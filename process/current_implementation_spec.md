# HeartSound Analysis Tool: 현재 구현된 프로세스 및 Feature 명세

Last updated: 2026-03-19

이 문서는 `/Users/ms/Desktop/Tool` 아래의 Tool 프로젝트에서 **현재 실제로 구현되어 있는 동작**만 기록한다.

폐기된 실험, 임시 테스트 로직, 과거 시행착오는 의도적으로 제외하였다.  
즉, 이 문서는 **현재 코드에 구현된 기능만** 설명한다.

## 1. 프로젝트 목적

이 프로젝트는 두 개의 workspace를 위한 브라우저 기반 로컬 분석 도구이다.

- `HeartSound`
- `ECG`

최근 구현의 주요 초점은 `HeartSound` workflow이며, 현재 다음 기능들을 포함한다.

- RS-score 기반 심음 데이터 로딩
- S1/S2/S3/S4 관련 overlay 시각화
- wave audio playback 연동
- 업로드된 `data` 파일에서 직접 파생된 parameter 값 추출
- cycle-aware parameter 값 및 graph annotation 표시

## 2. 실행 환경 및 진입점

최상위 launcher 명령어:

- `./start`  
  frontend와 backend를 로컬에서 실행한다.

- `./stop_dev.sh`  
  로컬 frontend와 backend 프로세스를 중지한다.

- `./status_dev.sh`  
  launcher, frontend, backend, share-tunnel 상태를 출력한다.

- `./health_dev.sh`  
  로컬 앱의 health 상태를 확인한다.

- `./code`  
  access mode가 `code`일 때 사용할 1회용 숫자 access code를 생성한다.

- `./share`  
  frontend용 Cloudflare public tunnel을 시작한다.  
  현재 동작:
  - public URL 출력
  - runtime share URL 파일에 URL 저장
  - `pbcopy`를 사용해 public URL을 macOS clipboard에 자동 복사
  - 이미 share tunnel이 실행 중이면 기존 URL을 다시 출력하고 다시 복사함

- `./stop_share.sh`  
  public share tunnel을 중지한다.

## 3. 접근 및 인증

앱은 두 가지 access mode를 지원한다.

- `open`  
  viewer code 없이 접근 가능

- `code`  
  1회용 숫자 code가 필요

현재 기본 database 동작:

- 기본 access mode는 `code`
- 기본 admin username은 `ms`

Frontend admin UI에서 가능한 기능:

- access mode를 `open`과 `code` 사이에서 전환
- 1회용 access code 생성

## 4. Workspace 및 파일 역할

### 4.1 Workspaces

- `heartsound`
- `ecg`

### 4.2 파일 역할

지원되는 file role:

- `data`
- `wave`
- `parameter`
- `unsupervised`

### 4.3 Workspace별 file role 가용성

현재 왼쪽 파일 영역에 보이는 tab:

- `HeartSound`
  - `Data`
  - `Wave`
  - `Unsupervised`
  - `Parameter` tab은 heartsound sidebar에서 숨김 처리됨.  
    현재 parameter workflow가 수동 업로드가 아니라 `data` 기반 파생 방식이기 때문임.  
    다만 backend에서는 heartsound parameter file 지원 자체는 여전히 존재함.

- `ECG`
  - `Data`
  - `Wave`
  - `Parameter`
  - `Unsupervised`

### 4.4 Validation 규칙

HeartSound `data` 파일은 다음 column을 반드시 포함해야 한다.

- `Time_Index`
- `Amplitude`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

Wave 파일:

- `.wav`만 허용

Unsupervised 파일은 다음 column을 반드시 포함해야 한다.

- `Cycle Num`
- `Cycle Start`
- `Cycle End`
- `Cluster`

## 5. Panel Layout 및 일반 UI 구조

이 도구는 one-panel mode와 two-panel mode를 지원한다.

각 panel은 다음 요소를 가진다.

- panel header
- chart area
- chart 아래의 optional parameter area

Panel header 구성:

- panel title
- 현재 할당된 data filename
- 연결된 `Wave`, `Parameter`, `Unsupervised` 파일 label
- 중앙 audio playback controls
- 우측 panel action buttons

Panel action controls:

- `Default`  
  기본 visible series 설정으로 복원

- `Detail`  
  series picker modal 열기

