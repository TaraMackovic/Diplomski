import subprocess
import sys
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand

BASE_DIR = Path(__file__).resolve().parents[3]
SCRAPERS_DIR = BASE_DIR / "scrapers"
DATA_DIR = BASE_DIR / "data"


class Command(BaseCommand):

    def handle(self, *args, **options):

        call_command("update_event_status")
        call_command("send_event_reminders")

        scraper_scripts = [
            "gigstix.py",
            "bl_city.py",
            "ulaznice.py",
            "bl_najave.py",
        ]
        for script in scraper_scripts:
            self.stdout.write(f"Pokrećem {script}...")
            result = subprocess.run(
                [sys.executable, str(SCRAPERS_DIR / script)],
                cwd=SCRAPERS_DIR,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                self.stderr.write(self.style.ERROR(f"{script} greška:\n{result.stderr}"))
                return
            self.stdout.write(self.style.SUCCESS(f"{script} gotovo."))

        self.stdout.write("Pokrećem merge...")
        try:
            call_command("merge_events")
        except Exception as exc:
            self.stderr.write(
                self.style.ERROR(f"Merge greška: {exc}")
            )
            return

        merged_path = DATA_DIR / "merged_events.json"
        call_command("import_events", str(merged_path))
        

        call_command("build_recommendations")

        self.stdout.write(self.style.SUCCESS("Pipeline završen."))