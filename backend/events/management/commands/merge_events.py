from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path

import json
import re
import unicodedata
import difflib
import math
from datetime import datetime

DATA_DIR = Path(settings.BASE_DIR) / "data"

SOURCE_FILES = [
    DATA_DIR / "gigstix.json",
    DATA_DIR / "banjaluka_city.json",
    DATA_DIR / "ulaznice.json",
    DATA_DIR / "banjaluka_najave.json",
]

SOURCE_PRIORITY = {
    "Ulaznice.org": 3,
    "Gigstix.ba": 3,
    "banjalukacity.info": 2,
    "banjaluka.com": 1,
}

#  1. UCITAVANJE 
################

def load_all():
    records = []

    for filepath in SOURCE_FILES:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)

        for r in data:
            r["_origin_file"] = filepath.name
            records.append(r)

    return records


# 2. CISCENJE OPISA 
###################

def dedupe_description(desc: str) -> str:
    if not desc:
        return desc
    desc = desc.strip()
    n = len(desc)
    half = n // 2
    for split in (half, half + 1, half - 1):
        if split <= 0 or split >= n:
            continue
        first, second = desc[:split].strip(), desc[split:].strip()
        if not first or not second:
            continue
        ratio = difflib.SequenceMatcher(None, first, second).ratio()
        if ratio > 0.9:
            return first
    return desc


# 3. NORMALIZACIJA TEKSTA ZA POREDJENJE 
#######################################

STOPWORDS = {
    "koncert", "koncerti", "banja", "luka", "banjaluka", "banjaluci",
    "banjalucka", "banjaluku", "tvrdjava", "tvrdava", "kastel", "2026",
    "najava", "najave", "manifestacija", "festival", "dogadjaj", "u", "na",
    "i", "za", "sa", "s",
}

