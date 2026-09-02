from django.shortcuts import render
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import UserProfile
from .emails import send_welcome_email, send_password_reset_email

from django.contrib.auth.decorators import login_required
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings

@login_required
def home_view(request):
    return render(request, "users/home.html")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login_api(request):

    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {"message": "Pogrešno korisničko ime ili lozinka."},
            status=401
        )

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff
        }
    })

@api_view(["POST"])
def register_api(request):

    data = request.data

    if data.get("password") != data.get("confirm_password"):
        return Response({
            "success": False,
            "message": "Lozinka i potvrda lozinke se ne poklapaju."
        }, status=400)

    if User.objects.filter(username=data["username"]).exists():
        return Response({
            "success": False,
            "message": "Korisničko ime već postoji."
        }, status=400)

    if User.objects.filter(email=data["email"]).exists():
        return Response({
            "success": False,
            "message": "Email već postoji."
        }, status=400)

    temp_user = User(
        username=data["username"],
        email=data["email"],
    )

    try:
        validate_password(data["password"], user=temp_user)
    except ValidationError as e:
        return Response({
            "success": False,
            "message": " ".join(e.messages)
        }, status=400)

    user = User.objects.create_user(
        username=data["username"],
        email=data["email"],
        password=data["password"]
    )

    UserProfile.objects.create(
        user=user,
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone_number=data.get("phone_number", ""),
        city=data.get("location", "Banja Luka"),
    )

    send_welcome_email(user)

    refresh = RefreshToken.for_user(user)

    return Response({
        "success": True,
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "message": "Registracija uspješna."
    })


def serialize_profile(user, profile):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "phone_number": profile.phone_number,
        "city": profile.city,
        "profile_image": profile.profile_image,
        "email_notifications": profile.email_notifications,
        "created_at": profile.created_at,
    }


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_api(request, id):

    if request.user.id != id:
        return Response(
            {"message": "Nemate dozvolu da pristupite ovom profilu."},
            status=403
        )

    try:
        user = User.objects.get(id=id)
        profile = UserProfile.objects.get(user=user)
    except User.DoesNotExist:
        return Response(status=404)
    except UserProfile.DoesNotExist:
        return Response({"message": "Profil ne postoji."}, status=404)

    if request.method == "GET":
        return Response(serialize_profile(user, profile))

    data = request.data

    profile.first_name = data.get("first_name", profile.first_name)
    profile.last_name = data.get("last_name", profile.last_name)
    profile.phone_number = data.get("phone_number", profile.phone_number)
    profile.city = data.get("city", profile.city)
    profile.profile_image = data.get("profile_image", profile.profile_image)

    if "email_notifications" in data:
        profile.email_notifications = data.get("email_notifications")

    profile.save()

    return Response(serialize_profile(user, profile))

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_api(request):

    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not current_password or not new_password or not confirm_password:
        return Response(
            {"message": "Sva polja su obavezna."},
            status=400
        )

    if new_password != confirm_password:
        return Response(
            {"message": "Nova lozinka i potvrda se ne poklapaju."},
            status=400
        )

    user = authenticate(username=request.user.username, password=current_password)

    if user is None:
        return Response(
            {"message": "Trenutna lozinka nije tačna."},
            status=401
        )

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response(
            {"message": " ".join(e.messages)},
            status=400
        )

    if current_password == new_password:
        return Response(
            {"message": "Nova lozinka mora biti različita od trenutne."},
            status=400
        )

    user.set_password(new_password)
    user.save()

    return Response({"message": "Lozinka je uspješno promijenjena."})

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get("email")

    if not email:
        return Response({"message": "Email je obavezan."}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            "message": "Ne postoji nalog sa ovom email adresom."
        }, status=404)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    try:
        send_password_reset_email(user, reset_link)
    except Exception:
        return Response({
            "message": "Greška pri slanju emaila. Pokušajte ponovo kasnije."
        }, status=500)

    return Response({
        "message": "Ako nalog sa ovim emailom postoji, poslat je link za reset lozinke."
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not uid or not token or not new_password or not confirm_password:
        return Response({"message": "Sva polja su obavezna."}, status=400)

    if new_password != confirm_password:
        return Response({"message": "Lozinke se ne poklapaju."}, status=400)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({"message": "Nevažeći link za reset lozinke."}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"message": "Link je nevažeći ili je istekao."}, status=400)

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response({"message": " ".join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({"message": "Lozinka je uspješno promijenjena."})