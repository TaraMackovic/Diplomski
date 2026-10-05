from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from events.models import Event


class Command(BaseCommand):

    def handle(self, *args, **options):
        now = timezone.now()
        today = timezone.localdate()

        active = Event.objects.exclude(status__in=["finished", "cancelled"])

        known = active.filter(time_known=True).filter(
            Q(end_date__lt=now)
            | Q(end_date__isnull=True, start_date__lt=now)
        )

        unknown = active.filter(time_known=False).filter(
            Q(end_date__date__lt=today)
            | Q(end_date__isnull=True, start_date__date__lt=today)
        )

        updated = known.update(status="finished") + unknown.update(status="finished")

        self.stdout.write(
            self.style.SUCCESS(f"Označeno kao finished: {updated} eventa")
        )