import pytest
from django.utils import timezone

from conftest import auth_headers
from media_items.models import Media

CREATE_MEDIA = """
mutation($image: Upload!) {
  createMedia(image: $image) {
    id
    uploadedBy { email }
  }
}
"""

MEDIA_ITEMS = """
{ mediaItems { id } }
"""

UPDATE_MEDIA = """
mutation($id: ID!, $image: Upload!) {
  updateMedia(id: $id, image: $image) { id }
}
"""

DELETE_MEDIA = """
mutation($id: ID!) {
  deleteMedia(id: $id)
}
"""


@pytest.mark.django_db
def test_active_manager_excludes_soft_deleted(user, sample_image):
    active = Media.objects.create(image=sample_image(), uploaded_by=user)
    deleted = Media.objects.create(image=sample_image(), uploaded_by=user, deleted_at=timezone.now())

    assert list(Media.objects.values_list("id", flat=True)) == [active.id]
    assert set(Media.all_objects.values_list("id", flat=True)) == {active.id, deleted.id}


@pytest.mark.django_db
def test_query_media_items_excludes_deleted(graphql_client, user, sample_image):
    Media.objects.create(image=sample_image(), uploaded_by=user)
    Media.objects.create(image=sample_image(), uploaded_by=user, deleted_at=timezone.now())

    response = graphql_client.query(MEDIA_ITEMS)

    assert len(response.data["mediaItems"]) == 1


@pytest.mark.django_db
def test_create_media_requires_auth(graphql_client, sample_image):
    response = graphql_client.query(
        CREATE_MEDIA, variables={"image": None}, files={"image": sample_image()}, assert_no_errors=False
    )

    assert response.errors[0]["message"] == "Authentication required"


@pytest.mark.django_db
def test_create_media_forces_uploaded_by(graphql_client, user, sample_image):
    response = graphql_client.query(
        CREATE_MEDIA, variables={"image": None}, files={"image": sample_image()}, headers=auth_headers(user)
    )

    assert response.data["createMedia"]["uploadedBy"]["email"] == user.email


@pytest.mark.django_db
def test_update_media_denies_non_owner(graphql_client, user, other_user, sample_image):
    media = Media.objects.create(image=sample_image(), uploaded_by=user)

    response = graphql_client.query(
        UPDATE_MEDIA,
        variables={"id": str(media.id), "image": None},
        files={"image": sample_image()},
        headers=auth_headers(other_user),
        assert_no_errors=False,
    )

    assert response.errors[0]["message"] == "Permission denied"


@pytest.mark.django_db
def test_update_media_allows_admin(graphql_client, user, admin_user, sample_image):
    media = Media.objects.create(image=sample_image(), uploaded_by=user)

    response = graphql_client.query(
        UPDATE_MEDIA,
        variables={"id": str(media.id), "image": None},
        files={"image": sample_image()},
        headers=auth_headers(admin_user),
    )

    assert response.data["updateMedia"]["id"] == str(media.id)


@pytest.mark.django_db
def test_delete_media_soft_deletes(graphql_client, user, sample_image):
    media = Media.objects.create(image=sample_image(), uploaded_by=user)

    response = graphql_client.query(
        DELETE_MEDIA, variables={"id": str(media.id)}, headers=auth_headers(user)
    )

    assert response.data["deleteMedia"] is True
    media.refresh_from_db()
    assert media.deleted_at is not None
