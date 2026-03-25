# Current Cycle Rule Code Trace

## 목적

이 문서는 현재 Tool에서 HeartSound cycle을 어떤 규칙으로 형성하는지, 그리고 그 규칙이 실제 코드에서 어떤 흐름으로 구현되어 있는지를 정리한다.

기존 문서들이 개념 설명과 제품 의도를 중심으로 했다면, 이 문서는 실제 구현 함수와 상수까지 포함한 code-trace 문서에 가깝다.

향후 다른 연구나 재현 실험에서 다음을 바로 가져다 쓸 수 있도록 정리하는 것이 목적이다.

- cycle 형성 기준
- S1/S2 region 생성 방식
- valid / invalid 판정 방식
- UI와 export에 연결되는 방식
- 재현에 필요한 상수와 예외 처리

## 범위

이 문서에서 다루는 내용은 다음과 같다.

- RS-score 기반 peak 추출
- S1 / S2 region pairing
- overlap 해소 규칙
- cycle definition
- S2 matching 규칙
- cycle validity filtering
- cycle index 부여 방식
- UI cycle selection 동작
- export 시 valid cycle만 남기는 정책

이 문서에서 다루지 않는 내용은 다음과 같다.

- S3 / S4 candidate 세부 탐색식
- 개별 parameter formula 전체
- audio playback 세부 로직

## 주요 코드 소스

현재 cycle 규칙을 이해할 때 핵심이 되는 파일은 다음과 같다.

- `backend/app/services/plot_data_service.py`
- `frontend/src/App.tsx`
- `process/current_implementation_spec.md`
- `product_requirements_document.md`
- `ideas/05_heartsound_cycle_and_s1_s2_structure.md`
- `ideas/10_parameter_computation_rules.md`

특히 실제 cycle backbone은 backend에서 형성되고, frontend는 그 규칙을 시각화와 navigation에 그대로 반영한다.

## 최상위 결론

현재 구현의 cycle은 다음 한 문장으로 요약할 수 있다.

> RS-score 기반으로 S1 / S2 event region을 먼저 만들고, 정렬된 S1 sequence를 anchor로 삼아 `current S1 start -> next S1 start`를 하나의 cycle로 정의한 뒤, 그 내부에서 strict ordering을 만족하는 첫 번째 S2만 매칭하여 valid cycle을 구성한다.

즉, 현재 구조의 핵심은 다음 네 가지다.

- `S1` anchor 중심 구조
- forward search 기반 `S2` matching
- 엄격한 시간 순서 검증
- malformed cycle 제외 정책

## 입력 신호와 기본 상수

현재 cycle logic은 다음 RS-score 채널을 입력으로 사용한다.

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

근거:

- `product_requirements_document.md`
- `backend/app/services/plot_data_service.py`

현재 구현에 박혀 있는 핵심 상수는 다음과 같다.

- sample rate = `4000 Hz`
- `1 sample = 0.25 ms`
- region threshold = `15`
- default cycle spacing = `4000 samples`
- max region width ratio = `0.45`

backend 근거:

- `HEARTSOUND_SAMPLE_RATE = 4000.0`
- `HEARTSOUND_SAMPLE_MS = 1000.0 / HEARTSOUND_SAMPLE_RATE`
- `HEARTSOUND_REGION_THRESHOLD = 15.0`
- `HEARTSOUND_DEFAULT_CYCLE_SPACING = 4000`
- `HEARTSOUND_MAX_REGION_WIDTH_RATIO = 0.45`

frontend도 같은 규칙을 시각화용으로 복제한다.

## 1. RS-score에서 Peak를 추출하는 방식

cycle은 raw amplitude만 보고 직접 형성되지 않는다.  
먼저 RS-score channel에서 event peak를 뽑는다.

backend 함수:

- `_extract_threshold_peaks`

동작은 다음과 같다.

1. 각 RS-score series를 왼쪽에서 오른쪽으로 순회한다.
2. 값이 threshold 이상인 연속 구간을 하나의 active segment로 본다.
3. 그 active segment 안에서 가장 높은 값의 index 하나만 peak로 선택한다.
4. threshold 아래로 내려가면 그 segment를 종료하고 저장한다.
5. 마지막 segment가 끝나지 않았더라도 종료 시점에 저장한다.

이는 "threshold 이상인 모든 점"을 쓰는 방식이 아니라, "threshold 이상인 연속 구간마다 대표 peak 1개"를 채택하는 방식이다.

이 규칙의 의미는 다음과 같다.

