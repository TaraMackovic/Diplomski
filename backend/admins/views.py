from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from events.models import Event, Category, SavedEvent, Interest, UserInterest
from users.models import UserProfile

from .permissions import IsAdminUser
from .serializers import AdminEventSerializer, AdminCategorySerializer, AdminInterestSerializer

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

def paginate(queryset, request, default_size=20):
    try:
        page = int(request.query_params.get("page", 1))
    except ValueError:
        page = 1
    try:
        page_size = int(request.query_params.get("page_size", default_size))
    except ValueError:
        page_size = default_size

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    total = queryset.count()
    total_pages = max((total + page_size - 1) // page_size, 1)
    page = min(page, total_pages)

    start = (page - 1) * page_size
    end = start + page_size

    return queryset[start:end], {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }

def serialize_admin_user(user, saved_count=None):
    profile = getattr(user, "profile", None)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": profile.first_name if profile else user.first_name,
        "last_name": profile.last_name if profile else user.last_name,
        "phone_number": profile.phone_number if profile else "",
        "date_joined": user.date_joined,
        "saved_events_count": saved_count if saved_count is not None else user.saved_events.count(),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }

def create_admin_user(request):
    data = request.data

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    is_staff = bool(data.get("is_staff", False))

    errors = {}
    if not username:
        errors["username"] = ["Username je obavezan."]
    elif User.objects.filter(username=username).exists():
        errors["username"] = ["Korisničko ime već postoji."]

    if not email:
        errors["email"] = ["Email je obavezan."]
    elif User.objects.filter(email=email).exists():
        errors["email"] = ["Email je već u upotrebi."]

    if not password:
        errors["password"] = ["Lozinka je obavezna."]
    else:
        try:
            validate_password(password)
        except DjangoValidationError as e:
            errors["password"] = list(e.messages)

    if errors:
        return Response(errors, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_staff=is_staff,
    )

    UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
        },
    )

    return Response(serialize_admin_user(user), status=201)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard_stats(request):
    now = timezone.now()

    total_events = Event.objects.count()
    active_events = Event.objects.filter(status="active", date__gte=now).count()
    past_events = Event.objects.filter(Q(status="finished") | Q(date__lt=now)).count()
    cancelled_events = Event.objects.filter(status="cancelled").count()

    total_users = User.objects.count()
    total_categories = Category.objects.count()
    total_saved = SavedEvent.objects.count()

    thirty_days_ago = now - timezone.timedelta(days=30)
    new_users = User.objects.filter(date_joined__gte=thirty_days_ago).count()

    events_by_category = list(
        Category.objects.annotate(event_count=Count("events"))
        .values("id", "name", "event_count")
        .order_by("-event_count")
    )

    popular_events = list(
        Event.objects.annotate(saved_count=Count("saved_by"))
        .filter(saved_count__gt=0)
        .order_by("-saved_count")[:5]
        .values("id", "title", "saved_count")
    )

    popular_categories = list(
        Category.objects.annotate(saved_count=Count("events__saved_by"))
        .filter(saved_count__gt=0)
        .order_by("-saved_count")[:5]
        .values("id", "name", "saved_count")
    )

    return Response({
        "total_events": total_events,
        "active_events": active_events,
        "past_events": past_events,
        "cancelled_events": cancelled_events,
        "pending_events": 0,
        "total_users": total_users,
        "total_categories": total_categories,
        "total_saved_events": total_saved,
        "new_users_last_30_days": new_users,
        "events_by_category": events_by_category,
        "popular_events": popular_events,
        "popular_categories": popular_categories,
    })

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_interests(request):
    if request.method == "GET":
        interests = Interest.objects.annotate(user_count=Count("users", distinct=True)).order_by("name")
        serializer = AdminInterestSerializer(interests, many=True)

        return Response(serializer.data)

    serializer = AdminInterestSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAdminUser])
def admin_interest_detail(request, id):
    interest = get_object_or_404(Interest, id=id)

    if request.method == "PUT":
        serializer = AdminInterestSerializer(
            interest,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    user_count = UserInterest.objects.filter(
        interest=interest
    ).count()

    if user_count > 0:
        return Response({
            "message": (
                f'Interesovanje "{interest.name}" koristi {user_count} '
                f'{"korisnik" if user_count == 1 else "korisnika"}.'
            ),
            "user_count": user_count,
            "can_delete": False,
        }, status=400)

    interest.delete()

    return Response(status=204)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_remove_interest_from_users(request, id):
    interest = get_object_or_404(Interest, id=id)

    UserInterest.objects.filter(
        interest=interest
    ).delete()

    interest.delete()

    return Response(status=204)

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_categories(request):
    if request.method == "GET":
        categories = Category.objects.annotate(event_count=Count("events")).order_by("name")
        serializer = AdminCategorySerializer(categories, many=True)
        return Response(serializer.data)

    serializer = AdminCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAdminUser])
