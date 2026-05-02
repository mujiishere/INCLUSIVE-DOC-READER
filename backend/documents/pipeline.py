"""
Document processing pipeline orchestrator.

Runs in a background thread for each uploaded document.

Flow:
  1. document.status = ocr_processing
  2. file_to_pages()  → per-page PIL Images
  3. per page: preprocess_image() → run_ocr_on_image() → save TextRegions (raw)
  4. document.status = ai_correction
  5. per page: correct_regions() → update TextRegions (corrected)
  6. document.status = completed

On any unhandled exception → document.status = failed with error_message.
"""

import logging
import os
import threading
from io import BytesIO
from pathlib import Path
from typing import List

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Entry point  (called from views.py after upload)
# ---------------------------------------------------------------------------

def start_processing(document_id: int) -> None:
    """Spawn a daemon thread to process a document asynchronously."""
    thread = threading.Thread(
        target=_run_pipeline,
        args=(document_id,),
        daemon=True,
        name=f"ocr-pipeline-{document_id}",
    )
    thread.start()
    logger.info("Started processing thread for document %s", document_id)


# ---------------------------------------------------------------------------
# Main pipeline (runs in the background thread)
# ---------------------------------------------------------------------------

def _run_pipeline(document_id: int) -> None:
    """Full OCR + AI correction pipeline for one document."""
    # Import here to avoid circular imports and ensure Django is ready
    from .models import Document, DocumentPage, TextRegion
    from .ai_corrector import correct_regions
    from .ocr_engine import run_ocr_on_image
    from .pdf_utils import file_to_pages
    from .preprocessor import preprocess_image

    try:
        document = Document.objects.get(pk=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found in pipeline.", document_id)
        return

    try:
        # ── Step 1: OCR Processing ────────────────────────────────────────
        document.status = Document.Status.OCR_PROCESSING
        document.error_message = ""
        document.save(update_fields=["status", "error_message", "updated_at"])

        file_path = document.file.path
        pages_data = file_to_pages(file_path)
        document.page_count = len(pages_data)
        document.save(update_fields=["page_count", "updated_at"])

        all_langs: set = set()
        page_region_map: dict = {}  # page_obj → [region dicts]

        for page_number, pil_image in pages_data:
            logger.info("Processing page %s of document %s", page_number, document_id)

            # Preprocess
            pil_image = preprocess_image(pil_image)

            # Save page image to media
            page_obj = _save_page_image(document, page_number, pil_image)

            # OCR
            region_data_list = run_ocr_on_image(pil_image)

            # Persist TextRegions (raw only, corrected_text empty for now)
            saved_regions = []
            for rd in region_data_list:
                bbox = rd.get("bbox", [0, 0, 0, 0])
                region = TextRegion.objects.create(
                    page=page_obj,
                    bbox_x=bbox[0],
                    bbox_y=bbox[1],
                    bbox_w=bbox[2],
                    bbox_h=bbox[3],
                    language=rd.get("language", "en"),
                    confidence=rd.get("confidence", 0.0),
                    reading_order=rd.get("reading_order", 0),
                    raw_text=rd.get("raw_text", ""),
                    corrected_text=rd.get("raw_text", ""),  # default = same as raw
                )
                all_langs.add(rd.get("language", "en"))
                saved_regions.append(region)

            page_region_map[page_obj] = saved_regions

        # Update detected languages
        document.set_languages_list(list(all_langs))
        document.save(update_fields=["languages_detected", "updated_at"])

        # ── Step 2: AI Correction ─────────────────────────────────────────
        document.status = Document.Status.AI_CORRECTION
        document.save(update_fields=["status", "updated_at"])

        for page_obj, regions in page_region_map.items():
            if not regions:
                continue

            # Build input for AI corrector
            region_inputs = [
                {
                    "id": region.pk,
                    "raw_text": region.raw_text,
                    "language": region.language,
                }
                for region in regions
            ]

            corrections = correct_regions(region_inputs)  # {region_pk: corrected_text}

            # Apply corrections in bulk
            to_update = []
            for region in regions:
                if region.pk in corrections and corrections[region.pk].strip():
                    region.corrected_text = corrections[region.pk]
                    to_update.append(region)

            if to_update:
                TextRegion.objects.bulk_update(to_update, ["corrected_text"])

        # ── Step 3: Completed ─────────────────────────────────────────────
        document.status = Document.Status.COMPLETED
        document.save(update_fields=["status", "updated_at"])
        logger.info("Document %s processing completed.", document_id)

    except Exception as exc:
        logger.exception("Pipeline failed for document %s: %s", document_id, exc)
        try:
            document.status = Document.Status.FAILED
            document.error_message = str(exc)[:1000]
            document.save(update_fields=["status", "error_message", "updated_at"])
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Helper: save page image to media storage
# ---------------------------------------------------------------------------

def _save_page_image(document, page_number: int, pil_image):
    """Create/update a DocumentPage and save its rendered image to media."""
    from .models import DocumentPage
    from PIL import Image

    page_obj, _ = DocumentPage.objects.get_or_create(
        document=document,
        page_number=page_number,
        defaults={"width": pil_image.width, "height": pil_image.height},
    )
    page_obj.width = pil_image.width
    page_obj.height = pil_image.height

    # Save page image as PNG
    buf = BytesIO()
    pil_image.save(buf, format="PNG", optimize=True)
    filename = f"doc_{document.pk}_page_{page_number}.png"
    page_obj.image_file.save(filename, ContentFile(buf.getvalue()), save=False)
    page_obj.save()

    return page_obj
