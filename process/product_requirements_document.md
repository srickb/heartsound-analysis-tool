# HeartSound Parameter Formula Reference

Last updated: 2026-03-19

이 문서는 HeartSound workspace의 하단 `Parameter` panel에 현재 표시되는 parameter group을 설명한다.

설명 범위는 **현재 코드에 실제로 구현된 formula**만을 대상으로 한다.

현재 UI의 top-level parameter 구성은 다음과 같다.

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

추가로:

- `HR`은 cycle selector 옆에 별도의 강조 카드로 표시된다.

## 1. 공통 정의

### 1.1 Input signal

- `x[n]`  
  HeartSound amplitude signal

- unit:  
  `mV`

### 1.2 Sampling

현재 backend의 고정 Sampling 가정:

- `fs = 4000 Hz`
- `1 sample = 0.25 ms`

### 1.3 현재 cycle 정의

유효한 cycle은 다음 조건을 만족한다.

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

Cycle의 시작점:

- `S1_start`

Cycle의 끝점:

- `next_S1_start`

### 1.4 Validity 정책

필수 boundary가 잘못되었거나 누락된 경우:

- 해당 parameter는 `NaN`으로 저장된다.
- 강제로 `0`으로 바꾸지 않는다.

### 1.5 Interval convention

모든 segment 계산은 half-open interval을 사용한다.

- `x[start:end)`

## 2. UI Mapping

### 2.1 `S1`

`S1` section은 S1 segment만으로 계산된 parameter를 보여준다.

- `S1_Duration`
- `S1_Peak`
- `S1_Mean`
- `S1_RMS`
- `S1_Area`
- `S1_Middle`
- `S1_StartCentroid`
- `S1_EndCentroid`

### 2.2 `S2`

`S2` section은 S2 segment에 대해 S1과 동일한 metric family를 보여준다.

- `S2_Duration`
- `S2_Peak`
- `S2_Mean`
- `S2_RMS`
- `S2_Area`
- `S2_Middle`
- `S2_StartCentroid`
- `S2_EndCentroid`

### 2.3 `S1-S2`

`S1-S2` section은 거리 및 관계 timing을 보여준다.

- `S1Start_to_S2Start`
- `S1End_to_S2Start`
- `S1Middle_to_S2Middle`
- `S1End_to_S2End`
- `S1Start_to_S2End`
- `S1Peak_to_S2Peak`

### 2.4 `RS Score`

`RS Score` section은 event 기반 3개 family를 묶어서 보여준다.

- `RS Peak`
- `RS Width`
- `RS STD`

대상 event는 다음 네 가지이다.

- `S1 start`
- `S1 end`
- `S2 start`
- `S2 end`

## 3. 공통 Landmark 정의

선택된 각 cycle에 대해:

- `s1s = S1_start`
- `s1e = S1_end`
- `s2s = S2_start`
- `s2e = S2_end`
- `s1n = next_S1_start`

Segment 정의:

- `seg_S1 = x[s1s:s1e]`
- `seg_S2 = x[s2s:s2e]`

Midpoint 정의:

- `mid_S1 = (s1s + s1e) / 2`
- `mid_S2 = (s2s + s2e) / 2`

Absolute peak index 정의:

- `peak_S1 = argmax(abs(seg_S1)) + s1s`
- `peak_S2 = argmax(abs(seg_S2)) + s2s`

Sample-to-time 변환:

- `samples_to_ms(n) = n * 0.25`

## 4. `S1` Parameter Formula

### 4.1 `S1_Duration`

의미:

- S1 segment의 duration

Formula:

- `(s1e - s1s) * 0.25`

Unit:

- `ms`

### 4.2 `S1_Peak`

의미:

- S1 내부의 최대 absolute amplitude

Formula:

- `max(abs(seg_S1))`

Unit:

- `mV`

### 4.3 `S1_Mean`

의미:

- S1 내부의 mean absolute amplitude

Formula:

- `mean(abs(seg_S1))`

Unit:

- `mV`

### 4.4 `S1_RMS`

의미:

- S1 내부의 RMS amplitude

Formula:

- `sqrt(mean(seg_S1^2))`

Unit:

- `mV`

### 4.5 `S1_Area`

의미:

- 시간에 대해 적분된 S1의 absolute signal area

Formula:

