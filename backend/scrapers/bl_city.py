# 1. Biblioteke 
################

import os
import re
import json

import requests
from bs4 import BeautifulSoup
from datetime import date, datetime

# 2. Konfiguracija
##################

BASE_URL = "https://banjalukacity.info"
LISTING_URL = "https://banjalukacity.info/bs/kategorije/dogadaji"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

MAX_PAGES = 15

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

# 4. Preuzimanje liste dogadjaja
################################

def build_page_url(page):

    if page == 1:
        return LISTING_URL

    return f"{LISTING_URL}?page={page}"


def fetch_event_cards():
    all_cards = []

    for page in range(1, MAX_PAGES + 1):

        url = build_page_url(page)
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")

        cards = [
            a for a in soup.select("article")
            if "Datum održavanja" in a.get_text()
        ]

        if not cards:
            break

        all_cards.extend(cards)
        print(f"  stranica {page}: {len(cards)} dogadjaja")

    return all_cards

# 5. Parsiranje
###############

def parse_event_card(article):
    event = {
        "title": None,
        "description": None,
        "location": None,
        "latitude": None,
        "longitude": None,
        "start_date": None,
        "end_date": None,
        "image": None,
        "price": 0,
        "source": "banjalukacity.info",
        "source_url": None,
        "category": None,
    }

    link = article.find_parent("a", href=True)

    if link:
        event["source_url"] = normalize_url(link["href"])

    h3 = article.select_one("h3")

    if h3:
        event["title"] = clean_text(h3.get_text(strip=True))

    img = article.select_one("img")

    if img and img.get("src"):
        event["image"] = normalize_url(img["src"])

    cat_div = article.select_one("div.capitalize")

    if cat_div:
        event["category"] = clean_text(cat_div.get_text(strip=True))

    countdown = article.select_one("span[x-data]")

    if countdown:
        x_data = countdown.get("x-data", "")

        start_match = re.search(r'start:\s*new Date\("([^"]+)"\)', x_data)

        if start_match:
            try:
                event["start_date"] = datetime.fromisoformat(start_match.group(1))
            except ValueError:
                pass

        end_match = re.search(r'end:\s*"([^"]+)"', x_data)

        if end_match:
            try:
                event["end_date"] = datetime.fromisoformat(end_match.group(1))
            except ValueError:
                pass

    if not event["start_date"]:
        text = article.get_text(" ", strip=True)
        match = re.search(
            r"Datum održavanja:\s*(\d{2})\.(\d{2})\.(\d{4})"
            r"(?:\s*[-–]\s*(\d{2})\.(\d{2})\.(\d{4}))?",
            text
        )

        if match:
            d1, m1, y1, d2, m2, y2 = match.groups()
            try:
                event["start_date"] = datetime(int(y1), int(m1), int(d1))
                if d2:
                    event["end_date"] = datetime(int(y2), int(m2), int(d2), 23, 59, 59)
            except ValueError:
                pass

    for key in ("start_date", "end_date"):
        if event[key] and event[key].tzinfo:
            event[key] = event[key].replace(tzinfo=None)

    return event

# 6. Ekstrakcija pojedinacnog dogadjaja
#######################################

def extract_description(soup):
    container = soup.select_one('div[x-show="showMore"]')

    if not container:
        return None

    paragraphs = []

    for p in container.find_all("p"):
        text = clean_text(p.get_text(" ", strip=True))
        if text:
            paragraphs.append(text)

    return " ".join(paragraphs) if paragraphs else None


def extract_location(soup):
    address_p = soup.select_one(".flex.flex-col.pl-5 p")

    if not address_p:
        return None

    return clean_text(address_p.get_text(" ", strip=True))


def extract_coordinates(soup):
    iframe = soup.select_one("iframe[src*='google.com/maps/embed']")

    if not iframe:
        return None, None

    match = re.search(r"!2d([\d.\-]+)!3d([\d.\-]+)", iframe["src"])

    if not match:
        return None, None

    longitude, latitude = float(match.group(1)), float(match.group(2))

    return latitude, longitude


def extract_price(text):
    if not text:
        return 0

    match = re.search(
        r"(?:cijena|ulaznic\w*)[^.]{0,30}?(\d+(?:[.,]\d+)?)\s*KM",
        text,
        re.IGNORECASE
    )

    if match:
        try:
            return float(match.group(1).replace(",", "."))
        except ValueError:
            return 0

    return 0

# 7. Scraping detalja pojediancnog dogadjaja
############################################

def scrape_event_detail(base_event):
    event = base_event.copy()
    url = event["source_url"]

    response = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(response.text, "html.parser")

    description = extract_description(soup)
    event["description"] = description

    location = extract_location(soup)
    if location:
        event["location"] = location

    lat, lon = extract_coordinates(soup)
    event["latitude"] = lat
    event["longitude"] = lon

    event["price"] = extract_price(description)

    return event

# 8. Geokodiranje(lat\long)
###########################

#vec postoji na stranici pa se ne treba geokodirati  

# 9. Prikupljanje svih dogadjaja
################################

all_events = []
today = date.today()

cards = fetch_event_cards()
print(f"Ukupno kartica pronadjeno: {len(cards)}")

for card in cards:

    base_event = parse_event_card(card)

    if not base_event["source_url"]:
        continue

    try:
        event = scrape_event_detail(base_event)
    except Exception as e:
        print("  Greska pri scrapingu detalja:", base_event["source_url"], "-", e)
        continue

    last_day = event["end_date"] or event["start_date"]

    if last_day and last_day.date() < today:
        continue

    all_events.append(event)

    #print("  +", event["title"], "->", event["start_date"], "-", event["end_date"])


print("\nUkupno prikupljenih dogadjaja:", len(all_events))

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


FILE_NAME = "banjaluka_city.json"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

os.makedirs(DATA_DIR, exist_ok=True)

FILE_PATH = os.path.join(DATA_DIR, FILE_NAME)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(prepare_for_json(all_events), f, ensure_ascii=False, indent=4)

print("Sacuvan:", FILE_NAME)