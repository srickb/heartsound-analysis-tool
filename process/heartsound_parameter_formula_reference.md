# HeartSound Parameter Formula Reference

Last updated: 2026-03-19

This document explains the parameter groups currently shown in the lower `Parameter` panel of the HeartSound workspace.

It focuses only on the current implemented formulas in code.

Current top-level parameter parts in the UI:

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

Additionally:

- `HR` is shown beside the cycle selector as a separate highlighted card

## 1. Shared Definitions

### 1.1 Input signal

- `x[n]`
  HeartSound amplitude signal

- unit:
  `mV`

### 1.2 Sampling

Current fixed backend sampling assumptions:

- `fs = 4000 Hz`
- `1 sample = 0.25 ms`

### 1.3 Current cycle definition

For a valid cycle:

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

The cycle starts at:

- `S1_start`

The cycle ends at:

- `next_S1_start`

### 1.4 Validity policy

If the required boundaries are invalid or missing:

- the parameter is stored as `NaN`
- it is not forced to `0`

### 1.5 Interval convention

All segment calculations use half-open intervals:

- `x[start:end)`

## 2. UI Mapping

### 2.1 `S1`

The `S1` section shows parameters calculated only from the S1 segment:

- `S1_Duration`
- `S1_Peak`
- `S1_Mean`
- `S1_RMS`
- `S1_Area`
- `S1_Middle`
- `S1_S Centroid`
- `S1_E Centroid`

### 2.2 `S2`

The `S2` section shows the same metric family for the S2 segment:

- `S2_Duration`
- `S2_Peak`
- `S2_Mean`
- `S2_RMS`
- `S2_Area`
- `S2_Middle`
- `S2_S Centroid`
- `S2_E Centroid`

### 2.3 `S1-S2`

The `S1-S2` section shows gap-segment parameters between `S1 end` and `S2 start`:

- `S1-S2_Duration`
- `S1-S2_Peak`
- `S1-S2_Mean`
- `S1-S2_Energy`

Additionally, the same `S1-S2` section also includes:

- `S2-S1_Duration`
- `S2-S1_Peak`
- `S2-S1_Mean`
- `S2-S1_Energy`

### 2.4 `RS Score`

The `RS Score` section groups two event-derived families:

- `RS Peak`
- `RS Width`

for:

- `S1 start`
- `S1 end`
- `S2 start`
- `S2 end`

## 3. Common Landmark Definitions

For each selected cycle:

- `s1s = S1_start`
- `s1e = S1_end`
- `s2s = S2_start`
- `s2e = S2_end`
- `s1n = next_S1_start`

Segment definitions:

- `seg_S1 = x[s1s:s1e]`
- `seg_S2 = x[s2s:s2e]`

Midpoints:

- `mid_S1 = (s1s + s1e) / 2`
- `mid_S2 = (s2s + s2e) / 2`

Absolute-peak indices:

- `peak_S1 = argmax(abs(seg_S1)) + s1s`
- `peak_S2 = argmax(abs(seg_S2)) + s2s`

Sample-to-time conversion:

- `samples_to_ms(n) = n * 0.25`

## 4. `S1` Parameter Formulas

### 4.1 `S1_Duration`

Meaning:

- Duration of the S1 segment

Formula:

- `(s1e - s1s) * 0.25`

Unit:

- `ms`

### 4.2 `S1_Peak`

Meaning:

- Maximum absolute amplitude inside S1

Formula:

- `max(abs(seg_S1))`

Unit:

- `mV`

### 4.3 `S1_Mean`

Meaning:

- Mean absolute amplitude inside S1

Formula:

- `mean(abs(seg_S1))`

Unit:

- `mV`

### 4.4 `S1_RMS`

Meaning:

- RMS amplitude inside S1

Formula:

- `sqrt(mean(seg_S1^2))`

Unit:

- `mV`

### 4.5 `S1_Area`

Meaning:

- Absolute signal area of S1 over time

