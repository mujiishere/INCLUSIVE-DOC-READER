from django.apps import AppConfig


class DocumentsConfig(AppConfig):
    """App config for documents module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "documents"

    def ready(self):
        """Initialize optional Mongo indexes without blocking startup."""
        from .mongo_service import ensure_indexes

        try:
            ensure_indexes()
        except Exception:
            pass
