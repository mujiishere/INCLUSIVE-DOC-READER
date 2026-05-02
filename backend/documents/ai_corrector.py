"""
AI post-correction step.

Sends raw OCR text from a page to an LLM to fix OCR errors, typos,
hallucinated characters, and improve readability while preserving meaning.

Supported backends (configured via settings.py):
  - Groq  (default, very fast, free tier available)
  - OpenAI-compatible endpoints
  - Stub / offline mode (no key required — returns raw text unchanged)
"""

import json
import logging
import os
from typing import Dict, List

from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an expert OCR post-correction engine specialising in multilingual "
    "Indian government and archival documents. Your job is to fix OCR errors, "
    "spelling mistakes, broken words, incorrect character substitutions, and "
    "garbled text while STRICTLY preserving the original meaning, language, and "
    "script. Do NOT translate. Do NOT add new information. Do NOT remove content. "
    "If the input is already correct, return it unchanged."
)

CORRECTION_PROMPT_TEMPLATE = (
    "Below are OCR-extracted text regions from one page of a scanned document. "
    "Each region is in the format: {{\"id\": <int>, \"lang\": \"<ISO>\", \"text\": \"<raw>\"}}.\n\n"
    "Return a JSON array with the SAME ids, corrected text only:\n"
    "[{{\"id\": <int>, \"corrected\": \"<text>\"}}]\n\n"
    "Regions to correct:\n{regions_json}"
)


def _build_correction_payload(regions: List[Dict]) -> str:
    """Build the JSON regions list for the prompt."""
    items = [
        {"id": r["id"], "lang": r.get("language", "en"), "text": r.get("raw_text", "")}
        for r in regions
        if r.get("raw_text", "").strip()
    ]
    return json.dumps(items, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Groq backend
# ---------------------------------------------------------------------------

def _correct_via_groq(regions: List[Dict], model: str) -> Dict[int, str]:
    """Call Groq API and parse corrections. Returns {region_id: corrected_text}."""
    try:
        from groq import Groq
    except ImportError:
        logger.warning("groq package not installed. Run: pip install groq")
        return {}

    api_key = getattr(settings, "GROQ_API_KEY", "") or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        logger.warning("GROQ_API_KEY not set — skipping AI correction.")
        return {}

    payload_json = _build_correction_payload(regions)
    prompt = CORRECTION_PROMPT_TEMPLATE.format(regions_json=payload_json)

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
        )
        raw_output = response.choices[0].message.content.strip()
        return _parse_correction_response(raw_output)
    except Exception as exc:
        logger.error("Groq correction call failed: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# OpenAI-compatible backend
# ---------------------------------------------------------------------------

def _correct_via_openai(regions: List[Dict], model: str, base_url: str) -> Dict[int, str]:
    """Call any OpenAI-compatible endpoint."""
    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai package not installed. Run: pip install openai")
        return {}

    api_key = getattr(settings, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping AI correction.")
        return {}

    payload_json = _build_correction_payload(regions)
    prompt = CORRECTION_PROMPT_TEMPLATE.format(regions_json=payload_json)

    try:
        client = OpenAI(api_key=api_key, base_url=base_url or None)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
        )
        raw_output = response.choices[0].message.content.strip()
        return _parse_correction_response(raw_output)
    except Exception as exc:
        logger.error("OpenAI correction call failed: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_correction_response(raw: str) -> Dict[int, str]:
    """Parse the JSON array from the LLM response into {id: corrected_text}."""
    # Strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw

    try:
        items = json.loads(raw)
        if isinstance(items, list):
            return {int(item["id"]): str(item.get("corrected", "")) for item in items}
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("Could not parse LLM correction response: %s — raw: %s", exc, raw[:200])

    return {}


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def correct_regions(regions: List[Dict]) -> Dict[int, str]:
    """
    Send a list of region dicts to the configured LLM backend for correction.

    Each region dict must have keys: 'id', 'raw_text', 'language'.
    Returns {region_id: corrected_text}.

    Falls back to empty dict (no correction) if no LLM is configured.
    """
    backend = getattr(settings, "AI_CORRECTION_BACKEND", "groq").lower()
    model = getattr(settings, "AI_CORRECTION_MODEL", "llama-3.1-8b-instant")

    if backend == "groq":
        return _correct_via_groq(regions, model)
    elif backend == "openai":
        base_url = getattr(settings, "OPENAI_BASE_URL", "")
        return _correct_via_openai(regions, model, base_url)
    else:
        logger.info("AI correction backend '%s' unknown — no correction applied.", backend)
        return {}
