"""Admin registrations for OCR platform models."""

from django.contrib import admin

from .models import Document, DocumentPage, DocumentTag, RegionAnnotation, TextRegion


class DocumentPageInline(admin.TabularInline):
    model = DocumentPage
    extra = 0
    readonly_fields = ["page_number", "image_file", "width", "height"]


class TextRegionInline(admin.TabularInline):
    model = TextRegion
    extra = 0
    readonly_fields = ["reading_order", "language", "confidence", "bbox_x", "bbox_y",
                       "bbox_w", "bbox_h", "raw_text", "corrected_text"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["id", "original_filename", "user", "status", "page_count", "created_at"]
    list_filter = ["status", "user"]
    search_fields = ["original_filename", "title"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [DocumentPageInline]


@admin.register(DocumentPage)
class DocumentPageAdmin(admin.ModelAdmin):
    list_display = ["id", "document", "page_number"]
    inlines = [TextRegionInline]


@admin.register(TextRegion)
class TextRegionAdmin(admin.ModelAdmin):
    list_display = ["id", "page", "language", "confidence", "reading_order"]
    list_filter = ["language"]
    search_fields = ["raw_text", "corrected_text"]


@admin.register(DocumentTag)
class DocumentTagAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "user"]
    search_fields = ["name"]


@admin.register(RegionAnnotation)
class RegionAnnotationAdmin(admin.ModelAdmin):
    list_display = ["id", "region", "category", "user", "updated_at"]
    list_filter = ["category", "user"]
    search_fields = ["category", "note"]