def admin_category_detail(request, id):
    category = get_object_or_404(Category.objects.annotate(event_count=Count("events")), id=id)

    if request.method == "PUT":
        serializer = AdminCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if category.event_count > 0:
        return Response({
            "message": f"Kategorija ima {category.event_count} povezanih događaja. Prvo premjestite ili obrišite te događaje."
        }, status=400)

    category.delete()
    return Response(status=204)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_analytics(request):
    most_saved_events = list(
        Event.objects.annotate(saved_count=Count("saved_by"))
        .filter(saved_count__gt=0)
        .order_by("-saved_count")[:10]
        .values("id", "title", "date", "saved_count")
    )

    saved_per_user = list(
        User.objects.annotate(saved_count=Count("saved_events"))
        .filter(saved_count__gt=0)
        .order_by("-saved_count")[:10]
        .values("id", "username", "saved_count")
    )

    popular_categories = list(
        Category.objects.annotate(saved_count=Count("events__saved_by"))
        .order_by("-saved_count")
        .values("id", "name", "saved_count")
    )

    return Response({
        "most_saved_events": most_saved_events,
        "saved_per_user": saved_per_user,
        "popular_categories": popular_categories,
        "total_saved_events": SavedEvent.objects.count(),
    })


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_events(request):
    if request.method == "GET":
        events = Event.objects.select_related("category").annotate(
            saved_count=Count("saved_by")
        ).order_by("-date")

        search = request.query_params.get("search")
        if search:
            events = events.filter(
                Q(title__icontains=search) |
                Q(location__icontains=search) |
                Q(description__icontains=search)
            )

        category = request.query_params.get("category")
        if category:
            events = events.filter(category_id=category)

        status_param = request.query_params.get("status")
        if status_param:
            events = events.filter(status=status_param)

        date_from = request.query_params.get("date_from")
        if date_from:
            events = events.filter(date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            events = events.filter(date__lte=date_to)

        ordering = request.query_params.get("ordering")
        allowed_ordering = {
            "date", "-date", "title", "-title", "created_at", "-created_at",
            "status", "-status",
        }
        if ordering in allowed_ordering:
            events = events.order_by(ordering)

        page_events, meta = paginate(events, request)
        serializer = AdminEventSerializer(page_events, many=True)

        return Response({
            "results": serializer.data,
            "meta": meta,
        })

    serializer = AdminEventSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAdminUser])
def admin_event_detail(request, id):
    event = get_object_or_404(
        Event.objects.select_related("category").annotate(saved_count=Count("saved_by")),
        id=id
    )

    if request.method == "GET":
        return Response(AdminEventSerializer(event).data)

    if request.method == "PUT":
        serializer = AdminEventSerializer(event, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    event.delete()
    return Response(status=204)



@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_users(request):
    if request.method == "POST":
        return create_admin_user(request)

    users = User.objects.select_related("profile").annotate(
        saved_events_count=Count("saved_events", distinct=True)
    ).order_by("-date_joined")

    search = request.query_params.get("search")
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(profile__first_name__icontains=search) |
            Q(profile__last_name__icontains=search)
        )

    status_param = request.query_params.get("status")
    if status_param == "active":
        users = users.filter(is_active=True)
    elif status_param == "inactive":
        users = users.filter(is_active=False)

    role = request.query_params.get("role")
    if role == "admin":
        users = users.filter(is_staff=True)
    elif role == "user":
        users = users.filter(is_staff=False)

    ordering = request.query_params.get("ordering")
    allowed_ordering = {
        "date_joined", "-date_joined", "username", "-username",
        "saved_events_count", "-saved_events_count",
    }
    if ordering in allowed_ordering:
        users = users.order_by(ordering)

    page_users, meta = paginate(users, request)

    results = [serialize_admin_user(u, u.saved_events_count) for u in page_users]

    return Response({
        "results": results,
        "meta": meta,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_user_detail(request, id):
    user = get_object_or_404(User.objects.select_related("profile"), id=id)
    return Response(serialize_admin_user(user))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_toggle_user_active(request, id):
    user = get_object_or_404(User, id=id)

    if user.id == request.user.id:
        return Response({"message": "Ne možete deaktivirati sopstveni nalog."}, status=400)

    user.is_active = not user.is_active
    user.save()
    return Response(serialize_admin_user(user))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_toggle_user_staff(request, id):
    user = get_object_or_404(User, id=id)

    if user.id == request.user.id:
        return Response({"message": "Ne možete promijeniti sopstvene privilegije."}, status=400)

    user.is_staff = not user.is_staff
    user.save()
    return Response(serialize_admin_user(user))


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def admin_delete_user(request, id):
    user = get_object_or_404(User, id=id)

    if user.id == request.user.id:
        return Response({"message": "Ne možete obrisati sopstveni nalog."}, status=400)

    user.delete()
    return Response(status=204)