Formula:

- `sum(abs(seg_S1)) * 0.25`

Unit:

- `mV*ms`

### 4.6 `S1_Middle`

Meaning:

- Midpoint time of the S1 segment

Formula:

- `((s1s + s1e) / 2) * 0.25`

Unit:

- `ms`

### 4.7 `S1_S Centroid`

Meaning:

- How much the weighted energy center is biased toward the start half of S1

Intermediate definition:

- `centroid_S1 = sum(n * abs(x[n])) / sum(abs(x[n]))` for `n in [s1s, s1e)`

Formula:

- `max(0, (mid_S1 - centroid_S1) / (mid_S1 - s1s)) * 100`

Unit:

- `%`

### 4.8 `S1_E Centroid`

Meaning:

- How much the weighted energy center is biased toward the end half of S1

Formula:

- `max(0, (centroid_S1 - mid_S1) / (s1e - mid_S1)) * 100`

Unit:

- `%`

## 5. `S2` Parameter Formulas

The `S2` formulas mirror the `S1` formulas but use the S2 segment.

### 5.1 `S2_Duration`

Formula:

- `(s2e - s2s) * 0.25`

Unit:

- `ms`

### 5.2 `S2_Peak`

Formula:

- `max(abs(seg_S2))`

Unit:

- `mV`

### 5.3 `S2_Mean`

Formula:

- `mean(abs(seg_S2))`

Unit:

- `mV`

### 5.4 `S2_RMS`

Formula:

- `sqrt(mean(seg_S2^2))`

Unit:

- `mV`

### 5.5 `S2_Area`

Formula:

- `sum(abs(seg_S2)) * 0.25`

Unit:

- `mV*ms`

### 5.6 `S2_Middle`

Formula:

- `((s2s + s2e) / 2) * 0.25`

Unit:

- `ms`

### 5.7 `S2_S Centroid`

Formula:

- `max(0, (mid_S2 - centroid_S2) / (mid_S2 - s2s)) * 100`

Unit:

- `%`

### 5.8 `S2_E Centroid`

Formula:

- `max(0, (centroid_S2 - mid_S2) / (s2e - mid_S2)) * 100`

Unit:

- `%`

## 6. Gap-Segment Formulas

### 6.1 `S1-S2_Duration`

Meaning:

- Length of the gap from `S1 end` to `S2 start`

Formula:

- `(s2s - s1e) * 0.25`

Unit:

- `ms`

### 6.2 `S1-S2_Peak`

Meaning:

- Maximum absolute amplitude inside the `S1 end ~ S2 start` gap

Formula:

- `max(abs(x[s1e:s2s]))`

Unit:

- `mV`

### 6.3 `S1-S2_Mean`

Meaning:

- Mean absolute amplitude inside the `S1 end ~ S2 start` gap

Formula:

- `mean(abs(x[s1e:s2s]))`

Unit:

- `mV`

### 6.4 `S1-S2_Energy`

Meaning:

- Energy of the `S1 end ~ S2 start` gap

Formula:

- `sum(x[s1e:s2s]^2) * 0.25`

Unit:

- `mV^2*ms`

### 6.5 `S2-S1_Duration`

Meaning:

- Length of the gap from `S2 end` to `next S1 start`

Formula:

- `(s1n - s2e) * 0.25`

Unit:

- `ms`

### 6.6 `S2-S1_Peak`

Meaning:

- Maximum absolute amplitude inside the `S2 end ~ next S1 start` gap

Formula:

- `max(abs(x[s2e:s1n]))`

Unit:

- `mV`

### 6.7 `S2-S1_Mean`

Meaning:

- Mean absolute amplitude inside the `S2 end ~ next S1 start` gap

Formula:

- `mean(abs(x[s2e:s1n]))`

Unit:

- `mV`

### 6.8 `S2-S1_Energy`

Meaning:

- Energy of the `S2 end ~ next S1 start` gap

Formula:

