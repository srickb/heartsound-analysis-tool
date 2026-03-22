"""

현재 파일의 기존 기능은 절대 수정하지 말고, PCG parameter extraction 코드만 추가해줘.

목표:
RS score로 이미 구해진 S1/S2 onset/offset 경계를 이용해서

1. Time_Timing 파라미터
2. Amplitude_Energy 파라미터
를 beat 단위로 추출하여 저장해줘.

중요 규칙:

- 기존 기능, 기존 UI, 기존 계산 로직은 절대 수정하지 말 것
- 파라미터 추출 코드와 저장 코드만 추가할 것
- 경계는 onset/offset 개념으로 처리할 것
- 모든 구간은 half-open interval [start, end) 로 통일할 것
예: segment = x[start:end]
- 입력 경계가 inclusive end라면, 내부 계산 시작 전에 off = off + 1 로 변환한 뒤 이후는 모두 [on, off) 규칙 사용
- 계산 실패 시 0으로 채우지 말고 NaN 처리
- beat validity를 먼저 검사한 뒤 valid beat만 파라미터 계산

입력 가정:

- filtered PCG signal: x (1D numpy array)
- sampling rate: fs
- beat마다 다음 경계가 존재:
s1_on, s1_off, s2_on, s2_off
- 가능하면 다음 beat의 s1_on_next, s2_on_next도 사용
- 모든 경계는 sample index 기준 정수

기본 beat validity 조건:

- 0 <= s1_on < s1_off <= s2_on < s2_off < s1_on_next <= len(x)
- s2_on_next가 필요한 파라미터는 추가로 s2_off < s2_on_next <= len(x) 필요
- 위 조건을 만족하지 않으면 해당 beat는 invalid 처리
- invalid beat는 feature를 NaN으로 저장하고 valid_flag = 0
- valid beat는 valid_flag = 1

단위 규칙:

- 시간 관련 값은 모두 ms 단위로 저장
- 비율 값은 unitless
- heart_rate는 bpm
- amplitude/energy는 입력 x의 스케일을 그대로 따름
- 추가 normalization은 하지 말 것
- 단, template_corr 계산용 template 생성 시에는 shape 비교를 위해 z-score normalization 사용 가능

구간 정의:

- S1 segment: x[s1_on:s1_off]
- S2 segment: x[s2_on:s2_off]
- systolic gap: x[s1_off:s2_on]
- diastolic gap: x[s2_off:s1_on_next]
- cycle: s1_on -> s1_on_next
- S2 anchor cycle: s2_on -> s2_on_next

시간 변환 함수:

- samples_to_ms(n) = 1000.0 * n / fs

==================================================

1. Time_Timing 파라미터
==================================================

각 beat마다 아래 파라미터를 계산해줘.

1. S1_duration_ms
- 공식: 1000 * (s1_off - s1_on) / fs
1. S2_duration_ms
- 공식: 1000 * (s2_off - s2_on) / fs
1. S1_center_time_ms
- 공식: 1000 * (s1_on + s1_off) / (2 * fs)
- 기록 전체 시작점을 기준으로 한 absolute time
1. S2_center_time_ms
- 공식: 1000 * (s2_on + s2_off) / (2 * fs)
1. S1_on_to_S2_on_ms
- 공식: 1000 * (s2_on - s1_on) / fs
1. S1_off_to_S2_on_ms
- 공식: 1000 * (s2_on - s1_off) / fs
1. S2_on_to_next_S1_on_ms
- 공식: 1000 * (s1_on_next - s2_on) / fs
1. S2_off_to_next_S1_on_ms
- 공식: 1000 * (s1_on_next - s2_off) / fs
1. cycle_length_ms
- 공식: 1000 * (s1_on_next - s1_on) / fs
1. cycle_length_S2_anchor_ms
- 공식: 1000 * (s2_on_next - s2_on) / fs
- s2_on_next가 없으면 NaN
1. heart_rate_bpm
- 공식: 60000.0 / cycle_length_ms
- cycle_length_ms <= 0 이면 NaN
1. systolic_fraction
- 공식: (s2_on - s1_on) / (s1_on_next - s1_on)
1. diastolic_fraction
- 공식: (s1_on_next - s2_on) / (s1_on_next - s1_on)
1. S1_fraction
- 공식: (s1_off - s1_on) / (s1_on_next - s1_on)
1. S2_fraction
- 공식: (s2_off - s2_on) / (s1_on_next - s1_on)
1. S1_S2_duration_ratio
- 공식: (s1_off - s1_on) / (s2_off - s2_on)
- denominator <= 0 이면 NaN
1. sys_dia_ratio
- 공식: (s2_on - s1_on) / (s1_on_next - s2_on)
- denominator <= 0 이면 NaN
1. center_to_center_interval_ms
- cS1 = (s1_on + s1_off) / 2
- cS2 = (s2_on + s2_off) / 2
- 공식: 1000 * (cS2 - cS1) / fs
1. timing_variability_stats
- 이건 beat별 컬럼이 아니라 record-level summary로 따로 저장
- 아래 feature들에 대해 mean, std, cv, rmssd 계산:
    - S1_duration_ms
    - S2_duration_ms
    - S1_off_to_S2_on_ms
    - S2_off_to_next_S1_on_ms
    - cycle_length_ms
    - heart_rate_bpm
    - sys_dia_ratio
- cv = std / (mean + eps)
- rmssd = sqrt(mean(diff(feature)^2))
- eps = 1e-12
- valid beat만 사용
- summary 시트 또는 별도 csv/xlsx sheet에 저장

# ==================================================
2. Amplitude_Energy 파라미터

공통 규칙:

- amplitude/energy feature는 S1, S2 각각 별도 컬럼으로 저장
- 즉 mean_abs_S1, mean_abs_S2 처럼 분리
- raw filtered PCG segment x를 사용
- shape 계열(feature with envelope)은 envelope e를 사용

Envelope 정의:

- 전체 신호 x에 대해 Hilbert envelope 계산
- e_raw = abs(hilbert(x))
- e = moving average 또는 smoothing 적용
- smoothing window는 round(0.01 * fs) 정도의 10 ms 사용
- 최소 3 sample
- 결과 envelope를 e라고 정의

S1/S2에 대해 각각 계산:

- seg_S1 = x[s1_on:s1_off]
- seg_S2 = x[s2_on:s2_off]
- env_S1 = e[s1_on:s1_off]
- env_S2 = e[s2_on:s2_off]

아래 파라미터를 각각 S1, S2에 대해 계산:

1. peak_abs_S1, peak_abs_S2
- 공식: max(abs(seg))
1. ptp_S1, ptp_S2
- 공식: max(seg) - min(seg)
1. mean_abs_S1, mean_abs_S2
- 공식: mean(abs(seg))
1. RMS_S1, RMS_S2
- 공식: sqrt(mean(seg^2))
1. area_abs_S1, area_abs_S2
- 공식: sum(abs(seg))
- 참고: sampling rate가 모두 동일하다는 전제로 raw sum 사용
1. energy_S1, energy_S2
- 공식: sum(seg^2)
1. log_energy_S1, log_energy_S2
- 공식: log(energy + eps)
- eps = 1e-12
- natural log 사용
1. energy_per_ms_S1, energy_per_ms_S2
- duration_ms = 1000 * len(seg) / fs
- 공식: energy / (duration_ms + eps)
1. S1_S2_peak_ratio
- 공식: peak_abs_S1 / (peak_abs_S2 + eps)
1. S1_S2_energy_ratio
- 공식: energy_S1 / (energy_S2 + eps)

# ==================================================
3. Shape 파라미터 (Amplitude_Energy 시트에 포함)

peak time은 raw signal peak가 아니라 envelope peak 기준으로 계산해줘.
이유: raw peak는 noise에 민감하므로 shape feature는 envelope가 더 안정적이다.

각 segment에 대해:

- peak_idx_rel = argmax(env_seg)
- peak_idx_abs = on + peak_idx_rel

S1, S2 각각 계산:

1. attack_time_S1_ms, attack_time_S2_ms
- 공식: 1000 * peak_idx_rel / fs
1. decay_time_S1_ms, decay_time_S2_ms
- 공식: 1000 * (len(env_seg) - peak_idx_rel) / fs
1. attack_decay_ratio_S1, attack_decay_ratio_S2
- 공식: attack_time_ms / (decay_time_ms + eps)
1. max_rise_slope_S1, max_rise_slope_S2
- 공식: max(diff(env_seg)) * fs
- 단위: amplitude / sec
- len(env_seg) < 2 이면 NaN
1. max_fall_slope_S1, max_fall_slope_S2
- 공식: min(diff(env_seg)) * fs
- 단위: amplitude / sec
- len(env_seg) < 2 이면 NaN
1. temporal_centroid_S1_ms, temporal_centroid_S2_ms
- 상대 시간 기준으로 계산
- t_rel = arange(len(env_seg)) / fs
- 공식: 1000 * sum(t_rel * env_seg) / (sum(env_seg) + eps)
- onset으로부터 몇 ms 지점에 에너지 중심이 있는지 의미

# ==================================================
4. Statistics / Complexity 파라미터 (Amplitude_Energy 시트에 포함)

S1, S2 각각 계산:

1. skewness_S1, skewness_S2
- mu = mean(seg)
- sigma = std(seg)
- 공식: mean(((seg - mu) / (sigma + eps))^3)
1. kurtosis_S1, kurtosis_S2
- mu = mean(seg)
- sigma = std(seg)
- 공식: mean(((seg - mu) / (sigma + eps))^4)
- excess kurtosis가 아니라 raw kurtosis 사용
1. zero_crossing_rate_S1, zero_crossing_rate_S2
- 부호가 바뀌는 횟수 / (len(seg) - 1)
- 공식:
sign_changes = sum(seg[:-1] * seg[1:] < 0)
zcr = sign_changes / (len(seg) - 1)
- len(seg) < 2 이면 NaN
1. abs_sum_first_diff_S1, abs_sum_first_diff_S2
- 공식: sum(abs(diff(seg)))
- len(seg) < 2 이면 NaN

# ==================================================
5. Stability 파라미터 (Amplitude_Energy 시트에 포함)

template_corr_S1, template_corr_S2 계산 규칙:

목적:

- 각 beat의 S1/S2 파형이 해당 recording의 대표 파형과 얼마나 유사한지 보기 위함

방법:

1. valid한 모든 S1 segment를 각각 고정 길이 L=128로 선형 보간하여 resample
2. 각 resampled segment를 z-score normalize
    - std가 매우 작으면 0 vector 처리
3. template_S1 = 모든 normalized S1 segment의 point-wise median
4. 각 beat의 normalized S1과 template_S1의 Pearson correlation 계산
5. S2도 동일하게 별도 수행

출력:

- template_corr_S1
- template_corr_S2

예외:

- valid beat가 너무 적어서 template 생성이 어려우면 NaN
- correlation 계산 불가 시 NaN

# ==================================================
6. 저장 규칙

beat-level output 컬럼 예시:

- beat_index
- valid_flag
- s1_on
- s1_off
- s2_on
- s2_off
- s1_on_next
- s2_on_next
- S1_duration_ms
- S2_duration_ms
- S1_center_time_ms
- S2_center_time_ms
- S1_on_to_S2_on_ms
- S1_off_to_S2_on_ms
- S2_on_to_next_S1_on_ms
- S2_off_to_next_S1_on_ms
- cycle_length_ms
- cycle_length_S2_anchor_ms
- heart_rate_bpm
- systolic_fraction
- diastolic_fraction
- S1_fraction
- S2_fraction
- S1_S2_duration_ratio
- sys_dia_ratio
- center_to_center_interval_ms
- peak_abs_S1
- peak_abs_S2
- ptp_S1
- ptp_S2
- mean_abs_S1
- mean_abs_S2
- RMS_S1
- RMS_S2
- area_abs_S1
- area_abs_S2
- energy_S1
- energy_S2
- log_energy_S1
- log_energy_S2
- energy_per_ms_S1
- energy_per_ms_S2
- S1_S2_peak_ratio
- S1_S2_energy_ratio
- attack_time_S1_ms
- attack_time_S2_ms
- decay_time_S1_ms
- decay_time_S2_ms
- attack_decay_ratio_S1
- attack_decay_ratio_S2
- max_rise_slope_S1
- max_rise_slope_S2
- max_fall_slope_S1
- max_fall_slope_S2
- temporal_centroid_S1_ms
- temporal_centroid_S2_ms
- skewness_S1
- skewness_S2
- kurtosis_S1
- kurtosis_S2
- zero_crossing_rate_S1
- zero_crossing_rate_S2
- abs_sum_first_diff_S1
- abs_sum_first_diff_S2
- template_corr_S1
- template_corr_S2

record-level summary 별도 저장:

- 각 timing variability feature의 mean/std/cv/rmssd
- 필요하면 amplitude/energy feature도 mean/std/cv 추가 가능하지만 기본은 time feature 우선

구현 세부:

- numpy 기반으로 구현
- 가능하면 scipy.signal.hilbert 사용
- 저장은 기존 파일 형식에 맞춰 csv 또는 xlsx
- 기존 파이프라인을 망가뜨리지 않도록 extraction 함수만 추가하고 마지막에 저장 코드 연결

"""