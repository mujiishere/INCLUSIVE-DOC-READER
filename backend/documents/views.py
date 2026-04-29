"""Views for upload, list, detail, and search endpoints."""

from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Document
from .ocr_service import run_ocr
from .serializers import DocumentSerializer


@api_view(["POST"])
def upload_document(request):
    """Upload file, run OCR placeholder, and save extracted text."""
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return Response({"error": "File is required."}, status=status.HTTP_400_BAD_REQUEST)

    document = Document.objects.create(user=request.user, file=uploaded_file)
    document.extracted_text = run_ocr(document.file.path)
    document.save()

    return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentListView(generics.ListAPIView):
    """List all documents for the logged-in user."""

    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user).order_by("-uploaded_at")


class DocumentDetailView(generics.RetrieveAPIView):
    """Get one document by id for the logged-in user."""

    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)


@api_view(["GET"])
def search_documents(request):
    """Search documents by keyword in extracted_text."""
    query = request.GET.get("q", "")
    queryset = Document.objects.filter(user=request.user)

    if query:
        queryset = queryset.filter(extracted_text__icontains=query)

    serializer = DocumentSerializer(queryset.order_by("-uploaded_at"), many=True)
    return Response(serializer.data)
