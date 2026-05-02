"""URL patterns for the OCR platform document APIs."""

from django.urls import path

from .views import (
    DocumentDetailView,
    DocumentListView,
    dashboard_stats,
    document_page_detail,
    document_pages,
    document_status,
    document_tag_remove,
    document_tags,
    export_document,
    region_add_tag,
    region_annotate,
    search_documents,
    upload_document,
)

urlpatterns = [
    # Dashboard
    path("dashboard/", dashboard_stats, name="dashboard-stats"),

    # Upload
    path("upload/", upload_document, name="upload-document"),

    # Documents CRUD + status
    path("documents/", DocumentListView.as_view(), name="document-list"),
    path("documents/<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("documents/<int:pk>/status/", document_status, name="document-status"),

    # Pages
    path("documents/<int:pk>/pages/", document_pages, name="document-pages"),
    path("documents/<int:pk>/pages/<int:page_number>/", document_page_detail, name="document-page-detail"),

    # Tags on document
    path("documents/<int:pk>/tags/", document_tags, name="document-tags"),
    path("documents/<int:pk>/tags/<int:tag_id>/", document_tag_remove, name="document-tag-remove"),

    # Regions
    path("regions/<int:region_id>/annotate/", region_annotate, name="region-annotate"),
    path("regions/<int:region_id>/tags/", region_add_tag, name="region-add-tag"),

    # Search
    path("search/", search_documents, name="document-search"),

    # Export
    path("documents/<int:pk>/export/", export_document, name="document-export"),
]
