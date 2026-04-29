"""Data model for uploaded files and extracted OCR text."""

from django.conf import settings
from django.db import models


class Document(models.Model):
    """Stores one uploaded file and its extracted text."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    file = models.FileField(upload_to="uploads/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    extracted_text = models.TextField(blank=True)

    def __str__(self):
        return f"Document {self.id} - {self.user.username}"
