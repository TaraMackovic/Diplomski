import logging

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


def send_event_reminder_email(user, event):
    context = {
        "username": user.username,
        "event": event,
        "frontend_url": settings.FRONTEND_URL,
    }
    html_content = render_to_string("emails/event_reminder.html", context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=f"Podsjetnik: {event.title} za 3 dana",
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)