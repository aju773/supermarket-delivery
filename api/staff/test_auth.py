"""Staff login, logout and change own password through the admin API (session cookie + CSRF)."""

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import Client

pytestmark = pytest.mark.django_db

PASSWORD = "correct horse battery"


@pytest.fixture
def staff_member():
    return User.objects.create_user(username="priya", password=PASSWORD)


@pytest.fixture
def browser():
    """A client that enforces CSRF like a real browser, holding the CSRF cookie the login page fetches."""
    client = Client(enforce_csrf_checks=True)
    client.get("/api/admin/auth/csrf")
    return client


def post(client, path, data=None):
    return client.post(
        path,
        data=data or {},
        content_type="application/json",
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )


def log_in(client, username="priya", password=PASSWORD):
    return post(client, "/api/admin/auth/login", {"username": username, "password": password})


def test_staff_member_logs_in_and_stays_signed_in_for_30_days(browser, staff_member):
    response = log_in(browser)

    assert response.status_code == 200
    assert response.json() == {"username": "priya"}
    assert browser.cookies["sessionid"]["max-age"] == 30 * 24 * 60 * 60
    assert browser.get("/api/admin/auth/me").json() == {"username": "priya"}


def test_wrong_password_is_rejected(browser, staff_member):
    response = log_in(browser, password="wrong")

    assert response.status_code == 401
    assert browser.get("/api/admin/auth/me").status_code == 401


def test_deactivated_staff_member_cannot_log_in(browser, staff_member):
    staff_member.is_active = False
    staff_member.save()

    assert log_in(browser).status_code == 401


def test_deactivated_staff_member_loses_an_existing_session(browser, staff_member):
    log_in(browser)
    staff_member.is_active = False
    staff_member.save()

    assert browser.get("/api/admin/auth/me").status_code == 401


def test_login_without_csrf_token_is_rejected(staff_member):
    client = Client(enforce_csrf_checks=True)

    response = client.post(
        "/api/admin/auth/login",
        data={"username": "priya", "password": PASSWORD},
        content_type="application/json",
    )

    assert response.status_code == 403


def test_logout_ends_the_session(browser, staff_member):
    log_in(browser)

    assert post(browser, "/api/admin/auth/logout").status_code == 204
    assert browser.get("/api/admin/auth/me").status_code == 401


def test_anonymous_requests_to_admin_endpoints_are_rejected(browser):
    assert browser.get("/api/admin/auth/me").status_code == 401
    assert post(browser, "/api/admin/auth/logout").status_code == 401
    assert post(browser, "/api/admin/auth/password", {"current_password": "x", "new_password": "y"}).status_code == 401


def test_admin_writes_without_csrf_token_are_rejected(browser, staff_member):
    log_in(browser)

    response = browser.post(
        "/api/admin/auth/password",
        data={"current_password": PASSWORD, "new_password": "a brand new secret"},
        content_type="application/json",
    )

    assert response.status_code == 403
    staff_member.refresh_from_db()
    assert staff_member.check_password(PASSWORD)


def test_staff_member_changes_own_password_and_stays_logged_in(browser, staff_member):
    log_in(browser)

    response = post(
        browser,
        "/api/admin/auth/password",
        {"current_password": PASSWORD, "new_password": "a brand new secret"},
    )

    assert response.status_code == 204
    assert browser.get("/api/admin/auth/me").status_code == 200
    staff_member.refresh_from_db()
    assert staff_member.check_password("a brand new secret")


def test_change_password_rejects_wrong_current_password(browser, staff_member):
    log_in(browser)

    response = post(
        browser,
        "/api/admin/auth/password",
        {"current_password": "wrong", "new_password": "a brand new secret"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Current password is wrong."}
    staff_member.refresh_from_db()
    assert staff_member.check_password(PASSWORD)


def test_change_password_rejects_a_too_short_new_password(browser, staff_member):
    log_in(browser)

    response = post(browser, "/api/admin/auth/password", {"current_password": PASSWORD, "new_password": "short"})

    assert response.status_code == 400
    assert "at least 8 characters" in response.json()["detail"]


def test_first_staff_member_is_created_from_the_command_line(browser, monkeypatch):
    # The README's `manage.py createsuperuser`, run without prompts.
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", PASSWORD)
    call_command("createsuperuser", interactive=False, username="owner", email="")

    assert log_in(browser, username="owner").status_code == 200
