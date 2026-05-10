"""URL patterns for the OCR platform document APIs."""

from django.urls import path

from .views import (
    DocumentDetailView,
    DocumentListView,
    create_region_annotation,
    dashboard_stats,
    document_annotations,
    document_page_detail,
    document_pages,
    document_status,
    document_tag_remove,
    document_tags,
    export_document,
    region_add_tag,
    region_remove_tag,
    region_annotation_detail,
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
    path("documents/<int:pk>/annotations/", document_annotations, name="document-annotations"),

    # Regions
    path("regions/<int:region_id>/annotations/", create_region_annotation, name="region-annotations-create"),
    path("regions/<int:region_id>/tags/", region_add_tag, name="region-add-tag"),
    path("regions/<int:region_id>/tags/<int:tag_id>/", region_remove_tag, name="region-remove-tag"),
    path("annotations/<int:annotation_id>/", region_annotation_detail, name="region-annotation-detail"),

    # Search
    path("search/", search_documents, name="document-search"),

    # Export
    path("documents/<int:pk>/export/", export_document, name="document-export"),
]
