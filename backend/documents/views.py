"""
Views for the multilingual OCR document platform.

All endpoints require TokenAuthentication. Users only see their own documents.
"""

import json
import os

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Document, DocumentPage, DocumentTag, RegionAnnotation, TextRegion
from .pipeline import start_processing
from .serializers import (
    DocumentDetailSerializer,
    DocumentPageSerializer,
    DocumentTagSerializer,
    DocumentSerializer,
    RegionAnnotationSerializer,
    TextRegionSerializer,
)


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@api_view(["POST"])
def upload_document(request):
    """Upload a file, create Document record, and kick off background processing."""
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return Response({"error": "File is required."}, status=status.HTTP_400_BAD_REQUEST)

    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
    original_name = uploaded_file.name
    extension = os.path.splitext(original_name)[1].lower()
    if extension not in allowed_extensions:
        return Response(
            {"error": "Unsupported file type. Upload PDF or image formats only."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Guardrail: many users rename text files as .pdf by mistake.
    if extension == ".pdf":
        header = uploaded_file.read(5)
        uploaded_file.seek(0)
        if header != b"%PDF-":
            return Response(
                {
                    "error": "The uploaded .pdf file is not a valid PDF. "
                    "Please export/download a real PDF and try again."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    title = request.data.get("title", "") or os.path.splitext(original_name)[0]

    doc = Document.objects.create(
        user=request.user,
        file=uploaded_file,
        title=title,
        original_filename=original_name,
        status=Document.Status.PENDING,
    )

    # Kick off async processing in a background thread
    start_processing(doc.pk)

    return Response(
        DocumentSerializer(doc, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# Document list, detail, delete
# ---------------------------------------------------------------------------

class DocumentListView(generics.ListAPIView):
    """List all documents for the current user, newest first."""
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = Document.objects.filter(user=self.request.user).prefetch_related("tags")

        tag_name = self.request.GET.get("tag", "").strip()
        tag_ids = self.request.GET.get("tag_ids", "").strip()

        if tag_name:
            queryset = queryset.filter(tags__name__iexact=tag_name, tags__user=self.request.user)

        if tag_ids:
            try:
                parsed_ids = [int(value) for value in tag_ids.split(",") if value.strip()]
                queryset = queryset.filter(tags__id__in=parsed_ids, tags__user=self.request.user)
            except ValueError:
                return queryset.none()

        return queryset.distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    """Get or delete one document. Includes pages list (regions fetched per-page)."""
    serializer_class = DocumentDetailSerializer

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def destroy(self, request, *args, **kwargs):
        doc = self.get_object()
        # Delete physical files
        try:
            if doc.file and os.path.isfile(doc.file.path):
                os.remove(doc.file.path)
        except Exception:
            pass
        # Page images deleted by cascade through Django's storage only if explicitly called
        for page in doc.pages.all():
            try:
                if page.image_file and os.path.isfile(page.image_file.path):
                    os.remove(page.image_file.path)
            except Exception:
                pass
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Status polling
# ---------------------------------------------------------------------------

@api_view(["GET"])
def document_status(request, pk):
    """Return only the processing status fields — for efficient polling."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "id": doc.pk,
        "status": doc.status,
        "page_count": doc.page_count,
        "languages": doc.get_languages_list(),
        "error_message": doc.error_message,
        "updated_at": doc.updated_at,
    })


# ---------------------------------------------------------------------------
# Page endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
def document_pages(request, pk):
    """List all pages for a document (lightweight — no regions)."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    from .serializers import DocumentPageListSerializer
    pages = doc.pages.all()
    serializer = DocumentPageListSerializer(pages, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
def document_page_detail(request, pk, page_number):
    """Return one page with all its text regions."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
        page = doc.pages.get(page_number=page_number)
    except (Document.DoesNotExist, DocumentPage.DoesNotExist):
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = DocumentPageSerializer(page, context={"request": request})
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Document tags
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def document_tags(request, pk):
    """GET: list tags on document. POST: add a tag by name."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(DocumentTagSerializer(doc.tags.all(), many=True).data)

    # POST — add tag
    name = request.data.get("name", "").strip()
    if not name:
        return Response({"error": "Tag name required."}, status=status.HTTP_400_BAD_REQUEST)

    tag, _ = DocumentTag.objects.get_or_create(user=request.user, name=name)
    doc.tags.add(tag)
    return Response(DocumentTagSerializer(tag).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def document_tag_remove(request, pk, tag_id):
    """Remove a tag from a document (does not delete the tag)."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
        tag = DocumentTag.objects.get(pk=tag_id, user=request.user)
    except (Document.DoesNotExist, DocumentTag.DoesNotExist):
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    doc.tags.remove(tag)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Region annotation + tagging
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_region_annotation(request, region_id):
    """Create a structured annotation for one text region."""
    try:
        region = TextRegion.objects.get(pk=region_id, page__document__user=request.user)
    except TextRegion.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    category = request.data.get("category", "").strip()
    note = request.data.get("note", "").strip()
    custom_tag_name = request.data.get("custom_tag_name", "").strip()
    custom_tag_id = request.data.get("custom_tag_id")

    if not category:
        return Response({"error": "Category is required."}, status=status.HTTP_400_BAD_REQUEST)

    custom_tag = None
    if custom_tag_name:
        custom_tag, _ = DocumentTag.objects.get_or_create(user=request.user, name=custom_tag_name)
    elif custom_tag_id:
        try:
            custom_tag = DocumentTag.objects.get(id=custom_tag_id, user=request.user)
        except DocumentTag.DoesNotExist:
            return Response({"error": "Custom tag not found."}, status=status.HTTP_400_BAD_REQUEST)

    annotation = RegionAnnotation.objects.create(
        user=request.user,
        region=region,
        category=category,
        note=note,
        custom_tag=custom_tag,
    )

    # Keep legacy text field in sync for old clients.
    region.annotation = note
    region.save(update_fields=["annotation"])

    serializer = RegionAnnotationSerializer(annotation)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def region_annotation_detail(request, annotation_id):
    """Update or delete one annotation owned by the current user."""
    try:
        annotation = RegionAnnotation.objects.get(
            id=annotation_id,
            user=request.user,
            region__page__document__user=request.user,
        )
    except RegionAnnotation.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        region = annotation.region
        annotation.delete()
        latest = region.annotations.order_by("-updated_at").first()
        region.annotation = latest.note if latest else ""
        region.save(update_fields=["annotation"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    category = request.data.get("category")
    note = request.data.get("note")
    custom_tag_name = request.data.get("custom_tag_name", "").strip()
    custom_tag_id = request.data.get("custom_tag_id")

    if category is not None:
        category = category.strip()
        if not category:
            return Response({"error": "Category cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        annotation.category = category

    if note is not None:
        annotation.note = str(note)

    if custom_tag_name:
        custom_tag, _ = DocumentTag.objects.get_or_create(user=request.user, name=custom_tag_name)
        annotation.custom_tag = custom_tag
    elif custom_tag_id is not None:
        if custom_tag_id == "" or custom_tag_id is None:
            annotation.custom_tag = None
        else:
            try:
                annotation.custom_tag = DocumentTag.objects.get(id=custom_tag_id, user=request.user)
            except DocumentTag.DoesNotExist:
                return Response({"error": "Custom tag not found."}, status=status.HTTP_400_BAD_REQUEST)

    annotation.save()

    region = annotation.region
    latest = region.annotations.order_by("-updated_at").first()
    region.annotation = latest.note if latest else ""
    region.save(update_fields=["annotation"])

    serializer = RegionAnnotationSerializer(annotation)
    return Response(serializer.data)


@api_view(["GET"])
def document_annotations(request, pk):
    """List all structured annotations for one document."""
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    annotations = RegionAnnotation.objects.filter(
        region__page__document=doc,
        user=request.user,
    ).select_related("custom_tag", "region", "region__page")

    serializer = RegionAnnotationSerializer(annotations, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def region_add_tag(request, region_id):
    """Add a tag to an individual text region."""
    try:
        region = TextRegion.objects.get(pk=region_id, page__document__user=request.user)
    except TextRegion.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    name = request.data.get("name", "").strip()
    if not name:
        return Response({"error": "Tag name required."}, status=status.HTTP_400_BAD_REQUEST)

    tag, _ = DocumentTag.objects.get_or_create(user=request.user, name=name)
    region.tags.add(tag)
    return Response(DocumentTagSerializer(tag).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@api_view(["GET"])
def search_documents(request):
    """
    Full-text search across corrected_text (and raw_text) with optional language filter.

    Query params:
      q    — keyword to search for
      lang — ISO language code filter (e.g. 'hi', 'ml')
    """
    query = request.GET.get("q", "").strip()
    lang = request.GET.get("lang", "").strip()
    tag = request.GET.get("tag", "").strip()

    # Start from user's documents
    docs_qs = Document.objects.filter(user=request.user)

    if tag:
        docs_qs = docs_qs.filter(tags__name__iexact=tag, tags__user=request.user).distinct()

    if not query and not lang:
        serializer = DocumentSerializer(
            docs_qs.order_by("-created_at"),
            many=True,
            context={"request": request},
        )
        return Response({"results": serializer.data, "total": docs_qs.count()})

    # Filter documents that have matching regions and/or matching document name.
    region_filter = Q()
    if query:
        region_filter &= Q(corrected_text__icontains=query) | Q(raw_text__icontains=query)
    if lang:
        region_filter &= Q(language=lang)

    region_doc_ids = set(
        TextRegion.objects.filter(region_filter, page__document__user=request.user)
        .values_list("page__document_id", flat=True)
        .distinct()
    )

    title_doc_ids = set()
    if query:
        title_doc_ids = set(
            docs_qs.filter(
                Q(title__icontains=query) | Q(original_filename__icontains=query)
            ).values_list("id", flat=True)
        )

    matched_ids = region_doc_ids | title_doc_ids
    docs_qs = docs_qs.filter(pk__in=matched_ids)

    # Build response with snippet per document
    results = []
    for doc in docs_qs.order_by("-created_at"):
        snippet_regions = TextRegion.objects.filter(
            page__document=doc, **({} if not query else {}),
        )
        if query:
            snippet_regions = snippet_regions.filter(
                Q(corrected_text__icontains=query) | Q(raw_text__icontains=query)
            )
        if lang:
            snippet_regions = snippet_regions.filter(language=lang)

        snippet = ""
        match_page = None
        sr = snippet_regions.first()
        if sr:
            text = sr.corrected_text or sr.raw_text
            match_page = sr.page.page_number
            # Excerpt around the match
            idx = text.lower().find(query.lower()) if query else 0
            start = max(0, idx - 60)
            end = min(len(text), idx + len(query) + 60)
            snippet = ("…" if start > 0 else "") + text[start:end] + ("…" if end < len(text) else "")
        elif query:
            title_text = doc.title or doc.original_filename or ""
            idx = title_text.lower().find(query.lower())
            if idx >= 0:
                start = max(0, idx - 30)
                end = min(len(title_text), idx + len(query) + 30)
                excerpt = title_text[start:end]
                snippet = f"Matched in filename/title: {excerpt}"

        doc_data = DocumentSerializer(doc, context={"request": request}).data
        doc_data["snippet"] = snippet
        doc_data["match_page"] = match_page
        results.append(doc_data)

    return Response({"results": results, "total": len(results)})


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@api_view(["GET"])
def export_document(request, pk):
    """
    Export document text as TXT or JSON.

    Query param: format=txt (default) or format=json
    """
    try:
        doc = Document.objects.get(pk=pk, user=request.user)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    fmt = request.GET.get("format", "txt").lower()

    if fmt == "json":
        export_data = {
            "document_id": doc.pk,
            "title": doc.title,
            "original_filename": doc.original_filename,
            "status": doc.status,
            "languages": doc.get_languages_list(),
            "pages": [],
        }
        for page in doc.pages.prefetch_related("regions").all():
            page_data = {
                "page_number": page.page_number,
                "regions": [
                    {
                        "reading_order": r.reading_order,
                        "language": r.language,
                        "confidence": r.confidence,
                        "bbox": r.bbox,
                        "raw_text": r.raw_text,
                        "corrected_text": r.corrected_text,
                    }
                    for r in page.regions.all()
                ],
            }
            export_data["pages"].append(page_data)

        response = HttpResponse(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            content_type="application/json",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{doc.original_filename or doc.pk}.json"'
        )
        return response

    # Default: TXT
    lines = []
    for page in doc.pages.prefetch_related("regions").all():
        lines.append(f"=== Page {page.page_number} ===\n")
        for region in page.regions.all():
            text = region.corrected_text or region.raw_text
            if text.strip():
                lines.append(text.strip())
                lines.append("")
    content = "\n".join(lines)

    response = HttpResponse(content, content_type="text/plain; charset=utf-8")
    response["Content-Disposition"] = (
        f'attachment; filename="{doc.original_filename or doc.pk}.txt"'
    )
    return response


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

@api_view(["GET"])
def dashboard_stats(request):
    """Return metrics and recent documents for the current user."""
    qs = Document.objects.filter(user=request.user)
    total = qs.count()
    completed = qs.filter(status=Document.Status.COMPLETED).count()
    processing = qs.filter(
        status__in=[Document.Status.PENDING, Document.Status.OCR_PROCESSING,
                    Document.Status.AI_CORRECTION]
    ).count()
    failed = qs.filter(status=Document.Status.FAILED).count()

    recent = qs.order_by("-created_at")[:5]
    recent_data = DocumentSerializer(recent, many=True, context={"request": request}).data

    return Response({
        "total_documents": total,
        "processed_files": completed,
        "pending_uploads": processing,
        "failed_documents": failed,
        "recent_activity": recent.count(),
        "recent_documents": recent_data,
    })
