import json

import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import Client, RequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import auth_headers
from core.authentication_middleware import JWTAuthenticationMiddleware


def _run_middleware(request):
    request.user = AnonymousUser()
    seen = {}

    def get_response(req):
        seen["user"] = req.user
        return "ok"

    JWTAuthenticationMiddleware(get_response)(request)
    return seen["user"]


@pytest.mark.django_db
def test_middleware_sets_user_for_valid_token(user):
    factory = RequestFactory()
    token = RefreshToken.for_user(user).access_token
    request = factory.get("/graphql/", HTTP_AUTHORIZATION=f"Bearer {token}")

    resolved_user = _run_middleware(request)

    assert resolved_user.id == user.id


@pytest.mark.django_db
def test_middleware_anonymous_for_missing_header():
    factory = RequestFactory()
    request = factory.get("/graphql/")

    resolved_user = _run_middleware(request)

    assert resolved_user.is_authenticated is False


@pytest.mark.django_db
def test_middleware_anonymous_for_malformed_header():
    factory = RequestFactory()
    request = factory.get("/graphql/", HTTP_AUTHORIZATION="not-a-bearer-token")

    resolved_user = _run_middleware(request)

    assert resolved_user.is_authenticated is False


@pytest.mark.django_db
def test_middleware_anonymous_for_expired_or_invalid_token():
    factory = RequestFactory()
    request = factory.get("/graphql/", HTTP_AUTHORIZATION="Bearer garbage.invalid.token")

    resolved_user = _run_middleware(request)

    assert resolved_user.is_authenticated is False


@pytest.mark.django_db
def test_token_obtain_happy_path(user):
    client = Client()
    response = client.post(
        "/api/token/",
        data=json.dumps({"email": user.email, "password": "pw12345"}),
        content_type="application/json",
    )

    assert response.status_code == 200
    body = response.json()
    assert "access" in body and "refresh" in body


@pytest.mark.django_db
def test_token_obtain_invalid_credentials(user):
    client = Client()
    response = client.post(
        "/api/token/",
        data=json.dumps({"email": user.email, "password": "wrong"}),
        content_type="application/json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_token_refresh_happy_path(user):
    refresh = RefreshToken.for_user(user)
    client = Client()

    response = client.post(
        "/api/token/refresh/",
        data=json.dumps({"refresh": str(refresh)}),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert "access" in response.json()


@pytest.mark.django_db
def test_token_refresh_invalid_token():
    client = Client()
    response = client.post(
        "/api/token/refresh/",
        data=json.dumps({"refresh": "garbage"}),
        content_type="application/json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_token_blacklist_then_refresh_fails(user):
    refresh = RefreshToken.for_user(user)
    client = Client()

    blacklist_response = client.post(
        "/api/token/blacklist/",
        data=json.dumps({"refresh": str(refresh)}),
        content_type="application/json",
    )
    assert blacklist_response.status_code == 200

    refresh_response = client.post(
        "/api/token/refresh/",
        data=json.dumps({"refresh": str(refresh)}),
        content_type="application/json",
    )
    assert refresh_response.status_code == 401


@pytest.mark.django_db
def test_graphql_me_anonymous_returns_none():
    from strawberry.django.test import GraphQLTestClient

    gql = GraphQLTestClient(Client())
    response = gql.query("{ me { email } }")
    assert response.data["me"] is None


@pytest.mark.django_db
def test_graphql_me_returns_authenticated_user(user):
    from strawberry.django.test import GraphQLTestClient

    gql = GraphQLTestClient(Client())
    response = gql.query("{ me { email } }", headers=auth_headers(user))
    assert response.data["me"]["email"] == user.email
