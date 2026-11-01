from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.middleware.csrf import get_token
from ninja import Router, Schema, Status
from ninja.security import django_auth
from ninja.utils import check_csrf

# Every admin endpoint needs a staff session; django_auth also checks the CSRF token on writes.
router = Router(tags=["staff"], auth=django_auth)


class Credentials(Schema):
    username: str
    password: str


class StaffMember(Schema):
    username: str


class PasswordChange(Schema):
    current_password: str
    new_password: str


@router.get("/csrf", response={204: None}, auth=None)
def csrf(request):
    """Sets the csrftoken cookie that the admin sends back in the X-CSRFToken header."""
    get_token(request)
    return Status(204, None)


@router.post("/login", response={200: StaffMember, 401: dict}, auth=None)
def log_in(request, credentials: Credentials):
    # Anonymous, so django_auth doesn't run: check CSRF here to stop login CSRF.
    if (csrf_error := check_csrf(request)) is not None:
        return csrf_error
    # Django's ModelBackend refuses deactivated users.
    user = authenticate(request, username=credentials.username, password=credentials.password)
    if user is None:
        return Status(401, {"detail": "Wrong username or password."})
    login(request, user)
    return Status(200, StaffMember(username=user.username))


@router.post("/logout", response={204: None})
def log_out(request):
    logout(request)
    return Status(204, None)


@router.get("/me", response=StaffMember)
def me(request):
    return StaffMember(username=request.user.username)


@router.post("/password", response={204: None, 400: dict})
def change_password(request, change: PasswordChange):
    user = request.user
    if not user.check_password(change.current_password):
        return Status(400, {"detail": "Current password is wrong."})
    try:
        validate_password(change.new_password, user)
    except ValidationError as error:
        return Status(400, {"detail": " ".join(error.messages)})
    user.set_password(change.new_password)
    user.save(update_fields=["password"])
    # Keeps this session signed in; the user's other sessions are logged out.
    update_session_auth_hash(request, user)
    return Status(204, None)
