from __future__ import annotations

from collections import OrderedDict
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

import numpy as np
import pandas as pd

from app.config import UPLOAD_DIR
from app.services.downsampling import build_raw_series, downsample_minmax_with_bucket_max
from app.services.file_service import (
    ECG_PARAMETER_REQUIRED_COLUMNS,
    HEARTSOUND_PARAMETER_REQUIRED_COLUMNS,
    UNSUPERVISED_REQUIRED_COLUMNS,
    get_file_metadata,
)

HEARTSOUND_PLOT_COLUMNS = [
    "Amplitude",
    "S1-Start_RS_Score",
    "S1-End_RS_Score",
    "S2-Start_RS_Score",
    "S2-End_RS_Score",
]
ECG_PLOT_COLUMNS = [
    "raw",
    "major_ps",
    "major_pe",
    "major_qrss",
    "major_qrse",
    "major_ts",
    "point_ps",
    "point_pe",
    "point_qrss",
    "point_qrse",
    "point_ts",
]
HEARTSOUND_PARAMETER_COLUMNS = HEARTSOUND_PARAMETER_REQUIRED_COLUMNS
ECG_PARAMETER_COLUMNS = ECG_PARAMETER_REQUIRED_COLUMNS
UNSUPERVISED_COLUMNS = UNSUPERVISED_REQUIRED_COLUMNS
TARGET_POINTS_MIN = 200
TARGET_POINTS_MAX = 3000
TARGET_POINTS_DEFAULT = 2400
RAW_RANGE_LIMIT = 4000
ECG_RAW_SCALE = 1 / 3
HEARTSOUND_SAMPLE_RATE = 4000.0
HEARTSOUND_SAMPLE_MS = 1000.0 / HEARTSOUND_SAMPLE_RATE
HEARTSOUND_S1_PARAMETER_COLUMNS = [
    "S1_Duration_ms",
    "S1_Peak_mV",
    "S1_mean_mV",
    "S1_RMS_mV",
    "S1_Area_mVms",
    "S1_Middle_ms",
    "S1_S_centroid_pct",
    "S1_E_centroid_pct",
]
HEARTSOUND_S2_PARAMETER_COLUMNS = [
    "S2_Duration_ms",
    "S2_Peak_mV",
    "S2_mean_mV",
    "S2_RMS_mV",
    "S2_Area_mVms",
    "S2_Middle_ms",
    "S2_S_centroid_pct",
    "S2_E_centroid_pct",
]
HEARTSOUND_RELATION_PARAMETER_COLUMNS = [
    "S1S2_Duration_ms",
    "S1S2_Peak_mV",
    "S1S2_mean_mV",
    "S1S2_Energy_mV2ms",
]
HEARTSOUND_NEXT_RELATION_PARAMETER_COLUMNS = [
    "S2S1_Duration_ms",
    "S2S1_Peak_mV",
    "S2S1_mean_mV",
    "S2S1_Energy_mV2ms",
]
HEARTSOUND_RS_PEAK_PARAMETER_COLUMNS = [
    "S1S_RS_Peak",
    "S1E_RS_Peak",
    "S2S_RS_Peak",
    "S2E_RS_Peak",
]
HEARTSOUND_RS_WIDTH_PARAMETER_COLUMNS = [
    "S1S_RS_Width_ms",
    "S1E_RS_Width_ms",
    "S2S_RS_Width_ms",
    "S2E_RS_Width_ms",
]
HEARTSOUND_HEART_RATE_COLUMNS = [
    "HeartRate_bpm",
]
HEARTSOUND_DERIVED_GROUP_METADATA: dict[str, dict[str, str]] = {
    "s1_parameters": {
        "label": "S1",
    },
    "s2_parameters": {
        "label": "S2",
    },
    "s1_s2_relation": {
        "label": "S1-S2",
    },
    "s2_s1_relation": {
        "label": "S2-S1",
    },
    "rs_peak": {
        "label": "RS Peak",
    },
    "rs_width": {
        "label": "RS Width",
    },
    "heart_rate": {
        "label": "HR",
    },
}
HEARTSOUND_DERIVED_METRIC_METADATA: dict[str, dict[str, str]] = {
    "S1_Duration_ms": {"label": "S1 Duration", "unit": "ms"},
    "S1_Peak_mV": {"label": "S1 Peak", "unit": "mV"},
    "S1_mean_mV": {"label": "S1 Mean", "unit": "mV"},
    "S1_RMS_mV": {"label": "S1 RMS", "unit": "mV"},
    "S1_Area_mVms": {"label": "S1 Area", "unit": "mV·ms"},
    "S1_Middle_ms": {"label": "S1 Middle", "unit": "ms"},
    "S1_S_centroid_pct": {"label": "S1_s Centroid", "unit": "%"},
    "S1_E_centroid_pct": {"label": "S1_e Centroid", "unit": "%"},
    "S2_Duration_ms": {"label": "S2 Duration", "unit": "ms"},
    "S2_Peak_mV": {"label": "S2 Peak", "unit": "mV"},
    "S2_mean_mV": {"label": "S2 Mean", "unit": "mV"},
    "S2_RMS_mV": {"label": "S2 RMS", "unit": "mV"},
    "S2_Area_mVms": {"label": "S2 Area", "unit": "mV·ms"},
    "S2_Middle_ms": {"label": "S2 Middle", "unit": "ms"},
    "S2_S_centroid_pct": {"label": "S2_s Centroid", "unit": "%"},
    "S2_E_centroid_pct": {"label": "S2_e Centroid", "unit": "%"},
    "S1S2_Duration_ms": {"label": "S1-S2 Duration", "unit": "ms"},
    "S1S2_Peak_mV": {"label": "S1-S2 Peak", "unit": "mV"},
    "S1S2_mean_mV": {"label": "S1-S2 Mean", "unit": "mV"},
    "S1S2_Energy_mV2ms": {"label": "S1-S2 Energy", "unit": "mV²·ms"},
    "S2S1_Duration_ms": {"label": "S2-S1 Duration", "unit": "ms"},
    "S2S1_Peak_mV": {"label": "S2-S1 Peak", "unit": "mV"},
    "S2S1_mean_mV": {"label": "S2-S1 Mean", "unit": "mV"},
    "S2S1_Energy_mV2ms": {"label": "S2-S1 Energy", "unit": "mV²·ms"},
    "S1S_RS_Peak": {"label": "S1_s RS Peak", "unit": "RS score"},
    "S1E_RS_Peak": {"label": "S1_e RS Peak", "unit": "RS score"},
    "S2S_RS_Peak": {"label": "S2_s RS Peak", "unit": "RS score"},
    "S2E_RS_Peak": {"label": "S2_e RS Peak", "unit": "RS score"},
    "S1S_RS_Width_ms": {"label": "S1_s RS Width", "unit": "ms"},
    "S1E_RS_Width_ms": {"label": "S1_e RS Width", "unit": "ms"},
    "S2S_RS_Width_ms": {"label": "S2_s RS Width", "unit": "ms"},
    "S2E_RS_Width_ms": {"label": "S2_e RS Width", "unit": "ms"},
    "HeartRate_bpm": {"label": "HR", "unit": "bpm"},
}
PARAMETER_SUMMARY_GROUPS: list[tuple[str, str, list[str]]] = [
    ("timing", "p_rs / qrs_rs / t_rs", ["p_rs", "qrs_rs", "t_rs"]),
    ("duration", "p_duration / qrs_duration / t_duration", ["p_duration", "qrs_duration", "t_duration"]),
    ("area", "p_area / qrs_area / t_area", ["p_area", "qrs_area", "t_area"]),
    (
        "interval",
        "pq_interval / st_interval / qq_interval",
        ["pq_interval", "st_interval", "qq_interval", "pq_segment", "qt_segment", "tp_segment"],
    ),
    ("amplitude", "p_amp / qrs_amp / t_amp", ["p_amp", "qrs_amp", "t_amp"]),
    ("average", "p_avg / qrs_avg / t_avg", ["p_avg", "qrs_avg", "t_avg"]),
]
HEARTSOUND_PARAMETER_SUMMARY_GROUPS: list[tuple[str, str, list[str]]] = [
    (
        "cycle",
        "S1_width / S2_width / cycle_duration",
        ["S1_width", "S2_width", "S1_S2_interval", "S2_S1_interval", "cycle_duration"],
    ),
    ("ratio", "sys_dia_ratio / S1_ratio / S2_ratio", ["sys_dia_ratio", "S1_ratio", "S2_ratio"]),
    ("s1_core", "Peak_S1 / area_S1 / rms_S1", ["Peak_S1", "area_S1", "rms_S1"]),
    (
        "s1_detail",
        "S1_peak_1 ~ S1_area_4",
        ["S1_peak_1", "S1_area_1", "S1_peak_2", "S1_area_2", "S1_peak_3", "S1_area_3", "S1_peak_4", "S1_area_4"],
    ),
    ("s1s2_core", "Peak_S1_S2 / area_S1_S2 / rms_S1_S2", ["Peak_S1_S2", "area_S1_S2", "rms_S1_S2"]),
    (
        "s1s2_detail",
        "S1_S2_peak_1 ~ S1_S2_area_4",
        [
            "S1_S2_peak_1",
            "S1_S2_area_1",
            "S1_S2_peak_2",
            "S1_S2_area_2",
            "S1_S2_peak_3",
            "S1_S2_area_3",
            "S1_S2_peak_4",
            "S1_S2_area_4",
        ],
    ),
    ("s2_core", "Peak_S2 / area_S2 / rms_S2", ["Peak_S2", "area_S2", "rms_S2"]),
    (
        "s2_detail",
        "S2_peak_1 ~ S2_area_4",
        ["S2_peak_1", "S2_area_1", "S2_peak_2", "S2_area_2", "S2_peak_3", "S2_area_3", "S2_peak_4", "S2_area_4"],
    ),
    ("s2s1_core", "Peak_S2_S1 / area_S2_S1 / rms_S2_S1", ["Peak_S2_S1", "area_S2_S1", "rms_S2_S1"]),
    (
        "s2s1_detail",
        "S2_S1_peak_1 ~ S2_S1_area_4",
        [
            "S2_S1_peak_1",
            "S2_S1_area_1",
            "S2_S1_peak_2",
            "S2_S1_area_2",
            "S2_S1_peak_3",
            "S2_S1_area_3",
            "S2_S1_peak_4",
            "S2_S1_area_4",
        ],
    ),
    (
        "comparative",
        "S1_S2_peak_ratio / sys_dia_peak_ratio",
        ["S1_S2_peak_ratio", "sys_dia_peak_ratio", "S1_S2_area_ratio", "sys_dia_area_ratio"],
    ),
]
HEARTSOUND_DERIVED_PARAMETER_SUMMARY_GROUPS: list[tuple[str, str, list[str]]] = [
    ("s1_parameters", "S1", HEARTSOUND_S1_PARAMETER_COLUMNS),
    ("s2_parameters", "S2", HEARTSOUND_S2_PARAMETER_COLUMNS),
    ("s1_s2_relation", "S1-S2", HEARTSOUND_RELATION_PARAMETER_COLUMNS),
    ("s2_s1_relation", "S2-S1", HEARTSOUND_NEXT_RELATION_PARAMETER_COLUMNS),
    ("rs_peak", "RS Peak", HEARTSOUND_RS_PEAK_PARAMETER_COLUMNS),
    ("rs_width", "RS Width", HEARTSOUND_RS_WIDTH_PARAMETER_COLUMNS),
    ("heart_rate", "HR", HEARTSOUND_HEART_RATE_COLUMNS),
]
HEARTSOUND_REGION_THRESHOLD = 15.0
HEARTSOUND_DEFAULT_CYCLE_SPACING = 4000
HEARTSOUND_MAX_REGION_WIDTH_RATIO = 0.45
HEARTSOUND_LOG_ENERGY_EPSILON = 1e-8


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
_derived_parameter_cache = LRUCache(max_size=16)
_parameter_cycle_summary_cache = LRUCache(max_size=16)


