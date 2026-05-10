"""MongoDB Atlas synchronization helpers.

This module keeps a cloud snapshot of OCR entities while preserving
the existing Django ORM workflow and API contracts.
"""

import os
from datetime import datetime

def _is_truthy(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def is_mongodb_enabled() -> bool:
    return _is_truthy(os.getenv("USE_MONGODB", "false")) and bool(os.getenv("MONGODB_URI", ""))


def _get_database():
    if not is_mongodb_enabled():
        return None

    try:
        from pymongo import MongoClient
    except Exception:
        return None

    client = MongoClient(os.getenv("MONGODB_URI", ""))
    db_name = os.getenv("MONGODB_DB_NAME", "ocr_platform")
    return client[db_name]


def ensure_indexes() -> None:
    db = _get_database()
    if db is None:
        return

    try:
        from pymongo import ASCENDING
    except Exception:
        return

    db.documents.create_index([("document_id", ASCENDING)], unique=True)
    db.documents.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    db.documents.create_index([("search_blob", "text")])


def _safe_iso(dt):
    return dt.isoformat() if dt else None


def sync_document_snapshot(document) -> None:
    """Write one full document snapshot to MongoDB.

    Snapshot includes document metadata, pages, regions, tags, and annotations.
    """
    db = _get_database()
    if db is None:
        return

    pages_payload = []
    search_parts = [document.title or "", document.original_filename or ""]

    annotations_by_region = {}
    for page in document.pages.prefetch_related(
        "regions__annotations", "regions__annotations__custom_tag"
    ).all():
        for region in page.regions.all():
            region_annotations = []
            for ann in region.annotations.all():
                region_annotations.append(
                    {
                        "annotation_id": ann.id,
                        "category": ann.category,
                        "note": ann.note,
                        "custom_tag": ann.custom_tag.name if ann.custom_tag else None,
                        "updated_at": _safe_iso(ann.updated_at),
                    }
                )
            annotations_by_region[region.id] = region_annotations

    for page in document.pages.prefetch_related("regions__tags").all():
        regions_payload = []
        for region in page.regions.all():
            display_text = region.corrected_text or region.raw_text or ""
            search_parts.append(display_text)
            regions_payload.append(
                {
                    "region_id": region.id,
                    "reading_order": region.reading_order,
                    "language": region.language,
                    "confidence": region.confidence,
                    "bbox": [region.bbox_x, region.bbox_y, region.bbox_w, region.bbox_h],
                    "raw_text": region.raw_text,
                    "corrected_text": region.corrected_text,
                    "tags": [tag.name for tag in region.tags.all()],
                    "annotations": annotations_by_region.get(region.id, []),
                }
            )

        pages_payload.append(
            {
                "page_number": page.page_number,
                "image_url": page.cloudinary_image_url
                or (page.image_file.url if page.image_file else ""),
                "width": page.width,
                "height": page.height,
                "regions": regions_payload,
            }
        )

    payload = {
        "document_id": document.id,
        "user_id": document.user_id,
        "title": document.title,
        "original_filename": document.original_filename,
        "status": document.status,
        "page_count": document.page_count,
        "languages": document.get_languages_list(),
        "tags": [tag.name for tag in document.tags.all()],
        "cloudinary_url": document.cloudinary_url,
        "cloudinary_public_id": document.cloudinary_public_id,
        "created_at": _safe_iso(document.created_at),
        "updated_at": _safe_iso(document.updated_at),
        "pages": pages_payload,
        "search_blob": "\n".join(part for part in search_parts if part).strip(),
        "synced_at": datetime.utcnow().isoformat() + "Z",
    }

    db.documents.update_one({"document_id": document.id}, {"$set": payload}, upsert=True)


def delete_document_snapshot(document_id: int) -> None:
    db = _get_database()
    if db is None:
        return
    db.documents.delete_one({"document_id": document_id})
