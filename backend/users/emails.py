import logging

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_html_email(subject, template_name, context, recipient, fail_silently=True):
    html_content = render_to_string(template_name, context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    email.attach_alternative(html_content, "text/html")

    try:
        email.send(fail_silently=False)
    except Exception as e:
        logger.error(f"Greška pri slanju mail-a na {recipient}: {e}")
        if not fail_silently:
            raise


def send_welcome_email(user):
    context = {
        "username": user.username,
        "frontend_url": settings.FRONTEND_URL,
    }
    _send_html_email(
        subject="Dobrodošli u Događaje u Banjoj Luci!",
        template_name="emails/welcome_email.html",
        context=context,
        recipient=user.email,
        fail_silently=True,  
    )


def send_password_reset_email(user, reset_link):
    context = {
        "username": user.username,
        "reset_link": reset_link,
    }
    _send_html_email(
        subject="Reset lozinke - Događaji u Banjoj Luci",
        template_name="emails/password_reset_email.html",
        context=context,
        recipient=user.email,
        fail_silently=False,
    )