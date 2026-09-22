# 1. Biblioteke 
################

import os
import re
import json
import time

import requests
from bs4 import BeautifulSoup
from datetime import datetime

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# 2. Konfiguracija
##################

BASE_URL = "https://ulaznice.org"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CATEGORIES = {
    1: ("muzika", "Muzika"),
    2: ("biznis", "Biznis"),
    3: ("pozoriste", "Pozorište"),
    4: ("sport", "Sport"),
    5: ("ostalo", "Ostalo"),
}

TARGET_CITIES = [
    "BANJA LUKA",
    "BANJALUKA",
]

TARGET_VENUE_HINTS = [
    "KASTEL",
    "BORIK",
    "BANSKI DVOR",
    "DOM OMLADINE",
    "TVRĐAVA KASTEL"
]

MONTHS_BS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "maj": 5, "jun": 6,
    "jul": 7, "avg": 8, "aug": 8, "sep": 9, "okt": 10, "oct": 10,
    "nov": 11, "dec": 12,
}

# 3. Pomocne funckije
#####################

def clean_text(text):
    """Skida viska razmake i praznine iz teksta."""

    if text is None:
        return None

    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    return text or None


def normalize_url(url):
    """Pretvara relativni URL sa sajta u apsolutni."""

    if not url:
        return None

    if url.startswith("http"):
        return url

    return BASE_URL + url


def is_target_location(location_text):
    if not location_text:
        return False

    text = location_text.upper()

    if "," in text:
        city_part = text.split(",")[-1].strip()
        return any(city in city_part for city in TARGET_CITIES)

    return (
        any(city in text for city in TARGET_CITIES)
        or any(hint in text for hint in TARGET_VENUE_HINTS)
    )

# 4. Preuzimanje liste dogadjaja
################################

def build_category_url(category_slug):

    category_id = CATEGORY_ID_BY_SLUG[category_slug]

    return f"{BASE_URL}/cat/{category_id}/{category_slug}"


CATEGORY_ID_BY_SLUG = {
    slug: cat_id for cat_id, (slug, _) in CATEGORIES.items()
}


def fetch_category_cards(category_slug):
    url = build_category_url(category_slug)

    response = requests.get(url, headers=HEADERS, timeout=15)

    if response.status_code != 200:
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    return soup.select(".event")

# 5. Parsiranje
###############

def parse_event_card(card, category_name):
    event = {
        "title": None,
        "description": None,
        "location": None,
        "latitude": None,
        "longitude": None,
        "date": None,
        "image": None,
        "price": 0,
        "source": "Ulaznice.org",
        "source_url": None,
        "category": category_name,
    }

    title_tag = card.select_one("h5.title a")

    if title_tag:
        event["title"] = clean_text(title_tag.get_text(strip=True))
        event["source_url"] = normalize_url(title_tag.get("href"))

    thumb = card.select_one(".movie-thumb")

    if thumb and thumb.get("data-bkgimg"):
        event["image"] = normalize_url(thumb["data-bkgimg"])

    event["location"] = extract_location(card)

    return event

# 6. Ekstrakcija pojedinacnog dogadjaja
#######################################

def extract_location(scope):
    loc_link = scope.select_one("span.location a") or scope.select_one("a.text-warning")

    if not loc_link:
        return None

    venue_tag = loc_link.find("b")
    city_tag = loc_link.select_one("span.smallinfo")

    venue = clean_text(venue_tag.get_text(strip=True)) if venue_tag else None
    city = clean_text(city_tag.get_text(strip=True)) if city_tag else None

    if city:
        city = city.lstrip(", ").strip()

    if venue and city:
        return f"{venue}, {city}"

    return venue or city


DATE_TIME_RE = re.compile(
    r"(\d{1,2})\.\s*([A-Za-zČĆŽŠĐčćžšđ]+)\.?\s*(\d{4})\s+(\d{2}:\d{2})"
)
DATE_ONLY_RE = re.compile(
    r"(\d{1,2})\.\s*([A-Za-zČĆŽŠĐčćžšđ]+)\.?\s*(\d{4})"
)


def _parse_date_match(match, time_str=None):
    day, month_name, year = match.group(1), match.group(2), match.group(3)

    month = MONTHS_BS.get(month_name.lower()[:3])

    if not month:
        return None

    hour, minute = (0, 0)

    if time_str:
        hour, minute = map(int, time_str.split(":"))

    return datetime(int(year), month, int(day), hour, minute)


def extract_datetime(soup):
    candidates = []

    time_tag = soup.select_one("span.time")
    if time_tag:
        candidates.append(time_tag.get_text(" ", strip=True))

    candidates.append(soup.get_text(" ", strip=True))

    for text in candidates:

        match = DATE_TIME_RE.search(text)
        if match:
            result = _parse_date_match(match, match.group(4))
            if result:
                return result

        match = DATE_ONLY_RE.search(text)
        if match:
            result = _parse_date_match(match)
            if result:
                return result

    return None