- noisy high-value plateau가 있어도 peak 수가 과도하게 증가하지 않음
- 하나의 event 후보 구간이 하나의 대표 point로 압축됨

frontend도 `extractSegmentPeaks`로 동일한 동작을 재현한다.

## 2. Peak spacing을 추정하는 방식

region 폭 제한을 두기 위해 현재 구현은 peak spacing을 추정한다.

backend 함수:

- `_estimate_peak_spacing`

규칙은 다음과 같다.

1. 인접 peak 간 distance를 계산한다.
2. 양수 spacing만 남긴다.
3. 정렬 후 median spacing을 사용한다.
4. spacing을 추정할 수 없으면 기본값 `4000`을 사용한다.

즉, 현재 region 폭 제한은 고정 길이 rule이 아니라, record 내부에서 추정된 rhythm spacing에 적응하는 방식이다.

## 3. S1 / S2 Region을 만드는 방식

backend 함수:

- `_build_heartsound_region_overlays`

이 함수는 `S1` 또는 `S2` 각각에 대해 region overlay를 만든다.

입력:

- start RS-score peak 목록
- end RS-score peak 목록

절차:

1. start peak와 end peak를 각각 threshold-based representative peak로 만든다.
2. 각 start peak에 대해, 자기 뒤에 있는 첫 번째 end peak를 찾는다.
3. 단, 그 end peak가 다음 start peak보다 뒤에 있으면 pairing하지 않는다.
4. `region_width = end - start`를 계산한다.
5. 폭이 `0 이하`이거나 `estimated cycle spacing * 0.45`보다 크면 버린다.
6. 살아남은 pair만 overlay로 저장한다.

overlay에 저장되는 정보:

- `label`
- `startPeak`
- `endPeak`
- `areaStart`
- `areaEnd`

이 설계는 단순 nearest-neighbor pairing이 아니다.  
다음 start를 넘지 못하게 하고, region 폭도 cycle spacing 대비 제한한다는 점이 중요하다.

## 4. Overlap를 해소하는 방식

S1 overlay와 S2 overlay가 시간축에서 겹칠 수 있기 때문에, 현재 구현은 conflict resolution 단계를 둔다.

backend 함수:

- `_resolve_heartsound_region_overlaps`

규칙은 다음과 같다.

1. 모든 overlay를 `areaStart` 기준으로 정렬한다.
2. 시작점이 같으면 score가 더 큰 overlay를 앞에 둔다.
3. 현재 overlay가 직전 overlay와 겹치지 않으면 그대로 유지한다.
4. 같은 label끼리는 서로 제거하지 않는다.
5. 서로 다른 label인데 겹치면 score가 더 높은 쪽만 남긴다.

여기서 score는 다음으로 계산된다.

- `max(startPeak value, endPeak value)`

즉, 현재 overlap 해결은 "시간적으로 겹치면 더 강한 evidence를 가진 region을 우선"하는 방식이다.

frontend의 `resolveOverlappingHeartsoundRegionOverlays`도 같은 원리로 작동한다.

## 5. 현재 Cycle 정의

현재 문서와 코드가 공통으로 채택하고 있는 cycle 정의는 다음과 같다.

- cycle `n`의 시작 = `S1_start(n)`
- cycle `n`의 끝 = `next_S1_start(n)`

즉, operational span은 다음과 같다.

- `current S1 start -> next S1 start`

이는 다음 기능의 공통 anchor가 된다.

- cycle navigation
- parameter grouping
- heart-rate calculation
- graph cycle highlight
- export row 구조

현재 구현은 S2 anchor cycle이 아니라 S1 anchor cycle을 backbone으로 사용한다.

## 6. S2를 매칭하는 방식

backend에서 실제 cycle row를 만드는 함수는 다음이다.

- `_build_heartsound_derived_parameter_frame`

핵심 절차는 다음과 같다.

1. 겹침 해소가 끝난 S1 overlay를 `areaStart` 기준으로 정렬한다.
2. 겹침 해소가 끝난 S2 overlay도 정렬한다.
3. 정렬된 S1을 앞에서부터 순회하면서 cycle index를 `1, 2, 3, ...` 부여한다.
4. 현재 S1의 다음 S1을 `next_s1_overlay`로 잡는다.
5. 현재 S1보다 앞에서 이미 끝난 S2는 skip한다.
6. 남은 S2들 중에서 앞으로 탐색하며 첫 번째 적합한 S2를 찾는다.

적합한 S2 조건은 코드상 다음과 같다.

