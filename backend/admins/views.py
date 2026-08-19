from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from events.models import Event, Category, SavedEvent

from .permissions import IsAdminUser
from .serializers import AdminEventSerializer, AdminCategorySerializer


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