- parameter toggle button  
  parameter section 표시/숨김

- settings button  
  panel settings 열기

- reset button  
  panel 초기화

## 6. Series 가시성 및 표시 제어

### 6.1 HeartSound의 기본 visible series

현재 기본 visible series:

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `S3 Candidates`
- `S4 Candidates`

기본 hidden series:

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 6.2 Detail modal

`Detail` 버튼은 panel별 series visibility를 제어하는 modal을 연다.

동작:

- 최상단 `All` checkbox 포함
- 현재 workspace에서 지원하는 각 visible series별 checkbox 포함
- 다른 panel state에는 영향 없이 개별 series만 on/off 가능

HeartSound에서 보이는 series 목록:

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `Show S3 Candidates`
- `Show S4 Candidates`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 6.3 Secondary axis 동작

HeartSound에서는 아래 RS score series 중 하나라도 visible일 때만 오른쪽 secondary axis가 표시된다.

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

네 개가 모두 hidden이면 secondary axis도 숨겨진다.

## 7. HeartSound Plot 동작

현재 HeartSound chart가 지원하는 요소:

- amplitude waveform line
- RS score bar overlays
- S1 area overlay
- S2 area overlay
- S3 candidate overlay
- S4 candidate overlay
- selected cycle highlight overlay
- selected parameter measurement overlay
- unsupervised cycle overlay
- audio playhead overlay

## 8. S1 및 S2 Area 검출

### 8.1 Source signals

S1과 S2 area는 다음 네 개의 RS-score channel을 기반으로 구성된다.

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 8.2 Peak 추출

각 RS-score channel에 대해:

- score가 threshold 이상인 contiguous region으로 signal을 분할
- 각 contiguous region마다 가장 좋은 local peak를 하나 선택

현재 threshold:

- `15`

### 8.3 Area 구성

S1의 경우:

- `S1 start peaks`를 이후의 compatible한 `S1 end peak`와 pairing

S2의 경우:

- `S2 start peaks`를 이후의 compatible한 `S2 end peak`와 pairing

최대 허용 region width는 추정된 cycle spacing으로부터 계산된다.

- region width는 estimated cycle spacing의 `45%`를 넘을 수 없음

### 8.4 Overlap 해소

S1 area와 S2 area가 겹치면:

- 둘 다 유지하지 않음
- 더 강한 쪽만 유지
- strength는 해당 overlay 내부의 더 강한 peak score를 기준으로 판단

이 과정을 통해 겹치지 않는 resolved S1/S2 area overlay가 생성된다.

### 8.5 현재 시각 스타일

- `S1 Area`
  - 녹색 계열의 반투명 band

- `S2 Area`
  - 빨간색 계열의 반투명 band

## 9. S3 및 S4 Candidate 검출

현재 S3와 S4는 **확정 진단**이 아니라 **amplitude 기반 candidate**로 취급된다.

### 9.1 Signal basis

Candidate detection은 다음을 사용한다.

- 현재 표시 중인 `Amplitude` signal
- 이미 resolve된 `S1` 및 `S2` area

### 9.2 Diastolic 해석

검출은 다음 interval을 기준으로 한다.

- `S2_end -> next_S1_start`

현재 개념적 해석:

- `S3`  
  S2 이후 early diastolic candidate

- `S4`  
  다음 S1 직전 late diastolic candidate

### 9.3 현재 기본 timing window

현재 고정 window:

- `S3`  
  `S2 + 120 ms`부터 `S2 + 200 ms`까지

- `S4`  
  `next S1 - 200 ms`부터 `next S1 - 80 ms`까지

Fallback diastolic-ratio window:

- `S3`  
  diastole 앞부분, 대략 `18% -> 34%`

- `S4`  
  diastole 뒷부분, 대략 `72% -> 88%`

### 9.4 현재 candidate detection 방식

현재 detector는 다음 절차를 따른다.

- absolute amplitude smoothing
- robust amplitude scale 추정
- local baseline 대비 deviation 계산
- minimum duration 조건 적용
- 가까운 candidate fragment 병합
- 각 window 내부에서 가장 강한 candidate 하나 선택

현재 frontend에서 사용하는 config:

- fallback sample rate: `8000`
- smoothing window: `12 ms`
- minimum duration: `18 ms`
- merge distance: `20 ms`
- noise standard deviation multiplier: `2.4`
- minimum absolute threshold: `1e-4`
- S3와 S4 사이 candidate distance floor: user-configurable, 기본 `120 ms`
- S3 delta threshold ratio: 기본 `0.10`
- S4 delta threshold ratio: 기본 `0.10`

### 9.5 S3/S4 ordering normalization

초기 검출 이후:

- S3는 diastole 전반부에 남도록 강제
- S4는 diastole 후반부에 남도록 강제
- 순서가 뒤바뀌면 label을 normalization
- S3와 S4가 너무 가까우면 더 강한 candidate만 유지

### 9.6 현재 S3/S4 시각 스타일

S3와 S4는 다음 형태로 표시된다.

- 빨간 outline box
- 내부 fill 없음
- box 위쪽에 작은 흰색 label 표시

현재 label:

- `S3`
- `S4`

### 9.7 Visibility controls

다음 series를 on/off 할 수 있다.

- `Show S3 Candidates`
- `Show S4 Candidates`

둘 다 기본값은 enabled이다.

### 9.8 Runtime tuning command

검색창은 S3/S4 candidate threshold 조정을 위한 `/search` command를 지원한다.

- `/search`  
  현재 S3/S4 설정 표시

- `/search reset`  
  candidate 설정을 기본값으로 초기화

- `/search s3=... s4=... gap=...`  
  threshold ratio와 최소 S3/S4 separation 값 갱신

## 10. Audio / Wave Workflow

### 10.1 Upload 및 linking

Wave 파일은 `Wave` file role로 업로드한다.

`data` 파일이 panel에 할당되면:

- matching `wave`
- matching `parameter`
- matching `unsupervised`

파일들이 기존 filename-base matching rule에 따라 자동 연결된다.

### 10.2 Panel wave label

Wave 파일이 연결되어 있으면 panel header에 다음과 같이 표시된다.

- `Wave: <filename>`

### 10.3 Playback controls

Panel header 중앙에는 다음 controls가 있다.

- 5초 뒤로
- play / pause
- 5초 앞으로
- 0초로 reset
- slow-speed cycle button

현재 speed option:

- `1x`
- `0.75x`
- `0.5x`
- `0.25x`

speed 버튼을 누를 때마다 순환한다.

### 10.4 Playback 동작

현재 구현된 동작:

- play / pause는 할당된 wave 파일을 재생/정지
- playhead가 현재 visible graph range 밖에 있으면, play/pause 전에 먼저 보이는 범위 안으로 이동
- rewind/forward는 5초 단위로 seek
- reset은 audio를 `0s`로 되돌림
- reset 시 graph viewport도 시작점으로 이동
- playback이 끝에 도달하면:
  - audio는 처음으로 reset
  - graph viewport도 처음으로 reset

### 10.5 Public wave serving

Backend는 업로드된 wave 파일을 file endpoint로 노출하며 `audio/wav` media type으로 제공한다.

### 10.6 Playhead

기존의 빨간 점선 marker는 더 이상 playback에 사용되지 않는다.

현재 playback indicator는 통합된 custom playhead overlay이다.

- 빨간 세로선
- 상단의 빨간 둥근 handle

이 둘은 하나의 구조처럼 함께 움직인다.

### 10.7 Playhead interaction

현재 구현된 interaction:

- playback 중 playhead 이동
- handle을 좌우로 drag 가능
- drag 시 audio current time 갱신
- audio seek이 발생하면 필요 시 playhead와 graph view가 함께 이동

### 10.8 Graph follow 동작

Wave navigation과 graph viewport는 연동된다.

구현된 follow case:

- play / pause visibility correction
- rewind
- forward
- reset
- end-of-track reset
- playhead drag

Cycle 선택 시:

- 선택한 cycle이 현재 visible range 밖에 있으면 graph viewport를 이동시킴

## 11. Parameter Panel 구조

### 11.1 일반 동작

하단 panel section은 `Parameter window`이다.

Panel header의 parameter toggle로 표시/숨김할 수 있다.

구성 요소:

- cycle controls
- cycle highlight toggle
- unsupervised overlay toggle
- heartsound parameter sections 또는 ECG parameter summary groups

chart와 parameter 영역 사이의 분할은 horizontal split handle을 drag해서 세로 방향으로 조절할 수 있다.