def extract_price_from_seatmap(html_text):
    match = re.search(r"var\s+tickettypes\s*=\s*(\{.*?\});", html_text)

    if not match:
        return None

    try:
        tickettypes = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None

    prices = []

    for tt in tickettypes.values():
        try:
            prices.append(float(tt.get("price", 0)))
        except (TypeError, ValueError):
            continue

    return min(prices) if prices else None


def extract_price_from_ticket_list(soup):
    prices = []

    for block in soup.select(".ticket-types"):
        for small in block.find_all("small"):
            text = small.get_text(" ", strip=True)

            if "Cijena" not in text:
                continue

            match = re.search(r"Cijena\s*([\d.,]+)\s*KM", text)

            if match:
                try:
                    prices.append(float(match.group(1).replace(",", ".")))
                except ValueError:
                    pass

            break

    return min(prices) if prices else None


def extract_price(soup, html_text):
    price = extract_price_from_seatmap(html_text)

    if price is not None:
        return price

    price = extract_price_from_ticket_list(soup)

    return price if price is not None else 0


def extract_description(soup):
    container = (
        soup.select_one(".event-about-content .section-header-3")
        or soup.select_one(".event-about-content")
    )

    if container:
        for p in container.find_all("p"):
            text = clean_text(p.get_text(" ", strip=True))
            if text:
                return text

    meta = soup.find("meta", attrs={"name": "description"})

    if meta and meta.get("content"):
        return clean_text(meta["content"])

    og_meta = soup.find("meta", attrs={"property": "og:description"})

    if og_meta and og_meta.get("content"):
        return clean_text(og_meta["content"])

    return None

# 7. Scraping detalja pojediancnog dogadjaja
############################################

def scrape_event_detail(base_event):
    event = base_event.copy()
    url = event["source_url"]

    response = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(response.text, "html.parser")

    title_tag = soup.select_one("h1.big-event-title")
    if title_tag:
        event["title"] = clean_text(title_tag.get_text(strip=True))

    location = extract_location(soup)
    if location:
        event["location"] = location

    event["date"] = extract_datetime(soup)

    event["price"] = extract_price(soup, response.text)

    event["description"] = extract_description(soup)

    return event

# 8. Geokodiranje(lat\long)
###########################

geolocator = Nominatim(user_agent="ulaznice_scraper")

geocode = RateLimiter(
    geolocator.geocode,
    min_delay_seconds=1,
    max_retries=2,
    error_wait_seconds=2.0
)

_geocode_cache = {}


def get_coordinates(location):
    if not location:
        return None, None

    if location in _geocode_cache:
        return _geocode_cache[location]

    query = f"{location}, Bosna i Hercegovina"

    try:
        result = geocode(query, timeout=10)
    except Exception as e:
        print("Greska pri geokodiranju:", location, "-", e)
        result = None

    coords = (result.latitude, result.longitude) if result else (None, None)
    _geocode_cache[location] = coords

    return coords

# 9. Prikupljanje svih dogadjaja
################################

all_events = []

for category_id, (category_slug, category_name) in CATEGORIES.items():

    print(f"Kategorija: {category_name} ({category_slug})")

    cards = fetch_category_cards(category_slug)
    print(f"  ukupno dogadjaja u kategoriji: {len(cards)}")

    for card in cards:

        base_event = parse_event_card(card, category_name)

        if not is_target_location(base_event["location"]):
            continue

        if not base_event["source_url"]:
            continue

        try:
            event = scrape_event_detail(base_event)
        except Exception as e:
            print("  Greska pri scrapingu detalja:", base_event["source_url"], "-", e)
            event = base_event

        lat, lon = get_coordinates(event["location"])
        event["latitude"] = lat
        event["longitude"] = lon

        all_events.append(event)

        #print("  + Banja Luka dogadjaj:", event["title"])


print("\nUkupno pronadjenih Banja Luka dogadjaja:", len(all_events))

# 10. Export u JSON
###################

def prepare_for_json(events):

    json_ready = []

    for event in events:
        event_copy = event.copy()

        if isinstance(event_copy.get("date"), datetime):
            event_copy["date"] = event_copy["date"].isoformat()

        json_ready.append(event_copy)

    return json_ready


FILE_NAME = "ulaznice.json"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

os.makedirs(DATA_DIR, exist_ok=True)

FILE_PATH = os.path.join(DATA_DIR, FILE_NAME)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(prepare_for_json(all_events), f, ensure_ascii=False, indent=4)
print("Sacuvan:", FILE_NAME)
