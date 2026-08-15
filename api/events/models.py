import uuid

from django.db import models

from core.managers import ActiveManager


class Event(models.Model):
    class Type(models.TextChoices):
        WEDDING = "wedding", "Wedding"
        BIRTHDAY = "birthday", "Birthday"
        BAPTISM = "baptism", "Baptism"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="events"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64)
    venue_name = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    cover_image = models.ForeignKey(
        "media_items.Media",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cover_of_events",
    )
    gallery = models.ManyToManyField(
        "media_items.Media", blank=True, related_name="gallery_events"
    )
    allow_plus_one = models.BooleanField(default=False)
    rsvp_deadline = models.DateTimeField(null=True, blank=True)
    require_approval = models.BooleanField(default=False)
    primary_color = models.CharField(max_length=32, blank=True)
    secondary_color = models.CharField(max_length=32, blank=True)
    font_family = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    def __str__(self):
        return self.title
