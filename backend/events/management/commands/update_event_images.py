import hashlib
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from events.models import Event

UPLOAD_DIR = "events_images"
MAX_SIZE = 20 * 1024 * 1024  # 10MB
TIMEOUT = 20  

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/*,*/*;q=0.8",
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
                    raise ValueError("slika je veća od 10 MB")
            return bytes(data)

    raise ValueError("download blokiran (HTTP 401/403)")


class Command(BaseCommand):
    help = "Prebacuje Event.image URL-ove u Supabase storage (images/events/) i bazu."

    def handle(self, *args, **options):

        media_url = settings.MEDIA_URL
        if not media_url or not media_url.startswith("http"):
            raise CommandError(
                f"MEDIA_URL nije ispravan ({media_url!r}). Provjeri SUPABASE_PROJECT_URL u .env."
            )

        events = list(Event.objects.order_by("id").values_list("id", "image"))
        total = len(events)

        uploaded = skipped = 0
        failed = []  

        for index, (event_id, image_url) in enumerate(events, start=1):
            label = f"[{index}/{total}] #{event_id}"

            if not image_url:
                skipped += 1
                self.stdout.write(f"{label} preskoceno (nema slike)")
                continue

            if image_url.startswith(media_url):
                skipped += 1
                self.stdout.write(f"{label} preskoceno (vec na Supabase-u)")
                continue

            if not image_url.startswith(("http://", "https://")):
                skipped += 1
                self.stdout.write(f"{label} preskoceno (neispravan URL: {image_url[:60]})")
                continue

            try:
                data = download(image_url)

                detected = detect_image_type(data)
                if not detected:
                    raise ValueError("odgovor nije podržana slika (jpg/png/gif/webp)")
                ext, content_type = detected

                digest = hashlib.sha1(image_url.encode()).hexdigest()[:8]
                name = f"{UPLOAD_DIR}/event_{event_id}_{digest}.{ext}"

                file = ContentFile(data)
                file.content_type = content_type

                saved_name = default_storage.save(name, file)
                new_url = f"{media_url}{saved_name}"

                Event.objects.filter(pk=event_id).update(image=new_url)

                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f"{label} prebaceno -> {saved_name}"))

            except Exception as exc:
                failed.append((event_id, image_url, str(exc)))
                self.stdout.write(self.style.ERROR(f"{label} NEUSPJESNO: {exc}"))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Gotovo. Prebaceno: {uploaded}")
            + f" | Preskoceno: {skipped} | "
            + (self.style.ERROR(f"Neuspješno: {len(failed)}") if failed else "Neuspjesno: 0")
        )

        if failed:
            self.stdout.write("\nNeuspjele slike (u bazi su ostale nepromijenjene):")
            for event_id, url, reason in failed:
                self.stdout.write(f"  #{event_id} {url}\n      -> {reason}")