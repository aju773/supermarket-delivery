"""The Staff page: list accounts, add one, reset another member's password, deactivate and reactivate."""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import Router, Schema, Status
from ninja.security import django_auth

from staff.accounts import AccountError, deactivate

# Every admin endpoint needs a staff session; django_auth also checks the CSRF token on writes.
router = Router(tags=["admin staff"], auth=django_auth)

FIX_ERRORS = "Please fix the errors below."
USERNAME_TAKEN = "There is already an account with this username."
USERNAME_MAX_LENGTH = User._meta.get_field("username").max_length


class NewMember(Schema):
    username: str
    password: str


class PasswordReset(Schema):
    new_password: str


class MemberOut(Schema):
    id: int
    username: str
    is_active: bool
    is_you: bool


def member_out(member: User, request) -> MemberOut:
    return MemberOut(id=member.id, username=member.username, is_active=member.is_active, is_you=member.id == request.user.id)


def username_error(username: str) -> str | None:
    if not username:
        return "Enter a username."
    if len(username) > USERNAME_MAX_LENGTH:
        return f"Use at most {USERNAME_MAX_LENGTH} characters."
    try:
        UnicodeUsernameValidator()(username)
    except ValidationError:
        return "Use only letters, numbers and @ . + - _ characters."
    if User.objects.filter(username__iexact=username).exists():
        return USERNAME_TAKEN
    return None


def password_error(password: str, user: User | None = None) -> str | None:
    try:
        validate_password(password, user)
    except ValidationError as error:
        return " ".join(error.messages)
    return None


@router.get("/staff", response=list[MemberOut])
def list_staff(request):
    """Active accounts first, then deactivated ones."""
    members = User.objects.order_by("-is_active", "username")
    return [member_out(member, request) for member in members]


@router.post("/staff", response={201: MemberOut, 400: dict})
def add_member(request, data: NewMember):
    username = data.username.strip()
    errors = {
        field: message
        for field, message in (
            ("username", username_error(username)),
            ("password", password_error(data.password, User(username=username))),
        )
        if message
    }
    if errors:
        return Status(400, {"detail": FIX_ERRORS, "errors": errors})
    try:
        member = User.objects.create_user(username=username, password=data.password)
    except IntegrityError:  # Another request added the same username in the meantime.
        return Status(400, {"detail": FIX_ERRORS, "errors": {"username": USERNAME_TAKEN}})
    return Status(201, member_out(member, request))


@router.post("/staff/{member_id}/password", response={204: None, 400: dict})
def reset_password(request, member_id: int, data: PasswordReset):
    member = get_object_or_404(User, id=member_id)
    if member.id == request.user.id:
        return Status(400, {"detail": "To change your own password, use Change password in the account menu."})
    if message := password_error(data.new_password, member):
        return Status(400, {"detail": message})
    member.set_password(data.new_password)
    member.save(update_fields=["password"])
    return Status(204, None)


@router.post("/staff/{member_id}/deactivate", response={200: MemberOut, 400: dict})
def deactivate_member(request, member_id: int):
    member = get_object_or_404(User, id=member_id)
    try:
        member = deactivate(member, by=request.user)
    except AccountError as error:
        return Status(400, {"detail": str(error)})
    return member_out(member, request)


@router.post("/staff/{member_id}/reactivate", response=MemberOut)
def reactivate_member(request, member_id: int):
    member = get_object_or_404(User, id=member_id)
    member.is_active = True
    member.save(update_fields=["is_active"])
    return member_out(member, request)
