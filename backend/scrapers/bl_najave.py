# 1. Biblioteke 
################

import os
import re
import json
import unicodedata

import requests
from bs4 import BeautifulSoup
from datetime import date, datetime, timedelta

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# 2. Konfiguracija
##################

BASE_URL = "https://www.banjaluka.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CATEGORIES = {
    "drustveni-dogadaji": "Društvo",
    "bioskop-i-pozoriste": "Pozorište",
    "kulturni-dogadaji": "Kultura",
    "koncerti-i-zurke": "Muzika",
    "sportski-dogadaji": "Sport",
}

GRACE_DAYS = 45

MAX_PAGES_PER_CATEGORY = 15

MONTHS_BS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "maj": 5, "jun": 6,
    "jul": 7, "avg": 8, "sep": 9, "okt": 10, "nov": 11, "dec": 12,
}

MONTH_WORD_PATTERN = (
    r"(januar\w*|februar\w*|mart\w*|april\w*|maj\w*|jun\w*|jul\w*|"
    r"avgust\w*|septembar\w*|septembr\w*|oktobar\w*|oktobr\w*|"
    r"novembar\w*|novembr\w*|decembar\w*|decembr\w*)"
)

EVENT_DATE_RE = re.compile(
    r"(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})?",
    re.IGNORECASE
)

# razdvajac u opsegu: "12. do 15. oktobra", "12. - 15. oktobra"
RANGE_SEP = r"(?:-|–|do)"

# "od 12. do 15. oktobra [2026]"  ->  dan1, dan2, mjesec, godina
RANGE_SAME_MONTH_RE = re.compile(
    r"(\d{1,2})\.\s*" + RANGE_SEP + r"\s*(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})?",
    re.IGNORECASE
)

# "od 28. septembra do 3. oktobra [2026]"  ->  dan1, mjesec1, godina1, dan2, mjesec2, godina2
RANGE_CROSS_MONTH_RE = re.compile(
    r"(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})?\.?\s*" + RANGE_SEP + r"\s*"
    r"(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})?",
    re.IGNORECASE
)

# "... i trajace do 20. septembra"  ->  dan, mjesec, godina
END_DO_RE = re.compile(
    r"\bdo\s+(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})?",
    re.IGNORECASE
)

# koliko znakova iza pocetnog datuma trazimo "do D. mjesec"
END_SEARCH_WINDOW = 250

EVENT_TIME_RE = re.compile(
    r"\b(?:u\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:časova|čas|sati|h\b)",
    re.IGNORECASE,
)

CARD_DATE_RE = re.compile(
    r"(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?\s*\|\s*(\d{1,2}):(\d{2})"
)

DETAIL_DATE_RE = re.compile(
    r"Objavljeno:\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*u\s*(\d{1,2}):(\d{2})h"
)

# 3. Pomocne funckije
#####################

def clean_text(text):
    if text is None:
        return None

    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    return text or None


def normalize_url(url):
    if not url:
        return None

    if url.startswith("http"):
        return url

    return BASE_URL + url


def month_from_word(word):
    word = word.lower()

    for prefix, month in MONTHS_BS.items():
        if word.startswith(prefix):
            return month

    return None

def strip_diacritics(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return (text.replace("đ", "dj").replace("Đ", "Dj")
                .replace("š", "s").replace("Š", "S")
                .replace("č", "c").replace("Č", "C")
                .replace("ć", "c").replace("Ć", "C")
                .replace("ž", "z").replace("Ž", "Z"))

# 4. Preuzimanje liste dogadjaja
################################

def build_category_page_url(category_slug, page):

    url = f"{BASE_URL}/najave/{category_slug}/"

    if page > 1:
        url += f"page/{page}/"

    return url


def parse_card_date(text):
    match = CARD_DATE_RE.search(text)

    if not match:
        return None

    day, month, year, hour, minute = map(int, match.groups())

    try:
        return datetime(year, month, day, hour, minute)
    except ValueError:
        return None


def fetch_category_cards(category_slug):
    all_cards = []
    cutoff = datetime.now() - timedelta(days=GRACE_DAYS)

    for page in range(1, MAX_PAGES_PER_CATEGORY + 1):

        url = build_category_page_url(category_slug, page)
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")
        cards = soup.select("article.box-news-category")

        if not cards:
            break

        page_has_recent = False

        for card in cards:
            date_tag = card.select_one("p.date")
            published = parse_card_date(date_tag.get_text(strip=True)) if date_tag else None

            all_cards.append((card, published))

            if published and published >= cutoff:
                page_has_recent = True

        print(f"  stranica {page}: {len(cards)} clanaka")

        if not page_has_recent:
            break

    return all_cards

# 5. Parsiranje
###############

def parse_event_card(card, category_name, published_date):
    event = {
        "title": None,
        "description": None,
        "location": "Banja Luka",
        "latitude": None,
        "longitude": None,
        "start_date": published_date,
        "end_date": None,
        "image": None,
        "price": 0,
        "source": "banjaluka.com",
        "source_url": None,
        "category": category_name,
    }

    title_tag = card.select_one("h2 a")

    if title_tag:
        event["title"] = clean_text(title_tag.get_text(strip=True))

    link_tag = card.select_one("a.more-link") or title_tag

    if link_tag and link_tag.get("href"):
        event["source_url"] = normalize_url(link_tag["href"])

    img_tag = card.select_one(".category-img img")

    if img_tag and img_tag.get("src"):
        event["image"] = normalize_url(img_tag["src"])

    return event

# 6. Ekstrakcija pojedinacnog dogadjaja
#######################################

def resolve_year(month, year_str, published_date):
    """Ako godina nije navedena u tekstu, uzimamo godinu objave clanka
    (uz prelaz decembar -> januar/februar/mart)."""

    if year_str:
        return int(year_str)

    if published_date:
        year = published_date.year

        if published_date.month == 12 and month in (1, 2, 3):
            year += 1

        return year

    return date.today().year


def extract_event_time(article_text):
    time_match = EVENT_TIME_RE.search(article_text)

    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2)) if time_match.group(2) else 0
        return hour, minute

    return 0, 0


