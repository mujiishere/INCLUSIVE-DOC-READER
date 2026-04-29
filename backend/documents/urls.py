"""URL patterns for document APIs."""

from django.urls import path

from .views import DocumentDetailView, DocumentListView, dashboard_stats, search_documents, upload_document


urlpatterns = [
    path("dashboard/", dashboard_stats, name="dashboard-stats"),
    path("upload/", upload_document, name="upload-document"),
    path("documents/", DocumentListView.as_view(), name="document-list"),
    path("documents/<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("search/", search_documents, name="document-search"),
]
