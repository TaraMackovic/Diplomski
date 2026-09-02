import os
import pickle
import numpy as np
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from events.models import Event, SavedEvent, UserInterest

CACHE_DIR = os.path.join(settings.BASE_DIR, "events", "ml_cache")
MATRIX_PATH = os.path.join(CACHE_DIR, "tfidf_matrix.pkl")
VECTORIZER_PATH = os.path.join(CACHE_DIR, "vectorizer.pkl")
INDICES_PATH = os.path.join(CACHE_DIR, "indices.pkl")

RECENCY_HALF_LIFE_DAYS = 120.0     
INTEREST_WEIGHT = 0.25        
DESCRIPTION_MAX_CHARS = 500
CATEGORY_WEIGHT = 0.3       


def create_event_soup(event):
    tags = (event.tags or "").replace(",", " ")
    category = event.category.name if event.category else ""
    title = event.title or ""
    description = (event.description or "")[:DESCRIPTION_MAX_CHARS]
    location = event.location or ""

    return " ".join([
        tags, tags, tags,
        category, category, category,
        title, title,
        location,
        description,
    ]).lower()


def _load_all_events():
    return list(Event.objects.select_related("category"))


def build_similarity_matrix():
    events = _load_all_events()
    soups = [create_event_soup(e) for e in events]

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.9,
        sublinear_tf=True,
    )
    tfidf_matrix = vectorizer.fit_transform(soups)

    indices = {event.id: idx for idx, event in enumerate(events)}
    reverse_indices = {idx: event.id for idx, event in enumerate(events)}

    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(MATRIX_PATH, "wb") as f:
        pickle.dump(tfidf_matrix, f)
    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(vectorizer, f)
    with open(INDICES_PATH, "wb") as f:
        pickle.dump({"indices": indices, "reverse": reverse_indices}, f)

    return tfidf_matrix, vectorizer, {"indices": indices, "reverse": reverse_indices}


def load_similarity_matrix():
    if not (
        os.path.exists(MATRIX_PATH)
        and os.path.exists(VECTORIZER_PATH)
        and os.path.exists(INDICES_PATH)
    ):
        return build_similarity_matrix()

    with open(MATRIX_PATH, "rb") as f:
        tfidf_matrix = pickle.load(f)
    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)
    with open(INDICES_PATH, "rb") as f:
        data = pickle.load(f)

    return tfidf_matrix, vectorizer, data


def get_similar_events(event_id, top_n=10):
    tfidf_matrix, vectorizer, data = load_similarity_matrix()
    indices = data["indices"]
    reverse = data["reverse"]

    if event_id not in indices:
        return []

    idx = indices[event_id]
    sims = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    sim_scores = sorted(enumerate(sims), key=lambda x: x[1], reverse=True)
    sim_scores = [s for s in sim_scores if s[0] != idx][:top_n]

    event_ids = [reverse[i] for i, _ in sim_scores]
    return Event.objects.filter(id__in=event_ids)


def get_interest_keywords_for_user(user):
    user_interests = UserInterest.objects.filter(user=user).select_related("interest")
    keywords = set()
    for ui in user_interests:
        for kw in ui.interest.keywords.split(","):
            kw = kw.strip().lower()
            if kw:
                keywords.add(kw)
    return keywords


def build_user_profile_vector(
    user,
    vectorizer,
    indices,
    tfidf_matrix,
    saved_event_rows=None,
    reference_date=None,
):
    if saved_event_rows is None:
        saved_event_rows = list(
            SavedEvent.objects.filter(user=user)
            .select_related("event")
            .values_list("event_id", "event__date")
        )

    if reference_date is None:
        reference_date = timezone.now()

    rows, weights = [], []
    for event_id, event_date in saved_event_rows:
        if event_id not in indices or event_date is None:
            continue
        days_ago = max((reference_date - event_date).days, 0)
        recency_weight = 0.5 ** (days_ago / RECENCY_HALF_LIFE_DAYS)
        rows.append(indices[event_id])
        weights.append(recency_weight)

    history_vector = None
    if rows:
        weights_arr = np.array(weights).reshape(-1, 1)
        weights_arr = weights_arr / weights_arr.sum()
        sub_matrix = tfidf_matrix[rows]
        history_vector = np.asarray(sub_matrix.multiply(weights_arr).sum(axis=0))

    keywords = get_interest_keywords_for_user(user)
    interest_vector = None
    if keywords:
        interest_vector = vectorizer.transform([" ".join(keywords)]).toarray()

    if history_vector is not None and interest_vector is not None:
        profile = (
            (1 - INTEREST_WEIGHT) * history_vector
            + INTEREST_WEIGHT * interest_vector
        )
    elif history_vector is not None:
        profile = history_vector
    elif interest_vector is not None:
        profile = interest_vector
    else:
        return None

    norm = np.linalg.norm(profile)
    if norm > 0:
        profile = profile / norm

    return profile