def _parse_cycle_number(value: Any, fallback: int) -> int:
    if value is None:
        return fallback

    try:
        if pd.notna(value):
            if isinstance(value, str):
                digits = "".join(character for character in value if character.isdigit())
                if digits:
                    return int(digits)
            return int(float(value))
    except Exception:
        return fallback

    return fallback


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


def _sanitize_numeric(values: np.ndarray) -> list[float]:
    return np.nan_to_num(values.astype(float, copy=False), nan=0.0, posinf=0.0, neginf=0.0).tolist()


def _safe_max(values: np.ndarray) -> float:
    if values.size == 0 or np.all(np.isnan(values)):
        return 0.0
    return float(np.nanmax(values))


def _safe_value(value: float) -> float:
    if np.isfinite(value):
        return float(value)
    return 0.0


def _extract_threshold_peaks(values: np.ndarray, threshold: float) -> list[tuple[int, float]]:
    peaks: list[tuple[int, float]] = []
    best_index: int | None = None
    best_value: float | None = None

    for index, raw_value in enumerate(values):
        value = float(raw_value)
        if not np.isfinite(value) or value < threshold:
            if best_index is not None and best_value is not None:
                peaks.append((best_index, best_value))
            best_index = None
            best_value = None
            continue

        if best_index is None or best_value is None or value > best_value:
            best_index = index
            best_value = value

    if best_index is not None and best_value is not None:
        peaks.append((best_index, best_value))

    return peaks


