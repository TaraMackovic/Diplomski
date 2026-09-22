# 1. Biblioteke 
################

import os
import re
import json

import requests
from bs4 import BeautifulSoup
from datetime import date, datetime

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# 2. Konfiguracija
##################

BASE_URL = "https://gigstix.ba"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CATEGORIES = {
    "koncert": "https://gigstix.ba/eventcat/koncert/?post_type=event",
    "festival": "https://gigstix.ba/eventcat/festival/?post_type=event",
    "dogadjaj": "https://gigstix.ba/eventcat/dogadjaj/?post_type=event",
}

TARGET_CITIES = [
    "BANJA LUKA",
    "BANJALUKA",
    "LAKTAŠI",
    "ČELINAC",
    "PRNJAVOR",
]

MAX_PAGES_PER_CATEGORY = 15

MONTHS_BS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "maj": 5, "jun": 6,
    "jul": 7, "avg": 8, "aug": 8, "sep": 9, "okt": 10, "nov": 11, "dec": 12,
}

MONTH_WORD_PATTERN = (
    r"(januar\w*|februar\w*|mart\w*|april\w*|maj\w*|jun\w*|jul\w*|"
    r"avgust\w*|august\w*|septembar\w*|septembr\w*|"
    r"oktobar\w*|oktobr\w*|novembar\w*|novembr\w*|decembar\w*|decembr\w*)"
)

FULL_DATETIME_RE = re.compile(
    r"(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})\.?\s*(\d{1,2}):(\d{2})",
    re.IGNORECASE
)

DATE_ONLY_RE = re.compile(
    r"(\d{1,2})\.\s*" + MONTH_WORD_PATTERN + r"\.?\s*(\d{4})",
    re.IGNORECASE
)


# 3. Pomocne funckije
#####################

def clean_text(text):
    if text is None:
        return None

    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    return text or None


def month_from_word(word):
    word = word.lower()

    for prefix, month in MONTHS_BS.items():
        if word.startswith(prefix):
            return month

    return None


def is_target_city(city_text):
    if not city_text:
        return False

    text = city_text.upper()

    return any(city in text for city in TARGET_CITIES)


def parse_full_datetime(text):
    if not text:
        return None

    match = FULL_DATETIME_RE.search(text)

    if not match:
        return None

    day = int(match.group(1))
    month = month_from_word(match.group(2))
    year = int(match.group(3))
    hour, minute = int(match.group(4)), int(match.group(5))

    if not month:
        return None

    try:
        return datetime(year, month, day, hour, minute)
    except ValueError:
        return None


def parse_date_only(text):
    if not text:
        return None

    match = DATE_ONLY_RE.search(text)

    if not match:
        return None

    day = int(match.group(1))
    month = month_from_word(match.group(2))
    year = int(match.group(3))

    if not month:
        return None

    try:
        return datetime(year, month, day)
    except ValueError:
        return None
    
# 4. Preuzimanje liste dogadjaja po kategoriji
##############################################

def build_category_page_url(category_url, page):

    if page == 1:
        return category_url

    return f"{category_url}&paged={page}"


def fetch_category_cards(category_url):
    all_cards = []

    for page in range(1, MAX_PAGES_PER_CATEGORY + 1):

        url = build_category_page_url(category_url, page)
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")
        cards = soup.select(".gt-event-style-1")

        if not cards:
            break

        all_cards.extend(cards)
        print(f"  stranica {page}: {len(cards)} dogadjaja")

    return all_cards

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
        "source": "Gigstix.ba",
        "source_url": None,
        "category": category_name,
        "_city": None,  # privremeno, koristi se samo za filtriranje
    }

    title_tag = card.select_one(".gt-title a")

    if title_tag:
        event["title"] = clean_text(title_tag.get_text(strip=True))
        event["source_url"] = title_tag.get("href")

    img_tag = card.select_one(".gt-image img")

    if img_tag and img_tag.get("src"):
        event["image"] = img_tag["src"]

    category_tag = card.select_one(".gt-category a")

    if category_tag:
        event["category"] = clean_text(category_tag.get_text(strip=True))

    city_tag = card.select_one(".gt-location a")

    if city_tag:
        event["_city"] = clean_text(city_tag.get_text(strip=True))

    date_span = card.select_one(".gt-date span")

    if date_span:
        event["date"] = parse_date_only(date_span.get_text(strip=True))

    text_div = card.select_one(".gt-text")

    if text_div:
        parts = clean_text(text_div.get_text(strip=True)).split("|")
        if len(parts) >= 3:
            venue = clean_text(parts[-1])
            if venue and event["_city"]:
                event["location"] = f"{venue}, {event['_city']}"
            elif venue:
                event["location"] = venue

    if not event["location"] and event["_city"]:
        event["location"] = event["_city"]

    return event

