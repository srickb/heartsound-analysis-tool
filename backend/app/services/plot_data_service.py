from __future__ import annotations

from collections import OrderedDict
from typing import Any

import pandas as pd

from app.config import UPLOAD_DIR
from app.services.downsampling import build_raw_series, downsample_minmax_with_bucket_max
from app.services.file_service import get_file_metadata

PLOT_COLUMNS = [
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]
TARGET_POINTS_MIN = 200
TARGET_POINTS_MAX = 3000
TARGET_POINTS_DEFAULT = 2400
RAW_RANGE_LIMIT = 4000


class PlotDataNotFoundError(Exception):
    pass


class PlotDataValidationError(Exception):
    pass


class LRUCache:
    def __init__(self, max_size: int):
        self.max_size = max_size
        self._store: OrderedDict[tuple[Any, ...] | str, Any] = OrderedDict()

    def get(self, key: tuple[Any, ...] | str) -> Any | None:
        if key not in self._store:
            return None
        self._store.move_to_end(key)
        return self._store[key]

    def set(self, key: tuple[Any, ...] | str, value: Any) -> None:
        self._store[key] = value
        self._store.move_to_end(key)
        if len(self._store) > self.max_size:
            self._store.popitem(last=False)


_dataframe_cache = LRUCache(max_size=16)
_plot_cache = LRUCache(max_size=256)


def _resolve_target_points(panel_width: int | None, target_points: int | None) -> int:
    if target_points is not None:
        return max(TARGET_POINTS_MIN, min(TARGET_POINTS_MAX, target_points))

    if panel_width is not None:
        estimated = int(panel_width * 2.5)
        return max(600, min(TARGET_POINTS_MAX, estimated))

    return TARGET_POINTS_DEFAULT


def _resolve_range(
    mode: str,
    start: int | None,
    end: int | None,
    row_count: int,
) -> tuple[int, int]:
    if row_count <= 0:
        raise PlotDataValidationError("file has no rows")

    if mode == "overview":
        return 0, row_count - 1

    if start is None or end is None:
        raise PlotDataValidationError("start and end are required in range mode")

    if end < start:
        raise PlotDataValidationError("end must be greater than or equal to start")

    clamped_start = max(0, start)
    clamped_end = min(row_count - 1, end)
    if clamped_start > clamped_end:
        raise PlotDataValidationError("requested range is outside file bounds")

    return clamped_start, clamped_end


def _load_dataframe(file_id: str, stored_name: str, extension: str) -> pd.DataFrame:
    cached = _dataframe_cache.get(file_id)
    if cached is not None:
        return cached

    path = UPLOAD_DIR / stored_name
    if not path.exists():
        raise PlotDataNotFoundError("stored file not found on server")

    try:
        if extension == ".csv":
            dataframe = pd.read_csv(path, usecols=PLOT_COLUMNS)
        elif extension == ".xlsx":
            dataframe = pd.read_excel(path, usecols=PLOT_COLUMNS)
        else:
            raise PlotDataValidationError(f"unsupported stored extension: {extension}")
    except Exception as error:
        raise PlotDataValidationError("failed to load stored file for plot data") from error

    for column in PLOT_COLUMNS:
        if column not in dataframe.columns:
            raise PlotDataValidationError(f"stored file missing column: {column}")
        dataframe[column] = pd.to_numeric(dataframe[column], errors="coerce")

    _dataframe_cache.set(file_id, dataframe)
    return dataframe


def _build_plot_payload(
    file_id: str,
    original_row_count: int,
    start_index: int,
    end_index: int,
    dataframe: pd.DataFrame,
    target_points: int,
    mode: str,
) -> dict[str, Any]:
    segment = dataframe.iloc[start_index : end_index + 1]
    amplitude = segment["Amplitude"].to_numpy()
    s1_start = segment["S1-Start_RS_Score"].to_numpy()
    s1_end = segment["S1-End_RS_Score"].to_numpy()
    s2_start = segment["S2-Start_RS_Score"].to_numpy()
    s2_end = segment["S2-End_RS_Score"].to_numpy()

    point_count = len(segment.index)
    should_downsample = mode == "overview" or point_count > min(target_points, RAW_RANGE_LIMIT)
    if should_downsample:
        series, is_downsampled = downsample_minmax_with_bucket_max(
            start_index,
            amplitude,
            s1_start,
            s1_end,
            s2_start,
            s2_end,
            target_points,
        )
    else:
        series = build_raw_series(start_index, amplitude, s1_start, s1_end, s2_start, s2_end)
        is_downsampled = False

    return {
        "fileId": file_id,
        "originalRowCount": original_row_count,
        "returnedPointCount": len(series.x),
        "startIndex": start_index,
        "endIndex": end_index,
        "isDownsampled": is_downsampled,
        "x": series.x,
        "amplitude": series.amplitude,
        "s1Start": series.s1_start,
        "s1End": series.s1_end,
        "s2Start": series.s2_start,
        "s2End": series.s2_end,
    }


def get_plot_data(
    file_id: str,
    mode: str,
    start: int | None,
    end: int | None,
    panel_width: int | None,
    target_points: int | None,
) -> dict[str, Any]:
    if mode not in {"overview", "range"}:
        raise PlotDataValidationError("mode must be 'overview' or 'range'")

    metadata = get_file_metadata(file_id)
    if metadata is None:
        raise PlotDataNotFoundError("file metadata not found")

    row_count = int(metadata["rowCount"])
    resolved_start, resolved_end = _resolve_range(mode, start, end, row_count)
    resolved_target_points = _resolve_target_points(panel_width, target_points)

    cache_key = (
        file_id,
        mode,
        resolved_start,
        resolved_end,
        resolved_target_points,
    )
    cached_payload = _plot_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    stored_name = str(metadata["storedName"])
    extension = str(metadata["extension"]).lower()
    dataframe = _load_dataframe(file_id, stored_name, extension)

    payload = _build_plot_payload(
        file_id=file_id,
        original_row_count=row_count,
        start_index=resolved_start,
        end_index=resolved_end,
        dataframe=dataframe,
        target_points=resolved_target_points,
        mode=mode,
    )

    _plot_cache.set(cache_key, payload)
    return payload
