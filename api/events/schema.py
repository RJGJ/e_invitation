import datetime

import strawberry
from django.utils import timezone

from core.permissions import require_auth, require_owner_or_admin
from media_items.models import Media
from media_items.schema import MediaType
from users.schema import UserType

from .models import Event

INPUT_FIELDS = [
    "title",
    "description",
    "type",
    "start_date",
    "end_date",
    "timezone",
    "venue_name",
    "address",
    "latitude",
    "longitude",
    "allow_plus_one",
    "rsvp_deadline",
    "require_approval",
    "primary_color",
    "secondary_color",
    "font_family",
]


@strawberry.type
class EventType:
    id: strawberry.ID
    title: str
    description: str
    type: str
    start_date: datetime.datetime
    end_date: datetime.datetime | None
    timezone: str
    venue_name: str
    address: str
    latitude: float | None
    longitude: float | None
    author: UserType
    cover_image: MediaType | None
    gallery: list[MediaType]
    allow_plus_one: bool
    rsvp_deadline: datetime.datetime | None
    require_approval: bool
    primary_color: str
    secondary_color: str
    font_family: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @staticmethod
    def from_model(event: Event) -> "EventType":
        return EventType(
            id=strawberry.ID(str(event.id)),
            title=event.title,
            description=event.description,
            type=event.type,
            start_date=event.start_date,
            end_date=event.end_date,
            timezone=event.timezone,
            venue_name=event.venue_name,
            address=event.address,
            latitude=event.latitude,
            longitude=event.longitude,
            author=UserType.from_model(event.author),
            cover_image=MediaType.from_model(event.cover_image) if event.cover_image_id else None,
            gallery=[MediaType.from_model(m) for m in event.gallery.all()],
            allow_plus_one=event.allow_plus_one,
            rsvp_deadline=event.rsvp_deadline,
            require_approval=event.require_approval,
            primary_color=event.primary_color,
            secondary_color=event.secondary_color,
            font_family=event.font_family,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )


@strawberry.input
class EventInput:
    title: str | None = None
    description: str | None = None
    type: str | None = None
    start_date: datetime.datetime | None = None
    end_date: datetime.datetime | None = None
    timezone: str | None = None
    venue_name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    cover_image_id: strawberry.ID | None = None
    gallery_ids: list[strawberry.ID] | None = None
    allow_plus_one: bool | None = None
    rsvp_deadline: datetime.datetime | None = None
    require_approval: bool | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    font_family: str | None = None


def _apply_input(event: Event, input: EventInput) -> None:
    for field in INPUT_FIELDS:
        value = getattr(input, field)
        if value is not None:
            setattr(event, field, value)
    if input.cover_image_id is not None:
        event.cover_image_id = input.cover_image_id


@strawberry.type
class Query:
    @strawberry.field
    def events(self) -> list[EventType]:
        return [EventType.from_model(e) for e in Event.objects.all()]

    @strawberry.field
    def event(self, id: strawberry.ID) -> EventType | None:
        event = Event.objects.filter(id=id).first()
        return EventType.from_model(event) if event else None

    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType | None:
        user = info.context.request.user
        return UserType.from_model(user) if user.is_authenticated else None


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_event(self, info: strawberry.Info, input: EventInput) -> EventType:
        user = require_auth(info)
        if not input.title or not input.type or not input.start_date or not input.timezone:
            raise Exception("title, type, startDate and timezone are required")
        event = Event(author=user)
        _apply_input(event, input)
        event.save()
        if input.gallery_ids is not None:
            event.gallery.set(Media.objects.filter(id__in=input.gallery_ids))
        return EventType.from_model(event)

    @strawberry.mutation
    def update_event(self, info: strawberry.Info, id: strawberry.ID, input: EventInput) -> EventType:
        event = Event.objects.filter(id=id).first()
        if event is None:
            raise Exception("Not found")
        require_owner_or_admin(info, event, "author")
        _apply_input(event, input)
        event.save()
        if input.gallery_ids is not None:
            event.gallery.set(Media.objects.filter(id__in=input.gallery_ids))
        return EventType.from_model(event)

    @strawberry.mutation
    def delete_event(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        event = Event.objects.filter(id=id).first()
        if event is None:
            raise Exception("Not found")
        require_owner_or_admin(info, event, "author")
        event.deleted_at = timezone.now()
        event.save()
        return True
