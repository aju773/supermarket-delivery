"""Staff account rules the API enforces: the admin can never be locked out."""

from django.contrib.auth.models import User
from django.db import transaction


class AccountError(Exception):
    """A Staff account change that isn't allowed; the message is shown to the Staff Member."""


def deactivate(member: User, by: User) -> User:
    """Deactivates `member` (accounts are never deleted). Not your own, and never the last active one."""
    if member.pk == by.pk:
        raise AccountError("You can't deactivate your own account.")
    with transaction.atomic():
        # Locks every active account, so two Staff Members deactivating each other can't both succeed.
        active = {user.pk: user for user in User.objects.select_for_update().filter(is_active=True)}
        if active.keys() <= {member.pk}:
            raise AccountError("You can't deactivate the last active account.")
        locked = active.get(member.pk)
        if locked is not None:
            locked.is_active = False
            locked.save(update_fields=["is_active"])
            return locked
    return member
