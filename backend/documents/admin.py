"""Admin registration for document model."""

from django.contrib import admin

from .models import Document


admin.site.register(Document)