def _estimate_peak_spacing(peaks: list[tuple[int, float]]) -> int | None:
    if len(peaks) < 2:
        return None

    spacings = sorted(
        peak[0] - peaks[index][0]
        for index, peak in enumerate(peaks[1:])
        if peak[0] - peaks[index][0] > 0
    )
    if not spacings:
        return None

    return int(spacings[len(spacings) // 2])


def _build_heartsound_region_overlays(
    label: str,
    start_values: np.ndarray,
    end_values: np.ndarray,
) -> list[dict[str, Any]]:
    start_peaks = _extract_threshold_peaks(start_values, HEARTSOUND_REGION_THRESHOLD)
    end_peaks = _extract_threshold_peaks(end_values, HEARTSOUND_REGION_THRESHOLD)
    if not start_peaks or not end_peaks:
        return []

    cycle_spacing = (
        _estimate_peak_spacing(start_peaks)
        or _estimate_peak_spacing(end_peaks)
        or HEARTSOUND_DEFAULT_CYCLE_SPACING
    )
    max_region_width = max(1, int(cycle_spacing * HEARTSOUND_MAX_REGION_WIDTH_RATIO))

    overlays: list[dict[str, Any]] = []
    end_peak_index = 0

    for index, start_peak in enumerate(start_peaks):
        next_start_index = start_peaks[index + 1][0] if index + 1 < len(start_peaks) else None

        while end_peak_index < len(end_peaks) and end_peaks[end_peak_index][0] <= start_peak[0]:
            end_peak_index += 1

        if end_peak_index >= len(end_peaks):
            break

        end_peak = end_peaks[end_peak_index]
        if next_start_index is not None and end_peak[0] >= next_start_index:
            continue

        region_width = end_peak[0] - start_peak[0]
        if region_width <= 0 or region_width > max_region_width:
            continue

        overlays.append(
            {
                "label": label,
                "startPeak": start_peak,
                "endPeak": end_peak,
                "areaStart": start_peak[0],
                "areaEnd": end_peak[0],
            }
        )
        end_peak_index += 1

    return overlays


def _get_heartsound_region_score(overlay: dict[str, Any]) -> float:
    start_peak = overlay.get("startPeak") or (0, 0.0)
    end_peak = overlay.get("endPeak") or (0, 0.0)
    return max(float(start_peak[1]), float(end_peak[1]))


def _overlaps_heartsound_region(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return int(left["areaStart"]) <= int(right["areaEnd"]) and int(right["areaStart"]) <= int(left["areaEnd"])


def _resolve_heartsound_region_overlaps(
    s1_overlays: list[dict[str, Any]],
    s2_overlays: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ordered = sorted(
        [*s1_overlays, *s2_overlays],
        key=lambda overlay: (int(overlay["areaStart"]), -_get_heartsound_region_score(overlay)),
    )
    resolved: list[dict[str, Any]] = []

    for overlay in ordered:
        previous = resolved[-1] if resolved else None
        if previous is None or previous["label"] == overlay["label"] or not _overlaps_heartsound_region(previous, overlay):
            resolved.append(overlay)
            continue

        if _get_heartsound_region_score(overlay) > _get_heartsound_region_score(previous):
            resolved[-1] = overlay

    resolved_s1 = [overlay for overlay in resolved if overlay["label"] == "S1"]
    resolved_s2 = [overlay for overlay in resolved if overlay["label"] == "S2"]
    return resolved_s1, resolved_s2


def _compute_segment_metrics(amplitude: np.ndarray, start_index: int, end_index: int, prefix: str) -> dict[str, float]:
    safe_start = max(0, int(start_index))
    safe_end = min(len(amplitude) - 1, int(end_index))
    if safe_end < safe_start or amplitude.size == 0:
        return {
            f"peak_abs_{prefix}": 0.0,
            f"ptp_{prefix}": 0.0,
            f"mean_abs_{prefix}": 0.0,
            f"rms_{prefix}": 0.0,
            f"area_abs_{prefix}": 0.0,
            f"energy_{prefix}": 0.0,
            f"log_energy_{prefix}": 0.0,
            f"energy_per_sample_{prefix}": 0.0,
        }

    segment = np.nan_to_num(amplitude[safe_start : safe_end + 1].astype(float, copy=False), nan=0.0, posinf=0.0, neginf=0.0)
    if segment.size == 0:
        return {
            f"peak_abs_{prefix}": 0.0,
            f"ptp_{prefix}": 0.0,
            f"mean_abs_{prefix}": 0.0,
            f"rms_{prefix}": 0.0,
            f"area_abs_{prefix}": 0.0,
            f"energy_{prefix}": 0.0,
            f"log_energy_{prefix}": 0.0,
            f"energy_per_sample_{prefix}": 0.0,
        }

    absolute_segment = np.abs(segment)
    energy = float(np.sum(segment ** 2))
    sample_count = max(int(segment.size), 1)

    return {
        f"peak_abs_{prefix}": float(np.max(absolute_segment)),
        f"ptp_{prefix}": float(np.ptp(segment)),
        f"mean_abs_{prefix}": float(np.mean(absolute_segment)),
        f"rms_{prefix}": float(np.sqrt(np.mean(segment ** 2))),
        f"area_abs_{prefix}": float(np.sum(absolute_segment)),
        f"energy_{prefix}": energy,
        f"log_energy_{prefix}": float(np.log(energy + HEARTSOUND_LOG_ENERGY_EPSILON)),
        f"energy_per_sample_{prefix}": float(energy / sample_count),
    }


def _nan_s1_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_S1_PARAMETER_COLUMNS}


def _nan_s2_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_S2_PARAMETER_COLUMNS}


def _nan_relation_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_RELATION_PARAMETER_COLUMNS}


def _nan_next_relation_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_NEXT_RELATION_PARAMETER_COLUMNS}


def _nan_rs_peak_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_RS_PEAK_PARAMETER_COLUMNS}


def _nan_rs_width_parameter_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_RS_WIDTH_PARAMETER_COLUMNS}


def _nan_heart_rate_row() -> dict[str, float]:
    return {column: np.nan for column in HEARTSOUND_HEART_RATE_COLUMNS}


def _is_valid_heartsound_cycle_order(
    s1_start: int | float | None,
    s1_end: int | float | None,
    s2_start: int | float | None,
    s2_end: int | float | None,
    next_s1_start: int | float | None,
) -> bool:
    try:
        values = [s1_start, s1_end, s2_start, s2_end, next_s1_start]
        if any(value is None or not np.isfinite(float(value)) for value in values):
            return False
        safe_s1_start = int(float(s1_start))
        safe_s1_end = int(float(s1_end))
        safe_s2_start = int(float(s2_start))
        safe_s2_end = int(float(s2_end))
        safe_next_s1_start = int(float(next_s1_start))
    except Exception:
        return False

    return safe_s1_start < safe_s1_end < safe_s2_start < safe_s2_end < safe_next_s1_start


def _compute_s1_parameter_row(amplitude: np.ndarray, start_index: int, end_index: int) -> dict[str, float]:
    return _compute_sound_parameter_row(
        amplitude,
        start_index,
        end_index,
        duration_key="S1_Duration_ms",
        peak_key="S1_Peak_mV",
        mean_key="S1_mean_mV",
        rms_key="S1_RMS_mV",
        area_key="S1_Area_mVms",
        middle_key="S1_Middle_ms",
        start_centroid_key="S1_S_centroid_pct",
        end_centroid_key="S1_E_centroid_pct",
        nan_factory=_nan_s1_parameter_row,
    )


