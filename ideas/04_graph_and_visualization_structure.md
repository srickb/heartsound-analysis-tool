# Graph 및 Visualization 구조

## 목적

이 문서는 Tool이 signal data를 시각적으로 어떻게 표현하는지를 설명한다.

graph는 이 제품의 핵심 분석 화면이다.  
이 영역은 raw signal display, overlay, cycle highlight, parameter-linked annotation, 그리고 audio-synchronized playback state를 함께 제공한다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- plotted signal layer
- 기본 graph visibility
- detail modal의 series control
- overlay rendering
- legend 동작
- cycle highlight rendering
- parameter-linked measurement annotation

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- file upload logic
- parameter formula
- auth/share 동작

## 핵심 Graph 모델

Tool은 panel마다 하나의 primary graph를 렌더링한다.

HeartSound의 경우 graph는 다음 요소를 중심으로 구성된다.

- amplitude waveform
- RS-score 기반 overlay
- candidate highlight
- playback-linked playhead

ECG의 경우 marker 구조는 다르지만, graph container 자체의 모델은 유사하게 유지된다.

## 기본 표시 Layer

HeartSound workspace에서는 현재 기본 visible state가 깔끔한 review 환경을 우선하도록 설정되어 있다.

기본 시각화 구성은 다음과 같다.

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `Parameter` window 활성화

이 기본 설정은 불필요한 복잡도를 줄이면서도, 임상적으로 의미 있는 주요 timing structure를 유지하는 것을 목표로 한다.

## Detail Modal

추가적인 visual layer는 `Detail` modal을 통해 제어된다.

이 modal은 series 관리 인터페이스 역할을 한다.

현재 지원 기능은 다음과 같다.

- 개별 layer on/off
- 상단의 `All` 선택
- panel 단위 `Default` action을 통한 기본 상태 복원

## Series Visibility 설계 방향

graph는 다음 두 요소를 구분하려고 설계되어 있다.

- essential context
- optional detail

이 구분이 중요한 이유는, Heartsound review에서 너무 많은 score channel과 overlay를 동시에 표시하면 화면 해석이 어려워지기 때문이다.

## S1/S2 Area Overlay

현재 graph는 다음 영역을 표시한다.

- `S1 Area`
- `S2 Area`

이 영역들은 감지된 S1, S2 sound region에 해당하는 semi-transparent interval overlay로 렌더링된다.

이들의 역할은 다음과 같다.

- beat structure 맥락 제공
- parameter anchor 가시성 확보
- cycle 해석 지원

## S3/S4 Candidate Overlay

graph는 후보 수준의 추가 표시로 다음 항목도 지원한다.

- `S3`
- `S4`

이들은 확정된 label이 아니다.  
탐색적 검토를 위한 visual candidate region으로 사용된다.

현재 rendering 의도는 다음과 같다.

- S1/S2와 명확히 구분되도록 표시
- 시인성이 높은 highlight 제공
- series control에서 별도로 toggle 가능하도록 구성

## Cycle Highlight Overlay

cycle highlight가 활성화되면, 선택된 cycle도 graph 위에 함께 표시된다.

이 기능의 역할은 다음과 같다.

- 현재 parameter window가 정확히 어떤 cycle을 설명하는지 보여줌
- 선택된 cycle이 현재 visible signal range와 어떻게 맞물리는지 보여줌

이 기능은 metric 해석을 waveform과 연결하는 데 매우 중요하다.

## Parameter 기반 Annotation Layer

parameter card를 클릭하면, 해당 metric이 어떤 구간에서 계산되었는지를 graph 위에 annotation으로 표시한다.

예시는 다음과 같다.

- S1 metric은 S1 segment를 강조
- S2 metric은 S2 segment를 강조
- S1-S2 metric은 S1 end부터 S2 start까지의 gap을 강조
- S2-S1 metric은 S2 end부터 다음 S1 start까지의 gap을 강조
- HR은 현재 cycle span을 강조
- RS peak metric은 event point를 표시
- RS width metric은 contiguous half-height region을 표시

이 구조 덕분에 parameter 영역은 단순한 정적 표가 아니라, 해석을 돕는 interactive explainer 역할을 하게 된다.

## Legend 동작

graph 우측 상단에는 compact한 legend 형태의 설명 영역이 포함되어 있다.

현재 legend 설계 원칙은 다음과 같다.

- 현재 relevant한 정보만 표시
- 항상 모든 항목을 나열하지 않음
- 불필요한 항목은 반복하지 않음

이 방식은 실제 waveform을 위한 화면 공간을 보존하는 데 도움이 된다.

## Navigator 및 Viewport

graph는 항상 전체 record를 한 번에 보여주지 않고, visible range window 안에서 동작한다.

이 구조를 통해 다음이 가능해진다.

- 국소 구간의 상세 검토
- 큰 record에서도 관리 가능한 성능 유지
- playback과 연동된 viewport 전환

현재 view range는 UI에서 row boundary 형태로 표시된다.

## Graph Navigation

사용자는 다음 방법으로 graph를 이동할 수 있다.

- panel range control
- keyboard shortcut
- cycle selection
- playback control

즉, viewport는 고정되어 있지 않고 interaction context에 따라 반응한다.

## 설계 목표

현재 graph 구조는 다음 요소들 사이의 균형을 목표로 한다.

- signal readability
- clinical/event interpretability
- interactivity
- performance

즉, 단순한 presentation보다는 실제 review workflow에 더 적합하도록 설계되어 있다.

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- 더 세밀한 legend customization
- pinned annotation
- waveform bookmark
- 더 고도화된 cycle comparison overlay
- optional mini-map / overview control 개선

## 요약

graph 구조는 Tool의 시각적 분석 엔진에 해당한다.

이 구조는 다음 요소를 결합한다.

- raw signal 표현
- event-area overlay
- candidate highlight
- parameter-linked explanation
- viewport-aware interaction

즉, 이 카테고리는 계산된 로직을 사용자가 해석 가능한 시각적 검토 형태로 가장 직접적으로 바꿔주는 영역이다.