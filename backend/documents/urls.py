"""URL patterns for document APIs."""

from django.urls import path

from .views import DocumentDetailView, DocumentListView, search_documents, upload_document


urlpatterns = [
    path("upload/", upload_document, name="upload-document"),
    path("documents/", DocumentListView.as_view(), name="document-list"),
    path("documents/<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("search/", search_documents, name="document-search"),
]