def _compute_sound_parameter_row(
    amplitude: np.ndarray,
    start_index: int,
    end_index: int,
    *,
    duration_key: str,
    peak_key: str,
    mean_key: str,
    rms_key: str,
    area_key: str,
    middle_key: str,
    start_centroid_key: str,
    end_centroid_key: str,
    nan_factory: Callable[[], dict[str, float]],
) -> dict[str, float]:
    safe_start = max(0, int(start_index))
    safe_end = min(len(amplitude), int(end_index))
    if safe_start >= safe_end or amplitude.size == 0:
        return nan_factory()

    segment = amplitude[safe_start:safe_end].astype(float, copy=False)
    if segment.size == 0:
        return nan_factory()

    absolute_segment = np.abs(segment)
    total_absolute = float(np.sum(absolute_segment))
    middle_index = (safe_start + safe_end) / 2.0
    segment_last_index = float(safe_end - 1)

    centroid_sample = np.nan
    if total_absolute > 0.0:
        sample_indices = np.arange(safe_start, safe_end, dtype=float)
        centroid_denominator = float(np.sum(absolute_segment))
        if centroid_denominator > 0.0:
            centroid_sample = float(np.sum(sample_indices * absolute_segment) / centroid_denominator)

    start_centroid_pct = np.nan
    end_centroid_pct = np.nan
    total_span = segment_last_index - safe_start
    if np.isfinite(centroid_sample) and total_span > 0.0:
        normalized_end_pct = ((centroid_sample - safe_start) / total_span) * 100.0
        end_centroid_pct = float(min(100.0, max(0.0, normalized_end_pct)))
        start_centroid_pct = float(100.0 - end_centroid_pct)

    return {
        duration_key: float((safe_end - safe_start) * HEARTSOUND_SAMPLE_MS),
        peak_key: float(np.max(absolute_segment)),
        mean_key: float(np.mean(absolute_segment)),
        rms_key: float(np.sqrt(np.mean(segment ** 2))),
        area_key: float(np.sum(absolute_segment) * HEARTSOUND_SAMPLE_MS),
        middle_key: float(middle_index * HEARTSOUND_SAMPLE_MS),
        start_centroid_key: start_centroid_pct,
        end_centroid_key: end_centroid_pct,
    }


def _compute_s2_parameter_row(amplitude: np.ndarray, start_index: int, end_index: int) -> dict[str, float]:
    return _compute_sound_parameter_row(
        amplitude,
        start_index,
        end_index,
        duration_key="S2_Duration_ms",
        peak_key="S2_Peak_mV",
        mean_key="S2_mean_mV",
        rms_key="S2_RMS_mV",
        area_key="S2_Area_mVms",
        middle_key="S2_Middle_ms",
        start_centroid_key="S2_S_centroid_pct",
        end_centroid_key="S2_E_centroid_pct",
        nan_factory=_nan_s2_parameter_row,
    )


def _compute_relation_parameter_row(
    amplitude: np.ndarray,
    s1_start_index: int,
    s1_end_index: int,
    s2_start_index: int,
    s2_end_index: int,
) -> dict[str, float]:
    return _compute_gap_parameter_row(
        amplitude,
        start_index=s1_end_index,
        end_index=s2_start_index,
        duration_key="S1S2_Duration_ms",
        peak_key="S1S2_Peak_mV",
        mean_key="S1S2_mean_mV",
        energy_key="S1S2_Energy_mV2ms",
        nan_factory=_nan_relation_parameter_row,
    )


def _compute_next_relation_parameter_row(
    amplitude: np.ndarray,
    s2_start_index: int,
    s2_end_index: int,
    next_s1_start_index: int,
    next_s1_end_index: int,
) -> dict[str, float]:
    return _compute_gap_parameter_row(
        amplitude,
        start_index=s2_end_index,
        end_index=next_s1_start_index,
        duration_key="S2S1_Duration_ms",
        peak_key="S2S1_Peak_mV",
        mean_key="S2S1_mean_mV",
        energy_key="S2S1_Energy_mV2ms",
        nan_factory=_nan_next_relation_parameter_row,
    )


def _compute_gap_parameter_row(
    amplitude: np.ndarray,
    *,
    start_index: int,
    end_index: int,
    duration_key: str,
    peak_key: str,
    mean_key: str,
    energy_key: str,
    nan_factory: Callable[[], dict[str, float]],
) -> dict[str, float]:
    safe_start = min(len(amplitude), int(start_index))
    safe_end = max(0, int(end_index))
    if amplitude.size == 0 or safe_start >= safe_end:
        return nan_factory()

    interval_segment = amplitude[safe_start:safe_end].astype(float, copy=False)
    if interval_segment.size == 0:
        return nan_factory()

    absolute_segment = np.abs(interval_segment)
    energy_value = float(np.sum(interval_segment ** 2) * HEARTSOUND_SAMPLE_MS)

    return {
        duration_key: float((safe_end - safe_start) * HEARTSOUND_SAMPLE_MS),
        peak_key: float(np.max(absolute_segment)),
        mean_key: float(np.mean(absolute_segment)),
        energy_key: energy_value,
    }


def _compute_heart_rate_row(s1_start_index: int, next_s1_start_index: int | None) -> dict[str, float]:
    if next_s1_start_index is None:
        return _nan_heart_rate_row()

    safe_s1_start = int(s1_start_index)
    safe_next_s1_start = int(next_s1_start_index)
    if safe_next_s1_start <= safe_s1_start:
        return _nan_heart_rate_row()

    cycle_duration_ms = float((safe_next_s1_start - safe_s1_start) * HEARTSOUND_SAMPLE_MS)
    if cycle_duration_ms <= 0.0:
        return _nan_heart_rate_row()

    return {
        "HeartRate_bpm": float(60000.0 / cycle_duration_ms),
    }


def _get_rs_peak_value(signal: np.ndarray, event_index: int | None) -> float:
    if event_index is None:
        return float(np.nan)

    safe_index = int(event_index)
    if safe_index < 0 or safe_index >= len(signal):
        return float(np.nan)

    value = float(signal[safe_index])
    if not np.isfinite(value):
        return float(np.nan)
    return float(int(round(value)))


def _get_rs_width_value(signal: np.ndarray, event_index: int | None) -> float:
    if event_index is None:
        return float(np.nan)

    safe_index = int(event_index)
    if safe_index < 0 or safe_index >= len(signal):
        return float(np.nan)

    peak_value = float(signal[safe_index])
    if not np.isfinite(peak_value) or peak_value <= 0.0:
        return float(np.nan)

    threshold = 0.5 * peak_value
    left_index = safe_index
    while left_index - 1 >= 0:
        next_value = float(signal[left_index - 1])
        if not np.isfinite(next_value) or next_value < threshold:
            break
        left_index -= 1

    right_index = safe_index
    while right_index + 1 < len(signal):
        next_value = float(signal[right_index + 1])
        if not np.isfinite(next_value) or next_value < threshold:
            break
        right_index += 1

    if left_index > right_index:
        return float(np.nan)

    return float((right_index - left_index) * HEARTSOUND_SAMPLE_MS)


