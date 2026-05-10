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
import shutil
import threading
import time
import tempfile
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
    from .models import Document, TextRegion  # type: ignore[attr-defined]
    from .ai_corrector import correct_regions
    from .cloudinary_service import upload_document_file
    from .mongo_service import sync_document_snapshot
    from .ocr_engine import run_ocr_on_image
    from .pdf_utils import file_to_pages
    from .preprocessor import preprocess_image

    local_file_path = None

    try:
        document = Document.objects.get(pk=document_id)  # type: ignore[attr-defined]
    except Document.DoesNotExist:  # type: ignore[attr-defined]
        logger.error("Document %s not found in pipeline.", document_id)
        return

    try:
        # ── Step 1: OCR Processing ────────────────────────────────────────
        document.status = Document.Status.OCR_PROCESSING
        document.error_message = ""
        document.save(update_fields=["status", "error_message", "updated_at"])

        # Best-effort cloud upload for original file.
        try:
            upload_result = upload_document_file(document.file.path, document.pk)
            if upload_result:
                document.cloudinary_url = upload_result.get("url", "")
                document.cloudinary_public_id = upload_result.get("public_id", "")
                document.save(update_fields=["cloudinary_url", "cloudinary_public_id", "updated_at"])
        except Exception as exc:
            logger.warning("Cloudinary document upload skipped for %s: %s", document_id, exc)

        _sync_snapshot_safe(sync_document_snapshot, document)

        file_path = document.file.path
        local_file_path = _prepare_local_processing_copy(file_path)
        pages_data = file_to_pages(local_file_path)
        document.page_count = len(pages_data)
        document.save(update_fields=["page_count", "updated_at"])
        _sync_snapshot_safe(sync_document_snapshot, document)

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
                region = TextRegion.objects.create(  # type: ignore[attr-defined]
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
        _sync_snapshot_safe(sync_document_snapshot, document)

        # ── Step 2: AI Correction ─────────────────────────────────────────
        document.status = Document.Status.AI_CORRECTION
        document.save(update_fields=["status", "updated_at"])
        _sync_snapshot_safe(sync_document_snapshot, document)

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
                TextRegion.objects.bulk_update(to_update, ["corrected_text"])  # type: ignore[attr-defined]

        # ── Step 3: Completed ─────────────────────────────────────────────
        document.status = Document.Status.COMPLETED
        document.save(update_fields=["status", "updated_at"])
        _sync_snapshot_safe(sync_document_snapshot, document)
        logger.info("Document %s processing completed.", document_id)

    except Exception as exc:
        logger.exception("Pipeline failed for document %s: %s", document_id, exc)
        try:
            document.status = Document.Status.FAILED
            document.error_message = str(exc)[:1000]
            document.save(update_fields=["status", "error_message", "updated_at"])
            _sync_snapshot_safe(sync_document_snapshot, document)
        except Exception:
            pass
    finally:
        # Clean temporary local processing copy if created.
        try:
            if local_file_path and local_file_path != document.file.path:
                if os.path.isfile(local_file_path):
                    os.remove(local_file_path)
        except Exception:
            pass


def _prepare_local_processing_copy(file_path: str) -> str:
    """Create a local temp copy for OCR processing with retry safety checks.

    This avoids transient file locks/sync issues from cloud-backed folders.
    """
    source = Path(file_path)

    # Wait briefly for file to become available on disk.
    last_error = None
    for _ in range(10):
        try:
            if source.exists() and source.stat().st_size > 0:
                with open(source, "rb"):
                    pass
                break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(0.3)
    else:
        if last_error:
            raise RuntimeError(f"Uploaded file is not readable yet: {source} ({last_error})")
        raise RuntimeError(f"Uploaded file not found or empty: {source}")

    suffix = source.suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = Path(tmp.name)

    shutil.copyfile(source, temp_path)
    return str(temp_path)


# ---------------------------------------------------------------------------
# Helper: save page image to media storage
# ---------------------------------------------------------------------------

def _save_page_image(document, page_number: int, pil_image):
    """Create/update a DocumentPage and save its rendered image to media."""
    from .models import DocumentPage  # type: ignore[attr-defined]
    from .cloudinary_service import upload_page_image

    page_obj, _ = DocumentPage.objects.get_or_create(  # type: ignore[attr-defined]
        document=document,
        page_number=page_number,
        defaults={"width": pil_image.width, "height": pil_image.height},
    )
    page_obj.width = pil_image.width
    page_obj.height = pil_image.height

    # Save page image as PNG
    buf = BytesIO()
    pil_image.save(buf, format="PNG", optimize=True)
    image_bytes = buf.getvalue()
    filename = f"doc_{document.pk}_page_{page_number}.png"
    page_obj.image_file.save(filename, ContentFile(image_bytes), save=False)

    # Best-effort cloud upload for page image.
    try:
        upload_result = upload_page_image(image_bytes, document.pk, page_number)
        if upload_result:
            page_obj.cloudinary_image_url = upload_result.get("url", "")
            page_obj.cloudinary_image_public_id = upload_result.get("public_id", "")
    except Exception as exc:
        logger.warning(
            "Cloudinary page upload skipped for doc %s page %s: %s",
            document.pk,
            page_number,
            exc,
        )

    page_obj.save()

    return page_obj


def _sync_snapshot_safe(sync_func, document) -> None:
    try:
        sync_func(document)
    except Exception as exc:
        logger.warning("Mongo snapshot sync skipped for document %s: %s", document.pk, exc)
