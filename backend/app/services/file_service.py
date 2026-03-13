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
WORKSPACE_KINDS = {"heartsound", "ecg"}
FILE_ROLES = {"data", "parameter"}
HEARTSOUND_REQUIRED_COLUMNS = [
    "Time_Index",
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]
HEARTSOUND_NUMERIC_COLUMNS = [
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]
HEARTSOUND_PARAMETER_REQUIRED_COLUMNS = [
    "Filename",
    "Cycle_Index",
    "S1_start",
    "S1_end",
    "S2_start",
    "S2_end",
    "next_S1_start",
    "S1_width",
    "S2_width",
    "S1_S2_interval",
    "S2_S1_interval",
    "cycle_duration",
    "sys_dia_ratio",
    "S1_ratio",
    "S2_ratio",
    "Peak_S1",
    "area_S1",
    "rms_S1",
    "S1_peak_1",
    "S1_area_1",
    "S1_peak_2",
    "S1_area_2",
    "S1_peak_3",
    "S1_area_3",
    "S1_peak_4",
    "S1_area_4",
    "Peak_S1_S2",
    "area_S1_S2",
    "rms_S1_S2",
    "S1_S2_peak_1",
    "S1_S2_area_1",
    "S1_S2_peak_2",
    "S1_S2_area_2",
    "S1_S2_peak_3",
    "S1_S2_area_3",
    "S1_S2_peak_4",
    "S1_S2_area_4",
    "Peak_S2",
    "area_S2",
    "rms_S2",
    "S2_peak_1",
    "S2_area_1",
    "S2_peak_2",
    "S2_area_2",
    "S2_peak_3",
    "S2_area_3",
    "S2_peak_4",
    "S2_area_4",
    "Peak_S2_S1",
    "area_S2_S1",
    "rms_S2_S1",
    "S2_S1_peak_1",
    "S2_S1_area_1",
    "S2_S1_peak_2",
    "S2_S1_area_2",
    "S2_S1_peak_3",
    "S2_S1_area_3",
    "S2_S1_peak_4",
    "S2_S1_area_4",
    "S1_S2_peak_ratio",
    "sys_dia_peak_ratio",
    "S1_S2_area_ratio",
    "sys_dia_area_ratio",
]
HEARTSOUND_PARAMETER_NUMERIC_COLUMNS = [
    column for column in HEARTSOUND_PARAMETER_REQUIRED_COLUMNS if column != "Filename"
]
ECG_REQUIRED_COLUMNS = [
    "raw",
    "major_ps",
    "major_pe",
    "major_qrss",
    "major_qrse",
    "major_ts",
    "major_te",
    "point_ps",
    "point_pe",
    "point_qrss",
    "point_qrse",
    "point_ts",
    "point_te",
]
ECG_NUMERIC_COLUMNS = ECG_REQUIRED_COLUMNS
ECG_PARAMETER_REQUIRED_COLUMNS = [
    "time",
    "p_rs",
    "qrs_rs",
    "t_rs",
    "p_duration",
    "p_area",
    "qrs_duration",
    "qrs_area",
    "t_duration",
    "t_area",
    "pq_interval",
    "st_interval",
    "qq_interval",
    "pq_segment",
    "qt_segment",
    "tp_segment",
    "p_amp",
    "qrs_amp",
    "t_amp",
    "p_avg",
    "qrs_avg",
    "t_avg",
]
ECG_PARAMETER_NUMERIC_COLUMNS = ECG_PARAMETER_REQUIRED_COLUMNS


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


