"""

공통 고정 명세를 기준으로 Part 3만 구현해라.
기존 Part 1, Part 2 구조를 유지하고 확장하라.

[이번 Part의 목표]
업로드된 파일을 active panel에 할당할 수 있게 하고, 1/2/4 분할 레이아웃 안에서 각 패널이 독립 상태를 갖도록 만든다.
아직 실제 차트는 placeholder 상태여도 된다.

[반드시 구현할 것]
1. Frontend에서 대시보드 상태 구조를 명확히 정의한다.
2. 최소 상태 예시는 아래를 따른다:
   - splitMode: 1 | 2 | 4
   - activePanelId: 1 | 2 | 3 | 4
   - panels:
     - panelId
     - fileId | null
     - fileName
     - rangeStart
     - rangeEnd
     - visibleSeries
     - style options
3. 파일 목록에서 파일을 클릭하면 active panel에 할당되게 한다.
4. 패널마다 헤더를 만든다:
   - Panel 번호
   - 현재 할당된 파일명
   - placeholder checkbox 영역
   - placeholder gear button
   - reset button
5. reset button을 누르면 그 패널의 local 상태를 기본값으로 초기화한다.
6. split mode를 바꿔도 이미 할당한 panel state는 가능한 한 유지한다.
7. 1분할일 때는 Panel 1만 보이고,
   2분할일 때는 Panel 1, Panel 2만 보이며,
   4분할일 때는 Panel 1~4가 보이게 한다.
8. active panel이 시각적으로 확실히 구분되게 한다.

[UI 세부 규칙]
- 패널 안 main content는 아직 "Chart placeholder" 정도로 두어도 된다.
- 파일이 할당되지 않은 패널에는 명확한 empty state를 보여라.
- 파일이 할당된 패널에는 파일명을 패널 헤더에 보여라.
- 아직 차트가 없더라도 패널 구조가 차트가 들어갈 것을 고려해 full-height로 잡혀 있어야 한다.

[이번 Part에서는 하지 말 것]
- 실제 ECharts 연동
- 실제 downsampling API 호출
- 실제 navigator/slider
- 실제 gear modal 세부 기능
- 서버 저장 dashboard state

[완료 기준]
- 업로드한 파일을 active panel에 배정 가능
- split mode를 바꿔도 UI 구조가 안정적
- 각 패널이 독립 상태를 갖는다
- reset button이 각 패널별로 동작한다

[응답 시 포함]
- panel state 타입 정의
- 파일 할당 플로우 설명
- split mode 변경 시 상태 유지 방식 설명

"""