### 11.2 Parameter window 내부 header controls

현재 controls:

- `Cycle` checkbox  
  그래프에서 selected cycle highlight on/off

- `Unsupervised` checkbox  
  그래프에서 unsupervised cycle overlay on/off

- 현재 row range text

### 11.3 Heartsound parameter layout

Heartsound의 parameter UI는 custom 구조이며 현재 다음 top-level section으로 나뉜다.

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

추가로:

- `HR`은 일반 metric card처럼 section 내부에 들어가지 않고 cycle selector 옆에 별도로 표시된다.

### 11.4 HR card

현재 HR 표시 방식:

- label: `HR`
- value 예시: `72 bpm`
- cycle controls 오른쪽의 별도 card
- 시각적으로 강조된 고유 color theme 사용

HR card는 클릭 가능하며 graph measurement annotation에도 참여한다.

### 11.5 Parameter card 내용

현재 각 heartsound parameter card는 다음을 표시한다.

- metric label
- 현재 선택된 cycle의 value
- unit이 있으면 값 옆에 inline으로 표시

현재 값 표시에 min-max range bar나 gauge는 없다.

### 11.6 Hover tooltip 설명

Parameter card는 hover tooltip을 지원한다.

Tooltip 내용:

- 짧은 title
- 쉬운 표현의 measurement 설명
- 작은 schematic string

현재 tooltip style:

- 어두운 floating box
- hover 또는 focus 시 표시
- `HR` card에도 동일하게 적용

### 11.7 현재 tooltip 문구 스타일

Tooltip wording은 의도적으로 짧게 유지한다.

예시:

- `S1 start ~ S1 end`
- `S1 peak ~ S2 peak`
- `peak 50% height contiguous width`

## 12. 현재 파생 HeartSound Parameter 추출

현재 HeartSound parameter는 별도의 parameter 파일 업로드 없이, `data` 파일에서 직접 파생된다.

### 12.1 Sampling 가정

현재 backend 가정:

- `SamplingRate = 4000 Hz`
- `1 sample = 0.25 ms`
- amplitude signal unit = `mV`

### 12.2 파생 column family

현재 파생되는 family:

- S1 parameters
- S2 parameters
- S1/S2 relation parameters
- RS Peak parameters
- RS Width parameters
- RS STD parameters
- Heart Rate

### 12.3 S1 parameter columns

현재 추출되는 column:

- `S1_Duration_ms`
- `S1_Peak_mV`
- `S1_mean_mV`
- `S1_RMS_mV`
- `S1_Area_mVms`
- `S1_Middle_ms`
- `S1_S_centroid_pct`
- `S1_E_centroid_pct`

현재 공식:

- `Duration`  
  `(S1_end - S1_start) * 0.25`

- `Peak`  
  `max(abs(x[S1_start:S1_end]))`

- `Mean`  
  `mean(abs(x[S1_start:S1_end]))`

- `RMS`  
  `sqrt(mean(x^2))`

- `Area`  
  `sum(abs(x)) * 0.25`

- `Middle`  
  start와 end의 midpoint를 ms로 변환

- `Start centroid percent`  
  weighted centroid가 시작 쪽 절반에 얼마나 치우치는지

- `End centroid percent`  
  weighted centroid가 끝 쪽 절반에 얼마나 치우치는지

### 12.4 S2 parameter columns

현재 추출되는 column:

- `S2_Duration_ms`
- `S2_Peak_mV`
- `S2_mean_mV`
- `S2_RMS_mV`
- `S2_Area_mVms`
- `S2_Middle_ms`
- `S2_S_centroid_pct`
- `S2_E_centroid_pct`

공식은 S1과 동일한 계산 패턴을 따른다.

### 12.5 S1/S2 relation parameter columns

현재 추출되는 column:

- `S1_S_to_S2_S_ms`
- `S1_E_to_S2_S_ms`
- `S1_mid_to_S2_mid_ms`
- `S1_E_to_S2_E_ms`
- `S1_S_to_S2_E_ms`
- `S1_peak_to_S2_peak_ms`

이 값들은 다음 landmark 간 거리를 나타낸다.

- start 간 거리
- end 간 거리
- midpoint 간 거리
- local absolute peak 간 거리

