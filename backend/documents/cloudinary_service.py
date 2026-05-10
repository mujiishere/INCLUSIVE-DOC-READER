"""Cloudinary helper utilities for document/page file storage.

This module is intentionally lightweight and safe to call even when
Cloudinary credentials are not configured.
"""

import os

def _is_truthy(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def is_cloudinary_enabled() -> bool:
    """Return True when cloud upload is explicitly enabled and credentials exist."""
    enabled = _is_truthy(os.getenv("USE_CLOUDINARY", "false"))
    required = [
        os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        os.getenv("CLOUDINARY_API_KEY", ""),
        os.getenv("CLOUDINARY_API_SECRET", ""),
    ]
    return enabled and all(required)


def configure_cloudinary() -> None:
    """Initialize Cloudinary SDK from environment variables."""
    import cloudinary

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        api_key=os.getenv("CLOUDINARY_API_KEY", ""),
        api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
        secure=True,
    )


def upload_document_file(file_path: str, document_id: int):
    """Upload original source file (PDF/image) as a raw asset."""
    if not is_cloudinary_enabled():
        return None

    try:
        import cloudinary.uploader
    except Exception:
        return None

    configure_cloudinary()
    result = cloudinary.uploader.upload(
        file_path,
        resource_type="raw",
        folder="ocr-platform/documents",
        public_id=f"document_{document_id}",
        overwrite=True,
        use_filename=False,
    )
    return {
        "url": result.get("secure_url", ""),
        "public_id": result.get("public_id", ""),
    }


def upload_page_image(image_bytes: bytes, document_id: int, page_number: int):
    """Upload rendered page image as standard image asset."""
    if not is_cloudinary_enabled():
        return None

    try:
        import cloudinary.uploader
    except Exception:
        return None

    configure_cloudinary()
    result = cloudinary.uploader.upload(
        image_bytes,
        resource_type="image",
        folder="ocr-platform/pages",
        public_id=f"document_{document_id}_page_{page_number}",
        overwrite=True,
    )
    return {
        "url": result.get("secure_url", ""),
        "public_id": result.get("public_id", ""),
    }


def delete_asset(public_id: str, resource_type: str = "image") -> None:
    """Delete a Cloudinary asset by public_id (best effort)."""
    if not public_id or not is_cloudinary_enabled():
        return

    try:
        import cloudinary.uploader
    except Exception:
        return

    configure_cloudinary()
    cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
