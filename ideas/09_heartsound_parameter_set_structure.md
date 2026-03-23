# HeartSound Parameter Set 구조

## 목적

이 문서는 현재 Tool에 구현되어 있는 HeartSound parameter set을 정리한다.

목적은 현재 어떤 parameter family가 존재하는지, 그리고 사용자가 해석하기 쉽도록 어떻게 구성되어 있는지를 설명하는 것이다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- 현재 구현된 parameter family
- category 단위 구성 방식
- 각 parameter family의 역할
- 각 family가 사용자에게 어떤 정보를 전달하려는지

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- 정확한 formula
- export formatting 방식
- rendering implementation detail

## 현재 Top-Level Parameter Category

현재 HeartSound parameter system은 다음과 같이 구성되어 있다.

- `S1`
- `S2`
- `S1-S2`
- `RS Score`
- `HR`

앞의 네 항목은 parameter window의 주요 category로 표시된다.  
`HR`은 cycle control 근처에 별도로 표시된다.

## 1. S1 Category

`S1` category는 S1 sound interval 자체에서 파생된 parameter를 포함한다.

현재 구현된 항목은 다음과 같다.

- `S1 Duration`
- `S1 Peak`
- `S1 Mean`
- `S1 RMS`
- `S1 Area`
- `S1 Middle`
- `S1_s Centroid`
- `S1_e Centroid`

### 이 Category가 사용자에게 알려주는 것

`S1` category는 다음과 같은 질문에 답한다.

- S1이 얼마나 오래 지속되는지
- S1이 얼마나 강한지
- S1 내부에 얼마나 많은 signal mass가 존재하는지
- S1의 energy distribution이 시작 쪽에 더 치우치는지, 끝 쪽에 더 치우치는지

## 2. S2 Category

`S2` category는 S1 category와 유사한 구조를 가지지만, S2 sound interval에 적용된다.

현재 구현된 항목은 다음과 같다.

- `S2 Duration`
- `S2 Peak`
- `S2 Mean`
- `S2 RMS`
- `S2 Area`
- `S2 Middle`
- `S2_s Centroid`
- `S2_e Centroid`

### 이 Category가 사용자에게 알려주는 것

`S2` category는 다음과 같은 해석을 돕는다.

- S2 duration
- S2 strength
- S2 내부 signal energy
- S2가 앞쪽에 더 무게가 실리는지, 뒤쪽에 더 무게가 실리는지

## 3. S1-S2 Category

현재 `S1-S2` category에는 systolic gap과 diastolic gap 성격의 measurement가 함께 포함되어 있다.

포함 항목은 다음과 같다.

- `S1-S2 Duration`
- `S1-S2 Peak`
- `S1-S2 Mean`
- `S1-S2 Energy`
- `S2-S1 Duration`
- `S2-S1 Peak`
- `S2-S1 Mean`
- `S2-S1 Energy`

시각적 section title은 `S1-S2`이지만,  
이 section은 의도적으로 두 방향의 between-sound gap measurement를 모두 포함한다.

### 이 Category가 사용자에게 알려주는 것

이 category는 다음과 같은 질문에 답하는 데 도움을 준다.

- S1에서 S2까지의 gap이 얼마나 큰지
- S2에서 다음 S1까지의 gap이 얼마나 큰지
- 주요 sound region 사이에 어느 정도의 signal이 존재하는지
- 그 inter-sound region이 얼마나 energetic한지

## 4. RS Score Category

`RS Score` category는 primary HeartSound event structure를 결정하는 데 이미 사용된 RS-score channel에서 파생된 parameter를 포함한다.

현재 구현된 항목은 다음과 같다.

- `S1_s RS Peak`
- `S1_e RS Peak`
- `S2_s RS Peak`
- `S2_e RS Peak`
- `S1_s RS Width`
- `S1_e RS Width`
- `S2_s RS Width`
- `S2_e RS Width`

### 이 Category가 사용자에게 알려주는 것

이 category는 다음과 같은 해석을 돕는다.

- 선택된 각 event peak가 RS domain에서 얼마나 강한지
- 선택된 각 RS event가 local peak 주변으로 얼마나 넓게 퍼져 있는지

이 metric들은 raw amplitude waveform만을 보는 것이 아니라, event-detection representation을 반영한다.

## 5. HR Category

`HR`은 현재 main card grid와 분리되어 표시된다.

표시 형식은 다음과 같다.

- `HR xxx bpm`

### 이 Category가 사용자에게 알려주는 것

이 category는 다음 질문에 답한다.

- 현재 cycle이 얼마나 빠르게 반복되는지
- 현재 cycle span으로부터 계산된 beats-per-minute 값이 무엇인지

## 현재 Set이 이렇게 구성된 이유

현재 set은 의도적으로 다음과 같이 나뉘어 있다.

- sound 내부 metric
- gap metric
- RS-score event metric
- cycle-level rhythm metric

이 구조는 모든 항목을 하나의 긴 flat list로 섞어 놓는 것보다 해석하기 쉽다.

## 현재 Naming Style

현재 visible naming system은 다음 방향을 목표로 한다.

- 짧을 것
- 직접적일 것
- 실제 UI에 표시되는 형태와 가깝게 유지할 것

예시는 다음과 같다.

- `S1 Duration`
- `S2 Peak`
- `S1_s Centroid`
- `S1_s RS Peak`
- `S1-S2 Energy`
- `HR`

## Graph Annotation과의 관계

각 parameter family는 graph 해석과 자연스럽게 연결된다.

- `S1` -> S1 segment
- `S2` -> S2 segment
- `S1-S2` -> inter-sound gap
- `RS Score` -> event 중심 RS region 또는 point
- `HR` -> cycle span

따라서 이 parameter family들은 단순한 data column 집합이 아니라, 각각 독립적인 category로서 의미를 가진다.

## 설계 의도

현재 parameter set은 다음 특성을 갖도록 설계되어 있다.

- compact
- interpretable
- cycle-specific
- 눈에 보이는 signal structure에 강하게 연결된 형태

즉, 이 구조는 최대한 많은 feature를 무작정 쏟아내기 위한 목적은 아니다.

## 향후 확장 메모

향후 추가될 수 있는 방향은 다음과 같다.

- morphology metric
- 더 안정적인 energy-shape descriptor
- candidate-event parameter family
- pathology-focused summary group

## 요약

현재 HeartSound parameter set은 reviewer 중심으로 구성된 구조화된 feature catalog이다.

이 구조는 다음 요소로 이루어진다.

- sound-specific metric
- between-sound gap metric
- RS-score event metric
- cycle-level heart-rate context

즉, 이 카테고리는 Tool이 현재 무엇을 측정하고 사용자에게 보여주는지를 정의한다.