- `sum(abs(seg_S1)) * 0.25`

Unit:

- `mV*ms`

### 4.6 `S1_Middle`

의미:

- S1 segment의 midpoint time

Formula:

- `((s1s + s1e) / 2) * 0.25`

Unit:

- `ms`

### 4.7 `S1_StartCentroid`

의미:

- weighted energy center가 S1의 시작 절반 쪽으로 얼마나 치우쳐 있는지

중간 정의:

- `centroid_S1 = sum(n * abs(x[n])) / sum(abs(x[n]))` for `n in [s1s, s1e)`

Formula:

- `max(0, (mid_S1 - centroid_S1) / (mid_S1 - s1s)) * 100`

Unit:

- `%`

### 4.8 `S1_EndCentroid`

의미:

- weighted energy center가 S1의 끝 절반 쪽으로 얼마나 치우쳐 있는지

Formula:

- `max(0, (centroid_S1 - mid_S1) / (s1e - mid_S1)) * 100`

Unit:

- `%`

## 5. `S2` Parameter Formula

`S2` formula는 `S1` formula와 동일한 구조를 가지며, S2 segment를 사용한다.

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

### 5.7 `S2_StartCentroid`

Formula:

- `max(0, (mid_S2 - centroid_S2) / (mid_S2 - s2s)) * 100`

Unit:

- `%`

### 5.8 `S2_EndCentroid`

Formula:

- `max(0, (centroid_S2 - mid_S2) / (s2e - mid_S2)) * 100`

Unit:

- `%`

## 6. `S1-S2` Relation Formula

이 metric들은 S1과 S2 landmark 사이의 거리를 설명한다.

### 6.1 `S1Start_to_S2Start`

의미:

- S1 start부터 S2 start까지의 거리

Formula:

- `(s2s - s1s) * 0.25`

Unit:

- `ms`

### 6.2 `S1End_to_S2Start`

의미:

- S1 end부터 S2 start까지의 거리

Formula:

- `(s2s - s1e) * 0.25`

Unit:

- `ms`

### 6.3 `S1Middle_to_S2Middle`

의미:

- S1 midpoint부터 S2 midpoint까지의 거리

Formula:

- `(mid_S2 - mid_S1) * 0.25`

Unit:

- `ms`

### 6.4 `S1End_to_S2End`

의미:

- S1 end부터 S2 end까지의 거리

Formula:

- `(s2e - s1e) * 0.25`

Unit:

- `ms`

### 6.5 `S1Start_to_S2End`

의미:

- S1 start부터 S2 end까지의 전체 거리

Formula:

- `(s2e - s1s) * 0.25`

Unit:

- `ms`

### 6.6 `S1Peak_to_S2Peak`

의미:

- S1 내부의 가장 강한 absolute peak와 S2 내부의 가장 강한 absolute peak 사이의 거리

Formula:

- `(peak_S2 - peak_S1) * 0.25`

Unit:

- `ms`

## 7. `HR` Formula

### 7.1 `HeartRate_bpm`

의미:

- 현재 cycle 길이로부터 추정한 heart rate

Formula:

- `cycle_length_ms = (s1n - s1s) * 0.25`
- `HR = 60000 / cycle_length_ms`

Unit:

- `bpm`

Note:

- `next_S1_start`가 없거나 invalid이면 `HR`은 `NaN`이 된다.

## 8. `RS Score` Parameter Formula

`RS Score` section은 S1/S2 boundary detection에 이미 사용되는 RS-score channel로부터 계산되는 event-based parameter를 포함한다.

Source RS signal:

- `rs_s1_start = S1-Start_RS_Score`
- `rs_s1_end = S1-End_RS_Score`
- `rs_s2_start = S2-Start_RS_Score`
- `rs_s2_end = S2-End_RS_Score`

Representative event index는 최종 선택된 area peak에서 가져온다.

- `tau_s1s = selected S1 start peak index`
- `tau_s1e = selected S1 end peak index`
- `tau_s2s = selected S2 start peak index`
- `tau_s2e = selected S2 end peak index`

### 8.1 `RS Peak` family

의미:

- 선택된 event peak index에서의 raw RS-score value

#### 8.1.1 `S1Start_RS_Peak`

Formula:

- `rs_s1_start[tau_s1s]`

#### 8.1.2 `S1End_RS_Peak`