def _compute_rs_peak_parameter_row(
    s1_start_signal: np.ndarray,
    s1_end_signal: np.ndarray,
    s2_start_signal: np.ndarray,
    s2_end_signal: np.ndarray,
    s1_overlay: dict[str, Any],
    s2_overlay: dict[str, Any] | None,
) -> dict[str, float]:
    if s2_overlay is None:
        return _nan_rs_peak_parameter_row()

    s1_start_peak = s1_overlay.get("startPeak")
    s1_end_peak = s1_overlay.get("endPeak")
    s2_start_peak = s2_overlay.get("startPeak")
    s2_end_peak = s2_overlay.get("endPeak")

    return {
        "S1S_RS_Peak": _get_rs_peak_value(s1_start_signal, s1_start_peak[0] if s1_start_peak else None),
        "S1E_RS_Peak": _get_rs_peak_value(s1_end_signal, s1_end_peak[0] if s1_end_peak else None),
        "S2S_RS_Peak": _get_rs_peak_value(s2_start_signal, s2_start_peak[0] if s2_start_peak else None),
        "S2E_RS_Peak": _get_rs_peak_value(s2_end_signal, s2_end_peak[0] if s2_end_peak else None),
    }


def _compute_rs_width_parameter_row(
    s1_start_signal: np.ndarray,
    s1_end_signal: np.ndarray,
    s2_start_signal: np.ndarray,
    s2_end_signal: np.ndarray,
    s1_overlay: dict[str, Any],
    s2_overlay: dict[str, Any] | None,
) -> dict[str, float]:
    if s2_overlay is None:
        return _nan_rs_width_parameter_row()

    s1_start_peak = s1_overlay.get("startPeak")
    s1_end_peak = s1_overlay.get("endPeak")
    s2_start_peak = s2_overlay.get("startPeak")
    s2_end_peak = s2_overlay.get("endPeak")

    return {
        "S1S_RS_Width_ms": _get_rs_width_value(s1_start_signal, s1_start_peak[0] if s1_start_peak else None),
        "S1E_RS_Width_ms": _get_rs_width_value(s1_end_signal, s1_end_peak[0] if s1_end_peak else None),
        "S2S_RS_Width_ms": _get_rs_width_value(s2_start_signal, s2_start_peak[0] if s2_start_peak else None),
        "S2E_RS_Width_ms": _get_rs_width_value(s2_end_signal, s2_end_peak[0] if s2_end_peak else None),
    }


def _empty_heartsound_parameter_frame() -> pd.DataFrame:
    columns = [
        "Filename",
        "Cycle_Index",
        "S1_start",
        "S1_end",
        "S2_start",
        "S2_end",
        "next_S1_start",
        "next_S1_end",
        *HEARTSOUND_S1_PARAMETER_COLUMNS,
        *HEARTSOUND_S2_PARAMETER_COLUMNS,
        *HEARTSOUND_RELATION_PARAMETER_COLUMNS,
        *HEARTSOUND_NEXT_RELATION_PARAMETER_COLUMNS,
        *HEARTSOUND_RS_PEAK_PARAMETER_COLUMNS,
        *HEARTSOUND_RS_WIDTH_PARAMETER_COLUMNS,
        *HEARTSOUND_HEART_RATE_COLUMNS,
    ]
    return pd.DataFrame(columns=columns)


def _filter_valid_heartsound_cycles(dataframe: pd.DataFrame) -> pd.DataFrame:
    if dataframe.empty:
        return dataframe.copy()

    validity_mask = dataframe.apply(
        lambda row: _is_valid_heartsound_cycle_order(
            row.get("S1_start"),
            row.get("S1_end"),
            row.get("S2_start"),
            row.get("S2_end"),
            row.get("next_S1_start"),
        ),
        axis=1,
    )
    return dataframe.loc[validity_mask].reset_index(drop=True)


def _build_heartsound_derived_parameter_frame(file_id: str, dataframe: pd.DataFrame) -> pd.DataFrame:
    cached = _derived_parameter_cache.get(file_id)
    if cached is not None:
        return cached

    if dataframe.empty:
        empty = _empty_heartsound_parameter_frame()
        _derived_parameter_cache.set(file_id, empty)
        return empty

    amplitude = pd.to_numeric(dataframe["Amplitude"], errors="coerce").to_numpy(dtype=float)
    s1_start_values = pd.to_numeric(dataframe["S1-Start_RS_Score"], errors="coerce").to_numpy(dtype=float)
    s1_end_values = pd.to_numeric(dataframe["S1-End_RS_Score"], errors="coerce").to_numpy(dtype=float)
    s2_start_values = pd.to_numeric(dataframe["S2-Start_RS_Score"], errors="coerce").to_numpy(dtype=float)
    s2_end_values = pd.to_numeric(dataframe["S2-End_RS_Score"], errors="coerce").to_numpy(dtype=float)
    s1_overlays = _build_heartsound_region_overlays("S1", s1_start_values, s1_end_values)
    s2_overlays = _build_heartsound_region_overlays("S2", s2_start_values, s2_end_values)
    resolved_s1, _ = _resolve_heartsound_region_overlaps(s1_overlays, [])
    _, resolved_s2 = _resolve_heartsound_region_overlaps([], s2_overlays)
    sorted_s1 = sorted(resolved_s1, key=lambda overlay: int(overlay["areaStart"]))
    sorted_s2 = sorted(resolved_s2, key=lambda overlay: int(overlay["areaStart"]))

    if not sorted_s1:
        empty = _empty_heartsound_parameter_frame()
        _derived_parameter_cache.set(file_id, empty)
        return empty

    rows: list[dict[str, Any]] = []
    s2_index = 0
    for cycle_index, s1_overlay in enumerate(sorted_s1, start=1):
        s1_start = int(s1_overlay["areaStart"])
        s1_end = int(s1_overlay["areaEnd"])
        next_s1_overlay = sorted_s1[cycle_index] if cycle_index < len(sorted_s1) else None
        next_s1_start = int(next_s1_overlay["areaStart"]) if next_s1_overlay is not None else None
        next_s1_end = int(next_s1_overlay["areaEnd"]) if next_s1_overlay is not None else None

        while s2_index < len(sorted_s2) and int(sorted_s2[s2_index]["areaEnd"]) <= s1_start:
            s2_index += 1

        matched_s2: dict[str, Any] | None = None
        probe_index = s2_index
        while probe_index < len(sorted_s2):
            candidate = sorted_s2[probe_index]
            candidate_start = int(candidate["areaStart"])
            candidate_end = int(candidate["areaEnd"])
            if candidate_end <= s1_start:
                probe_index += 1
                continue
            if next_s1_start is not None and candidate_start >= next_s1_start:
                break
            if (
                s1_start < s1_end < candidate_start < candidate_end
                and (next_s1_start is None or candidate_end < next_s1_start)
            ):
                matched_s2 = candidate
                s2_index = probe_index + 1
                break
            probe_index += 1

        s2_start = int(matched_s2["areaStart"]) if matched_s2 is not None else np.nan
        s2_end = int(matched_s2["areaEnd"]) if matched_s2 is not None else np.nan

        row: dict[str, Any] = {
            "Filename": file_id,
            "Cycle_Index": cycle_index,
            "S1_start": s1_start,
            "S1_end": s1_end,
            "S2_start": s2_start,
            "S2_end": s2_end,
            "next_S1_start": next_s1_start if next_s1_start is not None else np.nan,
            "next_S1_end": next_s1_end if next_s1_end is not None else np.nan,
        }
        row.update(_compute_s1_parameter_row(amplitude, s1_start, s1_end))
        if matched_s2 is not None:
            row.update(_compute_s2_parameter_row(amplitude, int(s2_start), int(s2_end)))
            row.update(_compute_relation_parameter_row(amplitude, s1_start, s1_end, int(s2_start), int(s2_end)))
            if next_s1_start is not None and next_s1_end is not None:
                row.update(
                    _compute_next_relation_parameter_row(
                        amplitude,
                        int(s2_start),
                        int(s2_end),
                        next_s1_start,
                        next_s1_end,
                    )
                )
            else:
                row.update(_nan_next_relation_parameter_row())
            row.update(
                _compute_rs_peak_parameter_row(
                    s1_start_values,
                    s1_end_values,
                    s2_start_values,
                    s2_end_values,
                    s1_overlay,
                    matched_s2,
                )
            )
            row.update(
                _compute_rs_width_parameter_row(
                    s1_start_values,
                    s1_end_values,
                    s2_start_values,
                    s2_end_values,
                    s1_overlay,
                    matched_s2,
                )
            )
        else:
            row.update(_nan_s2_parameter_row())
            row.update(_nan_relation_parameter_row())
            row.update(_nan_next_relation_parameter_row())
            row.update(_nan_rs_peak_parameter_row())
            row.update(_nan_rs_width_parameter_row())
        row.update(_compute_heart_rate_row(s1_start, next_s1_start))
        rows.append(row)

    derived = pd.DataFrame(rows) if rows else _empty_heartsound_parameter_frame()
    _derived_parameter_cache.set(file_id, derived)
    return derived