def safe_datetime(year, month, day, hour=0, minute=0, second=0):
    try:
        return datetime(year, month, day, hour, minute, second)
    except ValueError:
        return None


def parse_range_match(kind, match, published_date, hour, minute):
    """Pretvara pogodak regexa za opseg u (start, end). Vraca None ako nije validan."""

    if kind == "same_month":
        day1, day2, month_word, year_str = match.groups()
        month = month_from_word(month_word)

        if not month:
            return None

        year = resolve_year(month, year_str, published_date)

        start = safe_datetime(year, month, int(day1), hour, minute)
        end = safe_datetime(year, month, int(day2), 23, 59, 59)

    else:
        day1, month1_word, year1_str, day2, month2_word, year2_str = match.groups()
        month1 = month_from_word(month1_word)
        month2 = month_from_word(month2_word)

        if not month1 or not month2:
            return None

        wraps_year = 1 if month2 < month1 else 0

        if year2_str:
            year2 = int(year2_str)
            year1 = int(year1_str) if year1_str else year2 - wraps_year
        else:
            year1 = resolve_year(month1, year1_str, published_date)
            year2 = year1 + wraps_year

        start = safe_datetime(year1, month1, int(day1), hour, minute)
        end = safe_datetime(year2, month2, int(day2), 23, 59, 59)

    if start and end and end >= start:
        return start, end

    return None


def extract_event_dates(article_text, published_date):
    """Vraca (start_date, end_date, found_in_text).

    Redoslijed:
      1) opseg "od 12. do 15. oktobra" ili "od 28. septembra do 3. oktobra"
      2) prvi datum u tekstu + "do 20. septembra" nedaleko iza njega
      3) samo prvi datum u tekstu
      4) datum objave clanka (end_date = None)
    """

    if not article_text:
        return published_date, None, False

    hour, minute = extract_event_time(article_text)

    # 1) opsezi - uzimamo onaj koji se prvi pojavljuje u tekstu
    candidates = []

    for m in RANGE_CROSS_MONTH_RE.finditer(article_text):
        candidates.append((m.start(), "cross_month", m))

    for m in RANGE_SAME_MONTH_RE.finditer(article_text):
        candidates.append((m.start(), "same_month", m))

    candidates.sort(key=lambda c: c[0])

    for _, kind, m in candidates:
        result = parse_range_match(kind, m, published_date, hour, minute)

        if result:
            return result[0], result[1], True

    # 2) i 3) pocetni datum, pa eventualno "do D. mjesec" iza njega
    match = EVENT_DATE_RE.search(article_text)

    if not match:
        return published_date, None, False

    day = int(match.group(1))
    month = month_from_word(match.group(2))

    if not month:
        return published_date, None, False

    year = resolve_year(month, match.group(3), published_date)
    start = safe_datetime(year, month, day, hour, minute)

    if not start:
        return published_date, None, False

    end = None
    window = article_text[match.end():match.end() + END_SEARCH_WINDOW]
    end_match = END_DO_RE.search(window)

    if end_match:
        end_day = int(end_match.group(1))
        end_month = month_from_word(end_match.group(2))

        if end_month:
            end_year = int(end_match.group(3)) if end_match.group(3) else start.year + (1 if end_month < start.month else 0)
            end = safe_datetime(end_year, end_month, end_day, 23, 59, 59)

            if end and end < start:
                end = None

    return start, end, True

# 7. Scraping detalja pojediancnog dogadjaja
############################################

