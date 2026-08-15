import time

import pytest
from django.utils import timezone

from conftest import auth_headers
from events.models import Event

CREATE_EVENT = """
mutation($input: EventInput!) {
  createEvent(input: $input) {
    id
    author { email }
  }
}
"""

EVENTS = """
{ events { id } }
"""

UPDATE_EVENT = """
mutation($id: ID!, $input: EventInput!) {
  updateEvent(id: $id, input: $input) { id title }
}
"""

DELETE_EVENT = """
mutation($id: ID!) {
  deleteEvent(id: $id)
}
"""


def _event_input(**overrides):
    input = {
        "title": "Test Event",
        "type": "wedding",
        "startDate": "2026-01-01T00:00:00Z",
        "timezone": "UTC",
    }
    input.update(overrides)
    return input


@pytest.mark.django_db
def test_active_manager_excludes_soft_deleted(user):
    active = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")
    deleted = Event.objects.create(
        author=user, title="B", type="wedding", start_date=timezone.now(), timezone="UTC", deleted_at=timezone.now()
    )

    assert list(Event.objects.values_list("id", flat=True)) == [active.id]
    assert set(Event.all_objects.values_list("id", flat=True)) == {active.id, deleted.id}


@pytest.mark.django_db
def test_updated_at_changes_on_save_created_at_does_not(user):
    event = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")
    created_at = event.created_at
    updated_at = event.updated_at

    time.sleep(0.01)
    event.title = "A2"
    event.save()
    event.refresh_from_db()

    assert event.created_at == created_at
    assert event.updated_at > updated_at


@pytest.mark.django_db
def test_query_events_excludes_deleted(graphql_client, user):
    Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")
    Event.objects.create(
        author=user, title="B", type="wedding", start_date=timezone.now(), timezone="UTC", deleted_at=timezone.now()
    )

    response = graphql_client.query(EVENTS)

    assert len(response.data["events"]) == 1


@pytest.mark.django_db
def test_create_event_requires_auth(graphql_client):
    response = graphql_client.query(
        CREATE_EVENT, variables={"input": _event_input()}, assert_no_errors=False
    )

    assert response.errors[0]["message"] == "Authentication required"


@pytest.mark.django_db
def test_create_event_forces_author(graphql_client, user):
    response = graphql_client.query(
        CREATE_EVENT, variables={"input": _event_input()}, headers=auth_headers(user)
    )

    assert response.data["createEvent"]["author"]["email"] == user.email


@pytest.mark.django_db
def test_update_event_denies_non_owner(graphql_client, user, other_user):
    event = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")

    response = graphql_client.query(
        UPDATE_EVENT,
        variables={"id": str(event.id), "input": _event_input(title="Hacked")},
        headers=auth_headers(other_user),
        assert_no_errors=False,
    )

    assert response.errors[0]["message"] == "Permission denied"


@pytest.mark.django_db
def test_update_event_allows_owner(graphql_client, user):
    event = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")

    response = graphql_client.query(
        UPDATE_EVENT,
        variables={"id": str(event.id), "input": _event_input(title="Updated")},
        headers=auth_headers(user),
    )

    assert response.data["updateEvent"]["title"] == "Updated"


@pytest.mark.django_db
def test_update_event_allows_admin(graphql_client, user, admin_user):
    event = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")

    response = graphql_client.query(
        UPDATE_EVENT,
        variables={"id": str(event.id), "input": _event_input(title="Updated by admin")},
        headers=auth_headers(admin_user),
    )

    assert response.data["updateEvent"]["title"] == "Updated by admin"


@pytest.mark.django_db
def test_delete_event_soft_deletes(graphql_client, user):
    event = Event.objects.create(author=user, title="A", type="wedding", start_date=timezone.now(), timezone="UTC")

    response = graphql_client.query(
        DELETE_EVENT, variables={"id": str(event.id)}, headers=auth_headers(user)
    )

    assert response.data["deleteEvent"] is True
    event.refresh_from_db()
    assert event.deleted_at is not None
