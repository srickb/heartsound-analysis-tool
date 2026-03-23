# S3 및 S4 Candidate 구조

## 목적

이 문서는 현재 Tool이 S3와 S4를 확정적인 진단 label이 아니라 candidate event로 어떻게 다루는지를 설명한다.

이 카테고리의 핵심은 exploratory detection과 visual highlighting에 있다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- candidate 개념
- timing window
- amplitude 기반 candidate logic
- S1/S2 cycle structure와의 관계
- graph rendering behavior
- visibility control

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- 최종 pathology classification
- 사용자가 직접 작성하는 annotation workflow
- 외부 ML prediction system

## 개념적 역할

현재 Tool은 S3 또는 S4를 확정적으로 진단한다고 주장하지 않는다.

대신 다음 두 가지를 식별한다.

- `S3 candidate`
- `S4 candidate`

이 candidate는 본질적으로 다음 질문에 답하기 위한 것이다.

- 현재 cycle structure를 기준으로 볼 때, 추가적인 low-amplitude event가 존재할 가능성이 있는 위치가 어디인가

## 시간적 배치 규칙

현재의 개념적 모델은 다음과 같다.

- `S3`는 `S2` 직후에 위치한다
- `S4`는 다음 `S1` 직전에 위치한다

즉, S3/S4는 이미 구성된 cycle에 의존한다.

전체 record를 대상으로 무작정 탐색하는 방식은 아니다.

## Candidate Window

현재 구현은 cycle-aware window를 사용한다.

상위 수준의 의도는 다음과 같다.

- `S3`: `S2` 이후의 early diastolic candidate region
- `S4`: 다음 `S1` 이전의 late diastolic candidate region

이 window는 의도적으로 제한되어 있으며, candidate search가 임의의 amplitude fluctuation이 아니라 생리학적으로 가능한 위치에 묶이도록 설계되어 있다.

## 신호 기반

candidate logic은 주로 amplitude behavior에 의해 결정된다.

현재는 다음 요소에 직접 의존하지 않는다.

- ECG-confirmed timing
- expert label
- pathology-grade adjudication

즉, 이 방법은 의도적으로 lightweight하고 review-oriented하게 설계되어 있다.

## 현재 Detection 철학

현재 제품은 S3/S4를 다음과 같이 해석한다.

- low-confidence exploratory candidate
- 의미 있을 수 있는 visual hypothesis
- 추가 검토가 필요한 signal

이 접근은 Tool이 잠재적으로 의미 있는 구간을 사용자에게 보여주되, 확실성을 과장하지 않도록 해준다.

## Rendering 스타일

S3와 S4는 시각적으로 S1, S2와 구분되게 표시된다.

graph에서 이들의 목적은 다음과 같다.

- 검토자의 attention을 끌기
- primary heart sound와 시각적으로 분리된 상태 유지
- 빠르게 on/off 할 수 있도록 지원

rendering style은 일반적인 sound-area overlay보다 더 alert-like한 느낌을 가지도록 의도되어 있다.

## 다른 Overlay와의 관계

S3/S4는 secondary overlay에 해당한다.

이들은 이미 다음 요소를 포함하고 있는 graph 위에 추가로 표시된다.

- amplitude
- S1 area
- S2 area
- cycle highlight
- parameter annotation

따라서 이들의 color 및 shape 전략은 primary sound structure와 혼동되지 않도록 설계되어야 한다.

## Toggle 동작

현재 visualization model에서는 S3/S4 visibility를 series-selection 경로를 통해 제어할 수 있다.

이 구조는 다음과 같은 중요한 설계 가정을 반영한다.

- 모든 사용자가 candidate overlay를 항상 보고 싶어하는 것은 아니다

## Parameter Logic과의 관계

현재 S3/S4는 visualization 중심의 candidate feature이다.

이들은 현재 HeartSound parameter sheet의 main parameter set에 포함되어 export되지는 않는다.

이러한 분리는 다음 이유에서 유용하다.

- 현재 main parameter set은 안정적인 cycle anchor를 중심으로 설계되어 있다
- S3/S4는 아직 exploratory 단계에 있다

## 설계 의도

S3/S4 카테고리는 다음을 제공하기 위해 존재한다.

- 구조화된 exploratory guidance
- 시각적으로 명확한 secondary event candidate
- pathology-oriented review로 확장할 수 있는 여지

즉, 아직은 최종 clinical reporting layer를 목표로 하는 구조는 아니다.

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `frontend/src/App.tsx`
- `backend/app/services/plot_data_service.py`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- candidate confidence scoring
- S3/S4 waveform feature의 parameter화
- candidate interval export
- 사용자 확인 workflow
- supervised follow-up validation

## 요약

현재 S3/S4 구조는 cycle-aware HeartSound timing 위에 구축된 exploratory candidate layer이다.

이 구조의 목적은 사용자가 의심스러운 추가 event를 인지할 수 있도록 돕되,  
그 event를 확정된 S1/S2 구조와는 시각적·개념적으로 분리해서 유지하는 데 있다.