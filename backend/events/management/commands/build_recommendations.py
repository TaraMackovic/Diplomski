from django.core.management.base import BaseCommand

from events.recommendations import build_similarity_matrix

class Command(BaseCommand):

    help = "Rebuild event similarity matrix for recommendations"

    def handle(self, *args, **options):

        build_similarity_matrix()

        self.stdout.write(
            self.style.SUCCESS(
                "Matrica sličnosti je ažurirana."
            )
        )