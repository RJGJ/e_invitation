import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image
from rest_framework_simplejwt.tokens import RefreshToken
from strawberry.django.test import GraphQLTestClient

from users.models import User


@pytest.fixture
def graphql_client():
    return GraphQLTestClient(Client())


@pytest.fixture
def make_user(db):
    def _make_user(email="user@example.com", name="User", is_admin=False):
        return User.objects.create_user(email=email, name=name, password="pw12345", is_admin=is_admin)

    return _make_user


@pytest.fixture
def user(make_user):
    return make_user()


@pytest.fixture
def other_user(make_user):
    return make_user(email="other@example.com", name="Other")


@pytest.fixture
def admin_user(make_user):
    return make_user(email="admin@example.com", name="Admin", is_admin=True)


def auth_headers(user):
    token = RefreshToken.for_user(user)
    return {"Authorization": f"Bearer {token.access_token}"}


@pytest.fixture
def sample_image():
    def _make(name="test.png"):
        buffer = io.BytesIO()
        Image.new("RGB", (1, 1)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    return _make
