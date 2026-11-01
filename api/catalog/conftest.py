import pytest
from django.contrib.auth.models import User
from django.test import Client

from catalog.testing import send


@pytest.fixture
def staff():
    """A logged-in Staff Member's browser, enforcing CSRF like a real one."""
    User.objects.create_user(username="priya", password="correct horse battery")
    client = Client(enforce_csrf_checks=True)
    client.get("/api/admin/auth/csrf")
    send(client, "post", "/api/admin/auth/login", {"username": "priya", "password": "correct horse battery"})
    return client
