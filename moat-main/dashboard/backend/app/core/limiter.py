"""Shared slowapi rate limiter instance.

Kept in its own module so both app/main.py (where it is attached to the FastAPI
app state and wired to the exception handler) and route modules (which apply
`@limiter.limit(...)` to individual endpoints) can import the same instance
without creating a circular import between app/main.py and the routers.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
