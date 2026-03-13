from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from app.db import db_connection

SESSION_COOKIE_NAME = "heartsound_session"
ACCESS_MODE_OPEN = "open"
ACCESS_MODE_CODE = "code"
ACCESS_CODE_TTL_MINUTES = 5
VIEWER_SESSION_TTL_HOURS = 8
ADMIN_SESSION_TTL_HOURS = 8
ACCESS_CODE_LENGTH = 6


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class SessionRecord:
    token: str
    role: Literal["viewer", "admin"]
    expires_at: str


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _to_iso(value: datetime) -> str:
    return value.isoformat()


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _cleanup_expired_records() -> None:
    now = _to_iso(_utcnow())
    with db_connection() as connection:
        connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now,))
        connection.execute(
            "DELETE FROM access_codes WHERE expires_at <= ? OR used_at IS NOT NULL",
            (now,),
        )


def get_auth_settings() -> dict[str, str | bool | None]:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT access_mode, admin_username, admin_password_hash
            FROM auth_settings
            WHERE id = 1
            """
        ).fetchone()

    if row is None:
        return {
            "accessMode": ACCESS_MODE_OPEN,
            "adminUsername": None,
            "hasAdminPassword": False,
        }

    return {
        "accessMode": row["access_mode"],
        "adminUsername": row["admin_username"],
        "hasAdminPassword": bool(row["admin_password_hash"]),
    }


def get_public_auth_state(session_token: str | None) -> dict[str, str | bool | None]:
    settings = get_auth_settings()
    session = get_session(session_token)
    is_authenticated = session is not None or settings["accessMode"] == ACCESS_MODE_OPEN
    is_admin = session is not None and session.role == "admin"

    return {
        "accessMode": settings["accessMode"],
        "adminUsername": settings["adminUsername"],
        "hasAdminPassword": settings["hasAdminPassword"],
        "isAuthenticated": is_authenticated,
        "isAdmin": is_admin,
    }


def set_initial_admin_password(username: str, password: str) -> None:
    username = username.strip()
    if len(username) < 1:
        raise AuthError("admin ID is required", status_code=400)
    if len(password) < 4:
        raise AuthError("admin password must be at least 4 characters", status_code=400)

    settings = get_auth_settings()
    if settings["hasAdminPassword"]:
        raise AuthError("admin password is already configured", status_code=409)

    with db_connection() as connection:
        connection.execute(
            """
            UPDATE auth_settings
            SET admin_username = ?, admin_password_hash = ?, admin_password_updated_at = ?
            WHERE id = 1
            """,
            (username, _hash_password(password), _to_iso(_utcnow())),
        )


def change_admin_password(current_password: str, new_password: str) -> None:
    if len(new_password) < 4:
        raise AuthError("new admin password must be at least 4 characters", status_code=400)

    settings = get_auth_settings()
    admin_username = settings["adminUsername"]
    if not isinstance(admin_username, str) or not verify_admin_credentials(
        admin_username, current_password
    ):
        raise AuthError("current admin password is incorrect", status_code=401)

    with db_connection() as connection:
        connection.execute(
            """
            UPDATE auth_settings
            SET admin_password_hash = ?, admin_password_updated_at = ?
            WHERE id = 1
            """,
            (_hash_password(new_password), _to_iso(_utcnow())),
        )


def verify_admin_credentials(username: str, password: str) -> bool:
    username = username.strip()
    with db_connection() as connection:
        row = connection.execute(
            "SELECT admin_username, admin_password_hash FROM auth_settings WHERE id = 1"
        ).fetchone()

    if row is None or not row["admin_username"] or not row["admin_password_hash"]:
        return False
    return secrets.compare_digest(row["admin_username"], username) and secrets.compare_digest(
        row["admin_password_hash"], _hash_password(password)
    )


def update_access_mode(access_mode: str) -> str:
    if access_mode not in {ACCESS_MODE_OPEN, ACCESS_MODE_CODE}:
        raise AuthError("access mode must be 'open' or 'code'", status_code=400)

    with db_connection() as connection:
        connection.execute(
            "UPDATE auth_settings SET access_mode = ? WHERE id = 1",
            (access_mode,),
        )

    return access_mode


def create_session(
    role: Literal["viewer", "admin"],
    ttl_hours: int,
) -> SessionRecord:
    token = secrets.token_urlsafe(32)
    expires_at = _utcnow() + timedelta(hours=ttl_hours)
    session = SessionRecord(token=token, role=role, expires_at=_to_iso(expires_at))

    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO auth_sessions (session_token, role, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session.token, session.role, session.expires_at, _to_iso(_utcnow())),
        )

    return session


def get_session(session_token: str | None) -> SessionRecord | None:
    if not session_token:
        return None

    _cleanup_expired_records()

    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT session_token, role, expires_at
            FROM auth_sessions
            WHERE session_token = ?
            """,
            (session_token,),
        ).fetchone()

    if row is None:
        return None

    if _parse_iso(row["expires_at"]) <= _utcnow():
        clear_session(session_token)
        return None

    return SessionRecord(
        token=row["session_token"],
        role=row["role"],
        expires_at=row["expires_at"],
    )


