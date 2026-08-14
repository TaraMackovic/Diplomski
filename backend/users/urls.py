from django.urls import path
from . import views

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/", views.login_api),
    path("register/", views.register_api),
    path("profile/<int:id>/", views.profile_api),
    path("change-password/", views.change_password_api),
    path("password-reset/", views.request_password_reset),
    path("password-reset/confirm/", views.confirm_password_reset),
    path("token/refresh/", TokenRefreshView.as_view()),
]