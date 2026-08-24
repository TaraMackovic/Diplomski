from django.urls import path
from . import views

urlpatterns = [
    path("events/", views.all_events),
    path("events/<int:id>/", views.event_details),
    path("events/<int:id>/save/", views.save_event),
    path("events/<int:id>/is-saved/", views.is_event_saved),
    path("saved-events/", views.my_saved_events),
    path("categories/", views.categories),
    path("interests/", views.all_interests),
    path("my-interests/", views.my_interests),
    path("events/<int:id>/similar/", views.similar_events),
    path("events/recommended/", views.recommended_events),
]