def build_parameter_export_workbook(file_id: str) -> tuple[BytesIO, str]:
    metadata = get_file_metadata(file_id)
    if metadata is None:
        raise PlotDataNotFoundError("file metadata not found")

    workspace_kind = str(metadata.get("workspaceKind") or "heartsound")
    file_role = str(metadata.get("fileRole") or "data")
    if file_role != "parameter" and not (workspace_kind == "heartsound" and file_role == "data"):
        raise PlotDataValidationError("parameter export is only available for parameter files or heartsound data files")

    stored_name = str(metadata["storedName"])
    extension = str(metadata["extension"]).lower()
    dataframe = _load_dataframe(file_id, stored_name, extension, workspace_kind, file_role)

    if workspace_kind == "heartsound" and file_role == "data":
        export_frame = _filter_valid_heartsound_cycles(_build_heartsound_derived_parameter_frame(file_id, dataframe))
    else:
        export_frame = dataframe.copy()

    workbook_stream = BytesIO()
    with pd.ExcelWriter(workbook_stream, engine="openpyxl") as writer:
        export_frame.to_excel(writer, index=False, sheet_name="Parameters")
        metadata_frame = pd.DataFrame(
            [
                {"Field": "file_id", "Value": file_id},
                {"Field": "original_name", "Value": str(metadata.get("originalName") or file_id)},
                {"Field": "workspace_kind", "Value": workspace_kind},
                {"Field": "file_role", "Value": file_role},
                {"Field": "exported_row_count", "Value": int(len(export_frame))},
            ]
        )
        metadata_frame.to_excel(writer, index=False, sheet_name="Metadata")

    workbook_stream.seek(0)

    original_name = str(metadata.get("originalName") or file_id)
    export_stem = Path(original_name).stem or file_id
    export_filename = f"{export_stem}_parameters.xlsx"
    return workbook_stream, export_filename


def _downsample_generic_series(
    start_index: int,
    amplitude: np.ndarray,
    marker_series: dict[str, np.ndarray],
    target_points: int,
) -> tuple[dict[str, list[float] | list[int]], bool]:
    point_count = len(amplitude)
    if point_count == 0:
      return {"x": [], "amplitude": [], **{key: [] for key in marker_series}}, False

    target = max(2, target_points)
    if point_count <= target:
        x = list(range(start_index, start_index + point_count))
        return {
            "x": x,
            "amplitude": _sanitize_numeric(amplitude),
            **{key: _sanitize_numeric(values) for key, values in marker_series.items()},
        }, False

    amplitude = amplitude.astype(float, copy=False)
    bucket_count = max(1, target // 2)
    bucket_size = int(np.ceil(point_count / bucket_count))
    marker_matrix = {key: values.astype(float, copy=False) for key, values in marker_series.items()}

    out_x: list[int] = []
    out_amp: list[float] = []
    out_markers: dict[str, list[float]] = {key: [] for key in marker_series}

    for bucket_start in range(0, point_count, bucket_size):
        bucket_end = min(point_count, bucket_start + bucket_size)
        amp_bucket = amplitude[bucket_start:bucket_end]
        marker_buckets = {key: values[bucket_start:bucket_end] for key, values in marker_matrix.items()}

        if amp_bucket.size == 0:
            continue

        if np.all(np.isnan(amp_bucket)):
            picked_positions = [0]
        else:
            min_position = int(np.nanargmin(amp_bucket))
            max_position = int(np.nanargmax(amp_bucket))
            picked_positions = [min_position] if min_position == max_position else sorted([min_position, max_position])

        marker_maxima = {key: _safe_max(values) for key, values in marker_buckets.items()}

        for local_position in picked_positions:
            global_position = bucket_start + local_position
            out_x.append(start_index + global_position)
            out_amp.append(_safe_value(float(amp_bucket[local_position])))
            for key, max_value in marker_maxima.items():
                out_markers[key].append(max_value)

    return {"x": out_x, "amplitude": out_amp, **out_markers}, True


def _load_dataframe(
    file_id: str,
    stored_name: str,
    extension: str,
    workspace_kind: str,
    file_role: str,
) -> pd.DataFrame:
    cached = _dataframe_cache.get(file_id)
    if cached is not None:
        return cached

    path = UPLOAD_DIR / stored_name
    if not path.exists():
        raise PlotDataNotFoundError("stored file not found on server")

    if file_role == "data" and workspace_kind == "heartsound":
        plot_columns = HEARTSOUND_PLOT_COLUMNS
    elif file_role == "parameter" and workspace_kind == "heartsound":
        plot_columns = HEARTSOUND_PARAMETER_COLUMNS
    elif file_role == "data" and workspace_kind == "ecg":
        plot_columns = ECG_PLOT_COLUMNS
    elif file_role == "parameter" and workspace_kind == "ecg":
        plot_columns = ECG_PARAMETER_COLUMNS
    elif file_role == "unsupervised":
        plot_columns = UNSUPERVISED_COLUMNS
    else:
        raise PlotDataValidationError("unsupported workspace kind or file role")

    try:
        if extension == ".csv":
            dataframe = pd.read_csv(path, usecols=plot_columns)
        elif extension == ".xlsx":
            dataframe = pd.read_excel(path, usecols=plot_columns)
        else:
            raise PlotDataValidationError(f"unsupported stored extension: {extension}")
    except Exception as error:
        raise PlotDataValidationError("failed to load stored file for plot data") from error

    for column in plot_columns:
        if column not in dataframe.columns:
            raise PlotDataValidationError(f"stored file missing column: {column}")
        if file_role == "unsupervised" and column == "Cluster":
            dataframe[column] = dataframe[column].fillna("").astype(str)
        else:
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
    workspace_kind: str,
    full_resolution: bool,
) -> dict[str, Any]:
    segment = dataframe.iloc[start_index : end_index + 1]
    if workspace_kind == "heartsound":
        amplitude = segment["Amplitude"].to_numpy()
        s1_start = segment["S1-Start_RS_Score"].to_numpy()
        s1_end = segment["S1-End_RS_Score"].to_numpy()
        s2_start = segment["S2-Start_RS_Score"].to_numpy()
        s2_end = segment["S2-End_RS_Score"].to_numpy()

        point_count = len(segment.index)
        should_downsample = not full_resolution and (
            mode == "overview" or point_count > min(target_points, RAW_RANGE_LIMIT)
        )
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
            "workspaceKind": workspace_kind,
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
            "majorPs": [],
            "majorPe": [],
            "majorQrss": [],
            "majorQrse": [],
            "majorTs": [],
            "pointPs": [],
            "pointPe": [],
            "pointQrss": [],
            "pointQrse": [],
            "pointTs": [],
        }

    if workspace_kind == "ecg":
        amplitude = segment["raw"].to_numpy() * ECG_RAW_SCALE
        marker_series = {
            "majorPs": segment["major_ps"].to_numpy(),
            "majorPe": segment["major_pe"].to_numpy(),
            "majorQrss": segment["major_qrss"].to_numpy(),
            "majorQrse": segment["major_qrse"].to_numpy(),
            "majorTs": segment["major_ts"].to_numpy(),
            "pointPs": segment["point_ps"].to_numpy(),
            "pointPe": segment["point_pe"].to_numpy(),
            "pointQrss": segment["point_qrss"].to_numpy(),
            "pointQrse": segment["point_qrse"].to_numpy(),
            "pointTs": segment["point_ts"].to_numpy(),
        }
        point_count = len(segment.index)
        should_downsample = not full_resolution and (
            mode == "overview" or point_count > min(target_points, RAW_RANGE_LIMIT)
        )
        series, is_downsampled = _downsample_generic_series(
            start_index,
            amplitude,
            marker_series,
            target_points if should_downsample else max(point_count, 2),
        )
        return {
            "fileId": file_id,
            "workspaceKind": workspace_kind,
            "originalRowCount": original_row_count,
            "returnedPointCount": len(series["x"]),
            "startIndex": start_index,
            "endIndex": end_index,
            "isDownsampled": is_downsampled,
            "x": series["x"],
            "amplitude": series["amplitude"],
            "s1Start": [],
            "s1End": [],
            "s2Start": [],
            "s2End": [],
            "majorPs": series["majorPs"],
            "majorPe": series["majorPe"],
            "majorQrss": series["majorQrss"],
            "majorQrse": series["majorQrse"],
            "majorTs": series["majorTs"],
            "pointPs": series["pointPs"],
            "pointPe": series["pointPe"],
            "pointQrss": series["pointQrss"],
            "pointQrse": series["pointQrse"],
            "pointTs": series["pointTs"],
        }

    raise PlotDataValidationError("unsupported workspace kind")


def _to_summary_metric(
    segment: pd.DataFrame,
    column: str,
    metadata: dict[str, dict[str, str]] | None = None,
) -> dict[str, Any]:
    series = pd.to_numeric(segment[column], errors="coerce")
    values = series.to_numpy(dtype=float)
    metric_metadata = metadata.get(column, {}) if metadata else {}
    label = metric_metadata.get("label", column)
    description = metric_metadata.get("description")
    unit = metric_metadata.get("unit")
    finite_values = values[np.isfinite(values)]
    if finite_values.size == 0:
        return {
            "key": column,
            "label": label,
            "description": description,
            "unit": unit,
            "mean": 0.0,
            "min": 0.0,
            "max": 0.0,
        }

    return {
        "key": column,
        "label": label,
        "description": description,
        "unit": unit,
        "mean": float(np.mean(finite_values)),
        "min": float(np.min(finite_values)),
        "max": float(np.max(finite_values)),
    }


def _build_summary_groups(
    segment: pd.DataFrame,
    group_spec: list[tuple[str, str, list[str]]],
    group_metadata: dict[str, dict[str, str]] | None = None,
    metric_metadata: dict[str, dict[str, str]] | None = None,
) -> list[dict[str, Any]]:
    return [
        {
            "key": key,
            "label": (group_metadata.get(key, {}).get("label") if group_metadata else None) or label,
            "description": group_metadata.get(key, {}).get("description") if group_metadata else None,
            "metrics": [_to_summary_metric(segment, column, metric_metadata) for column in columns],
        }
        for key, label, columns in group_spec
    ]


def _build_cycle_summary_payloads(
    frame: pd.DataFrame,
    group_spec: list[tuple[str, str, list[str]]],
    *,
    requested_start: int,
    requested_end: int,
    group_metadata: dict[str, dict[str, str]] | None = None,
    metric_metadata: dict[str, dict[str, str]] | None = None,
    validate_cycle_order: bool = False,
) -> list[dict[str, Any]]:
    cycles: list[dict[str, Any]] = []
    for row_index, (_, row) in enumerate(frame.iterrows()):
        if validate_cycle_order and not _is_valid_heartsound_cycle_order(
            row.get("S1_start"),
            row.get("S1_end"),
            row.get("S2_start"),
            row.get("S2_end"),
            row.get("next_S1_start"),
        ):
            continue

        row_frame = pd.DataFrame([row])
        cycle_index_raw = row.get("Cycle_Index", row_index + 1)
        cycle_index = int(cycle_index_raw) if pd.notna(cycle_index_raw) else row_index + 1
        cycle_start_value = row.get("S1_start", requested_start)
        cycle_end_value = row.get("next_S1_start", row.get("S2_end", requested_end))
        try:
            cycle_start_int = int(float(cycle_start_value))
        except Exception:
            cycle_start_int = requested_start
        try:
            cycle_end_int = int(float(cycle_end_value))
        except Exception:
            cycle_end_int = requested_end

        cycles.append(
            {
                "cycleIndex": cycle_index,
                "startIndex": cycle_start_int,
                "endIndex": max(cycle_start_int, cycle_end_int),
                "groups": _build_summary_groups(row_frame, group_spec, group_metadata, metric_metadata),
            }
        )
    return cycles


def get_parameter_summary(
    file_id: str,
    start: int | None,
    end: int | None,
) -> dict[str, Any]:
    metadata = get_file_metadata(file_id)
    if metadata is None:
        raise PlotDataNotFoundError("file metadata not found")

    workspace_kind = str(metadata.get("workspaceKind") or "heartsound")
    file_role = str(metadata.get("fileRole") or "data")
    if file_role != "parameter" and not (workspace_kind == "heartsound" and file_role == "data"):
        raise PlotDataValidationError("parameter summary is only available for parameter files or heartsound data files")

    row_count = int(metadata["rowCount"])
    requested_start = max(0, int(start if start is not None else 0))
    requested_end = max(requested_start, int(end if end is not None else requested_start))
    cache_key = ("parameter-summary", file_id, requested_start, requested_end)
    cached_payload = _plot_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    stored_name = str(metadata["storedName"])
    extension = str(metadata["extension"]).lower()
    dataframe = _load_dataframe(file_id, stored_name, extension, workspace_kind, file_role)
    if workspace_kind == "ecg":
        time_series = pd.to_numeric(dataframe["time"], errors="coerce")
        segment = dataframe.loc[(time_series >= requested_start) & (time_series <= requested_end)]
        group_spec = PARAMETER_SUMMARY_GROUPS
        cycles: list[dict[str, Any]] = []
    elif workspace_kind == "heartsound" and file_role == "parameter":
        cycle_start = pd.to_numeric(dataframe["S1_start"], errors="coerce")
        cycle_end = pd.to_numeric(dataframe["next_S1_start"], errors="coerce")
        fallback_end = pd.to_numeric(dataframe["S2_end"], errors="coerce")
        resolved_cycle_end = cycle_end.where(np.isfinite(cycle_end), fallback_end)
        segment = dataframe.loc[(cycle_start <= requested_end) & (resolved_cycle_end >= requested_start)]
        group_spec = HEARTSOUND_PARAMETER_SUMMARY_GROUPS
        cycles = _build_cycle_summary_payloads(
            segment,
            HEARTSOUND_PARAMETER_SUMMARY_GROUPS,
            requested_start=requested_start,
            requested_end=requested_end,
        )
    elif workspace_kind == "heartsound" and file_role == "data":
        derived_frame = _build_heartsound_derived_parameter_frame(file_id, dataframe)
        cycle_start = pd.to_numeric(derived_frame["S1_start"], errors="coerce")
        cycle_end = pd.to_numeric(derived_frame["next_S1_start"], errors="coerce")
        fallback_end = pd.to_numeric(derived_frame["S2_end"], errors="coerce")
        resolved_cycle_end = cycle_end.where(np.isfinite(cycle_end), fallback_end)
        segment = derived_frame.loc[(cycle_start <= requested_end) & (resolved_cycle_end >= requested_start)]
        group_spec = HEARTSOUND_DERIVED_PARAMETER_SUMMARY_GROUPS
        cycle_cache_key = ("heartsound-derived-cycles", file_id)
        cached_cycles = _parameter_cycle_summary_cache.get(cycle_cache_key)
        if cached_cycles is None:
            cached_cycles = _build_cycle_summary_payloads(
                derived_frame,
                HEARTSOUND_DERIVED_PARAMETER_SUMMARY_GROUPS,
                requested_start=requested_start,
                requested_end=requested_end,
                group_metadata=HEARTSOUND_DERIVED_GROUP_METADATA,
                metric_metadata=HEARTSOUND_DERIVED_METRIC_METADATA,
                validate_cycle_order=True,
            )
            _parameter_cycle_summary_cache.set(cycle_cache_key, cached_cycles)
        cycles = cached_cycles
    else:
        raise PlotDataValidationError("unsupported workspace kind for parameter summary")

    groups = _build_summary_groups(
        segment,
        group_spec,
        HEARTSOUND_DERIVED_GROUP_METADATA if workspace_kind == "heartsound" and file_role == "data" else None,
        HEARTSOUND_DERIVED_METRIC_METADATA if workspace_kind == "heartsound" and file_role == "data" else None,
    )

    payload = {
        "fileId": file_id,
        "workspaceKind": workspace_kind,
        "fileRole": file_role,
        "rowCount": row_count,
        "startIndex": requested_start,
        "endIndex": requested_end,
        "groups": groups,
        "cycles": cycles,
    }
    _plot_cache.set(cache_key, payload)
    return payload


def get_unsupervised_summary(
    file_id: str,
    start: int | None,
    end: int | None,
) -> dict[str, Any]:
    metadata = get_file_metadata(file_id)
    if metadata is None:
        raise PlotDataNotFoundError("file metadata not found")

    workspace_kind = str(metadata.get("workspaceKind") or "heartsound")
    file_role = str(metadata.get("fileRole") or "data")
    if file_role != "unsupervised":
        raise PlotDataValidationError("unsupervised summary is only available for unsupervised files")

    row_count = int(metadata["rowCount"])
    requested_start = max(0, int(start if start is not None else 0))
    requested_end = max(requested_start, int(end if end is not None else requested_start))
    cache_key = ("unsupervised-summary", file_id, requested_start, requested_end)
    cached_payload = _plot_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    stored_name = str(metadata["storedName"])
    extension = str(metadata["extension"]).lower()
    dataframe = _load_dataframe(file_id, stored_name, extension, workspace_kind, file_role)

    cycle_start = pd.to_numeric(dataframe["Cycle Start"], errors="coerce")
    cycle_end = pd.to_numeric(dataframe["Cycle End"], errors="coerce")
    cycle_number = pd.to_numeric(dataframe["Cycle Num"], errors="coerce")
    cluster_series = dataframe["Cluster"].fillna("").astype(str)

    segment = dataframe.loc[(cycle_start <= requested_end) & (cycle_end >= requested_start)].copy()
    segment["__cycle_start__"] = cycle_start.loc[segment.index]
    segment["__cycle_end__"] = cycle_end.loc[segment.index]
    segment["__cycle_num__"] = cycle_number.loc[segment.index]
    segment["__cluster__"] = cluster_series.loc[segment.index]

    cycles: list[dict[str, Any]] = []
    for row_index, (_, row) in enumerate(segment.iterrows()):
        try:
            cycle_start_int = max(0, int(float(row["__cycle_start__"])))
            cycle_end_int = max(0, int(float(row["__cycle_end__"])))
        except Exception:
            continue

        cycle_num_value = row["__cycle_num__"]
        cycle_num = _parse_cycle_number(cycle_num_value, row_index + 1)

        cycles.append(
            {
                "cycleNumber": cycle_num,
                "startIndex": cycle_start_int,
                "endIndex": max(cycle_start_int, cycle_end_int),
                "cluster": str(row["__cluster__"]).strip(),
            }
        )

    payload = {
        "fileId": file_id,
        "workspaceKind": workspace_kind,
        "fileRole": file_role,
        "rowCount": row_count,
        "startIndex": requested_start,
        "endIndex": requested_end,
        "cycles": cycles,
    }
    _plot_cache.set(cache_key, payload)
    return payload


def get_plot_data(
    file_id: str,
    mode: str,
    start: int | None,
    end: int | None,
    panel_width: int | None,
    target_points: int | None,
    full_resolution: bool = False,
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
        full_resolution,
    )
    cached_payload = _plot_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    stored_name = str(metadata["storedName"])
    extension = str(metadata["extension"]).lower()
    workspace_kind = str(metadata.get("workspaceKind") or "heartsound")
    file_role = str(metadata.get("fileRole") or "data")
    if file_role != "data":
        raise PlotDataValidationError("plot data is only available for data files")
    dataframe = _load_dataframe(file_id, stored_name, extension, workspace_kind, file_role)

    payload = _build_plot_payload(
        file_id=file_id,
        original_row_count=row_count,
        start_index=resolved_start,
        end_index=resolved_end,
        dataframe=dataframe,
        target_points=resolved_target_points,
        mode=mode,
        workspace_kind=workspace_kind,
        full_resolution=full_resolution,
    )

    _plot_cache.set(cache_key, payload)
    return payload