def build_user_category_weights(saved_event_rows, reference_date):
    weights = {}
    for _, event_date, category_id in saved_event_rows:
        if category_id is None or event_date is None:
            continue
        days_ago = max((reference_date - event_date).days, 0)
        w = 0.5 ** (days_ago / RECENCY_HALF_LIFE_DAYS)
        weights[category_id] = weights.get(category_id, 0.0) + w

    total = sum(weights.values())
    if total > 0:
        weights = {cid: w / total for cid, w in weights.items()}
    return weights


def score_candidates(profile, tfidf_matrix, candidate_rows, candidate_category_ids, category_weights):
    content_sims = cosine_similarity(profile, tfidf_matrix[candidate_rows]).flatten()
    category_scores = np.array([
        category_weights.get(cid, 0.0) for cid in candidate_category_ids
    ])
    beta = CATEGORY_WEIGHT
    return (1 - beta) * content_sims + beta * category_scores


def event_matches_keywords(event, keywords):
    if not keywords:
        return False
    text = f"{event.tags} {event.category.name if event.category else ''}".lower()
    return any(kw in text for kw in keywords)


def get_cold_start_recommendations(user=None, top_n=10):
    now = timezone.now()

    qs = Event.objects.select_related("category").filter(
        status="active",
        date__gte=now,
        date__lte=now + timedelta(days=30),
    )

    events = list(qs)
    if not events:
        events = list(
            Event.objects.select_related("category").filter(status="active", date__gte=now)[:50]
        )

    if not events:
        return []

    keywords = get_interest_keywords_for_user(user) if user else set()

    def weight_for(e):
        days_until = max((e.date - now).days, 1)
        date_weight = 1 / days_until
        interest_boost = 3.0 if event_matches_keywords(e, keywords) else 1.0
        return date_weight * interest_boost

    weights = np.array([weight_for(e) for e in events])

    n = min(top_n, len(events))
    chosen_idx = np.argsort(-weights)[:n]
    return [events[i] for i in chosen_idx]


def get_recommendations_for_user(user, top_n=10, exclude_ids=None):
    saved_rows = list(
        SavedEvent.objects.filter(user=user)
        .select_related("event")
        .values_list("event_id", "event__date", "event__category_id")
    )
    saved_ids = {r[0] for r in saved_rows}
    has_interests = bool(get_interest_keywords_for_user(user))

    if not saved_ids and not has_interests:
        return get_cold_start_recommendations(user=user, top_n=top_n)

    tfidf_matrix, vectorizer, data = load_similarity_matrix()
    indices = data["indices"]

    profile = build_user_profile_vector(user, vectorizer, indices, tfidf_matrix)
    if profile is None:
        return get_cold_start_recommendations(user=user, top_n=top_n)

    now = timezone.now()
    category_weights = build_user_category_weights(saved_rows, reference_date=now)

    exclude_ids = set(exclude_ids or []) | saved_ids

    candidate_qs = Event.objects.filter(status="active", date__gte=now).select_related("category")
    candidates = [e for e in candidate_qs if e.id in indices and e.id not in exclude_ids]
    if not candidates:
        return []

    candidate_ids = [e.id for e in candidates]
    candidate_rows = [indices[cid] for cid in candidate_ids]
    candidate_category_ids = [e.category_id for e in candidates]

    scores = score_candidates(
        profile, tfidf_matrix, candidate_rows, candidate_category_ids, category_weights
    )

    ranked = sorted(zip(candidate_ids, scores), key=lambda x: x[1], reverse=True)[:top_n]
    event_ids = [eid for eid, _ in ranked]

    events_by_id = {e.id: e for e in Event.objects.filter(id__in=event_ids)}
    return [events_by_id[eid] for eid in event_ids if eid in events_by_id]