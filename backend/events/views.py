from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Event
from .serializers import EventSerializer

from .models import Category
from .serializers import CategorySerializer

from .models import SavedEvent
from .serializers import SavedEventSerializer

from .models import Interest, UserInterest
from .serializers import InterestSerializer


@api_view(["GET"])
def all_events(request):

    events = Event.objects.filter(status="active").order_by("date")

    serializer = EventSerializer(events, many=True)

    return Response(serializer.data)


@api_view(["GET"])
def event_details(request, id):

    try:

        event = Event.objects.get(id=id)

        serializer = EventSerializer(event)

        return Response(serializer.data)

    except Event.DoesNotExist:

        return Response(status=404)
    

@api_view(["GET"])
def categories(request):

    serializer = CategorySerializer(
        Category.objects.all(),
        many=True
    )

    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_event(request, id):
    event = get_object_or_404(Event, id=id)

    saved_qs = SavedEvent.objects.filter(user=request.user, event=event)

    if saved_qs.exists():
        saved_qs.delete()
        return Response({"saved": False})

    SavedEvent.objects.create(user=request.user, event=event)
    return Response({"saved": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_event_saved(request, id):
    exists = SavedEvent.objects.filter(user=request.user, event_id=id).exists()
    return Response({"saved": exists})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_saved_events(request):
    saved = SavedEvent.objects.filter(user=request.user).select_related("event")
    events = [s.event for s in saved]
    serializer = EventSerializer(events, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def all_interests(request):
    serializer = InterestSerializer(Interest.objects.all(), many=True)
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def my_interests(request):
    if request.method == "GET":
        interest_ids = list(
            UserInterest.objects.filter(user=request.user).values_list("interest_id", flat=True)
        )
        return Response({"interest_ids": interest_ids})

    interest_ids = request.data.get("interest_ids", [])

    UserInterest.objects.filter(user=request.user).delete()
    UserInterest.objects.bulk_create([
        UserInterest(user=request.user, interest_id=iid) for iid in interest_ids
    ])

    return Response({"interest_ids": interest_ids})