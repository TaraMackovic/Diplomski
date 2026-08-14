from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Event(models.Model):

    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("finished", "Finished"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    date = models.DateTimeField()
    time_known = models.BooleanField(default=True)

    image = models.URLField(blank=True, null=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    tags = models.CharField(
        max_length=255,
        blank=True,
        help_text="npr: muzika, elektronska, festival (odvojeno zarezom)"
    )

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(
                fields=["title", "date", "location"],
                name="unique_event",
            )
        ]

    def __str__(self):
        return self.title


class EventSource(models.Model):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="sources",
    )

    source = models.CharField(
        max_length=100,
        help_text="Grad Banja Luka, NP RS, SC Borik...",
    )
    source_url = models.URLField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "source_url"],
                name="unique_event_source",
            )
        ]

    def __str__(self):
        return f"{self.source} - {self.event.title}"
    
class SavedEvent(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="saved_events",
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    saved_at = models.DateTimeField(auto_now_add=True)
    reminder_sent = models.BooleanField(default=False) 

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "event"],
                name="unique_saved_event",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.event.title}"


class Interest(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    keywords = models.CharField(
        max_length=500,
        blank=True,
        help_text="Tagovi/kategorije (iz Event.tags/category) odvojeni zarezom koje ovaj interes pokriva",
    )

    def __str__(self):
        return self.name


class UserInterest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="interests")
    interest = models.ForeignKey(Interest, on_delete=models.CASCADE, related_name="users")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "interest"], name="unique_user_interest")
        ]

    def __str__(self):
        return f"{self.user.username} - {self.interest.name}"