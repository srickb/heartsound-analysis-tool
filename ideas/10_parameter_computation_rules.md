# Parameter Computation Rule

## 목적

이 문서는 현재 HeartSound parameter system을 지배하는 계산 규칙을 설명한다.

이 문서는 formula를 한 줄씩 나열하는 reference가 아니다.  
대신 현재 formula들이 내부적으로 일관되게 동작하도록 만드는 rule system을 정리하는 데 목적이 있다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- sampling 가정
- index 의미
- interval 의미
- unit 규칙
- invalid case 처리
- cycle dependency
- RS parameter 계산 규칙

이 문서는 formula reference 전용 문서를 대체하지 않는다.

## 핵심 Signal 가정

현재 HeartSound parameter pipeline은 다음을 가정한다.

- sample rate = `4000 Hz`
- 따라서 `1 sample = 0.25 ms`
- signal amplitude unit = `mV`

이 가정들은 현재 구현된 모든 HeartSound derived parameter family에 공통으로 적용된다.

## Index 의미

현재 시스템은 event location을 sample index로 취급한다.

예시는 다음과 같다.

- `S1_start`
- `S1_end`
- `S2_start`
- `S2_end`
- `next_S1_start`

이 값들은 그 자체로 time value가 아니다.  
sample-to-time conversion이 이루어져야만 시간값이 된다.

## Interval 의미

시스템은 signal slicing에 half-open interval semantics를 사용한다.

- `[start, end)`

이는 다음을 의미한다.

- start sample은 포함된다
- end sample은 포함되지 않는다

이 규칙은 segment parameter와 gap parameter 전반에서 slicing 동작을 일관되게 유지하는 데 중요하다.

## Cycle Dependency 규칙

대부분의 HeartSound parameter는 record 전체에 대한 global statistic이 아니다.  
이들은 cycle-local metric이다.

즉, 현재 parameter set은 다음에 의존한다.

- 유효한 current cycle
- 해당 cycle 내부의 유효한 S1 및 S2 anchor
- 필요한 경우 유효한 next S1 anchor

이 anchor가 없거나 유효하지 않으면, 시스템은 가짜 숫자 기본값을 넣기보다 `NaN`을 우선 사용한다.

## Invalid Value 정책

현재 parameter system은 계산 불가능한 경우 다음을 사용한다.

- `NaN`

다음과 같은 방식은 피한다.

- invalid case를 `0`으로 강제 변환

이 점이 중요한 이유는, `0`이 실제로는 유효한 물리량 결과처럼 오해될 수 있기 때문이다.

## Unit 규칙

현재 unit 정책은 다음과 같다.

- duration 및 middle position -> `ms`
- amplitude magnitude summary -> `mV`
- area 계열 absolute integral -> `mV·ms`
- energy 계열 quantity -> `mV²·ms`
- centroid balance value -> `%`
- HR -> `bpm`
- RS peak -> `RS score`
- RS width -> `ms`

이 규칙들은 parameter card가 사용자에게 전달하는 해석 표면을 정의한다.

## Sound-Internal Parameter 규칙

`S1`과 `S2` 내부 parameter는 해당 sound interval 자체로부터 계산된다.

대표적인 규칙은 다음과 같다.

- sound interval 내부 sample만 사용한다
- magnitude concentration을 측정할 때는 absolute value를 사용한다
- energy 성격의 amplitude concentration에는 RMS를 사용한다
- `Middle`에는 midpoint를 사용한다
- centroid balance에는 weighted distribution logic을 사용한다

## Gap Parameter 규칙

현재 `S1-S2` 및 `S2-S1` metric은 gap 기반이다.

이는 다음을 의미한다.

- `S1-S2` metric은 `S1 end -> S2 start`를 사용한다
- `S2-S1` metric은 `S2 end -> next S1 start`를 사용한다

즉, 이 metric들은 sound body 자체를 설명하는 것이 아니라, sound 사이의 interval을 설명한다.

## Centroid 규칙

centroid value는 단순한 geometric center가 아니다.  
이는 sound interval 내부의 weighted balance를 설명한다.

현재 해석 규칙은 다음과 같다.

- `S*_s Centroid`와 `S*_e Centroid`는 함께 보았을 때, energy distribution이 시작 쪽과 끝 쪽 중 어디로 더 기울어져 있는지를 설명한다

즉, 현재 의도된 해석은 sound 내부에서의 상보적 balance를 보는 것이다.

## HR 규칙

현재 heart-rate 규칙은 cycle 기반이다.

- `current S1 start -> next S1 start`를 사용한다
- 이 cycle span을 bpm으로 변환한다

즉, HR은 record 전체 평균값이 아니라 cycle-local rhythm context value로 해석된다.

## RS Peak 규칙

`RS Peak`는 다음과 같이 정의된다.

- 최종 선택된 event point를 기준으로 한다
- 정확히 그 event point에서의 RS score 값을 읽는다

현재 display 정책에서는 이 값을 정수 형태로 반올림해 보여준다.  
이는 RS score를 이산적인 event-strength scale로 해석하기 때문이다.

## RS Width 규칙

현재 `RS Width` logic은 event-centered 방식이다.

이는 전체 RS signal을 전역적으로 사용하는 방식이 아니다.

대신 다음 절차를 따른다.

- 선택된 event peak에서 시작한다
- 해당 peak의 local height를 기준으로 삼는다
- RS score가 half-height 이상인 동안 좌우로 확장한다
- 최종 span을 `ms`로 변환한다

즉, 이 width는 record-level spread가 아니라 local event spread를 나타내는 규칙이다.

## Consistency 규칙

현재 parameter system의 중요한 원칙 중 하나는 다음 요소들 사이의 일관성이다.

- graph structure
- cycle structure
- parameter extraction
- annotation display
- export output

이 원칙이 중요한 이유는, 하나의 parameter가 제품 전체에서 동일한 structural anchor를 기준으로 가리킬 때만 신뢰할 수 있기 때문이다.

## 설계 의도

현재 계산 규칙은 다음 특성을 목표로 한다.

- stable
- interpretable
- cycle-specific
- failure case에서 보수적으로 동작하는 구조

즉, 불안정한 derived feature를 많이 추가하는 것보다, 안정적이고 해석 가능한 구조를 유지하는 것이 이 Tool에 더 중요하다.

## 관련 Reference

정확한 parameter별 formula는 다음 문서를 참고한다.

- `process/heartsound_parameter_formula_reference.md`

이 문서는 해당 formula sheet의 배경이 되는 rule system으로 읽는 것이 적절하다.

## 요약

현재 HeartSound computation rule은 다음 기반 위에서 일관된 parameter system을 정의한다.

- 고정된 sample-rate 해석
- cycle-local segmentation
- half-open interval
- 명시적인 unit handling
- invalid case에 대한 `NaN` 처리
- event-centered RS measurement

이 규칙들은 UI, export, graph interaction 전반에서 Tool의 내부 일관성을 유지해준다.