# 6. Ekstrakcija pojedinacnog dogadjaja
#######################################

def extract_detail_field(soup, li_class):
    li = soup.select_one(f"li.{li_class}")

    if not li:
        return None

    inner = li.select_one(".gt-inner")

    if not inner:
        return None

    link = inner.select_one("a")

    if link:
        return clean_text(link.get_text(strip=True))

    return clean_text(inner.get_text(strip=True))


def extract_section_content(soup, section_title):
    for section in soup.select(".gt-section"):

        title_tag = section.select_one(".gt-section-title")

        if title_tag and clean_text(title_tag.get_text(strip=True)) == section_title:
            return section.select_one(".gt-content")

    return None


def extract_description(soup):
    content = extract_section_content(soup, "O događaju")

    if not content:
        return None

    return clean_text(content.get_text(" ", strip=True))


def extract_min_price(soup):
    content = extract_section_content(soup, "Ulaznice")

    if not content:
        return 0

    prices = []

    for frame in content.select(".gt-tickets-frame"):

        price_div = frame.select_one(".gt-tickets-price")

        if not price_div:
            continue

        match = re.search(r"(\d+(?:[.,]\d+)?)\s*BAM", price_div.get_text(strip=True))

        if match:
            prices.append(float(match.group(1).replace(",", ".")))

    return min(prices) if prices else 0

# 7. Scraping detalja pojediancnog dogadjaja
############################################

def scrape_event_detail(base_event):
    event = base_event.copy()
    url = event["source_url"]

    response = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(response.text, "html.parser")

    precise_date_text = extract_detail_field(soup, "gt-start-date")
    precise_date = parse_full_datetime(precise_date_text)

    if precise_date:
        event["date"] = precise_date

    city = extract_detail_field(soup, "gt-locations")
    venue = extract_detail_field(soup, "gt-venue")

    if city:
        event["_city"] = city

    if venue and city:
        event["location"] = f"{venue}, {city}"
    elif venue:
        event["location"] = venue

    category = extract_detail_field(soup, "gt-categories")

    if category:
        event["category"] = category

    event["description"] = extract_description(soup)

    event["price"] = extract_min_price(soup)

    return event

# 8. Geokodiranje(lat\long)
###########################

geolocator = Nominatim(user_agent="gigstix_scraper")

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
today = date.today()

for category_slug, category_url in CATEGORIES.items():

    print(f"Kategorija: {category_slug}")

    cards = fetch_category_cards(category_url)
    print(f"  ukupno dogadjaja u kategoriji: {len(cards)}")

    for card in cards:

        base_event = parse_event_card(card, category_slug.capitalize())

        if not is_target_city(base_event["_city"]):
            continue

        if not base_event["source_url"]:
            continue

        try:
            event = scrape_event_detail(base_event)
        except Exception as e:
            print("  Greska pri scrapingu detalja:", base_event["source_url"], "-", e)
            event = base_event

        if not event["date"] or event["date"].date() < today:
            continue 

        lat, lon = get_coordinates(event["location"])
        event["latitude"] = lat
        event["longitude"] = lon

        del event["_city"]
        all_events.append(event)

        #print("  +", event["title"], "->", event["date"])


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


FILE_NAME = "gigstix.json"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

os.makedirs(DATA_DIR, exist_ok=True)

FILE_PATH = os.path.join(DATA_DIR, FILE_NAME)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(prepare_for_json(all_events), f, ensure_ascii=False, indent=4)
print("Sacuvan:", FILE_NAME)