Formula:

- `rs_s1_end[tau_s1e]`

#### 8.1.3 `S2Start_RS_Peak`

Formula:

- `rs_s2_start[tau_s2s]`

#### 8.1.4 `S2End_RS_Peak`

Formula:

- `rs_s2_end[tau_s2e]`

Unit:

- raw RS-score scale

### 8.2 `RS Width` family

의미:

- 선택된 event peak 주변에서 RS score가 peak value의 50% 이상으로 유지되는 contiguous region의 width

일반 절차:

1. `peak_val = RS(tau)`
2. `threshold = 0.5 * peak_val`
3. RS score가 `>= threshold`인 동안 왼쪽으로 이동
4. RS score가 `>= threshold`인 동안 오른쪽으로 이동
5. 두 경계 사이의 거리를 width로 계산

일반 formula:

- `width_ms = (right_index - left_index) * 0.25`

해당 metric:

- `S1Start_RS_Width`
- `S1End_RS_Width`
- `S2Start_RS_Width`
- `S2End_RS_Width`

Unit:

- `ms`

### 8.3 `RS STD` family

의미:

- 선택된 RS event peak 주변의 weighted temporal spread

현재 local window:

- `tau - 80`부터 `tau + 80`
- 즉 `+-20 ms`

일반 절차:

1. event peak 주변의 local RS-score window 추출
2. RS value를 weight로 사용
3. weighted mean index 계산
4. index 공간에서 weighted variance 계산
5. standard deviation을 sample에서 ms로 변환

Weighted mean:

- `mu = sum(t * RS(t)) / sum(RS(t))`

Weighted variance:

- `var = sum((t - mu)^2 * RS(t)) / sum(RS(t))`

최종 formula:

- `std_ms = sqrt(var) * 0.25`

해당 metric:

- `S1Start_RS_STD`
- `S1End_RS_STD`
- `S2Start_RS_STD`
- `S2End_RS_STD`

Unit:

- `ms`

## 9. 각 Part가 사용자에게 의미하는 것

### 9.1 `S1`

이 part는 다음을 알려준다.

- S1이 얼마나 긴지
- S1이 얼마나 강한지
- S1이 얼마나 많은 energy를 가지는지
- S1 energy가 start-heavy인지 end-heavy인지

### 9.2 `S2`

이 part는 다음을 알려준다.

- S2가 얼마나 긴지
- S2가 얼마나 강한지
- S2가 얼마나 많은 energy를 가지는지
- S2 energy가 start-heavy인지 end-heavy인지

### 9.3 `S1-S2`

이 part는 다음을 알려준다.

- S1과 S2 landmark가 얼마나 떨어져 있는지
- systolic timing이 두 sound 사이에 어떻게 분포하는지
- midpoint 기반 timing과 peak 기반 timing이 어떻게 다른지

### 9.4 `RS Score`

이 part는 다음을 알려준다.

- 선택된 RS event peak가 얼마나 강한지
- half-height 기준으로 RS event가 얼마나 넓은지
- RS event가 시간적으로 얼마나 집중되어 있는지 혹은 퍼져 있는지

### 9.5 `HR`

이 part는 다음을 알려준다.

- 현재 cycle이 한 S1 start에서 다음 S1 start까지 얼마나 긴지
- 그로부터 계산된 beats-per-minute 값

## 10. Graph Annotation Mapping

UI에서 parameter를 클릭하면, graph에는 해당 parameter가 어디서 계산되었는지가 표시된다.

현재 mapping:

- `S1` metric -> S1 range
- `S2` metric -> S2 range
- `S1-S2` metric -> 해당 S1/S2 landmark 사이 interval
- `HR` -> 현재 cycle부터 다음 cycle까지
- `RS Peak` -> event point
- `RS Width` -> half-height contiguous width region
- `RS STD` -> local `+-20 ms` RS window

## 11. Notes

- 이 문서의 모든 formula는 `backend/app/services/plot_data_service.py`의 현재 구현을 반영한다.
- UI grouping은 `frontend/src/App.tsx`의 현재 구현을 반영한다.
- 이 문서는 현재 배포된 formula set만 설명한다.
- `ideas/Parameter.py`에 있는 미래 parameter 아이디어는, 이미 구현된 것이 아니라면 여기 포함하지 않는다.
