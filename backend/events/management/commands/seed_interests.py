from django.core.management.base import BaseCommand
from django.utils.text import slugify
from events.models import Interest

DEFAULT_INTERESTS = [
    ("Muzika", "koncert, rok, pop, narodna, elektronska, jazz, klasicna-muzika, hip-hop"),
    ("Film", "film"),
    ("Festival", "festival"),
    ("Porodica", "za-djecu, porodicni"),
    ("Sport", "sport"),
    ("Pozorište", "predstava, kultura"),
    ("Priroda", "na-otvorenom"),
    ("Umjetnost", "izlozba"),
    ("Noćni život", "zurka, klub"),
    ("Radionice", "radionica, promocija"),
    ("Auto-moto", "auto-moto"),
]


class Command(BaseCommand):

    def handle(self, *args, **options):
        for name, keywords in DEFAULT_INTERESTS:
            interest, created = Interest.objects.update_or_create(
                name=name,
                defaults={"slug": slugify(name), "keywords": keywords},
            )
            self.stdout.write(f"{name}: {'kreiran' if created else 'ažuriran'}")
        self.stdout.write(self.style.SUCCESS("Gotovo."))