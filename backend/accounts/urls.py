"""URL patterns for account APIs."""

from django.urls import path

from .views import admin_summary_view, admin_users_view, login_view, register_view


urlpatterns = [
    path("register/", register_view, name="register"),
    path("login/", login_view, name="login"),
    path("admin/summary/", admin_summary_view, name="admin-summary"),
    path("admin/users/", admin_users_view, name="admin-users"),
]
