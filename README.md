# Web aplikacija za preporuku događaja 

Web aplikacija omogućava pregled i pretragu događaja u Banjoj Luci, uz personalizovane preporuke na osnovu interesovanja korisnika. Razvijena je korišćenjem Django i React tehnologija, uz PostgreSQL bazu podataka.

## Struktura repozitorijuma

```
.
├── requirements.txt          # Python zavisnosti
├── backend/
│   ├── manage.py
│   ├── test_project/         # Django podešavanja i glavni URL-ovi
│   ├── users/                # registracija, prijava, profil, reset lozinke
│   ├── events/               # modeli, API, preporuke, management komande
│   │   ├── management/
│   │   │    └──commands/     # skripte za pipeline 
│   │   └── ml_cache/         # matrica sličnosti 
│   ├── admins/               # API za administratorski panel
│   ├── scrapers/             # skripte za preuzimanje događaja sa izvora
│   ├── data/                 # folder za čuvanje .json fajlova
│   └── templates/emails/     # HTML šabloni emailova
└── frontend/                 # React aplikacija
    └── src/ (assets, components, pages, services, styles, utils)
```

## Preduslovi

- Python 3.14
- Node.js i npm (preporučeno Node 18+)
- PostgreSQL (lokalno pokrenut server i prazna baza)
- pristup internetu (skripte preuzimaju događaje sa javnih sajtova)
- (opciono) Supabase projekat sa javnim bucketom za slike događaja i profila
- (opciono) SMTP nalog za slanje emailova

## Instalacija i pokretanje

### 1. Kloniranje

```bash
git clone https://github.com/TaraMackovic/Diplomski.git
cd Diplomski
```

### 2. Backend

Kreiranje virtuelnog okruženja i instalacija zavisnosti iz korijena repozitorijuma:

```bash
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

python -m pip install -r requirements.txt
```

### 3. Konfiguracija (`.env`)

Podešavanja aplikacije definišu se u datoteci backend/.env. Prije pokretanja potrebno je unijeti odgovarajuće vrijednosti za sljedeće varijable okruženja:

```env
# Django
SECRET_KEY=proizvoljan-tajni-kljuc
DEBUG=True

# PostgreSQL
DB_NAME=naziv_baze
DB_USER=korisnik
DB_PASSWORD=lozinka
DB_HOST=localhost
DB_PORT=5432

# Email (SMTP) - potrebno za reset lozinke i podsjetnike (Opciono)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=dogadjajiubanjaluci@gmail.com

# Supabase Storage - potrebno za slike događaja i profila (Opciono)
SUPABASE_PROJECT_URL=https://<projekat-ref>.supabase.co
SUPABASE_S3_ACCESS_KEY_ID=
SUPABASE_S3_SECRET_ACCESS_KEY=
SUPABASE_S3_BUCKET_NAME=
SUPABASE_S3_ENDPOINT_URL=
SUPABASE_S3_REGION=
```

> Napomena: `.env` se učitava iz foldera `backend/`, zbog čega se komande ispod pokreću iz tog foldera.

### 4. Migracije i početni podaci

```bash
cd backend
python manage.py migrate
python manage.py seed_interests
```

`seed_interests` upisuje podrazumijevana interesovanja (Muzika, Film, Sport, Pozorište...) koja korisnici biraju pri registraciji. Kategorije događaja kreiraju se same pri uvozu događaja.

### 5. Pokretanje servera

Backend (http://localhost:8000):

```bash
python manage.py runserver
```

Frontend, u drugom terminalu (http://localhost:3000):

```bash
cd frontend
npm install
npm start
```

Frontend je podešen da komunicira sa backendom na `http://localhost:8000` (`frontend/src/services/api.js`), a backend dozvoljava CORS zahtjeve sa `http://localhost:3000`, pa aplikacija radi bez dodatnog podešavanja ako se koriste ovi portovi.

### 6. Preuzimanje događaja

Prije prvog korišćenja aplikacije potrebno je pokrenuti pipeline. Događaji nisu uključeni u repozitorijum, već se preuzimaju sa javno dostupnih izvora pokretanjem sledeće komande:

```bash
cd backend
python manage.py run_pipeline
```

Komanda redom izvršava sljedeće korake:

| # | Korak                     | Uloga 
|---|---------------------------|---
| 1 | `update_event_status`     | događaje čiji je datum prošao označava kao završene |
| 2 | `send_event_reminders`    | šalje email podsjetnike za sačuvane događaje koji slijede u naredna 3 dana |
| 3 | `scrapers/gigstix.py`     | preuzima događaje sa gigstix.ba |
| 4 | `scrapers/bl_city.py`     | preuzima događaje sa banjalukacity.info |
| 5 | `scrapers/ulaznice.py`    | preuzima događaje sa ulaznice.org |
| 6 | `scrapers/bl_najave.py`   | preuzima događaje sa banjaluka.com |
| 7 | `merge_events`            | objedinjuje podatke iz različitih izvora |
| 8 | `import_events`           | uvozi objedinjene događaje u bazu podataka |
| 9 | `build_recommendations`   | gradi matricu sličnosti koja se koristi u sistemu za preporuke |

Pojedinačne korake moguće je pokrenuti i zasebno, npr. `python manage.py merge_events` ili `python manage.py build_recommendations`. Scraperi se mogu pokrenuti i direktno: `python scrapers/gigstix.py`.

## Korisnici i administratori

Korisnici se **kreiraju kroz aplikaciju**, putem forme za registraciju na `/register`. 

Administratorski nalog kreira se sledećom komandom:

```bash
cd backend
python manage.py createsuperuser
```

## Ostale komande

| Komanda | Uloga |
|------------------------------------------|---|
| `python manage.py update_event_images` | prebacuje slike događaja u Supabase storage |
| `python manage.py evaluate_recommendations` | evaluacija modela preporuka (metrike precision, recall, NDCG i dr., poređenje sa baseline modelima) |
| `python manage.py assign_saved_events` | simulacija sačuvanih događaja za naloge osam korisnika; koristi se samo za evaluaciju preporuka |

Posljednje dvije komande služe isključivo za evaluaciju sistema preporuka u okviru rada i nisu potrebne za pokretanje aplikacije. Zahtijevaju da nalozi osam korisnika prethodno budu kreirani kroz formu za registraciju.
