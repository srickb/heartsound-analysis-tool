# Wave Playback 구조

## 목적

이 문서는 wave playback이 panel에 어떻게 연결되고, audio playback이 graph와 어떻게 상호작용하는지를 설명한다.

wave playback은 독립적인 media 기능이 아니다.  
이는 활성 HeartSound panel을 위한 synchronized review aid이다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- wave file linking
- playback control
- playhead 동작
- drag interaction
- viewport synchronization
- speed control
- reset 및 종료 시 동작

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- upload registry 세부 구조
- parameter extraction formula
- share/auth runtime

## Panel에 연결되는 Wave Resource

wave file은 전역적으로 열리는 것이 아니라 panel에 연결된다.

즉, 다음과 같은 구조를 가진다.

- 각 panel은 자신만의 wave context를 가질 수 있다
- playback control은 해당 panel에 연결된 wave를 기준으로 동작한다
- graph와 audio의 관계도 panel별로 독립적이다

## Playback Control 구성

현재 playback control 그룹에는 다음 기능이 포함된다.

- 5초 뒤로 이동
- 재생 / 일시정지
- 5초 앞으로 이동
- 0초로 reset
- 느린 재생 속도 조절

이 control들은 panel header에 배치되어 있으며,  
짧고 자주 사용하는 review 도구로 설계되어 있다.

## Play / Pause 동작

중앙의 play control은 현재 상태에 따라 icon이 바뀐다.

동작 방식은 다음과 같다.

- 정지 상태에서는 play icon 표시
- 재생 중에는 pause icon 표시

이 방식은 일반적인 media-control interaction 패턴을 따른다.

## Jump Control

### `-5 sec`

현재 playback position을 5초 뒤로 이동시킨다.

### `+5 sec`

현재 playback position을 5초 앞으로 이동시킨다.

### Reset

playback을 연결된 wave의 시작 지점으로 되돌린다.

현재 중요한 동작은 다음과 같다.

- graph 위치도 reset 동작을 함께 따른다

## Speed Control

현재 playback speed control은 normal speed보다 느린 review를 특히 강조한다.

현재 설계는 다음에 초점을 둔다.

- normal speed
- 단계적으로 느리게 재생하는 mode

이는 acoustic detail을 자세히 확인할 때 유용하다.

## Playhead

graph에는 현재 audio time에 대응하는 playhead가 표시된다.

playhead는 다음 형태로 렌더링된다.

- 세로 막대
- 상단의 원형 handle

이 구조는 현재 재생 위치를 명확하게 보여주는 시각적 marker 역할을 한다.

## Drag Interaction

사용자는 playhead handle을 직접 drag할 수 있다.

즉, 다음 의미를 가진다.

- graph는 단순히 audio를 수동적으로 따라가기만 하지 않는다
- 사용자가 waveform 맥락 안에서 직접 audio를 scrub할 수 있다

drag 동작은 audio position과 graph state를 함께 업데이트한다.

## Graph Synchronization

wave system은 graph viewport와 강하게 연결되어 있다.

현재 동기화 동작에는 다음이 포함된다.

- playback이 graph 위의 playhead position을 업데이트한다
- step control이 필요 시 graph도 함께 이동시킨다
- reset 시 audio와 graph가 모두 시작 지점으로 돌아간다
- playhead가 visible range를 벗어나면 graph가 함께 앞으로 진행될 수 있다

이 구조 덕분에 wave review는 공간적으로 의미 있는 해석이 가능해진다.

## Playback 종료 시 동작

playback이 끝에 도달하면 다음과 같이 동작한다.

- audio는 다시 시작 지점으로 돌아간다
- graph도 초기 viewing region으로 복원된다

즉, playback state와 visual state가 일관되게 유지된다.

## 현재 설계 목표

wave playback은 다음과 같은 기능으로 설계되어 있다.

- review synchronization feature
- 일반적인 media player가 아님

제품의 의도는 사용자가 시각적으로 분석하고 있는 내용을 실제로 들을 수 있게 하는 데 있다.

## HeartSound Review와의 관계

wave playback은 특히 다음 요소를 직접 정렬해준다는 점에서 중요하다.

- plotted signal
- cycle structure
- area overlay
- parameter interpretation workflow

이 부분은 현재 Tool에서 가장 특징적인 요소 중 하나이다.

## Core Files

이 카테고리와 관련된 대표 파일은 다음과 같다.

- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `backend/app/main.py`

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- waveform/audio 양방향 snapping
- 정확한 시간 readout 표시
- cue point
- 특정 구간 반복 재생
- 검토한 playback range export

## 요약

현재 wave playback 구조는 graph를 audio-synchronized inspection surface로 바꿔주는 역할을 한다.

이 구조는 다음 기능을 제공한다.

- panel별 audio linkage
- transport control
- draggable playhead 기반 review
- graph-aware playback movement

즉, 이 카테고리는 acoustic interpretation workflow에 핵심적인 역할을 한다.