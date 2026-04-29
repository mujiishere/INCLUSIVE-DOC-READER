"""Function-based views for registration and login."""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
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
    """Validate credentials and return token for React app."""
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


@api_view(["GET"])
def admin_summary_view(request):
    """Return simple admin-level summary metrics."""
    if not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    staff_users = User.objects.filter(is_staff=True).count()

    return Response(
        {
            "total_users": total_users,
            "active_users": active_users,
            "staff_users": staff_users,
        }
    )


@api_view(["GET"])
def admin_users_view(request):
    """Return a list of user accounts for admin user management UI."""
    if not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.order_by("username")
    payload = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
        }
        for user in users
    ]

    return Response(payload)