def clear_session(session_token: str | None) -> None:
    if not session_token:
        return

    with db_connection() as connection:
        connection.execute(
            "DELETE FROM auth_sessions WHERE session_token = ?",
            (session_token,),
        )


def require_viewer_access(session_token: str | None) -> SessionRecord | None:
    settings = get_auth_settings()
    if settings["accessMode"] == ACCESS_MODE_OPEN:
        return get_session(session_token)

    session = get_session(session_token)
    if session is None:
        raise AuthError("login required", status_code=401)
    return session


def require_admin_access(session_token: str | None) -> SessionRecord:
    session = get_session(session_token)
    if session is None or session.role != "admin":
        raise AuthError("admin login required", status_code=401)
    return session


def login_admin(username: str, password: str) -> SessionRecord:
    if not verify_admin_credentials(username, password):
        raise AuthError("admin ID or password is incorrect", status_code=401)
    return create_session("admin", ADMIN_SESSION_TTL_HOURS)


def generate_access_code() -> dict[str, str]:
    _cleanup_expired_records()

    for _ in range(20):
        code = f"{secrets.randbelow(10**ACCESS_CODE_LENGTH):0{ACCESS_CODE_LENGTH}d}"
        expires_at = _utcnow() + timedelta(minutes=ACCESS_CODE_TTL_MINUTES)
        try:
            with db_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO access_codes (code, expires_at, created_at, used_at)
                    VALUES (?, ?, ?, NULL)
                    """,
                    (code, _to_iso(expires_at), _to_iso(_utcnow())),
                )
            print(
                f"One-time access code generated: {code} "
                f"(valid for {ACCESS_CODE_TTL_MINUTES} minutes, expires {_to_iso(expires_at)})"
            )
            return {
                "expiresAt": _to_iso(expires_at),
            }
        except Exception:
            continue

    raise AuthError("failed to generate access code", status_code=500)


def redeem_access_code(code: str) -> SessionRecord:
    if not code.isdigit():
        raise AuthError("access code must contain digits only", status_code=400)

    _cleanup_expired_records()

    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT code, expires_at, used_at
            FROM access_codes
            WHERE code = ?
            """,
            (code,),
        ).fetchone()

        if row is None:
            raise AuthError("invalid or expired access code", status_code=401)

        if row["used_at"] is not None or _parse_iso(row["expires_at"]) <= _utcnow():
            connection.execute("DELETE FROM access_codes WHERE code = ?", (code,))
            raise AuthError("invalid or expired access code", status_code=401)

        connection.execute(
            "UPDATE access_codes SET used_at = ? WHERE code = ?",
            (_to_iso(_utcnow()), code),
        )

    return create_session("viewer", VIEWER_SESSION_TTL_HOURS)
