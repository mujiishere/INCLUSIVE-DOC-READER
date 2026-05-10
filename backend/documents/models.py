"""
Data models for multilingual document OCR & digitization platform.

Hierarchy: Document → DocumentPage → TextRegion
Tags and Annotations are also modelled here.
"""

import json

from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# DocumentTag  (user-scoped label reusable across documents and regions)
# ---------------------------------------------------------------------------

class DocumentTag(models.Model):
    """A simple text label owned by a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tags",
    )
    name = models.CharField(max_length=80)

    class Meta:
        unique_together = [("user", "name")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.user.username})"


# ---------------------------------------------------------------------------
# Document  (top-level entity per uploaded file)
# ---------------------------------------------------------------------------

class Document(models.Model):
    """One uploaded file — PDF or image — with full processing lifecycle."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        OCR_PROCESSING = "ocr_processing", "OCR Processing"
        AI_CORRECTION = "ai_correction", "AI Correction"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255, blank=True)
    original_filename = models.CharField(max_length=512, blank=True)
    file = models.FileField(upload_to="uploads/")
    cloudinary_url = models.URLField(blank=True, default="")
    cloudinary_public_id = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    page_count = models.PositiveIntegerField(default=0)
    # Comma-separated ISO language codes detected across all pages
    languages_detected = models.TextField(blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    tags = models.ManyToManyField(DocumentTag, blank=True, related_name="documents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Document {self.id} — {self.original_filename or 'unnamed'}"

    def get_languages_list(self):
        """Return languages_detected as a Python list."""
        if not self.languages_detected:
            return []
        try:
            return json.loads(self.languages_detected)
        except (json.JSONDecodeError, TypeError):
            return [l.strip() for l in self.languages_detected.split(",") if l.strip()]

    def set_languages_list(self, lang_list):
        """Persist a Python list as JSON string."""
        self.languages_detected = json.dumps(sorted(set(lang_list)))


# ---------------------------------------------------------------------------
# DocumentPage  (one page inside a document)
# ---------------------------------------------------------------------------

class DocumentPage(models.Model):
    """One rendered page image extracted from the uploaded document."""

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="pages",
    )
    page_number = models.PositiveIntegerField()
    # Rendered page image stored separately for the viewer
    image_file = models.ImageField(upload_to="pages/", blank=True, null=True)
    cloudinary_image_url = models.URLField(blank=True, default="")
    cloudinary_image_public_id = models.CharField(max_length=255, blank=True, default="")
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["page_number"]
        unique_together = [("document", "page_number")]

    def __str__(self):
        return f"Page {self.page_number} of Document {self.document_id}"


# ---------------------------------------------------------------------------
# TextRegion  (one detected text block on a page)
# ---------------------------------------------------------------------------

class TextRegion(models.Model):
    """A bounding-box delimited text block with raw + AI-corrected text."""

    page = models.ForeignKey(
        DocumentPage,
        on_delete=models.CASCADE,
        related_name="regions",
    )
    # Bounding box (pixels, top-left origin)
    bbox_x = models.IntegerField(default=0)
    bbox_y = models.IntegerField(default=0)
    bbox_w = models.IntegerField(default=0)
    bbox_h = models.IntegerField(default=0)
    # Language detected for this region (ISO code, e.g. 'en', 'ml', 'hi')
    language = models.CharField(max_length=10, blank=True, default="")
    # OCR confidence 0.0 – 1.0
    confidence = models.FloatField(default=0.0)
    # Reading order index within the page
    reading_order = models.PositiveIntegerField(default=0)
    raw_text = models.TextField(blank=True, default="")
    corrected_text = models.TextField(blank=True, default="")
    # Legacy inline annotation field kept for backward compatibility.
    annotation = models.TextField(blank=True, default="")
    tags = models.ManyToManyField(DocumentTag, blank=True, related_name="regions")

    class Meta:
        ordering = ["reading_order"]

    def __str__(self):
        return f"Region {self.id} on Page {self.page_id} [{self.language}]"

    @property
    def bbox(self):
        return [self.bbox_x, self.bbox_y, self.bbox_w, self.bbox_h]


# ---------------------------------------------------------------------------
# RegionAnnotation  (structured annotation linked to one text region)
# ---------------------------------------------------------------------------

class RegionAnnotation(models.Model):
    """A structured user annotation for one extracted text region."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="region_annotations",
    )
    region = models.ForeignKey(
        TextRegion,
        on_delete=models.CASCADE,
        related_name="annotations",
    )
    category = models.CharField(max_length=80)
    note = models.TextField(blank=True, default="")
    custom_tag = models.ForeignKey(
        DocumentTag,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="annotations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Annotation {self.id} on Region {self.region_id}"
