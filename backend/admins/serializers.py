from rest_framework import serializers
from events.models import Event, Category
from events.serializers import EventSourceSerializer


class AdminEventSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    sources = EventSourceSerializer(many=True, read_only=True)
    saved_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "location", "latitude", "longitude",
            "date", "time_known", "image", "price", "category", "category_name",
            "status", "created_at", "updated_at", "tags", "sources", "saved_count",
        ]

    def get_saved_count(self, obj):
        if hasattr(obj, "saved_count"):
            return obj.saved_count
        return obj.saved_by.count()


class AdminCategorySerializer(serializers.ModelSerializer):
    event_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "event_count"]

    def get_event_count(self, obj):
        if hasattr(obj, "event_count"):
            return obj.event_count
        return obj.events.count()