- `sum(x[s2e:s1n]^2) * 0.25`

Unit:

- `ms`

## 7. `HR` Formula

### 7.1 `HR`

Meaning:

- Heart rate estimated from the current cycle length

Formula:

- `cycle_length_ms = (s1n - s1s) * 0.25`
- `HR = 60000 / cycle_length_ms`

Unit:

- `bpm`

Note:

- If `next_S1_start` is missing or invalid, `HR` becomes `NaN`

## 8. `RS Score` Parameter Formulas

The `RS Score` section contains event-based parameters computed from the RS-score channels already used for S1/S2 boundary detection.

Source RS signals:

- `rs_s1_start = S1-Start_RS_Score`
- `rs_s1_end = S1-End_RS_Score`
- `rs_s2_start = S2-Start_RS_Score`
- `rs_s2_end = S2-End_RS_Score`

Representative event indices come from the final selected area peaks:

- `tau_s1s = selected S1 start peak index`
- `tau_s1e = selected S1 end peak index`
- `tau_s2s = selected S2 start peak index`
- `tau_s2e = selected S2 end peak index`

### 8.1 `RS Peak` family

Meaning:

- The raw RS-score value exactly at the selected event peak index

#### 8.1.1 `S1_s RS Peak`

Formula:

- `rs_s1_start[tau_s1s]`

#### 8.1.2 `S1_e RS Peak`

Formula:

- `rs_s1_end[tau_s1e]`

#### 8.1.3 `S2_s RS Peak`

Formula:

- `rs_s2_start[tau_s2s]`

#### 8.1.4 `S2_e RS Peak`

Formula:

- `rs_s2_end[tau_s2e]`

Unit:

- raw RS-score scale

### 8.2 `RS Width` family

Meaning:

- Width of the contiguous region around the selected event peak where RS score remains above 50% of that peak value

General process:

1. `peak_val = RS(tau)`
2. `threshold = 0.5 * peak_val`
3. Move left while RS score stays `>= threshold`
4. Move right while RS score stays `>= threshold`
5. Width is the distance between those bounds

General formula:

- `width_ms = (right_index - left_index) * 0.25`

Metrics:

- `S1_s RS Width`
- `S1_e RS Width`
- `S2_s RS Width`
- `S2_e RS Width`

Unit:

- `ms`

## 9. What Each Part Tells the User

### 9.1 `S1`

This part answers:

- How long S1 is
- How strong S1 is
- How much energy S1 contains
- Whether S1 energy is start-heavy or end-heavy

### 9.2 `S2`

This part answers:

- How long S2 is
- How strong S2 is
- How much energy S2 contains
- Whether S2 energy is start-heavy or end-heavy

### 9.3 `S1-S2`

This part answers:

- How large the S1-to-S2 gap is
- How strong the S1-to-S2 gap signal is
- How much energy the S1-to-S2 and S2-to-S1 gaps contain

### 9.4 `RS Score`

This part answers:

- How strong the selected RS event peak is
- How wide the RS event is around half-height

### 9.5 `HR`

This part answers:

- How long the current cycle is from one S1 start to the next
- The implied beats-per-minute value

## 10. Graph Annotation Mapping

When a parameter is clicked in the UI, the graph shows where that parameter came from.

Current mapping:

- `S1` metrics -> S1 range
- `S2` metrics -> S2 range
- `S1-S2` metrics -> gap from `S1 end` to `S2 start`
- `S2-S1` metrics -> gap from `S2 end` to `next S1 start`
- `HR` -> current cycle to next cycle
- `RS Peak` -> event point
- `RS Width` -> half-height contiguous width region

## 11. Notes

- All formulas in this document reflect the current implementation in `backend/app/services/plot_data_service.py`
- UI grouping reflects the current implementation in `frontend/src/App.tsx`
- This document describes the current shipped formula set only
- Future parameter ideas in `ideas/Parameter.py` are not included here unless they are already implemented
