"""Serializers for document APIs."""

from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Serialize document fields for responses."""

    class Meta:
        model = Document
        fields = ["id", "user", "file", "uploaded_at", "extracted_text"]
        read_only_fields = ["id", "user", "uploaded_at", "extracted_text"]