def strip_diacritics(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = (s.replace("đ", "dj").replace("Đ", "Dj")
           .replace("š", "s").replace("Š", "S")
           .replace("č", "c").replace("Č", "C")
           .replace("ć", "c").replace("Ć", "C")
           .replace("ž", "z").replace("Ž", "Z"))
    return s

def clean_tokens(title: str) -> str:
    t = strip_diacritics(title).lower()
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    tokens = [w for w in t.split() if w and w not in STOPWORDS]
    return " ".join(tokens)

def normalize_title(title: str) -> set:
    return set(clean_tokens(title).split())

def title_similarity(a: str, b: str) -> float:
    ta, tb = normalize_title(a), normalize_title(b)
    if not ta or not tb:
        return 0.0
    overlap = len(ta & tb) / min(len(ta), len(tb))
    raw_ratio = difflib.SequenceMatcher(None, clean_tokens(a), clean_tokens(b)).ratio()
    return max(overlap, raw_ratio)


# 4. GEO DISTANCA 
#################

def haversine_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 0
    r = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# 5. KATEGORIJA 
###############

CATEGORY_RULES = [
    ("auto-moto", ["automobil", "sport car", "luxury", "vespa", "moto klub",
                   "trening bezbjedne voznje", "motociklist"]),
    ("sport", ["sportsko ljeto", "kosarka", "odbojka", "rukomet", "fudbal",
               "kajak", "boks", "obaranje ruke", "sportska arena"]),
    ("saobracaj-obavjestenje", ["izmjene u saobracaju", "obustava saobracaja",
                                 "skokovi sa gradskog mosta"]),
    ("festival", ["fest ", "festival", "rock fest", "vikend fest"]),
    ("kultura", ["predstava", "pozoriste", "kocicev zbor", "knjizev",
                 "izlozba", "akademija"]),
    ("koncert", ["koncert", "muzick", "pjevac", "pjevacica", "nastup",
                 "muzika", "singer", "bend", "orkestar"]),
]

def classify_category(title, description, source_category):
    text = strip_diacritics(f"{title} {description}").lower()
    for canon, keywords in CATEGORY_RULES:
        for kw in keywords:
            if strip_diacritics(kw).lower() in text:
                return canon
    sc = (source_category or "").lower()
    if "sport" in sc:
        return "sport"
    if "drustvo" in strip_diacritics(sc):
        return "ostalo"
    if "muzik" in sc or "koncert" in sc:
        return "koncert"
    if "kultura" in sc:
        return "kultura"
    if "festival" in sc:
        return "festival"
    return "ostalo"

# 5.5 TAGOVI (finija granulacija unutar kategorije)
##################################################

TAG_RULES = [
    ("rok", ["rock", "rok koncert", "rock bend"]),
    ("pop", ["pop muzika", "pop koncert"]),
    ("narodna", ["narodna muzika", "izvorna muzika", "folk"]),
    ("elektronska", ["dj set", "electronic", "elektronska muzika", "tehno", "techno", "house muzika"]),
    ("jazz", ["jazz", "džez"]),
    ("klasicna-muzika", ["klasicna muzika", "simfonijski", "filharmonija", "orkestar"]),
    ("hip-hop", ["hip hop", "hip-hop", "trep", "trap"]),

    ("zurka", ["zurka", "party", "noc", "klub"]),
    ("stand-up", ["stand up", "stand-up", "komedija"]),
    ("izlozba", ["izlozba", "galerija"]),
    ("predstava", ["predstava", "pozoriste", "monodrama"]),
    ("sajam", ["sajam", "vasar"]),
    ("radionica", ["radionica", "workshop"]),
    ("promocija", ["promocija knjige", "knjizevna vece"]),

    ("na-otvorenom", ["na otvorenom", "open air", "tvrdjava kastel", "gradski park"]),
    ("za-djecu", ["za djecu", "djecija predstava", "porodicni"]),
    ("besplatno", ["besplatan ulaz", "ulaz slobodan", "besplatna ulaznica"]),
]


def extract_tags(title, description, category):
    text = strip_diacritics(f"{title} {description}").lower()

    tags = set()
    for tag, keywords in TAG_RULES:
        for kw in keywords:
            if strip_diacritics(kw).lower() in text:
                tags.add(tag)
                break

    # kategorija sama po sebi je koristan tag za soup u recommendations.py
    if category:
        tags.add(category)

    return sorted(tags)

# 6. PRIPREMA ZAPISA 
####################

def prepare(records):
    prepped = []
    for r in records:
        try:
            dt = datetime.fromisoformat(r["date"])
        except Exception:
            dt = None
        desc = dedupe_description(r.get("description", ""))
        time_known = bool(dt) and not (dt.hour == 0 and dt.minute == 0 and dt.second == 0)

        title = r.get("title", "").strip()
        category = classify_category(title, desc, r.get("category", ""))
        tags = extract_tags(title, desc, category)  # <-- dodato

        prepped.append({
            "title": title,
            "description": desc,
            "location": r.get("location", "").strip(),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "date": dt,
            "time_known": time_known,
            "image": r.get("image"),
            "price": r.get("price") or 0,
            "source": r.get("source"),
            "source_url": r.get("source_url"),
            "category": category,
            "tags": tags,
        })
    return prepped


# 7. GRUPISANJE 
###############

TITLE_SIM_THRESHOLD = 0.6       
GEO_KM_THRESHOLD = 15              
MAX_DAY_GAP = 1  
MAX_DAY_GAP_END = 5

def allowed_day_gap(dist_km):
    if dist_km <= GEO_KM_THRESHOLD:
        return MAX_DAY_GAP_END
    return MAX_DAY_GAP

def cluster(records):
    clusters = []
    for rec in records:
        if rec["date"] is None:
            clusters.append({"members": [rec]})
            continue
        placed = False
        for c in clusters:
            for m in c["members"]:
                if m["date"] is None:
                    continue

                dist = haversine_km(rec["latitude"], rec["longitude"], m["latitude"], m["longitude"])
                day_gap = abs((rec["date"].date() - m["date"].date()).days)

                same_datetime = rec["date"] == m["date"]
                same_location = dist <= 0.5
                if same_datetime and same_location:
                    c["members"].append(rec)
                    placed = True
                    break

                if day_gap > allowed_day_gap(dist):
                    continue

                sim = title_similarity(rec["title"], m["title"])
                if sim >= TITLE_SIM_THRESHOLD and dist <= GEO_KM_THRESHOLD:
                    c["members"].append(rec)
                    placed = True
                    break

            if placed:
                break
        if not placed:
            clusters.append({"members": [rec]})
    return clusters


# 8. SPAJANJE GRUPE U JEDAN ZAPIS
#################################

def merge_cluster(members):
    def rank(m):
        return (-SOURCE_PRIORITY.get(m["source"], 0),)

    def title_score(m):
        return (SOURCE_PRIORITY.get(m["source"], 0), len(m["title"]))
    best_title = max(members, key=title_score)["title"]

    def desc_score(m):
        return (SOURCE_PRIORITY.get(m["source"], 0), len(m["description"] or ""))
    best_desc = max(members, key=desc_score)["description"]

    dated = [m for m in members if m["date"] is not None]
    time_known_members = [m for m in dated if m["time_known"]]
    if time_known_members:
        chosen = max(time_known_members, key=lambda m: SOURCE_PRIORITY.get(m["source"], 0))
    elif dated:
        chosen = dated[0]
    else:
        chosen = members[0]
    final_date = chosen["date"]

    best_loc_member = max(members, key=lambda m: (SOURCE_PRIORITY.get(m["source"], 0), len(m["location"] or "")))
    location = best_loc_member["location"]
    lat = best_loc_member["latitude"]
    lon = best_loc_member["longitude"]

    priced = [m["price"] for m in members if m["price"]]
    price = max(priced) if priced else 0

    cats = [m["category"] for m in members]
    category = max(set(cats), key=cats.count)

    all_tags = set()
    for m in members:
        all_tags.update(m.get("tags", []))
    tags = sorted(all_tags)

    images = [m["image"] for m in members if m.get("image")]
    sources = [{"source": m["source"], "source_url": m["source_url"]} for m in members]


    images = [m["image"] for m in members if m.get("image")]
    sources = [{"source": m["source"], "source_url": m["source_url"]} for m in members]

    distinct_dates = {m["date"].date() for m in dated} if dated else set()
    distinct_times = {m["date"] for m in time_known_members} if time_known_members else set()
    had_conflict = len(distinct_dates) > 1 or len(distinct_times) > 1

    return {
        "title": best_title,
        "description": best_desc,
        "category": category,
        "tags": tags,
        "location": location,
        "latitude": lat,
        "longitude": lon,
        "date": final_date.isoformat() if final_date else None,
        "price": price,
        "image": images[0] if images else None,
        "images_all": images,
        "sources": sources,
        "duplicate_count": len(members),
        "had_auto_resolved_conflict": had_conflict,  
        "time_known": bool(time_known_members),
    }


def main():
    raw = load_all()
    prepped = prepare(raw)
    clusters = cluster(prepped)
    merged = [merge_cluster(c["members"]) for c in clusters]
    merged.sort(key=lambda e: (e["date"] is None, e["date"] or ""))

    output_file = DATA_DIR / "merged_events.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"Ucitano zapisa: {len(raw)}")
    print(f"Finalnih eventa: {len(merged)}")
    multi = [e for e in merged if len(e["sources"]) > 1]
    for e in multi:
        srcs = ", ".join(s["source"] for s in e["sources"])
        flag = " [auto-resolved konflikt datuma/vremena]" if e["had_auto_resolved_conflict"] else ""
        #print(f"   - {e['title']}  [{e['date']}]  <- {srcs}{flag}")


class Command(BaseCommand):
    help = "Spaja rezultate scrapera u jedan merged_events.json"

    def handle(self, *args, **options):
        main()