- `candidate_end > s1_start`
- `candidate_start < next_s1_start` 이어야 탐색 계속 가능
- `s1_start < s1_end < candidate_start < candidate_end`
- `next_s1_start`가 있으면 `candidate_end < next_s1_start`

즉, 개념적으로 정리하면 다음과 같다.

- 현재 S1이 끝난 뒤에 시작해야 함
- 다음 S1이 시작되기 전에 끝나야 함
- ordering rule을 깨지 않아야 함
- 여러 후보가 있으면 forward search에서 가장 먼저 만나는 유효 S2를 채택함

따라서 현재 S2 matching은 "cycle context와 독립적인 global best match"가 아니라, "현재 S1과 다음 S1 사이에서 ordering을 만족하는 첫 번째 forward match"이다.

## 7. Valid Cycle 판정 규칙

현재 valid cycle rule은 매우 명확하다.

> `S1_start < S1_end < S2_start < S2_end < next_S1_start`

backend 함수:

- `_is_valid_heartsound_cycle_order`

이 함수는 다음 상황에서 `False`를 반환한다.

- 다섯 값 중 하나라도 없음
- `NaN` / infinite 등 비정상 값
- strict increasing order 불만족

즉, 단순히 S1과 S2가 존재한다고 valid cycle이 되는 것이 아니다.  
반드시 다섯 anchor가 모두 finite해야 하고, strict temporal order를 만족해야 한다.

## 8. Last-cycle 처리 방식

현재 구현에서 마지막 S1은 특별한 위치를 가진다.

`_build_heartsound_derived_parameter_frame`는 마지막 S1에 대해서도 row를 만들 수 있다.  
이때 `next_S1_start`가 없으면 다음 값들은 제대로 채워지지 못한다.

그 결과:

- 내부 파생 frame에는 마지막 row가 남을 수 있다
- 일부 parameter는 `NaN`이 들어간다
- HR도 `NaN`이 될 수 있다

하지만 이 row는 최종 valid cycle list에서는 제외된다.

제외 경로는 두 군데다.

1. UI cycle list 생성 시 `validate_cycle_order=True`를 걸어 valid cycle만 payload에 넣음
2. export 시 `_filter_valid_heartsound_cycles`를 거쳐 valid cycle만 workbook에 기록함

즉, 내부 intermediate row와 외부 user-facing valid cycle은 분리되어 있다.

## 9. Cycle Indexing 방식

cycle index는 정렬된 S1 overlay 순서에 따라 `1`부터 순차 부여된다.

중요한 점은 다음과 같다.

- S1 sequence 기준 numbering이다
- UI selector가 이 값을 사용한다
- export row가 이 값을 사용한다
- graph-linked interaction도 이 값을 사용한다

따라서 cycle number는 "valid cycle만 재번호 부여"하는 별도 구조가 아니라, 먼저 S1 순회 중 만든 `Cycle_Index`를 기반으로 하고, 이후 valid filtering이 적용된다.

이 때문에 내부 row 기준과 최종 visible cycle 기준 사이에 드물게 index gap 가능성을 검토할 여지는 있지만, 현재 UI payload 생성 시 invalid row를 건너뛰는 구조라 user-facing cycle list는 valid cycle만 보게 된다.

## 10. Parameter와 HR이 cycle에 의존하는 방식

현재 parameter system은 cycle-local metric 중심이다.

관련 문서와 코드가 공통으로 보여주는 점은 다음과 같다.

- S1 parameter는 `S1_start -> S1_end`
- S2 parameter는 `S2_start -> S2_end`
- S1-S2 relation은 `S1_end -> S2_start`
- S2-S1 relation은 `S2_end -> next_S1_start`
- HR은 `current S1 start -> next S1 start`

특히 HR은 record-level average가 아니라 current cycle span으로부터 계산된다.

공식:

- `cycle_duration_ms = (next_s1_start - s1_start) * 0.25`
- `HeartRate_bpm = 60000 / cycle_duration_ms`

`next_s1_start <= s1_start`이거나 `next_s1_start`가 없으면 `NaN`이다.

즉, HR 역시 cycle backbone이 깨지면 함께 무효화된다.

## 11. UI에서 Cycle을 사용하는 방식

frontend는 backend에서 만들어진 cycle payload를 그대로 사용한다.

### 기본 선택 규칙

parameter summary를 불러온 뒤, 현재 panel의 selected cycle은 다음 우선순위로 결정된다.

