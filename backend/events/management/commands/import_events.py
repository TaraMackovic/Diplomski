import json
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from events.models import Category, Event, EventSource


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("json_file")

    def handle(self, *args, **options):

        with open(options["json_file"], encoding="utf-8") as f:
            events = json.load(f)

        created = 0
        updated = 0
        skipped_finished = 0

        for data in events:

            category = None
            category_name = data.get("category")
            if category_name:
                category, _ = Category.objects.get_or_create(name=category_name)

            raw_dt = parse_datetime(data["date"])
            if raw_dt and timezone.is_naive(raw_dt):
                raw_dt = timezone.make_aware(raw_dt, timezone.get_current_timezone())

            sources = data.get("sources")
            if not sources and data.get("source_url"):
                sources = [{
                    "source": data.get("source", ""),
                    "source_url": data.get("source_url"),
                }]
            sources = sources or []

            existing_event = None
            source_urls = [s["source_url"] for s in sources if s.get("source_url")]
            if source_urls:
                existing_source = (
                    EventSource.objects
                    .filter(source_url__in=source_urls)
                    .select_related("event")
                    .first()
                )
                if existing_source:
                    existing_event = existing_source.event

            if existing_event is None:
                existing_event = Event.objects.filter(
                    title=data["title"],
                    date=raw_dt,
                    location=data["location"],
                ).first()

            defaults = {
                "title": data["title"],
                "description": data.get("description", ""),
                "location": data["location"],
                "date": raw_dt,
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "image": data.get("image", ""),
                "price": Decimal(str(data.get("price", 0))),
                "category": category,
                "time_known": data.get("time_known", True),
                "tags": ", ".join(data.get("tags", [])),
            }

            if existing_event:
                if existing_event.status in ("finished", "cancelled"):
                    skipped_finished += 1
                else:
                    for field, value in defaults.items():
                        setattr(existing_event, field, value)
                    existing_event.save()
                    updated += 1
                event = existing_event
            else:
                event = Event.objects.create(**defaults)
                created += 1

            for source in sources:
                EventSource.objects.get_or_create(
                    event=event,
                    source_url=source["source_url"],
                    defaults={"source": source.get("source", "")},
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Created: {created}, Updated: {updated}, "
                f"Preskočeno (finished/cancelled): {skipped_finished}"
            )
        )