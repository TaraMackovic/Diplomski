from django.core.management.base import BaseCommand
from django.utils import timezone

from events.models import Event


class Command(BaseCommand):

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()

        known = Event.objects.filter(
            time_known=True,
            date__lt=now,
        ).exclude(status__in=["finished", "cancelled"])

        unknown = Event.objects.filter(
            time_known=False,
            date__date__lt=today,
        ).exclude(status__in=["finished", "cancelled"])

        updated = known.update(status="finished") + unknown.update(status="finished")

        self.stdout.write(
            self.style.SUCCESS(f"Označeno kao finished: {updated} eventa")
        )