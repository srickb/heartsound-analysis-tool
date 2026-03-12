from __future__ import annotations

import io
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pandas as pd
from fastapi import UploadFile

from app.config import UPLOAD_DIR
from app.db import db_connection

SUPPORTED_EXTENSIONS = {".csv", ".xlsx"}
REQUIRED_COLUMNS = [
    "Time_Index",
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]
NUMERIC_COLUMNS = [
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]


class UploadValidationError(Exception):
    pass


def _normalize_relative_path(relative_path: str | None) -> str | None:
    if relative_path is None:
        return None

    cleaned = relative_path.strip().replace("\\", "/")
    if not cleaned:
        return None

    if cleaned.startswith("/"):
        cleaned = cleaned.lstrip("/")

    if ".." in cleaned.split("/"):
        raise UploadValidationError("relative path must not include '..'")

    return cleaned


def _read_dataframe(file_bytes: bytes, extension: str) -> pd.DataFrame:
    if extension == ".csv":
        return pd.read_csv(io.BytesIO(file_bytes))
    if extension == ".xlsx":
        return pd.read_excel(io.BytesIO(file_bytes))
    raise UploadValidationError(f"unsupported file extension: {extension}")


def _validate_dataframe(dataframe: pd.DataFrame) -> None:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in dataframe.columns]
    if missing_columns:
        raise UploadValidationError(
            f"missing required columns: {', '.join(missing_columns)}"
        )

    for column in NUMERIC_COLUMNS:
        try:
            pd.to_numeric(dataframe[column], errors="raise")
        except Exception as error:  # pandas raises different error types per dtype
            raise UploadValidationError(
                f"column '{column}' must be numeric-convertible"
            ) from error


def _to_api_file(row: sqlite3.Row) -> dict[str, str | int | None]:
    return {
        "fileId": row["file_id"],
        "originalName": row["original_name"],
        "relativePath": row["relative_path"],
        "storedName": row["stored_name"],
        "extension": row["extension"],
        "rowCount": row["row_count"],
        "fileSizeBytes": row["file_size_bytes"],
        "uploadedAt": row["uploaded_at"],
    }


def list_files() -> list[dict[str, str | int | None]]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT file_id, original_name, relative_path, stored_name, extension,
                   row_count, file_size_bytes, uploaded_at
            FROM files
            ORDER BY uploaded_at DESC
            """
        ).fetchall()

    return [_to_api_file(row) for row in rows]


def get_file_metadata(file_id: str) -> dict[str, str | int | None] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT file_id, original_name, relative_path, stored_name, extension,
                   row_count, file_size_bytes, uploaded_at
            FROM files
            WHERE file_id = ?
            """,
            (file_id,),
        ).fetchone()
    if row is None:
        return None
    return _to_api_file(row)


def _insert_file_metadata(metadata: dict[str, str | int | None]) -> None:
    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO files (
                file_id,
                original_name,
                stored_name,
                relative_path,
                extension,
                row_count,
                file_size_bytes,
                uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                metadata["fileId"],
                metadata["originalName"],
                metadata["storedName"],
                metadata["relativePath"],
                metadata["extension"],
                metadata["rowCount"],
                metadata["fileSizeBytes"],
                metadata["uploadedAt"],
            ),
        )


async def save_uploaded_file(
    upload_file: UploadFile, relative_path: str | None = None
) -> dict[str, str | int | None]:
    original_name = upload_file.filename or "unknown"
    extension = Path(original_name).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise UploadValidationError(
            f"unsupported file extension '{extension or '(none)'}'. only csv/xlsx allowed"
        )

    file_bytes = await upload_file.read()
    if not file_bytes:
        raise UploadValidationError("file is empty")

    try:
        dataframe = _read_dataframe(file_bytes, extension)
        _validate_dataframe(dataframe)
    except UploadValidationError:
        raise
    except Exception as error:
        raise UploadValidationError(f"failed to parse '{original_name}'") from error

    file_id = str(uuid4())
    stored_name = f"{file_id}{extension}"
    stored_path = UPLOAD_DIR / stored_name

    metadata: dict[str, str | int | None] = {
        "fileId": file_id,
        "originalName": original_name,
        "relativePath": _normalize_relative_path(relative_path),
        "storedName": stored_name,
        "extension": extension,
        "rowCount": int(len(dataframe.index)),
        "fileSizeBytes": len(file_bytes),
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
    }

    try:
        stored_path.write_bytes(file_bytes)
        _insert_file_metadata(metadata)
    except Exception:
        if stored_path.exists():
            stored_path.unlink(missing_ok=True)
        raise

    return metadata


def delete_files(file_ids: list[str]) -> tuple[list[str], list[str]]:
    deleted_ids: list[str] = []
    not_found_ids: list[str] = []

    with db_connection() as connection:
        for file_id in file_ids:
            row = connection.execute(
                "SELECT stored_name FROM files WHERE file_id = ?",
                (file_id,),
            ).fetchone()

            if row is None:
                not_found_ids.append(file_id)
                continue

            connection.execute("DELETE FROM files WHERE file_id = ?", (file_id,))
            deleted_ids.append(file_id)

            stored_path = UPLOAD_DIR / row["stored_name"]
            if stored_path.exists():
                stored_path.unlink(missing_ok=True)

    return deleted_ids, not_found_ids
