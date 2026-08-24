import math
from collections import Counter

import numpy as np
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

import events.recommendations as reco
from events.models import Event, SavedEvent

TOP_K_VALUES = [5, 10]
MIN_SAVED_EVENTS = 5
USERNAMES = ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8"]

CATEGORY_BONUS_GRID = [0.10, 0.15, 0.20, 0.25, 0.30]
RECENCY_HALF_LIFE_GRID = [60, 90, 120]
PRIMARY_METRIC = "ndcg.10"

METRIC_NAMES = [
    "precision", "recall", "f1", "hit_rate",
    "map", "ndcg",
]


def precision_at_k(ranked_ids, relevant_ids, k):
    return len(set(ranked_ids[:k]) & relevant_ids) / k


def recall_at_k(ranked_ids, relevant_ids, k):
    if not relevant_ids:
        return 0.0
    return len(set(ranked_ids[:k]) & relevant_ids) / len(relevant_ids)


def f1_at_k(precision, recall):
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def hit_rate_at_k(ranked_ids, relevant_ids, k):
    return 1.0 if set(ranked_ids[:k]) & relevant_ids else 0.0


def average_precision_at_k(ranked_ids, relevant_ids, k):
    if not relevant_ids:
        return 0.0
    hits, score = 0, 0.0
    for i, item in enumerate(ranked_ids[:k], start=1):
        if item in relevant_ids:
            hits += 1
            score += hits / i
    return score / min(len(relevant_ids), k)


def reciprocal_rank(ranked_ids, relevant_ids):
    for i, item in enumerate(ranked_ids, start=1):
        if item in relevant_ids:
            return 1.0 / i
    return 0.0


def ndcg_at_k(ranked_ids, relevant_ids, k):
    dcg = sum(
        1.0 / math.log2(i + 1)
        for i, item in enumerate(ranked_ids[:k], start=1)
        if item in relevant_ids
    )
    ideal_hits = min(len(relevant_ids), k)
    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, ideal_hits + 1))
    return dcg / idcg if idcg > 0 else 0.0


def split_user_events(user):
    saved_events = list(
        SavedEvent.objects
        .filter(user=user, event__date__lt=timezone.now())
        .select_related("event", "event__category")
        .order_by("event__date", "event_id")
    )
    if len(saved_events) < MIN_SAVED_EVENTS:
        return None
    split_index = int(len(saved_events) * 0.8)
    return saved_events[:split_index], saved_events[split_index:]


def build_splits(users):
    splits = {}
    global_test_ids = set()
    for user in users:
        split = split_user_events(user)
        if split is None:
            continue
        train_events, test_events = split
        splits[user.id] = (user, train_events, test_events)
        global_test_ids.update(se.event_id for se in test_events)
    return splits, global_test_ids


def evaluate_users(score_fn, indices, splits):
    results = {k: {m: [] for m in METRIC_NAMES} for k in TOP_K_VALUES}
    mrr_values = []
    per_user = []

    for user, train_events, test_events in splits.values():
        train_rows = [(se.event_id, se.event.date) for se in train_events if se.event_id in indices]
        train_category_rows = [
            (se.event_id, se.event.date, se.event.category_id)
            for se in train_events if se.event_id in indices
        ]
        train_ids = {eid for eid, _ in train_rows}
        test_ids = {se.event_id for se in test_events if se.event_id in indices}

        if not train_rows or not test_ids:
            continue

        reference_date = train_events[-1].event.date

        candidate_events = list(
            Event.objects
            .select_related("category")
            .filter(date__gte=reference_date)
            .exclude(id__in=train_ids)
            .order_by("date", "id")
        )
        candidate_events = [e for e in candidate_events if e.id in indices]
        if not candidate_events:
            continue

        scores = score_fn(user, train_rows, train_category_rows, reference_date, candidate_events)
        if scores is None:
            continue

        ranked = sorted(zip(candidate_events, scores), key=lambda x: (-x[1], x[0].id))
        ranked_ids = [event.id for event, _ in ranked]
        ranked_events = {event.id: event for event, _ in ranked}

        mrr = reciprocal_rank(ranked_ids, test_ids)
        mrr_values.append(mrr)

        user_row = {
            "username": user.username,
            "train_n": len(train_events),
            "test_n": len(test_events),
            "mrr": mrr,
        }

        for k in TOP_K_VALUES:
            precision = precision_at_k(ranked_ids, test_ids, k)
            recall = recall_at_k(ranked_ids, test_ids, k)
            f1 = f1_at_k(precision, recall)
            hit_rate = hit_rate_at_k(ranked_ids, test_ids, k)
            map_k = average_precision_at_k(ranked_ids, test_ids, k)
            ndcg = ndcg_at_k(ranked_ids, test_ids, k)

            results[k]["precision"].append(precision)
            results[k]["recall"].append(recall)
            results[k]["f1"].append(f1)
            results[k]["hit_rate"].append(hit_rate)
            results[k]["map"].append(map_k)
            results[k]["ndcg"].append(ndcg)

            user_row[f"precision.{k}"] = precision
            user_row[f"recall.{k}"] = recall
            user_row[f"ndcg.{k}"] = ndcg

        per_user.append(user_row)

    result = {
        "valid_users": len(per_user),
        "mrr": np.mean(mrr_values) if mrr_values else float("nan"),
        "mrr_std": np.std(mrr_values) if mrr_values else float("nan"),
        "per_user": per_user,
    }
    for k in TOP_K_VALUES:
        for metric in METRIC_NAMES:
            values = results[k][metric]
            result[f"{metric}.{k}"] = np.mean(values) if values else float("nan")
            result[f"{metric}.{k}_std"] = np.std(values) if values else float("nan")
    return result


