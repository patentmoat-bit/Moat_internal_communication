from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

# Argon2id at library defaults. Tune only against measured hardware -- guessing
# parameters usually makes them weaker, not stronger.
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Verify, without leaking whether the account exists.

    A missing hash still runs a dummy verification so the response time does
    not distinguish "no such user" from "wrong password".
    """
    if not password_hash:
        _hasher.hash(password)  # burn comparable time on a missing account
        return False
    try:
        _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    return True


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)
