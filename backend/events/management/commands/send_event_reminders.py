from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from events.models import SavedEvent
from events.emails import send_event_reminder_email


class Command(BaseCommand):
    help = "Šalje email podsjetnike za sačuvane događaje koji se održavaju za 3 dana ili manje."

    def handle(self, *args, **options):
        today = timezone.localdate()
        cutoff_date = today + timedelta(days=3)

        saved_events = SavedEvent.objects.filter(
            reminder_sent=False,
            event__date__date__gte=today,
            event__date__date__lte=cutoff_date,
            event__status="active",
        ).select_related("event", "user__profile")
        for saved in saved_events:
            profile = getattr(saved.user, "profile", None)

            if profile and not profile.email_notifications:
                continue
            if not saved.user.email:
                continue

            try:
                send_event_reminder_email(saved.user, saved.event)
                saved.reminder_sent = True
                saved.save(update_fields=["reminder_sent"])
                self.stdout.write(f"  POSLATO: {saved.user.username} -> {saved.event.title}")
            except Exception as e:
                self.stderr.write(f"  GREŠKA za {saved.user.username}: {e}")