def make_content_scorer(tfidf_matrix, vectorizer, indices):
    def score(user, train_rows, train_category_rows, reference_date, candidate_events):
        profile = reco.build_user_profile_vector(
            user, vectorizer, indices, tfidf_matrix,
            saved_event_rows=train_rows, reference_date=reference_date,
        )
        if profile is None:
            return None
        category_weights = reco.build_user_category_weights(train_category_rows, reference_date)
        candidate_rows = [indices[e.id] for e in candidate_events]
        candidate_category_ids = [e.category_id for e in candidate_events]
        return reco.score_candidates(profile, tfidf_matrix, candidate_rows, candidate_category_ids, category_weights)
    return score


def make_popularity_scorer(exclude_event_ids):
    counts = Counter(
        SavedEvent.objects
        .exclude(event_id__in=exclude_event_ids)
        .values_list("event_id", flat=True)
    )

    def score(user, train_rows, train_category_rows, reference_date, candidate_events):
        return np.array([counts.get(e.id, 0) for e in candidate_events], dtype=float)
    return score


def make_category_only_scorer():
    def score(user, train_rows, train_category_rows, reference_date, candidate_events):
        category_weights = reco.build_user_category_weights(train_category_rows, reference_date)
        return np.array([category_weights.get(e.category_id, 0.0) for e in candidate_events])
    return score


def evaluate_config(beta, half_life, indices, tfidf_matrix, vectorizer, splits):
    reco.CATEGORY_WEIGHT = beta
    reco.RECENCY_HALF_LIFE_DAYS = half_life
    return evaluate_users(make_content_scorer(tfidf_matrix, vectorizer, indices), indices, splits)


