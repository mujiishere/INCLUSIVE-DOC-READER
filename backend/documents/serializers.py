"""Serializers for all document OCR platform models."""

from rest_framework import serializers

from .models import Document, DocumentPage, Tag, TextRegion


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class TextRegionSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    bbox = serializers.SerializerMethodField()

    class Meta:
        model = TextRegion
        fields = [
            "id", "bbox", "bbox_x", "bbox_y", "bbox_w", "bbox_h",
            "language", "confidence", "reading_order",
            "raw_text", "corrected_text", "annotation", "tags",
        ]
        read_only_fields = ["id", "bbox"]

    def get_bbox(self, obj):
        return [obj.bbox_x, obj.bbox_y, obj.bbox_w, obj.bbox_h]


class DocumentPageSerializer(serializers.ModelSerializer):
    regions = TextRegionSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPage
        fields = ["id", "page_number", "image_url", "width", "height", "regions"]
        read_only_fields = ["id"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image_file and request:
            return request.build_absolute_uri(obj.image_file.url)
        return None


class DocumentPageListSerializer(serializers.ModelSerializer):
    """Lightweight page serializer — no regions, for page list endpoint."""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPage
        fields = ["id", "page_number", "image_url", "width", "height"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image_file and request:
            return request.build_absolute_uri(obj.image_file.url)
        return None


class DocumentSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    languages = serializers.SerializerMethodField()
    page_count = serializers.IntegerField(read_only=True)
    file_url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "title", "original_filename", "filename", "file_url",
            "status", "page_count", "languages",
            "tags", "error_message", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "page_count", "created_at", "updated_at", "error_message"]

    def get_languages(self, obj):
        return obj.get_languages_list()

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_filename(self, obj):
        return obj.original_filename or (obj.file.name.split("/")[-1] if obj.file else "")


class DocumentDetailSerializer(DocumentSerializer):
    """Document serializer that includes all pages + regions."""
    pages = DocumentPageListSerializer(many=True, read_only=True)

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ["pages"]
