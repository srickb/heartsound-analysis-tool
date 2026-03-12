import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DATABASE_PATH


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
                extension TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                uploaded_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC)"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_mode TEXT NOT NULL DEFAULT 'open',
                admin_password_hash TEXT,
                admin_password_updated_at TEXT
            )
            """
        )
        connection.execute(
            """
            INSERT INTO auth_settings (id, access_mode)
            VALUES (1, 'open')
            ON CONFLICT(id) DO NOTHING
            """
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