def extract_description(soup):
    """Spaja paragrafe iz '.clanak' u opis, preskacuci citat izvora
    ('Izvor: ...') i eventualne reklamne blokove."""

    container = soup.select_one(".clanak")

    if not container:
        return None

    paragraphs = []

    for p in container.find_all("p", recursive=False):

        if p.select_one(".izvor"):
            continue

        text = clean_text(p.get_text(" ", strip=True))

        if text:
            paragraphs.append(text)

    return " ".join(paragraphs) if paragraphs else None


def extract_price(text):
    """banjaluka.com je novinski portal - cijena se rijetko spominje.
    Best-effort: trazimo 'X KM' pored rijeci 'cijena/cijene/...' ili
    'ulaznic*' (ulaznica/ulaznice/ulaznicu...) ili 'kart*' (karta/karte/kartu)."""

    if not text:
        return 0

    match = re.search(
        r"(?:cijen\w*|ulaznic\w*|kart\w*)[^.]{0,40}?(\d+(?:[.,]\d+)?)\s*KM",
        text,
        re.IGNORECASE
    )

    if match:
        try:
            return float(match.group(1).replace(",", "."))
        except ValueError:
            return 0

    return 0

def extract_og_image(soup):
    tag = soup.select_one('meta[property="og:image"]')
    if tag and tag.get("content"):
        return normalize_url(tag["content"])
    return None


def scrape_event_detail(base_event):
    event = base_event.copy()
    url = event["source_url"]

    response = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(response.text, "html.parser")

    og_image = extract_og_image(soup)
    if og_image:
        event["image"] = og_image

    detail_match = DETAIL_DATE_RE.search(soup.get_text(" ", strip=True))

    published_date = event["start_date"]

    if detail_match:
        day, month, year, hour, minute = map(int, detail_match.groups())
        try:
            published_date = datetime(year, month, day, hour, minute)
        except ValueError:
            pass

    description = extract_description(soup)
    event["description"] = description

    start_date, end_date, found_in_text = extract_event_dates(description, published_date)
    event["start_date"] = start_date
    event["end_date"] = end_date
    event["_date_from_text"] = found_in_text  

    event["price"] = extract_price(description)

    return event

# 8. Geokodiranje(lat\long)
###########################

geolocator = Nominatim(user_agent="banjaluka_scraper")

geocode = RateLimiter(
    geolocator.geocode,
    min_delay_seconds=1,
    max_retries=2,
    error_wait_seconds=2.0
)

try:
    _bl = geocode("Banja Luka, Bosna i Hercegovina", timeout=10)
    BANJA_LUKA_COORDS = (_bl.latitude, _bl.longitude) if _bl else (None, None)
except Exception as e:
    print("Greska pri geokodiranju Banja Luke:", e)
    BANJA_LUKA_COORDS = (None, None)


os.makedirs(DATA_DIR, exist_ok=True)

LOCATION_CACHE_FILE = os.path.join(DATA_DIR, "location_cache.json")


def load_location_cache():
    try:
        with open(LOCATION_CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_location_cache(cache):
    with open(LOCATION_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


LOCATION_CACHE = load_location_cache()

# 9. Prikupljanje svih dogadjaja
################################

all_events = []
today = date.today()

for category_slug, category_name in CATEGORIES.items():

    print(f"Kategorija: {category_name} ({category_slug})")

    cards = fetch_category_cards(category_slug)
    print(f"  ukupno clanaka provjereno: {len(cards)}")

    for card, published in cards:

        base_event = parse_event_card(card, category_name, published)

        if not base_event["source_url"]:
            continue

        try:
            event = scrape_event_detail(base_event)
        except Exception as e:
            print("  Greska pri scrapingu detalja:", base_event["source_url"], "-", e)
            continue

        if not event["start_date"]:
            continue  # preskacemo neodredive dogadjaje

        # preskacemo prosle dogadjaje (koristi end_date ako postoji, inace start_date)
        last_day = event["end_date"] or event["start_date"]

        if last_day.date() < today:
            continue

        event["latitude"] = event.get("latitude")
        event["longitude"] = event.get("longitude")

        if event["latitude"] is None or event["longitude"] is None:
            event["latitude"], event["longitude"] = BANJA_LUKA_COORDS

        del event["_date_from_text"]

        all_events.append(event)

        #print("  +", event["title"], "->", event["start_date"], "-", event["end_date"])


print("\nUkupno pronadjenih buducih dogadjaja:", len(all_events))

# 10. Export u JSON
###################

def prepare_for_json(events):

    json_ready = []

    for event in events:
        event_copy = event.copy()

        for key in ("start_date", "end_date"):
            if isinstance(event_copy.get(key), datetime):
                event_copy[key] = event_copy[key].isoformat()

        json_ready.append(event_copy)

    return json_ready


FILE_NAME = "banjaluka_najave.json"

os.makedirs(DATA_DIR, exist_ok=True)

FILE_PATH = os.path.join(DATA_DIR, FILE_NAME)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(prepare_for_json(all_events), f, ensure_ascii=False, indent=4)
print("Sacuvan:", FILE_NAME)