import json
import hashlib
from decimal import Decimal
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from events.models import Category, Event, EventSource

UPLOAD_DIR = "events_images"
MAX_SIZE = 10 * 1024 * 1024
TIMEOUT = 20
HEADERS = {
    "User-Agent": (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/,/*;q=0.8",
}

def detect_image_type(data: bytes):
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "gif", "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp", "image/webp"
    return None

def download(url: str) -> bytes:
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    attempts = [HEADERS, {**HEADERS, "Referer": referer}]

    for headers in attempts:
        with requests.get(url, headers=headers, timeout=TIMEOUT, stream=True) as resp:
            if resp.status_code in (401, 403):
                continue
            resp.raise_for_status()

            data = bytearray()
            for chunk in resp.iter_content(64 * 1024):
                data.extend(chunk)
                if len(data) > MAX_SIZE:
                    raise ValueError("slika je veca od 10 MB")
            return bytes(data)

    raise ValueError("download blokiran (HTTP 401/403)")

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("json_file")

    def handle(self, *args, **options):

        with open(options["json_file"], encoding="utf-8") as f:
            events = json.load(f)

        created = 0
        updated = 0
        skipped_finished = 0
        media_url = settings.MEDIA_URL

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

            image_url = data.get("image", "")

            if existing_event and existing_event.image:
                image_url = existing_event.image
            elif image_url and image_url.startswith(("http://", "https://")):
                if not image_url.startswith(media_url):
                    try:
                        image_data = download(image_url)
                        detected = detect_image_type(image_data)

                        if detected:
                            ext, content_type = detected
                            event_id = existing_event.id if existing_event else None

                            if event_id:
                                digest = hashlib.sha1(image_url.encode()).hexdigest()[:8]
                                name = f"{UPLOAD_DIR}/event_{event_id}_{digest}.{ext}"

                                file = ContentFile(image_data)
                                file.content_type = content_type

                                saved_name = default_storage.save(name, file)
                                image_url = f"{media_url}{saved_name}"

                                self.stdout.write(self.style.SUCCESS(
                                    f"Slika za #{event_id} prebačena -> {saved_name}"
                                ))
                        else:
                            self.stdout.write(self.style.WARNING(
                                f"Slika nije podržana za: {data['title']}"
                            ))

                    except Exception as exc:
                        self.stdout.write(self.style.WARNING(
                            f"Slika nije prebacena za '{data['title']}': {exc}"
                        ))

            defaults = {
                "title": data["title"],
                "description": data.get("description", ""),
                "location": data["location"],
                "date": raw_dt,
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                #"image": image_url,
                "price": Decimal(str(data.get("price", 0))),
                "category": category,
                "time_known": data.get("time_known", True),
                "tags": ", ".join(data.get("tags", [])),
            }

            if existing_event:
                if existing_event.status in ("finished", "cancelled"):
                    skipped_finished += 1
                    event = existing_event
                else:
                    for field, value in defaults.items():
                        setattr(existing_event, field, value)
                    existing_event.save()
                    updated += 1
                    event = existing_event
            else:
                event = Event.objects.create(**defaults, image="")
                created += 1


            raw_image_url = data.get("image", "")

            if event.image:
                pass  
            elif raw_image_url and raw_image_url.startswith(("http://", "https://")):
                if not raw_image_url.startswith(media_url):
                    try:
                        image_data = download(raw_image_url)
                        detected = detect_image_type(image_data)
                        if detected:
                            ext, content_type = detected
                            digest = hashlib.sha1(raw_image_url.encode()).hexdigest()[:8]
                            name = f"{UPLOAD_DIR}/event_{event.id}_{digest}.{ext}"
                            file = ContentFile(image_data)
                            file.content_type = content_type
                            saved_name = default_storage.save(name, file)
                            event.image = f"{media_url}{saved_name}"
                            event.save(update_fields=["image"])
                            self.stdout.write(self.style.SUCCESS(
                                f"Slika za #{event.id} prebacena -> {saved_name}"
                            ))
                        else:
                            self.stdout.write(self.style.WARNING(
                                f"Slika nije podrzana za: {data['title']}"
                            ))
                    except Exception as exc:
                        self.stdout.write(self.style.WARNING(
                            f"Slika nije prebacena za '{data['title']}': {exc}"
                        ))
                else:
                    event.image = raw_image_url
                    event.save(update_fields=["image"])

            for source in sources:
                EventSource.objects.get_or_create(
                    event=event,
                    source_url=source["source_url"],
                    defaults={"source": source.get("source", "")},
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Created: {created}, Updated: {updated}, "
                f"Preskoceno (finished/cancelled): {skipped_finished}"
            )
        )