"""Function-based views for registration and login."""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import RegisterSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """Create a new user account and return token."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key}, status=status.HTTP_201_CREATED)
    return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Validate credentials and return token (legacy unified login)."""
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def user_login_view(request):
    """Login endpoint dedicated to normal users (non-staff accounts)."""
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    if user.is_staff or user.is_superuser:
        return Response(
            {"error": "Admin account detected. Please use Admin Login."},
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_login_view(request):
    """Login endpoint dedicated to admin accounts only."""
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    if not (user.is_staff or user.is_superuser):
        return Response(
            {"error": "This account is not an admin account."},
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key}, status=status.HTTP_200_OK)


@api_view(["GET"])
def admin_summary_view(request):
    """Return simple admin-level summary metrics."""
    if not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    staff_users = User.objects.filter(is_staff=True).count()

    from documents.models import Document

    total_documents = Document.objects.count()
    completed_documents = Document.objects.filter(status=Document.Status.COMPLETED).count()
    processing_documents = Document.objects.filter(
        status__in=[
            Document.Status.PENDING,
            Document.Status.OCR_PROCESSING,
            Document.Status.AI_CORRECTION,
        ]
    ).count()
    failed_documents = Document.objects.filter(status=Document.Status.FAILED).count()
    
    # Real-time user uploads (last 10)
    recent_docs = Document.objects.select_related('user').order_by('-created_at')[:10]
    recent_uploads = [
        {
            "id": d.id,
            "title": d.title,
            "username": d.user.username if d.user else "Unknown",
            "status": d.status,
            "created_at": d.created_at
        }
        for d in recent_docs
    ]

    return Response(
        {
            "total_users": total_users,
            "active_users": active_users,
            "staff_users": staff_users,
            "total_documents": total_documents,
            "completed_documents": completed_documents,
            "processing_documents": processing_documents,
            "failed_documents": failed_documents,
            "recent_uploads": recent_uploads,
        }
    )


@api_view(["GET", "POST", "PUT", "DELETE"])
def admin_users_view(request):
    """Admin user management API (CRUD)."""
    if not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        users = User.objects.annotate(
            documents_uploaded=Count("documents", distinct=True),
            documents_completed=Count(
                "documents",
                filter=Q(documents__status="completed"),
                distinct=True,
            ),
            documents_processing=Count(
                "documents",
                filter=Q(documents__status__in=["pending", "ocr_processing", "ai_correction"]),
                distinct=True,
            ),
            documents_failed=Count(
                "documents",
                filter=Q(documents__status="failed"),
                distinct=True,
            ),
        ).order_by("username")
        payload = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "documents_uploaded": user.documents_uploaded,
                "documents_completed": user.documents_completed,
                "documents_processing": user.documents_processing,
                "documents_failed": user.documents_failed,
            }
            for user in users
        ]
        return Response(payload)

    elif request.method == "POST":
        data = request.data
        if User.objects.filter(username=data.get("username")).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=data.get("username"),
            email=data.get("email", ""),
            password=data.get("password"),
            is_staff=data.get("is_staff", False),
            is_active=data.get("is_active", True)
        )
        return Response({"message": "User created", "id": user.id}, status=status.HTTP_201_CREATED)

    elif request.method == "PUT":
        data = request.data
        try:
            user = User.objects.get(id=data.get("id"))
            if "username" in data and data["username"] != user.username:
                if User.objects.filter(username=data["username"]).exists():
                    return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
                user.username = data["username"]
            if "email" in data:
                user.email = data["email"]
            if "password" in data and data["password"]:
                user.set_password(data["password"])
            if "is_staff" in data:
                user.is_staff = data["is_staff"]
            if "is_active" in data:
                user.is_active = data["is_active"]
            user.save()
            return Response({"message": "User updated"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == "DELETE":
        try:
            user = User.objects.get(id=request.data.get("id"))
            if user == request.user:
                return Response({"error": "Cannot delete yourself"}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({"message": "User deleted"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def current_user_view(request):
    """Return basic profile details for the logged-in user."""
    user = request.user
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )
