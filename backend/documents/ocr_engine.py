"""
OCR engine integrating EasyOCR for multilingual Indian document processing.

Since EasyOCR cannot load incompatible scripts (like Hindi and Tamil) into 
a single Reader instance, this engine uses a multi-pass approach:
1. Runs multiple configured Readers sequentially over the image.
2. Collects all bounding boxes and text.
3. Merges overlapping bounding boxes, keeping the result with the highest confidence.

Returns a list of TextRegionData dicts per page.
"""

import logging
from typing import Any, Dict, List

from PIL import Image

logger = logging.getLogger(__name__)

# Define the language groups to run. 
# EasyOCR requires 'en' to be paired with complex scripts.
# Add or remove groups here based on requirements.
READER_GROUPS = [
    ["en", "hi"],
    ["en", "ta"],
    ["en", "te"],
    ["en", "ur"]
]

_reader_cache: Dict[str, Any] = {}


def _get_reader(langs: List[str], gpu: bool = False):
    """Return (and cache) the EasyOCR Reader instance for a specific language group."""
    cache_key = ",".join(sorted(langs))
    if cache_key not in _reader_cache:
        try:
            import easyocr
            logger.info("Initialising EasyOCR reader for: %s", langs)
            _reader_cache[cache_key] = easyocr.Reader(
                langs,
                gpu=gpu,
                verbose=False,
            )
        except ImportError:
            logger.error("EasyOCR not installed. Run: pip install easyocr")
            raise
    return _reader_cache[cache_key]


def detect_language_from_text(text: str) -> str:
    """Heuristically detect the primary script/language of a text string."""
    if not text:
        return "en"

    counts: Dict[str, int] = {
        "ml": 0, "ta": 0, "hi": 0, "te": 0, "kn": 0, "ur": 0, "en": 0,
    }

    for ch in text:
        cp = ord(ch)
        if 0x0D00 <= cp <= 0x0D7F:
            counts["ml"] += 1
        elif 0x0B80 <= cp <= 0x0BFF:
            counts["ta"] += 1
        elif 0x0900 <= cp <= 0x097F:
            counts["hi"] += 1
        elif 0x0C00 <= cp <= 0x0C7F:
            counts["te"] += 1
        elif 0x0C80 <= cp <= 0x0CFF:
            counts["kn"] += 1
        elif 0x0600 <= cp <= 0x06FF:
            counts["ur"] += 1
        elif ch.isascii() and ch.isalpha():
            counts["en"] += 1

    dominant = max(counts, key=counts.get)
    return dominant if counts[dominant] > 0 else "en"


def _calculate_iou(boxA, boxB):
    """Calculate Intersection over Union (IoU) for two bounding boxes [x, y, w, h]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    if interArea == 0:
        return 0.0

    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou


def run_ocr_on_image(pil_image: Image.Image) -> List[Dict]:
    """
    Run EasyOCR on a single PIL Image using a multi-pass strategy to support
    mixed incompatible scripts (like Hindi and Tamil) on the same page.
    """
    import numpy as np
    
    img_np = np.array(pil_image.convert("RGB"))
    all_detections = []

    # ── 1. Run Multiple Readers ─────────────────────────────────────────────
    for langs in READER_GROUPS:
        try:
            reader = _get_reader(langs, gpu=False)
            results = reader.readtext(
                img_np,
                detail=1,
                paragraph=False,
                batch_size=4,
            )
            
            for bbox_pts, text, prob in results:
                if not text.strip():
                    continue

                xs = [pt[0] for pt in bbox_pts]
                ys = [pt[1] for pt in bbox_pts]
                x = int(min(xs))
                y = int(min(ys))
                w = int(max(xs) - min(xs))
                h = int(max(ys) - min(ys))

                all_detections.append({
                    "bbox": [x, y, w, h],
                    "raw_text": text.strip(),
                    "confidence": float(prob),
                    "reader_lang": langs[1], # Store which reader found this
                })
        except ImportError:
            return _fallback_ocr(pil_image)
        except Exception as exc:
            logger.error("EasyOCR error for langs %s: %s", langs, exc)
            continue

    if not all_detections:
        return []

    # ── 2. Merge Overlapping Bounding Boxes (NMS-style) ─────────────────────
    # Sort detections by confidence (highest first)
    all_detections.sort(key=lambda d: d["confidence"], reverse=True)
    
    final_regions = []
    
    for det in all_detections:
        overlap_found = False
        for final_det in final_regions:
            iou = _calculate_iou(det["bbox"], final_det["bbox"])
            if iou > 0.4:  # If significant overlap, assume it's the same text region
                overlap_found = True
                break
        
        if not overlap_found:
            # Re-evaluate the language using our character-level heuristic 
            # to be more precise than just the reader group.
            lang = detect_language_from_text(det["raw_text"])
            
            final_regions.append({
                "bbox": det["bbox"],
                "raw_text": det["raw_text"],
                "confidence": det["confidence"],
                "language": lang,
            })

    # Add reading order based on Y coordinate primarily, then X
    final_regions.sort(key=lambda r: (r["bbox"][1] // 20, r["bbox"][0]))
    for order, region in enumerate(final_regions):
        region["reading_order"] = order

    return final_regions


def _fallback_ocr(pil_image: Image.Image) -> List[Dict]:
    """Minimal Pillow/pytesseract fallback."""
    try:
        import pytesseract
        text = pytesseract.image_to_string(pil_image, lang="eng+hin+tam+mal")
        if text.strip():
            return [{
                "bbox": [0, 0, pil_image.width, pil_image.height],
                "raw_text": text.strip(),
                "confidence": 0.5,
                "language": detect_language_from_text(text),
                "reading_order": 0,
            }]
    except Exception as exc:
        logger.warning("Tesseract fallback also failed: %s", exc)

    return [{
        "bbox": [0, 0, pil_image.width, pil_image.height],
        "raw_text": "(OCR engine not available — install easyocr)",
        "confidence": 0.0,
        "language": "en",
        "reading_order": 0,
    }]
