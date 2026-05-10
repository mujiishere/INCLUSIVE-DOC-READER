"""Serializers for all document OCR platform models."""

from rest_framework import serializers

from .models import Document, DocumentPage, DocumentTag, RegionAnnotation, TextRegion


class DocumentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTag
        fields = ["id", "name"]


class RegionAnnotationSerializer(serializers.ModelSerializer):
    custom_tag = DocumentTagSerializer(read_only=True)
    custom_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    region_page_number = serializers.IntegerField(source="region.page.page_number", read_only=True)
    region_reading_order = serializers.IntegerField(source="region.reading_order", read_only=True)

    class Meta:
        model = RegionAnnotation
        fields = [
            "id",
            "region",
            "category",
            "note",
            "custom_tag",
            "custom_tag_id",
            "region_page_number",
            "region_reading_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "region", "custom_tag"]

    def validate_custom_tag_id(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context missing.")
        exists = DocumentTag.objects.filter(id=value, user=request.user).exists()
        if not exists:
            raise serializers.ValidationError("Tag not found.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["custom_tag"] = (
            DocumentTagSerializer(instance.custom_tag).data if instance.custom_tag else None
        )
        return data


class TextRegionSerializer(serializers.ModelSerializer):
    tags = DocumentTagSerializer(many=True, read_only=True)
    bbox = serializers.SerializerMethodField()
    annotations = RegionAnnotationSerializer(many=True, read_only=True)

    class Meta:
        model = TextRegion
        fields = [
            "id", "bbox", "bbox_x", "bbox_y", "bbox_w", "bbox_h",
            "language", "confidence", "reading_order",
            "raw_text", "corrected_text", "annotation", "tags", "annotations",
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
        if obj.cloudinary_image_url:
            return obj.cloudinary_image_url
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
        if obj.cloudinary_image_url:
            return obj.cloudinary_image_url
        request = self.context.get("request")
        if obj.image_file and request:
            return request.build_absolute_uri(obj.image_file.url)
        return None


class DocumentSerializer(serializers.ModelSerializer):
    tags = DocumentTagSerializer(many=True, read_only=True)
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
        if obj.cloudinary_url:
            return obj.cloudinary_url
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_filename(self, obj):
        return obj.original_filename or (obj.file.name.split("/")[-1] if obj.file else "")


class DocumentDetailSerializer(DocumentSerializer):
    """Document serializer that includes all pages + regions."""
    pages = DocumentPageListSerializer(many=True, read_only=True)
    annotations = serializers.SerializerMethodField()

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ["pages", "annotations"]

    def get_annotations(self, obj):
        annotations = RegionAnnotation.objects.filter(
            region__page__document=obj
        ).select_related("custom_tag", "region")
        return RegionAnnotationSerializer(annotations, many=True, context=self.context).data