def _validate_dataframe(dataframe: pd.DataFrame, workspace_kind: str, file_role: str) -> None:
    if file_role == "data" and workspace_kind == "heartsound":
        required_columns = HEARTSOUND_REQUIRED_COLUMNS
        numeric_columns = HEARTSOUND_NUMERIC_COLUMNS
    elif file_role == "parameter" and workspace_kind == "heartsound":
        required_columns = HEARTSOUND_PARAMETER_REQUIRED_COLUMNS
        numeric_columns = HEARTSOUND_PARAMETER_NUMERIC_COLUMNS
    elif file_role == "data" and workspace_kind == "ecg":
        required_columns = ECG_REQUIRED_COLUMNS
        numeric_columns = ECG_NUMERIC_COLUMNS
    elif file_role == "parameter" and workspace_kind == "ecg":
        required_columns = ECG_PARAMETER_REQUIRED_COLUMNS
        numeric_columns = ECG_PARAMETER_NUMERIC_COLUMNS
    else:
        raise UploadValidationError("invalid workspace kind or file role")

    missing_columns = [column for column in required_columns if column not in dataframe.columns]
    if missing_columns:
        raise UploadValidationError(
            f"missing required columns: {', '.join(missing_columns)}"
        )

    for column in numeric_columns:
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
        "workspaceKind": row["workspace_kind"],
        "fileRole": row["file_role"],
        "storedName": row["stored_name"],
        "extension": row["extension"],
        "rowCount": row["row_count"],
        "fileSizeBytes": row["file_size_bytes"],
        "uploadedAt": row["uploaded_at"],
    }


def list_files(
    workspace_kind: str | None = None,
    file_role: str | None = None,
) -> list[dict[str, str | int | None]]:
    if workspace_kind is not None and workspace_kind not in WORKSPACE_KINDS:
        raise UploadValidationError("workspace kind must be 'heartsound' or 'ecg'")
    if file_role is not None and file_role not in FILE_ROLES:
        raise UploadValidationError("file role must be 'data' or 'parameter'")

    with db_connection() as connection:
        if workspace_kind is None and file_role is None:
            rows = connection.execute(
                """
                SELECT file_id, original_name, relative_path, workspace_kind, file_role, stored_name, extension,
                       row_count, file_size_bytes, uploaded_at
                FROM files
                ORDER BY uploaded_at DESC
                """
            ).fetchall()
        elif workspace_kind is not None and file_role is None:
            rows = connection.execute(
                """
                SELECT file_id, original_name, relative_path, workspace_kind, file_role, stored_name, extension,
                       row_count, file_size_bytes, uploaded_at
                FROM files
                WHERE workspace_kind = ?
                ORDER BY uploaded_at DESC
                """,
                (workspace_kind,),
            ).fetchall()
        elif workspace_kind is None and file_role is not None:
            rows = connection.execute(
                """
                SELECT file_id, original_name, relative_path, workspace_kind, file_role, stored_name, extension,
                       row_count, file_size_bytes, uploaded_at
                FROM files
                WHERE file_role = ?
                ORDER BY uploaded_at DESC
                """,
                (file_role,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT file_id, original_name, relative_path, workspace_kind, file_role, stored_name, extension,
                       row_count, file_size_bytes, uploaded_at
                FROM files
                WHERE workspace_kind = ? AND file_role = ?
                ORDER BY uploaded_at DESC
                """,
                (workspace_kind, file_role),
            ).fetchall()

    return [_to_api_file(row) for row in rows]


def get_file_metadata(file_id: str) -> dict[str, str | int | None] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT file_id, original_name, relative_path, workspace_kind, file_role, stored_name, extension,
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
                workspace_kind,
                file_role,
                extension,
                row_count,
                file_size_bytes,
                uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                metadata["fileId"],
                metadata["originalName"],
                metadata["storedName"],
                metadata["relativePath"],
                metadata["workspaceKind"],
                metadata["fileRole"],
                metadata["extension"],
                metadata["rowCount"],
                metadata["fileSizeBytes"],
                metadata["uploadedAt"],
            ),
        )


async def save_uploaded_file(
    upload_file: UploadFile,
    relative_path: str | None = None,
    workspace_kind: str = "heartsound",
    file_role: str = "data",
) -> dict[str, str | int | None]:
    if workspace_kind not in WORKSPACE_KINDS:
        raise UploadValidationError("workspace kind must be 'heartsound' or 'ecg'")
    if file_role not in FILE_ROLES:
        raise UploadValidationError("file role must be 'data' or 'parameter'")

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
        _validate_dataframe(dataframe, workspace_kind, file_role)
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
        "workspaceKind": workspace_kind,
        "fileRole": file_role,
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