1. 이전에 선택해 둔 `selectedCycleIndex`가 아직 존재하면 유지
2. 현재 visible range와 겹치는 cycle이 있으면 그것을 선택
3. 없으면 첫 번째 available cycle 선택
4. 아무것도 없으면 `null`

즉, visible range는 cycle list를 제한하는 기준이 아니라, 초기 선택 cycle을 고르는 보조 기준이다.

### 수동 선택 시 viewport 동작

사용자가 cycle을 선택했을 때 그 cycle이 현재 viewport 밖에 있으면, frontend는 해당 cycle이 보이도록 그래프 범위를 재조정한다.

규칙:

- cycle이 이미 visible하면 viewport 유지
- 아니면 cycle 중심을 기준으로 viewport를 recenter
- viewport 폭은 기존 visible width와 cycle width 중 더 큰 값을 사용

즉, cycle selection은 단순 상태 갱신이 아니라 graph navigation까지 동반한다.

### keyboard navigation

현재 HeartSound panel에서 다음 key를 지원한다.

- `[` : 이전 cycle
- `]` : 다음 cycle

이때 기준이 되는 목록은 현재 summary payload 안의 `availableCycles`이다.

## 12. Export에서의 Cycle 정책

parameter export workbook 생성 시, HeartSound data file은 derived frame을 바로 내보내지 않는다.

대신 다음 절차를 거친다.

1. `_build_heartsound_derived_parameter_frame`으로 내부 row를 만든다.
2. `_filter_valid_heartsound_cycles`로 valid cycle만 남긴다.
3. 그 결과만 `Parameters` sheet에 저장한다.

즉, export는 다음 원칙을 가진다.

- user-facing valid cycle 구조와 일치해야 한다
- malformed cycle을 억지로 숫자로 채우지 않는다
- 내부 intermediate row를 그대로 노출하지 않는다

이 점은 연구 데이터셋 정리 시 매우 중요하다.  
현재 export row는 "모든 S1 row"가 아니라 "strict ordering을 통과한 valid cycle row"라고 보는 것이 정확하다.

## 13. Backend와 Frontend의 역할 분담

현재 구조는 backend와 frontend가 완전히 분리된 임의 규칙을 갖는 방식이 아니다.

역할은 대체로 다음과 같이 나뉜다.

### backend

- 실제 cycle backbone 생성
- S2 matching
- valid cycle 판정
- parameter 계산
- export filtering

### frontend

- 동일한 region overlay logic으로 시각적 설명 layer 제공
- backend가 준 cycle payload를 기반으로 selection / navigation 수행
- selected cycle을 graph highlight와 연결

즉, authoritative cycle formation은 backend에 있고, frontend는 그 규칙을 시각적으로 재현하고 interaction에 연결한다.

## 14. 연구용 재현 규칙으로 정리하면

현재 구현을 다른 연구에 가져가려면 다음 procedural rule로 요약할 수 있다.

1. `S1-Start_RS_Score`, `S1-End_RS_Score`, `S2-Start_RS_Score`, `S2-End_RS_Score`를 준비한다.
2. 각 채널에서 threshold `15` 이상인 연속 구간마다 최고점을 대표 peak로 추출한다.
3. 같은 sound type 내부에서 start peak와 뒤따르는 첫 end peak를 pair한다.
4. 단, end가 다음 start를 넘으면 제외한다.
5. region width가 `estimated_peak_spacing * 0.45`를 넘으면 제외한다.
6. S1 / S2 region이 서로 겹치면 score가 더 강한 region만 남긴다.
7. 정렬된 S1 sequence를 기준으로 각 row에 `Cycle_Index = 1..N`을 부여한다.
8. 각 S1에 대해, `s1_start < s1_end < s2_start < s2_end < next_s1_start`를 만족하는 첫 번째 forward S2를 매칭한다.
9. cycle span은 `current S1 start -> next S1 start`로 둔다.
10. strict ordering을 만족하지 않는 row는 valid cycle에서 제외한다.
11. parameter, HR, UI cycle selector, export는 모두 이 valid cycle backbone을 공유한다.

## 15. 핵심 해석

현재 cycle rule의 설계 철학은 다음처럼 읽힌다.

- cycle을 S1 anchor 중심으로 고정한다
- S2는 cycle 내부 secondary structure로 붙인다
- 시간 순서를 강하게 강제한다
- 불완전한 cycle은 살려두기보다 제외한다
- user-facing 결과와 export 결과를 valid cycle 기준으로 일치시킨다

