"""
PDF and image file utilities.

Converts uploaded PDFs or images into per-page PIL Images for downstream OCR.
Uses PyMuPDF (fitz) with a Pillow fallback for images.
"""

import logging
from pathlib import Path
from typing import List, Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# DPI to render PDF pages at (higher = better OCR, slower)
PDF_RENDER_DPI = 200


def file_to_pages(file_path: str) -> List[Tuple[int, Image.Image]]:
    """
    Convert a file (PDF or image) into a list of (page_number, PIL_Image) tuples.

    Page numbers are 1-indexed.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return _pdf_to_pages(file_path)
    else:
        return _image_to_pages(file_path)


def _pdf_to_pages(file_path: str) -> List[Tuple[int, Image.Image]]:
    """Render each PDF page to a PIL Image using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF not installed — trying pdf2image fallback")
        return _pdf_to_pages_pdf2image(file_path)

    pages = []
    try:
        doc = fitz.open(file_path)
        mat = fitz.Matrix(PDF_RENDER_DPI / 72, PDF_RENDER_DPI / 72)  # 72dpi is PDF base
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            pages.append((page_idx + 1, img))
        doc.close()
    except Exception as exc:
        logger.error("PyMuPDF render failed for %s: %s", file_path, exc)
        raise

    return pages


def _pdf_to_pages_pdf2image(file_path: str) -> List[Tuple[int, Image.Image]]:
    """Fallback: use pdf2image (poppler required)."""
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(file_path, dpi=PDF_RENDER_DPI)
        return [(i + 1, img) for i, img in enumerate(images)]
    except ImportError:
        raise RuntimeError(
            "Neither PyMuPDF nor pdf2image is installed. "
            "Install: pip install PyMuPDF"
        )


def _image_to_pages(file_path: str) -> List[Tuple[int, Image.Image]]:
    """Load an image file as a single page."""
    img = Image.open(file_path)
    img.load()  # fully read into memory
    if img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGB")
    # Handle multi-frame (e.g. multi-page TIFF)
    pages = []
    try:
        for i in range(img.n_frames):
            img.seek(i)
            pages.append((i + 1, img.copy().convert("RGB")))
    except (AttributeError, EOFError):
        pages = [(1, img.convert("RGB"))]
    return pages
