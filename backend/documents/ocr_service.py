"""Placeholder OCR service module.

Replace `run_ocr` with your real custom OCR AI model later.
"""

from pathlib import Path


def run_ocr(file_path):
    """Return dummy text for now, based on uploaded file name."""
    filename = Path(file_path).name
    return (
        f"Placeholder OCR output for file: {filename}. "
        "Replace this with your custom OCR model integration."
    )
