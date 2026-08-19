from django.urls import path
from . import views

urlpatterns = [
    path("admin-api/dashboard/", views.dashboard_stats),
    path("admin-api/categories/", views.admin_categories),
    path("admin-api/categories/<int:id>/", views.admin_category_detail),
]