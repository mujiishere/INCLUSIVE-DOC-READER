"""
Image preprocessing utilities for scanned documents.

Applies deskew, denoising, and contrast enhancement using Pillow and OpenCV.
Falls back gracefully when OpenCV is not installed.
"""

import logging
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)


def _try_import_cv2():
    try:
        import cv2
        import numpy as np
        return cv2, np
    except ImportError:
        return None, None


def preprocess_image(pil_image: Image.Image) -> Image.Image:
    """
    Run the full preprocessing chain on a PIL Image and return the result.

    Steps (all degrade gracefully):
      1. Convert to RGB if needed
      2. Denoise  (OpenCV fastNlMeansDenoising or Pillow SMOOTH_MORE filter)
      3. Contrast enhancement (Pillow ImageEnhance)
      4. Deskew  (OpenCV minAreaRect on thresholded image)
    """
    # ── 1. Normalise colour mode ───────────────────────────────────────────
    if pil_image.mode not in ("RGB", "L"):
        pil_image = pil_image.convert("RGB")

    cv2, np = _try_import_cv2()

    if cv2 is not None and np is not None:
        pil_image = _cv2_preprocess(pil_image, cv2, np)
    else:
        pil_image = _pillow_preprocess(pil_image)

    return pil_image


# ---------------------------------------------------------------------------
# OpenCV-based path (higher quality)
# ---------------------------------------------------------------------------

def _cv2_preprocess(img: Image.Image, cv2, np) -> Image.Image:
    """Full pipeline using OpenCV."""
    # PIL → numpy BGR
    rgb = np.array(img.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # ── Denoise ────────────────────────────────────────────────────────────
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # ── Adaptive threshold for deskew detection ────────────────────────────
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # ── Deskew ─────────────────────────────────────────────────────────────
    coords = np.column_stack(np.where(thresh > 0))
    if coords.shape[0] > 50:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        if abs(angle) > 0.3:  # only correct if skew is noticeable
            h, w = gray.shape
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            denoised = cv2.warpAffine(denoised, M, (w, h),
                                      flags=cv2.INTER_CUBIC,
                                      borderMode=cv2.BORDER_REPLICATE)

    # ── Contrast (CLAHE) ───────────────────────────────────────────────────
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # ── Return to PIL RGB ──────────────────────────────────────────────────
    result_rgb = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(result_rgb)


# ---------------------------------------------------------------------------
# Pillow-only fallback
# ---------------------------------------------------------------------------

def _pillow_preprocess(img: Image.Image) -> Image.Image:
    """Lighter preprocessing using only Pillow."""
    # Smooth (acts as mild denoise)
    img = img.filter(ImageFilter.SMOOTH_MORE)
    # Contrast enhancement
    img = ImageEnhance.Contrast(img).enhance(1.4)
    # Sharpness
    img = ImageEnhance.Sharpness(img).enhance(1.3)
    return img


def pil_to_bytes(img: Image.Image, fmt: str = "PNG") -> bytes:
    buf = BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()
