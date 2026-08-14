from rest_framework import serializers
from .models import Event, Category, EventSource, SavedEvent, Interest


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class EventSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSource
        fields = ["id", "source", "source_url"]


class EventSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    sources = EventSourceSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = "__all__"


class SavedEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedEvent
        fields = ["id", "user", "event", "saved_at"]

class InterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ["id", "name", "slug"]