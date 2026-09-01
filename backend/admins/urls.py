from django.urls import path
from . import views

urlpatterns = [
    path("admin-api/dashboard/", views.dashboard_stats),
    path("admin-api/categories/", views.admin_categories),
    path("admin-api/categories/<int:id>/", views.admin_category_detail),

    path("admin-api/events/", views.admin_events),
    path("admin-api/events/<int:id>/", views.admin_event_detail),


    path("admin-api/users/", views.admin_users),
    path("admin-api/users/<int:id>/", views.admin_user_detail),
    path("admin-api/users/<int:id>/toggle-active/", views.admin_toggle_user_active),
    path("admin-api/users/<int:id>/toggle-staff/", views.admin_toggle_user_staff),
    path("admin-api/users/<int:id>/delete/", views.admin_delete_user),
]