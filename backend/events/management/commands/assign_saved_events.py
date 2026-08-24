import random

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from events.models import Event, SavedEvent, Interest

RANDOM_SEED = 42
N_TIME_GROUPS = 5

USER_PROFILES = {
    "user1": {
        "categories": ["koncert", "festival"],
        "tag_pattern": r"(rok|pop|narodna|elektronska|jazz|klasicna-muzika|hip-hop)",
        "interests": ["Muzika", "Festival"],
        "n_saved": 300,
        "noise_fraction": 0.0,
    },
    "user2": {
        "categories": ["sport", "auto-moto"],
        "tag_pattern": None,
        "interests": ["Sport", "Auto-moto"],
        "n_saved": 150,
        "noise_fraction": 0.0,
    },
    "user3": {
        "categories": ["kultura"],
        "tag_pattern": r"(predstava|izlozba|promocija)",
        "interests": ["Pozorište", "Umjetnost"],
        "n_saved": 250,
        "noise_fraction": 0.0,
    },
    "user4": {
        "categories": ["koncert", "sport", "kultura", "festival"],
        "tag_pattern": None,
        "interests": ["Muzika", "Sport", "Pozorište"],
        "n_saved": 200,
        "noise_fraction": 0.3,
    },
    "user5": {
        "categories": ["sport"],
        "tag_pattern": None,
        "interests": ["Sport"],
        "n_saved": 180,
        "noise_fraction": 0.5,
    },
    "user6": {
        "categories": ["auto-moto"],
        "tag_pattern": None,
        "interests": ["Auto-moto"],
        "n_saved": 15,
        "noise_fraction": 0.0,
    },
    "user7": {
        "categories": [
            "koncert", "kultura", "festival", "sport",
            "auto-moto", "ostalo", "saobracaj-obavjestenje",
        ],
        "tag_pattern": None,
        "interests": [],
        "n_saved": 150,
        "noise_fraction": 0.0,
    },
    "user8": {
        "categories": [],
        "tag_pattern": r"(za-djecu|na-otvorenom)",
        "interests": ["Porodica", "Priroda"],
        "n_saved": 60,
        "noise_fraction": 0.1,
    },
}


def stratified_sample(events, n, seed=RANDOM_SEED):
    events = sorted(events, key=lambda e: e.date)
    if not events:
        return []

    n = min(n, len(events))
    if n == len(events):
        return events

    rng = random.Random(seed)
    first_date, last_date = events[0].date, events[-1].date
    total_seconds = (last_date - first_date).total_seconds()

    if total_seconds <= 0:
        return rng.sample(events, n)

    groups = [[] for _ in range(N_TIME_GROUPS)]
    for event in events:
        position = (event.date - first_date).total_seconds() / total_seconds
        group_index = min(int(position * N_TIME_GROUPS), N_TIME_GROUPS - 1)
        groups[group_index].append(event)

    base_count, _ = divmod(n, N_TIME_GROUPS)
    sampled = []
    for group in groups:
        take = min(base_count, len(group))
        if take:
            sampled.extend(rng.sample(group, take))

    remaining_needed = n - len(sampled)
    if remaining_needed > 0:
        leftover = sorted(
            (e for group in groups for e in group if e not in sampled),
            key=lambda e: e.date,
        )
        extra = min(remaining_needed, len(leftover))
        sampled.extend(rng.sample(leftover, extra))

    rng.shuffle(sampled)
    return sampled[:n]


def build_pool(historical, categories, tag_pattern, noise_fraction, seed=RANDOM_SEED):
    if categories:
        pool_qs = historical.filter(category__name__in=categories)
    else:
        pool_qs = historical.none()

    if tag_pattern:
        pool_qs = pool_qs | historical.filter(tags__iregex=tag_pattern)

    pool = list(pool_qs.distinct())

    if noise_fraction > 0:
        rng = random.Random(seed + 1)
        pool_ids = {e.id for e in pool}
        rest_qs = historical.exclude(id__in=pool_ids)
        rest_ids = list(rest_qs.values_list("id", flat=True))

        n_noise = int(len(pool) * noise_fraction / max(1 - noise_fraction, 0.01))
        n_noise = min(n_noise, len(rest_ids))
        noise_ids = rng.sample(rest_ids, n_noise) if n_noise else []

        if noise_ids:
            pool.extend(Event.objects.filter(id__in=noise_ids).select_related("category"))

    return pool


class Command(BaseCommand):

    def handle(self, *args, **options):
        now = timezone.now()
        historical = Event.objects.filter(date__lt=now).select_related("category")

        for username, profile in USER_PROFILES.items():
            user = User.objects.get(username=username)
            pool = build_pool(
                historical,
                profile["categories"],
                profile["tag_pattern"],
                profile["noise_fraction"],
            )
            sample = stratified_sample(pool, profile["n_saved"])

            created = sum(
                SavedEvent.objects.get_or_create(user=user, event=event)[1]
                for event in sample
            )

            dates = sorted(e.date for e in sample)
            date_range = f"{dates[0].date()} -> {dates[-1].date()}" if dates else "N/A"
            self.stdout.write(self.style.SUCCESS(
                f"{username}: {created} novih SavedEvent zapisa "
                f"(pool={len(pool)}, uzorak={len(sample)}, raspon: {date_range})"
            ))

            for name in profile["interests"]:
                try:
                    interest = Interest.objects.get(name=name)
                    user.interests.get_or_create(interest=interest)
                except Interest.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"Interes '{name}' ne postoji."))

        self.stdout.write(self.style.SUCCESS("Podaci uspješno dodani."))