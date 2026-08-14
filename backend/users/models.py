from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    phone_number = models.CharField(
        max_length=30,
        blank=True
    )

    city = models.CharField(
        max_length=100,
        default="Banja Luka"
    )

    profile_image = models.URLField(
        blank=True,
        null=True
    )

    email_notifications = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username