import hashlib
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DATABASE_PATH

DEFAULT_ADMIN_USERNAME = "ms"
DEFAULT_ADMIN_PASSWORD = "1466"
DEFAULT_WORKSPACE_KIND = "heartsound"
DEFAULT_FILE_ROLE = "data"


def _default_admin_password_hash() -> str:
    return hashlib.sha256(DEFAULT_ADMIN_PASSWORD.encode("utf-8")).hexdigest()


@contextmanager
def db_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS files (
                file_id TEXT PRIMARY KEY,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL UNIQUE,
                relative_path TEXT,
                workspace_kind TEXT NOT NULL DEFAULT 'heartsound',
                file_role TEXT NOT NULL DEFAULT 'data',
                extension TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                uploaded_at TEXT NOT NULL
            )
            """
        )
        file_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(files)").fetchall()
        }
        if "workspace_kind" not in file_columns:
            connection.execute(
                "ALTER TABLE files ADD COLUMN workspace_kind TEXT NOT NULL DEFAULT 'heartsound'"
            )
        if "file_role" not in file_columns:
            connection.execute(
                "ALTER TABLE files ADD COLUMN file_role TEXT NOT NULL DEFAULT 'data'"
            )
        connection.execute(
            """
            UPDATE files
            SET workspace_kind = COALESCE(NULLIF(workspace_kind, ''), ?)
            """,
            (DEFAULT_WORKSPACE_KIND,),
        )
        connection.execute(
            """
            UPDATE files
            SET file_role = COALESCE(NULLIF(file_role, ''), ?)
            """,
            (DEFAULT_FILE_ROLE,),
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC)"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_mode TEXT NOT NULL DEFAULT 'code',
                admin_username TEXT,
                admin_password_hash TEXT,
                admin_password_updated_at TEXT
            )
            """
        )
        connection.execute(
            """
            INSERT INTO auth_settings (id, access_mode)
            VALUES (1, 'code')
            ON CONFLICT(id) DO NOTHING
            """
        )
        auth_settings_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(auth_settings)").fetchall()
        }
        if "admin_username" not in auth_settings_columns:
            connection.execute("ALTER TABLE auth_settings ADD COLUMN admin_username TEXT")
        connection.execute(
            """
            UPDATE auth_settings
            SET admin_username = COALESCE(NULLIF(admin_username, ''), ?)
            WHERE id = 1
            """,
            (DEFAULT_ADMIN_USERNAME,),
        )
        connection.execute(
            """
            UPDATE auth_settings
            SET admin_password_hash = COALESCE(admin_password_hash, ?)
            WHERE id = 1
            """,
            (_default_admin_password_hash(),),
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                session_token TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS access_codes (
                code TEXT PRIMARY KEY,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                used_at TEXT
            )
            """
        )