이 구조 덕분에 downstream 기능은 일관성을 얻지만, 반대로 말하면 S1 anchor 또는 next S1 anchor가 불안정하면 전체 cycle backbone도 함께 흔들리게 된다.

## 16. 코드 근거 요약

### backend

- peak 추출: `backend/app/services/plot_data_service.py`의 `_extract_threshold_peaks`
- spacing 추정: `backend/app/services/plot_data_service.py`의 `_estimate_peak_spacing`
- region 형성: `backend/app/services/plot_data_service.py`의 `_build_heartsound_region_overlays`
- overlap 해소: `backend/app/services/plot_data_service.py`의 `_resolve_heartsound_region_overlaps`
- cycle validity: `backend/app/services/plot_data_service.py`의 `_is_valid_heartsound_cycle_order`
- cycle row 생성: `backend/app/services/plot_data_service.py`의 `_build_heartsound_derived_parameter_frame`
- export filtering: `backend/app/services/plot_data_service.py`의 `_filter_valid_heartsound_cycles`

### frontend

- peak 추출 복제: `frontend/src/App.tsx`의 `extractSegmentPeaks`
- spacing 추정 복제: `frontend/src/App.tsx`의 `estimatePeakSpacing`
- region 형성 복제: `frontend/src/App.tsx`의 `buildHeartsoundRegionOverlays`
- overlap 해소 복제: `frontend/src/App.tsx`의 `resolveOverlappingHeartsoundRegionOverlays`
- cycle selection / viewport 이동: `frontend/src/App.tsx`의 `selectPanelCycle`
- initial selected cycle 결정: parameter summary load 구간
- keyboard cycle navigation: `frontend/src/App.tsx`의 `[` / `]` 처리 구간

## 17. 코드 위치 레퍼런스

아래는 실제 코드 위치를 다시 찾을 때 바로 참고할 수 있는 line-level reference다.

### backend line reference

- sample rate / sample ms: `backend/app/services/plot_data_service.py:48-49`
- region 관련 상수: `backend/app/services/plot_data_service.py:237-239`
- threshold peak 추출: `backend/app/services/plot_data_service.py:345-366`
- peak spacing 추정: `backend/app/services/plot_data_service.py:369-381`
- region overlay 구성: `backend/app/services/plot_data_service.py:384-432`
- overlap 해소: `backend/app/services/plot_data_service.py:435-466`
- valid cycle 판정: `backend/app/services/plot_data_service.py:541-560`
- valid cycle filtering: `backend/app/services/plot_data_service.py:856-870`
- derived cycle row 생성: `backend/app/services/plot_data_service.py:873-992`
- export 시 valid row만 사용: `backend/app/services/plot_data_service.py:995-1013`
- UI용 cycle payload 구성: `backend/app/services/plot_data_service.py:1368-1478`

### frontend line reference

- region threshold 상수: `frontend/src/App.tsx:548`
- threshold peak 추출 복제: `frontend/src/App.tsx:668-694`
- peak spacing 추정 복제: `frontend/src/App.tsx:696-712`
- region overlay 구성 복제: `frontend/src/App.tsx:714-770`
- overlap 해소 복제: `frontend/src/App.tsx:772-805`
- cycle 선택 시 viewport 이동: `frontend/src/App.tsx:4909-4955`
- parameter summary 로드 후 기본 cycle 선택: `frontend/src/App.tsx:5464-5481`
- keyboard cycle navigation: `frontend/src/App.tsx:5892-5915`

### 문서 line reference

- current implementation spec의 cycle 정의: `process/current_implementation_spec.md:731-776`
- PRD의 cycle backbone 정의: `product_requirements_document.md:446-457`
- PRD의 parameter computation 공통 규칙: `product_requirements_document.md:511-520`

## 최종 요약

현재 Tool의 cycle은 "정렬된 S1 anchor 사이의 구간"이며, S2는 그 안에서 strict ordering을 만족하는 첫 번째 forward candidate로 매칭된다.

따라서 현재 cycle rule은 단순 beat segmentation이 아니라 다음 성격을 가진다.

- RS-score driven
- S1 anchored
- forward matched
- order validated
- invalid cycle excluded
- UI / parameter / export shared backbone

다른 연구에서 동일 규칙을 재현하려면, 단순히 `S1-S2` 위치만 쓰는 것이 아니라 region 생성, overlap 해소, next-S1 anchor, strict validity filtering까지 함께 복제해야 현재 Tool과 구조적으로 동일한 cycle system이 된다.
