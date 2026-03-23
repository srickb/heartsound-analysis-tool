# Panel 및 Layout 구조

## 목적

이 문서는 Tool의 시각적·구조적 layout model을 설명한다.

panel system은 이 애플리케이션의 핵심 아키텍처 개념 중 하나이다.  
이 구조는 사용자가 case를 비교하고, 파일을 연결하고, plot을 확인하고, parameter window를 여는 방식을 정의한다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- one-panel 및 two-panel mode
- panel identity
- header action
- chart/parameter split layout
- panel별 linked state
- panel reset 동작

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- parameter value의 분석적 의미
- S1/S2 detection formula
- wave timing formula

## 핵심 Layout 모델

현재 애플리케이션 layout은 두 개의 주요 영역으로 나뉜다.

- left sidebar
- right analysis area

analysis area 내부에서 제품은 다음 두 가지 구성을 지원한다.

- `1 Panel`
- `2 Panels`

즉, panel은 전체 inspection의 중심 단위이다.

## Panel Identity

각 panel은 고유한 state와 identity를 가진다.

하나의 panel은 독립적으로 다음 정보를 가질 수 있다.

- primary data file
- linked wave file
- linked parameter source
- linked unsupervised file
- 자체 graph range
- 자체 selected cycle
- 자체 selected parameter metric

즉, panel은 단순히 복제된 시각 요소가 아니라, 서로 독립된 review context이다.

## 지원되는 Review Mode

### Single-Panel Mode

Single-panel mode는 다음 상황에 최적화되어 있다.

- 집중 검토
- 상세 확인
- parameter 중심 탐색
- audio-linked investigation

### Two-Panel Mode

Two-panel mode는 다음 상황에 최적화되어 있다.

- case 비교
- 좌우 차이 검토
- cross-file analysis
- 동일한 UI 규칙 안에서의 feature 비교

## Panel Header 구조

각 analysis panel에는 여러 control이 배치된 header 영역이 있다.

현재 주요 구성 요소는 다음과 같다.

- panel title 및 linked file name
- linked wave 정보
- `Default` 버튼
- `Detail` 버튼
- parameter window toggle
- settings 버튼
- reset 버튼
- 중앙 header 영역의 wave playback control

이 header는 단순한 장식 요소가 아니다.  
현재 활성 panel에 대한 주요 command surface 역할을 한다.

## `Default` 버튼

`Default` 버튼은 해당 panel의 기본 시각화 상태를 복원한다.

이 버튼의 목적은 다음과 같은 상황에서 빠른 reset 경로를 제공하는 것이다.

- 너무 많은 series가 toggle된 경우
- graph가 시각적으로 복잡해진 경우
- 익숙한 시작 상태로 빠르게 돌아가야 하는 경우

## `Detail` 버튼

`Detail` 버튼은 series-selection modal을 연다.

이 버튼의 목적은 다음과 같다.

- visible overlay 및 score channel에 대한 세밀한 제어
- `All` toggle 또는 default-state 복원을 통한 원상 복귀

이 panel 단위 modal은 현재 review workflow의 일부이다.

## Parameter Toggle

parameter window는 panel별로 표시하거나 숨길 수 있다.

즉, 하나의 panel은 최소한 다음 두 가지 inspection mode를 지원한다.

- graph 중심 보기
- graph + parameter 해석 보기

이 toggle은 사용자가 이 두 가지 review mode 사이를 자주 오가기 때문에 가볍게 사용할 수 있도록 설계되어 있다.

## Settings 및 Reset

### Settings

panel settings control은 panel별 시각화 설정 및 보조 configuration에 사용된다.

### Reset

reset control은 panel에 할당된 분석 맥락을 복원한다.  
탐색 과정에서 누적된 state를 정리하고 다시 시작할 수 있도록 설계되어 있다.

## Graph와 Parameter Split

panel 내부의 하단 content area는 수직으로 다음 두 영역으로 나뉜다.

- graph area
- parameter window

이 두 영역은 draggable resize handle로 구분된다.

### 현재 동작 방식

parameter window가 표시된 상태에서는 다음이 가능하다.

- 사용자가 split handle을 drag할 수 있다
- chart와 parameter 영역의 크기가 동적으로 조절된다

이를 통해 다음과 같은 사용이 가능해진다.

- wave-following review를 위한 더 넓은 graph 공간 확보
- metric comparison을 위한 더 넓은 parameter 공간 확보

## 현재 Split 설계 의도

이 split system은 서로 다른 두 가지 사용 방식을 지원한다.

- waveform 중심 검토
- metric 중심 검토

즉, 모든 세션에 하나의 고정 비율을 강제하지 않도록 설계되어 있다.

## Panel별 State 분리

panel system의 핵심 설계 원칙 중 하나는 state isolation이다.

의미는 다음과 같다.

- 한 panel의 변경이 다른 panel에 자동으로 영향을 주지 않는다
- file binding은 panel별로 유지된다
- cycle selection은 panel별로 유지된다
- graph viewport는 panel별로 유지된다
- wave playback context는 panel별로 유지된다

이 구조는 의미 있는 side-by-side comparison을 위해 필요하다.

## Active Panel 개념

애플리케이션은 현재 focus에 따라 동작하는 interaction을 위해 active panel 개념을 추적한다.

예시는 다음과 같다.

- sidebar의 파일을 의도한 panel에 할당
- 올바른 panel에 modal action 열기
- 현재 review target에 연결된 keyboard action 처리

## Range 인식 구조

각 panel은 자체 visible row range를 유지한다.

이것이 중요한 이유는 다음과 같다.

- graph rendering이 현재 range에 의존하기 때문
- cycle visibility가 현재 range에 의존하기 때문
- parameter-linked annotation이 현재 range에 의존하기 때문
- wave playback viewport 동작이 현재 range에 의존하기 때문

## Layout 안정성

현재 layout은 다음 요소를 우선시한다.

- 핵심 control의 일관된 배치
- 안정적인 panel header 구성
- 예측 가능한 graph/parameter 분리 구조

이는 Tool이 정적인 dashboard가 아니라 interactive하게 사용된다는 점에서 특히 중요하다.

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- panel preset
- detachable comparison mode
- panel별 saved view
- panel-specific note widget
- 더 고급화된 multi-panel synchronization

## 요약

현재 panel 및 layout 구조는 제품의 실제 사용 형태를 결정하는 기반이다.

이 구조는 다음 요소를 결합한다.

- 서로 독립적인 analysis panel
- 일관된 action header
- 유연한 graph/parameter resize 구조
- panel 단위 file context

즉, 이 카테고리는 거의 모든 주요 기능을 담아내는 UI container layer라고 볼 수 있다.