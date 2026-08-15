import pytest

from users.models import User


@pytest.mark.django_db
def test_create_user_defaults():
    user = User.objects.create_user(email="a@example.com", name="A", password="pw12345")
    assert user.is_admin is False
    assert user.is_staff is False
    assert user.is_active is True
    assert user.password != "pw12345"
    assert user.check_password("pw12345")


@pytest.mark.django_db
def test_create_superuser_defaults():
    user = User.objects.create_superuser(email="admin@example.com", name="Admin", password="pw12345")
    assert user.is_admin is True
    assert user.is_staff is True
    assert user.is_superuser is True
