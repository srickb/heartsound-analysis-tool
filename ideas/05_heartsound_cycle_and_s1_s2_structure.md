# HeartSound Cycle 및 S1/S2 구조

## 목적

이 문서는 현재 Tool이 HeartSound cycle을 어떻게 정의하는지, 그리고 RS-score channel로부터 어떻게 사용 가능한 S1 및 S2 event region을 도출하는지를 설명한다.

이 카테고리는 제품 내에서 가장 중요한 구조적 범주 중 하나이다.  
많은 downstream feature가 이 구조에 의존하기 때문이다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- S1 및 S2 area 구성
- peak pairing logic
- overlap 처리
- cycle validity rule
- cycle indexing
- panel cycle selection semantics

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- parameter formula 자체
- wave playback
- export formatting

## Boundary Logic에 사용되는 입력 신호

HeartSound data model에는 boundary signal 역할을 하는 RS-score channel이 포함되어 있다.

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

이 채널들은 amplitude signal과 함께 사용되어 각 record의 event structure를 구성한다.

## S1 및 S2 Region 구성

현재 구현은 다음 절차를 통해 event region을 생성한다.

1. start 및 end RS-score series에서 threshold 기반 peak candidate를 추출한다
2. 동일한 sound type 내에서 start peak와 end peak를 pairing한다
3. 유효하지 않거나 지나치게 넓은 pairing은 제외한다
4. 최종 선택된 start peak와 end peak를 이용해 interval overlay를 구성한다

이 과정을 통해 다음이 생성된다.

- `S1` overlay
- `S2` overlay

각 overlay는 다음 정보를 포함한다.

- start peak
- end peak
- area start
- area end

## Threshold 및 Pairing 동작

event logic은 단순히 임의의 nearest-neighbor pairing만으로 동작하지 않는다.

추가로 다음 요소들도 함께 고려한다.

- region ordering
- spacing constraint
- cycle spacing 대비 최대 허용 width

이러한 조건은 비현실적인 interval을 걸러내는 데 도움을 준다.

## Overlap 해결

S1과 S2 candidate는 시각적으로나 논리적으로 모호해질 수 있다.

이 문제를 줄이기 위해 현재 구현은 overlap conflict를 해소하는 로직을 가진다.

상위 규칙은 다음과 같다.

- overlap되는 region이 경쟁할 경우, 더 강한 evidence를 가진 쪽을 우선한다

이 규칙은 명백히 충돌하는 S1/S2 interval이 동시에 남지 않도록 한다.

## 현재 Cycle 정의

현재 cycle rule은 다음과 같다.

- cycle `n`은 cycle `n`의 `S1 start`에서 시작한다
- cycle `n`은 cycle `n+1`의 `S1 start` 직전에서 끝난다

운영상 이는 다음 의미를 가진다.

- 현재 cycle span = `current S1 start -> next S1 start`

이 cycle 정의는 다음 기능에서 사용된다.

- cycle navigation
- parameter grouping
- HR calculation
- graph cycle highlight

## 유효한 Cycle 순서 규칙

하나의 cycle은 다음 순서가 성립할 때만 valid하다고 간주된다.

- `S1 start < S1 end < S2 start < S2 end < next S1 start`

이 ordering rule은 매우 핵심적이다.

이 규칙은 형태가 잘못된 cycle이 분석 가능한 beat로 취급되지 않도록 한다.

## S2 Matching 규칙

하나의 cycle 내부에서 S2는 다음 조건을 만족해야 한다.

- 현재 S1 end 이후에 발생해야 한다
- 다음 S1 start 이전에 발생해야 한다
- 선택된 S2는 valid ordering rule을 유지해야 한다

즉, S2는 cycle context와 무관하게 독립적으로 선택되는 것이 아니다.

## Cycle Indexing

cycle에는 순서대로 명시적인 cycle 번호가 부여된다.

이 numbering은 정렬된 valid S1 sequence를 기준으로 한다.

이 cycle index는 이후 다음 기능들에 사용된다.

- parameter window
- cycle stepping control
- exported parameter row
- graph-linked interaction

## UI에서의 Cycle 가시성

현재 UI는 다음 기능을 지원한다.

- 좌우 step으로 cycle 선택
- 현재 선택된 cycle index 확인
- 해당 cycle의 highlighted sample range 확인
- 선택된 cycle이 visible range 밖에 있을 경우 graph viewport 자동 이동

이 구조 덕분에 cycle review는 일관되고 탐색 가능하게 유지된다.

## 제품에서의 중요성

이 카테고리는 다음 기능들의 기반이 된다.

- S1 parameter extraction
- S2 parameter extraction
- S1-S2 gap parameter extraction
- S2-S1 gap parameter extraction
- HR calculation
- parameter export
- parameter-to-graph annotation

즉, cycle structure가 무너지면 HeartSound review layer의 거의 전체가 신뢰하기 어려워진다.

## 설계 의도

현재 설계는 의도적으로 다음 요소를 우선한다.

- 엄격한 beat ordering
- 명시적인 cycle validity
- 과도하게 허용적인 matching보다 해석 가능성 우선

이는 downstream metric이 안정적인 anchor를 필요로 하기 때문에 중요하다.

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `backend/app/services/plot_data_service.py`
- `frontend/src/App.tsx`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- UI에서 더 명시적인 cycle validity diagnostic 제공
- 사용자에게 보이는 rejected-cycle 설명
- cycle confidence scoring
- 선택적 manual correction workflow

## 요약

현재 HeartSound cycle 및 S1/S2 구조는 Tool의 시간축 backbone을 정의한다.

이 구조는 다음을 결정한다.

- 각 sound가 어디서 시작하고 끝나는지
- 어떤 cycle이 valid한지
- beat가 어떤 방식으로 indexing되는지
- HeartSound의 주요 downstream analysis가 어떤 기준점에 anchoring되는지