"""Helpers shared by the catalog API tests."""


def send(client, method, path, data=None):
    """A JSON request carrying the CSRF token, like the admin's browser code."""
    return getattr(client, method)(
        path,
        data=data or {},
        content_type="application/json",
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )
