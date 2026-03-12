from __future__ import annotations

from dataclasses import dataclass
from math import ceil

import numpy as np


@dataclass
class DownsampledSeries:
    x: list[int]
    amplitude: list[float]
    s1_start: list[float]
    s1_end: list[float]
    s2_start: list[float]
    s2_end: list[float]


def _sanitize_numeric(values: np.ndarray) -> np.ndarray:
    return np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)


def _safe_max(values: np.ndarray) -> float:
    if values.size == 0 or np.all(np.isnan(values)):
        return 0.0
    return float(np.nanmax(values))


def _safe_value(value: float) -> float:
    if np.isfinite(value):
        return float(value)
    return 0.0


def build_raw_series(
    start_index: int,
    amplitude: np.ndarray,
    rs_s1_start: np.ndarray,
    rs_s1_end: np.ndarray,
    rs_s2_start: np.ndarray,
    rs_s2_end: np.ndarray,
) -> DownsampledSeries:
    point_count = len(amplitude)
    x = list(range(start_index, start_index + point_count))

    return DownsampledSeries(
        x=x,
        amplitude=_sanitize_numeric(amplitude).tolist(),
        s1_start=_sanitize_numeric(rs_s1_start).tolist(),
        s1_end=_sanitize_numeric(rs_s1_end).tolist(),
        s2_start=_sanitize_numeric(rs_s2_start).tolist(),
        s2_end=_sanitize_numeric(rs_s2_end).tolist(),
    )


def downsample_minmax_with_bucket_max(
    start_index: int,
    amplitude: np.ndarray,
    rs_s1_start: np.ndarray,
    rs_s1_end: np.ndarray,
    rs_s2_start: np.ndarray,
    rs_s2_end: np.ndarray,
    target_points: int,
) -> tuple[DownsampledSeries, bool]:
    point_count = len(amplitude)
    if point_count == 0:
        return (
            DownsampledSeries(
                x=[],
                amplitude=[],
                s1_start=[],
                s1_end=[],
                s2_start=[],
                s2_end=[],
            ),
            False,
        )

    target = max(2, target_points)
    if point_count <= target:
        return (
            build_raw_series(
                start_index,
                amplitude,
                rs_s1_start,
                rs_s1_end,
                rs_s2_start,
                rs_s2_end,
            ),
            False,
        )

    amplitude = amplitude.astype(float, copy=False)
    rs_matrix = np.column_stack((rs_s1_start, rs_s1_end, rs_s2_start, rs_s2_end)).astype(
        float, copy=False
    )

    bucket_count = max(1, target // 2)
    bucket_size = ceil(point_count / bucket_count)

    out_x: list[int] = []
    out_amp: list[float] = []
    out_s1_start: list[float] = []
    out_s1_end: list[float] = []
    out_s2_start: list[float] = []
    out_s2_end: list[float] = []

    for bucket_start in range(0, point_count, bucket_size):
        bucket_end = min(point_count, bucket_start + bucket_size)
        amp_bucket = amplitude[bucket_start:bucket_end]
        rs_bucket = rs_matrix[bucket_start:bucket_end]

        if amp_bucket.size == 0:
            continue

        if np.all(np.isnan(amp_bucket)):
            picked_positions = [0]
        else:
            min_position = int(np.nanargmin(amp_bucket))
            max_position = int(np.nanargmax(amp_bucket))
            if min_position == max_position:
                picked_positions = [min_position]
            else:
                picked_positions = sorted([min_position, max_position])

        s1_start_max = _safe_max(rs_bucket[:, 0])
        s1_end_max = _safe_max(rs_bucket[:, 1])
        s2_start_max = _safe_max(rs_bucket[:, 2])
        s2_end_max = _safe_max(rs_bucket[:, 3])

        for local_position in picked_positions:
            global_position = bucket_start + local_position
            out_x.append(start_index + global_position)
            out_amp.append(_safe_value(float(amp_bucket[local_position])))
            out_s1_start.append(s1_start_max)
            out_s1_end.append(s1_end_max)
            out_s2_start.append(s2_start_max)
            out_s2_end.append(s2_end_max)

    series = DownsampledSeries(
        x=out_x,
        amplitude=out_amp,
        s1_start=out_s1_start,
        s1_end=out_s1_end,
        s2_start=out_s2_start,
        s2_end=out_s2_end,
    )
    return series, True

