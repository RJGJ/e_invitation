import datetime

import strawberry
from django.utils import timezone
from strawberry.file_uploads import Upload

from core.permissions import require_auth, require_owner_or_admin
from users.schema import UserType

from .models import Media


@strawberry.type
class MediaType:
    id: strawberry.ID
    image: str
    uploaded_by: UserType
    created_at: datetime.datetime

    @staticmethod
    def from_model(media: Media) -> "MediaType":
        return MediaType(
            id=strawberry.ID(str(media.id)),
            image=media.image.url,
            uploaded_by=UserType.from_model(media.uploaded_by),
            created_at=media.created_at,
        )


@strawberry.type
class Query:
    @strawberry.field
    def media_items(self) -> list[MediaType]:
        return [MediaType.from_model(m) for m in Media.objects.all()]

    @strawberry.field
    def media_item(self, id: strawberry.ID) -> MediaType | None:
        media = Media.objects.filter(id=id).first()
        return MediaType.from_model(media) if media else None


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_media(self, info: strawberry.Info, image: Upload) -> MediaType:
        user = require_auth(info)
        media = Media.objects.create(image=image, uploaded_by=user)
        return MediaType.from_model(media)

    @strawberry.mutation
    def update_media(self, info: strawberry.Info, id: strawberry.ID, image: Upload) -> MediaType:
        media = Media.objects.filter(id=id).first()
        if media is None:
            raise Exception("Not found")
        require_owner_or_admin(info, media, "uploaded_by")
        media.image = image
        media.save()
        return MediaType.from_model(media)

    @strawberry.mutation
    def delete_media(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        media = Media.objects.filter(id=id).first()
        if media is None:
            raise Exception("Not found")
        require_owner_or_admin(info, media, "uploaded_by")
        media.deleted_at = timezone.now()
        media.save()
        return True