class Command(BaseCommand):
    help = "Grid-search, evaluacija i poređenje sa baseline modelima."

    def handle(self, *args, **options):
        original_beta = reco.CATEGORY_WEIGHT
        original_half_life = reco.RECENCY_HALF_LIFE_DAYS

        tfidf_matrix, vectorizer, data = reco.load_similarity_matrix()
        indices = data["indices"]

        users = list(User.objects.filter(username__in=USERNAMES))
        splits, global_test_ids = build_splits(users)

        self.stdout.write("")
        self.stdout.write("PARAMETRI:")
        self.stdout.write(f"CATEGORY_BONUS_WEIGHT: {CATEGORY_BONUS_GRID}")
        self.stdout.write(f"RECENCY_HALF_LIFE_DAYS: {RECENCY_HALF_LIFE_GRID}")
        self.stdout.write(f"Glavna metrika: {PRIMARY_METRIC}")
        self.stdout.write(f"Validnih korisnika u splitu: {len(splits)}")
        self.stdout.write("")

        rows = []
        try:
            for beta in CATEGORY_BONUS_GRID:
                for half_life in RECENCY_HALF_LIFE_GRID:
                    result = evaluate_config(beta, half_life, indices, tfidf_matrix, vectorizer, splits)
                    rows.append((beta, half_life, result))
        finally:
            reco.CATEGORY_WEIGHT = original_beta
            reco.RECENCY_HALF_LIFE_DAYS = original_half_life

        valid_rows = [r for r in rows if not np.isnan(r[2][PRIMARY_METRIC])]
        if not valid_rows:
            self.stdout.write(self.style.ERROR("Nema validnih rezultata."))
            return

        best_beta, best_half_life, best = max(valid_rows, key=lambda r: r[2][PRIMARY_METRIC])

        header = (
            f"{'beta':>6} {'half':>6} | {'P.5':>6} {'P.10':>6} | {'R.5':>6} {'R.10':>6} | "
            f"{'NDCG.5':>8} {'NDCG.10':>9} | {'MRR':>6} | STATUS"
        )
        self.stdout.write(header)
        self.stdout.write("-" * len(header))
        for beta, half_life, result in rows:
            marker = "NAJBOLJI" if (beta == best_beta and half_life == best_half_life) else ""
            self.stdout.write(
                f"{beta:>6.2f} {half_life:>6} | "
                f"{result['precision.5']:>6.3f} {result['precision.10']:>6.3f} | "
                f"{result['recall.5']:>6.3f} {result['recall.10']:>6.3f} | "
                f"{result['ndcg.5']:>8.3f} {result['ndcg.10']:>9.3f} | "
                f"{result['mrr']:>6.3f} | {marker}"
            )
        self.stdout.write("-" * len(header))
        self.stdout.write(
            f"Najbolji {PRIMARY_METRIC}: {best[PRIMARY_METRIC]:.3f} "
            f"(beta={best_beta}, half_life={best_half_life}, valid_users={best['valid_users']})"
        )

        self.stdout.write(
            f"NDCG.10: {best['ndcg.10']:.3f} ± {best['ndcg.10_std']:.3f}"
        )
        self.stdout.write(
            f"P.10:    {best['precision.10']:.3f} ± {best['precision.10_std']:.3f}"
        )
        self.stdout.write(
            f"R.10:    {best['recall.10']:.3f} ± {best['recall.10_std']:.3f}"
        )
        self.stdout.write(
            f"MRR:     {best['mrr']:.3f} ± {best['mrr_std']:.3f}"
        )

        self.stdout.write("")
        self.stdout.write("POREĐENJE SA DRUGIM MODELIMA")
        self.stdout.write("")
        reco.CATEGORY_WEIGHT = best_beta
        reco.RECENCY_HALF_LIFE_DAYS = best_half_life
        content_result = evaluate_users(make_content_scorer(tfidf_matrix, vectorizer, indices), indices, splits)
        reco.CATEGORY_WEIGHT = original_beta
        reco.RECENCY_HALF_LIFE_DAYS = original_half_life

        popularity_result = evaluate_users(make_popularity_scorer(global_test_ids), indices, splits)
        category_only_result = evaluate_users(make_category_only_scorer(), indices, splits)

        baseline_header = f"{'model':>20} | {'P.10':>6} | {'R.10':>6} | {'NDCG.10':>9} | {'MRR':>6}"
        self.stdout.write(baseline_header)
        self.stdout.write("-" * len(baseline_header))
        for name, result in [
            ("content + category", content_result),
            ("samo popularnost", popularity_result),
            ("samo kategorija", category_only_result),
        ]:
            self.stdout.write(
                f"{name:>20} | {result['precision.10']:>6.3f} | {result['recall.10']:>6.3f} | "
                f"{result['ndcg.10']:>9.3f} | {result['mrr']:>6.3f}"
            )

        self.stdout.write("")
        self.stdout.write(f"USER REZULTATI (beta={best_beta}, half_life={best_half_life})")
        self.stdout.write("")

        per_user_header = (
            f"{'username':>10} | {'train':>5} {'test':>5} | "
            f"{'P.5':>6} {'P.10':>6} | {'R5':>6} {'R10':>6} | "
            f"{'NDCG.5':>8} {'NDCG.10':>9} | {'MRR':>6}"
        )
        self.stdout.write(per_user_header)
        self.stdout.write("-" * len(per_user_header))
        for row in sorted(content_result["per_user"], key=lambda r: r["username"]):
            self.stdout.write(
                f"{row['username']:>10} | {row['train_n']:>5} {row['test_n']:>5} | "
                f"{row['precision.5']:>6.3f} {row['precision.10']:>6.3f} | "
                f"{row['recall.5']:>6.3f} {row['recall.10']:>6.3f} | "
                f"{row['ndcg.5']:>8.3f} {row['ndcg.10']:>9.3f} | "
                f"{row['mrr']:>6.3f}"
            )

        self.stdout.write("=" * 100)
        self.stdout.write(self.style.SUCCESS(
            f"Evaluacija završena. Izabrana konfiguracija: beta={best_beta}, half_life={best_half_life}."
        ))