### 12.6 Heart rate

현재 추출되는 column:

- `HeartRate_bpm`

현재 공식:

- `60000 / (next_S1_start - S1_start in ms)`

### 12.7 RS Peak parameter columns

현재 추출되는 column:

- `S1S_RS_Peak`
- `S1E_RS_Peak`
- `S2S_RS_Peak`
- `S2E_RS_Peak`

의미:

- 선택된 representative event index에서의 raw RS-score value

### 12.8 RS Width parameter columns

현재 추출되는 column:

- `S1S_RS_Width_ms`
- `S1E_RS_Width_ms`
- `S2S_RS_Width_ms`
- `S2E_RS_Width_ms`

의미:

- event peak 주변에서 RS score가 peak height의 50% 이상인 contiguous width

### 12.9 RS STD parameter columns

현재 추출되는 column:

- `S1S_RS_STD`
- `S1E_RS_STD`
- `S2S_RS_STD`
- `S2E_RS_STD`

의미:

- event peak 주변의 weighted temporal spread standard deviation

현재 local window:

- `+-80 samples`
- `4000 Hz` 기준 `+-20 ms`

## 13. Cycle 정의 및 Cycle Validation

### 13.1 현재 cycle 정의

현재 valid cycle은 다음으로 정의된다.

- 현재 `S1_start`
- 현재 `S1_end`
- 매칭된 `S2_start`
- 매칭된 `S2_end`
- 다음 `S1_start`

즉:

- cycle `n`은 `S1_start(n)`에서 시작
- cycle `n`은 `next_S1_start(n)`에서 끝남

### 13.2 필수 ordering rule

다음 순서를 만족할 때만 cycle을 valid로 간주한다.

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

이 규칙은 현재 명시적으로 강제된다.

### 13.3 S2 matching rule

각 S1에 대해:

- 아래 조건을 만족하는 첫 번째 S2를 forward search한다.
  - `S2_start`가 `S1_end` 이후
  - `S2_end`가 `S2_start` 이후
  - `S2_end`가 `next_S1_start` 이전

### 13.4 Last-cycle 동작

마지막 S1에 대해 유효한 다음 S2도 없고 다음 S1도 없으면:

- 파생 frame에는 마지막 row가 존재할 수 있음
- 하지만 UI에서 보여주는 main cycle list의 valid cycle로는 포함되지 않음

### 13.5 UI에 표시되는 cycle list

현재 동작:

- cycle selector는 파일 전체의 valid cycle list를 사용
- 더 이상 현재 visible graph page로 제한되지 않음
- parameter summary refresh 시, 현재 visible graph range는 기본 selected cycle을 고르는 데만 사용됨

### 13.6 그래프에서의 cycle highlight

`Cycle` checkbox가 enabled일 때:

- 선택된 cycle이 그래프에서 outlined box로 표시된다.

현재 style:

- fill 없음
- 강한 outline
- label `Cycle`

선택된 cycle의 범위:

- `startIndex = current S1_start`
- `endIndex = next_S1_start`

## 14. Parameter-to-Graph Measurement Annotation

Heartsound parameter card를 클릭하면 unsupervised measurement style과 유사한 graph annotation이 생성된다.

현재 metric type별 구현 동작:

- `S1_*`  
  S1 range 표시

- `S2_*`  
  S2 range 표시

- `S1-S2 relation`  
  해당 landmark 간 측정 interval 표시

- `HeartRate_bpm`  
  현재 cycle에서 다음 cycle까지의 interval 표시

- `RS Peak`  
  선택된 RS event point 표시

- `RS Width`  
  선택된 RS event peak 주변의 50%-height width bound 표시

- `RS STD`  
  local RS spread window 표시

선택된 metric card는 active state가 된다.

## 15. Unsupervised Overlay 동작

Unsupervised 데이터는 panel에 연결될 수 있다.

현재 동작:

- visible range에 해당하는 unsupervised cycle을 로딩
- parameter header의 `Unsupervised` checkbox로 graph overlay visibility를 제어
- unsupervised overlay는 selected cycle 및 parameter measurement overlay와 구분되어 유지됨

## 16. Keyboard 동작

현재 구현된 keyboard 동작:

- `ArrowLeft`  
  graph range를 왼쪽으로 이동

