# Parameter Window 및 Interaction 구조

## 목적

이 문서는 현재 HeartSound parameter window의 구조와 interaction model을 설명한다.

parameter window는 단순한 표시 영역이 아니다.  
선택된 cycle과 연결된 explanatory layer이자 navigational layer로도 동작한다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- parameter window layout
- cycle navigation control
- HR 배치
- parameter card interaction
- tooltip 동작
- graph-linked annotation
- export trigger 위치

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- 정확한 parameter formula
- file upload 동작
- wave control 내부 구현

## Parameter Window의 역할

parameter window는 현재 선택된 HeartSound beat에 대한 cycle 중심 요약 정보를 제공한다.

현재 이 영역의 주요 역할은 다음과 같다.

- cycle별 parameter value 표시
- cycle 단위 navigation 지원
- 각 metric이 의미하는 바 설명
- 클릭한 metric을 다시 graph와 연결
- 계산된 parameter의 export 지원

## UI 내 위치

parameter window는 panel 내부에서 graph 아래에 위치한다.

시각적으로는 graph와 분리되어 있지만, 기능적으로는 강하게 연결되어 있다.

이 구조가 중요한 이유는 다음과 같다.

- graph는 context를 제공한다
- parameter window는 interpretation을 제공한다

## Header 구조

현재 parameter window의 header에는 다음 요소가 포함된다.

- title
- download 버튼
- cycle highlight toggle
- unsupervised toggle
- 현재 row range 정보

이 header는 하단 분석 영역의 operational command layer 역할을 한다.

## Cycle Navigation

현재 cycle navigation은 stepper 형태의 control로 구성되어 있다.

- 이전 cycle 버튼
- 현재 cycle label
- 다음 cycle 버튼

현재 선택된 cycle은 다음과 같이 명시적으로 표시된다.

- `Cycle n`

이 방식은 dropdown보다 더 직접적이며, 순차적인 review를 유도한다.

## Keyboard 지원

cycle navigation은 keyboard도 지원한다.

- `[` : 이전 cycle
- `]` : 다음 cycle

이 덕분에 parameter window는 정적인 summary table이 아니라, 실제 review workflow의 일부가 된다.

## Cycle Range 표시

cycle stepper 아래에는 현재 highlight된 sample range가 표시된다.

이 정보는 사용자가 현재 active cycle이 record 내 어디에 위치하는지 구체적으로 파악할 수 있게 해준다.

## HR 배치

Heart rate는 main parameter card와 시각적으로 분리되어 표시된다.

현재 동작은 다음과 같다.

- HR은 cycle control 근처에 표시된다
- 강조된 card/badge 형태로 스타일링된다
- 단순한 metric tile이 아니라 cycle-level context로 취급된다

이 구조는 HR이 문맥적 요약값으로서 중요하다는 점을 반영한다.

## Section 구조

현재 HeartSound parameter layout은 다음과 같은 주요 category로 나뉜다.

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

`HR`은 의도적으로 이 grid 바깥에 배치된다.

이 구조는 사용자가 다음 항목을 구분해서 이해하도록 돕는다.

- sound-local metric
- gap-local metric
- RS 기반 metric
- cycle-level tempo context

## Parameter Card

각 metric은 클릭 가능한 card 형태로 표시된다.

각 card에는 다음 정보가 포함된다.

- metric name
- 현재 값
- unit

이 설계는 각 parameter를 시각적으로 독립시키고, 빠르게 훑어보기 쉽게 만든다.

## Hover 설명

사용자가 parameter card 위에 마우스를 올리면 간단한 설명이 표시된다.

현재 tooltip 내용에는 다음이 포함된다.

- parameter title
- 짧은 요약 설명
- 간단한 schematic

이 tooltip은 다음을 설명하도록 설계되어 있다.

- 어떤 interval 또는 quantity를 측정하는지
- 긴 교과서식 정의를 제공하는 것이 아님

## Click-to-Annotate 동작

parameter card를 클릭하면 graph annotation이 표시된다.

이것은 현재 Tool에서 가장 중요한 interaction pattern 중 하나이다.

이 동작을 통해 사용자는 다음 흐름으로 이동할 수 있다.

- 값 확인

에서

- 그 값이 waveform의 어디에서 나왔는지 확인

즉, parameter window는 단순한 값 표시판이 아니라 interactive measurement browser로 동작하게 된다.

## Download 동작

`Download xlsx` 버튼은 sidebar가 아니라 parameter window 안에 위치한다.

이 배치는 의도된 것이다. 이유는 다음과 같다.

- export는 현재 해석 중인 parameter state에 속하기 때문
- 사용자는 파생된 값을 검토하면서 자연스럽게 이 위치에서 export를 기대하기 때문

## 설계 의도

parameter window는 다음 특성을 갖도록 설계되어 있다.

- 정보 밀도는 높지만 읽기 쉬운 구조
- file 전체가 아니라 cycle별 중심 구조
- 정적인 표시가 아니라 interactive한 구조
- graph review와 강하게 연결된 구조

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- metric pinning
- cycle comparison mode
- 접고 펼칠 수 있는 parameter section
- favorite metric
- annotation persistence

## 요약

parameter window는 HeartSound review 경험에서 설명 중심의 control center 역할을 한다.

이 구조는 다음 요소를 결합한다.

- cycle navigation
- metric display
- hover 설명
- graph-linked measurement feedback
- export 접근

즉, 이 카테고리는 계산된 feature를 사용자가 실제로 활용 가능한 reviewer knowledge로 바꿔주는 역할을 한다.