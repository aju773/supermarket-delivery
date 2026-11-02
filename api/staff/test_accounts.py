"""Staff accounts through the admin API: list, add, reset password, deactivate and reactivate."""

import pytest
from django.contrib.auth.models import User
from django.test import Client

from catalog.testing import send
from staff.accounts import AccountError, deactivate

pytestmark = pytest.mark.django_db

PASSWORD = "correct horse battery"
NEW_PASSWORD = "a brand new secret"


@pytest.fixture
def staff():
    """Priya's logged-in browser, enforcing CSRF like a real one."""
    User.objects.create_user(username="priya", password=PASSWORD)
    client = browser()
    assert log_in(client, "priya", PASSWORD).status_code == 200
    return client


@pytest.fixture
def lakshmi():
    return User.objects.create_user(username="lakshmi", password=PASSWORD)


def log_in(client, username, password):
    return send(client, "post", "/api/admin/auth/login", {"username": username, "password": password})


def browser():
    client = Client(enforce_csrf_checks=True)
    client.get("/api/admin/auth/csrf")
    return client


def test_staff_sees_every_account_with_active_status_and_which_is_theirs(staff, lakshmi):
    arjun = User.objects.create_user(username="arjun", password=PASSWORD, is_active=False)

    response = staff.get("/api/admin/staff")

    assert response.status_code == 200
    assert response.json() == [
        {"id": lakshmi.id, "username": "lakshmi", "is_active": True, "is_you": False},
        {"id": User.objects.get(username="priya").id, "username": "priya", "is_active": True, "is_you": True},
        {"id": arjun.id, "username": "arjun", "is_active": False, "is_you": False},
    ]


def test_staff_adds_a_member_who_can_then_log_in(staff):
    response = send(staff, "post", "/api/admin/staff", {"username": "  suresh ", "password": PASSWORD})

    assert response.status_code == 201
    assert response.json() == {"id": response.json()["id"], "username": "suresh", "is_active": True, "is_you": False}
    assert log_in(browser(), "suresh", PASSWORD).status_code == 200


@pytest.mark.parametrize(
    ("username", "password", "field"),
    [
        ("  ", PASSWORD, "username"),
        ("PRIYA", PASSWORD, "username"),
        ("has space", PASSWORD, "username"),
        ("suresh", "short", "password"),
        ("suresh", "12345678901", "password"),
    ],
)
def test_new_member_needs_a_free_valid_username_and_a_strong_password(staff, username, password, field):
    response = send(staff, "post", "/api/admin/staff", {"username": username, "password": password})

    assert response.status_code == 400
    assert field in response.json()["errors"]
    assert User.objects.count() == 1


def test_staff_resets_another_members_password(staff, lakshmi):
    response = send(staff, "post", f"/api/admin/staff/{lakshmi.id}/password", {"new_password": NEW_PASSWORD})

    assert response.status_code == 204
    assert log_in(browser(), "lakshmi", NEW_PASSWORD).status_code == 200
    assert log_in(browser(), "lakshmi", PASSWORD).status_code == 401


def test_reset_logs_the_member_out_of_their_existing_sessions(staff, lakshmi):
    theirs = browser()
    log_in(theirs, "lakshmi", PASSWORD)

    send(staff, "post", f"/api/admin/staff/{lakshmi.id}/password", {"new_password": NEW_PASSWORD})

    assert theirs.get("/api/admin/auth/me").status_code == 401


def test_reset_rejects_a_weak_password(staff, lakshmi):
    response = send(staff, "post", f"/api/admin/staff/{lakshmi.id}/password", {"new_password": "short"})

    assert response.status_code == 400
    lakshmi.refresh_from_db()
    assert lakshmi.check_password(PASSWORD)


def test_staff_resets_their_own_password_through_change_password_instead(staff):
    me = User.objects.get(username="priya")

    response = send(staff, "post", f"/api/admin/staff/{me.id}/password", {"new_password": NEW_PASSWORD})

    assert response.status_code == 400
    assert "Change password" in response.json()["detail"]
    me.refresh_from_db()
    assert me.check_password(PASSWORD)


def test_deactivated_member_cannot_log_in_and_is_reactivated_later(staff, lakshmi):
    deactivated = send(staff, "post", f"/api/admin/staff/{lakshmi.id}/deactivate")

    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert log_in(browser(), "lakshmi", PASSWORD).status_code == 401

    reactivated = send(staff, "post", f"/api/admin/staff/{lakshmi.id}/reactivate")

    assert reactivated.status_code == 200
    assert reactivated.json()["is_active"] is True
    assert log_in(browser(), "lakshmi", PASSWORD).status_code == 200


def test_deactivated_member_stays_in_the_list_and_on_order_history(staff, lakshmi):
    send(staff, "post", f"/api/admin/staff/{lakshmi.id}/deactivate")

    assert User.objects.filter(username="lakshmi").exists()
    assert "lakshmi" in [member["username"] for member in staff.get("/api/admin/staff").json()]


def test_staff_cannot_deactivate_their_own_account(staff):
    me = User.objects.get(username="priya")

    response = send(staff, "post", f"/api/admin/staff/{me.id}/deactivate")

    assert response.status_code == 400
    assert response.json()["detail"] == "You can't deactivate your own account."
    me.refresh_from_db()
    assert me.is_active
    assert staff.get("/api/admin/auth/me").status_code == 200


def test_the_last_active_account_cannot_be_deactivated(lakshmi):
    gone = User.objects.create_user(username="gone", password=PASSWORD, is_active=False)

    with pytest.raises(AccountError, match="last active account"):
        deactivate(lakshmi, by=gone)

    lakshmi.refresh_from_db()
    assert lakshmi.is_active


def test_unknown_member_is_not_found(staff):
    assert send(staff, "post", "/api/admin/staff/99999/deactivate").status_code == 404
    assert send(staff, "post", "/api/admin/staff/99999/reactivate").status_code == 404
    assert send(staff, "post", "/api/admin/staff/99999/password", {"new_password": NEW_PASSWORD}).status_code == 404


def test_anonymous_requests_are_rejected():
    anonymous = browser()
    member = User.objects.create_user(username="lakshmi", password=PASSWORD)

    assert anonymous.get("/api/admin/staff").status_code == 401
    assert send(anonymous, "post", "/api/admin/staff", {"username": "x", "password": PASSWORD}).status_code == 401
    for action in ("deactivate", "reactivate"):
        assert send(anonymous, "post", f"/api/admin/staff/{member.id}/{action}").status_code == 401
    assert send(anonymous, "post", f"/api/admin/staff/{member.id}/password", {"new_password": NEW_PASSWORD}).status_code == 401
    member.refresh_from_db()
    assert member.is_active
    assert member.check_password(PASSWORD)


def test_writes_without_csrf_token_are_rejected(staff, lakshmi):
    def post(path, data):
        return staff.post(path, data=data, content_type="application/json")

    assert post("/api/admin/staff", {"username": "suresh", "password": PASSWORD}).status_code == 403
    assert post(f"/api/admin/staff/{lakshmi.id}/password", {"new_password": NEW_PASSWORD}).status_code == 403
    assert post(f"/api/admin/staff/{lakshmi.id}/deactivate", {}).status_code == 403
    assert not User.objects.filter(username="suresh").exists()
    lakshmi.refresh_from_db()
    assert lakshmi.is_active
    assert lakshmi.check_password(PASSWORD)
