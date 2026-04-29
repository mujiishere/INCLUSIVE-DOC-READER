"""Serializers for account endpoints."""

from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    """Create new users with username/email/password."""

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        """Use Django helper to hash password correctly."""
        return User.objects.create_user(**validated_data)