- `ArrowRight`  
  graph range를 오른쪽으로 이동

- `[`  
  현재 heartsound panel에서 이전 cycle로 이동

- `]`  
  현재 heartsound panel에서 다음 cycle로 이동

Cycle keyboard navigation:

- 현재 full cycle list 기준으로 동작
- selected cycle을 갱신
- 선택한 cycle이 visible graph range 밖이면 viewport도 함께 이동

Arrow navigation:

- graph range를 고정 step만큼 이동
- 무거운 linked summary refresh는 이동이 멈춘 뒤 지연 반영

## 17. Graph Range 및 Viewport 동작

현재 구현된 range 기능:

- panel은 현재 `rangeStart`와 `rangeEnd`를 유지
- parameter 및 unsupervised summary는 visible graph range와 연동
- cycle을 선택했을 때 현재 viewport 밖에 있으면 cycle이 보이도록 viewport를 recenter

Full-resolution heartsound playback의 경우:

- full-resolution data를 memory에 유지할 수 있음
- chart viewport를 이동할 때 항상 plot data를 다시 fetch할 필요는 없음

## 18. Sharing 동작

현재 public share flow는 다음과 같다.

1. `./share`가 frontend availability를 확인한다.
2. `cloudflared`를 찾거나 다운로드한다.
3. detached tunnel process를 시작한다.
4. `trycloudflare.com` URL이 나올 때까지 대기한다.
5. 해당 URL을 runtime share URL 파일에 저장한다.
6. terminal에 URL을 출력한다.
7. macOS clipboard에 URL을 자동 복사한다.

이미 share tunnel이 실행 중이라면:

- 저장된 share URL을 다시 출력
- 같은 URL을 다시 clipboard에 복사

## 19. 파일 저장 및 Persistence

현재 storage 위치:

- uploaded files:  
  `/Users/ms/Desktop/Tool/backend/storage/uploads`

- metadata database:  
  `/Users/ms/Desktop/Tool/backend/storage/heartsound.db`

- launcher runtime files:  
  `/Users/ms/Desktop/Tool/.launcher`

업로드 파일에 대해 저장되는 metadata:

- original filename
- stored filename
- workspace kind
- file role
- extension
- row count
- file size
- upload timestamp

## 20. 현재 HeartSound Derived-Parameter Summary Source Rule

Heartsound panel에서는:

- parameter window가 active `data` 파일을 source로 사용
- 수동 업로드한 heartsound parameter 파일을 source로 사용하지 않음

즉:

- heartsound `data` 파일만 할당해도 parameter window가 채워짐
- panel은 linked file label은 유지하지만, 실제 heartsound parameter summary source는 derived data summary이다.

## 21. 현재 Visual Semantics 요약

### 21.1 주요 category

- `Amplitude`  
  메인 waveform

- `S1 Area`  
  resolve된 S1 region

- `S2 Area`  
  resolve된 S2 region

- `S3`  
  candidate box

- `S4`  
  candidate box

- `Cycle`  
  selected cycle box

- `Parameter annotation`  
  선택된 metric의 measurement range 또는 point

- `Wave playhead`  
  현재 audio 위치

### 21.2 Parameter section

- `S1`
- `S2`
- `S1-S2`
- `RS Score`
- `HR`은 cycle controls 옆에 별도로 표시

## 22. 현재 Scope 경계

현재 구현된 항목:

- heartsound data upload
- wave upload 및 playback
- support file auto-linking
- S1/S2 area detection
- S3/S4 candidate detection
- cycle-aware parameter extraction
- parameter card 및 graph annotation
- cycle navigation
- keyboard cycle navigation
- clipboard copy를 포함한 public share URL 생성

현재 derived-parameter 구현에 포함되지 않는 항목:

- frequency-domain parameter extraction
- pathology labeling
- confirmed S3/S4 diagnosis
- ECG-driven S3/S4 validation
- UI에서의 arbitrary user-defined parameter formula

## 23. 권장 참고 파일

Main frontend implementation:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

Main backend implementation:

- `backend/app/services/plot_data_service.py`
- `backend/app/services/file_service.py`
- `backend/app/services/auth_service.py`
- `backend/app/db.py`

Launcher 및 sharing:

- `scripts/share.sh`
- `scripts/common.sh`

최상위 사용 문서:

- `README.md`
