"""

앞으로 만들 프로젝트의 공통 고정 명세다. 이후 모든 작업은 이 명세를 절대 벗어나지 말고 따른다.

[프로젝트 목적]
심음 분석 결과 파일(csv, xlsx)을 업로드하고, 웹 브라우저에서 1분할 / 좌우 2분할 / 4분할 형태로 시각화하는 연구실 내부용 웹사이트를 만든다.

[고정 기술 스택]
- Frontend: React + TypeScript + Vite
- Chart: Apache ECharts
- Backend: FastAPI + Python
- Data processing: pandas
- Persistence: SQLite
- Serve on LAN: Uvicorn
- Do not switch to other chart libraries or frameworks unless explicitly instructed.

[운영 방식]
- 개발은 Mac에서 해도 되지만, 최종 사용은 Mac/Windows 브라우저 모두 지원해야 한다.
- 우선 연구실 내부 네트워크에서 접속 가능한 형태로 만든다.
- 인증/권한 시스템은 v1에서 넣지 않는다.
- 모든 접속자는 업로드된 파일을 볼 수 있고, 대시보드의 보기 설정도 바꿀 수 있다.
- 실시간 협업 동기화(WebSocket)는 v1에서 필요 없다.
- 단, 서버에 저장된 파일과 현재 대시보드 상태는 유지되어야 한다.
- 다른 사용자가 URL로 접속하면 업로드된 데이터와 현재 저장된 대시보드 상태를 볼 수 있어야 한다.

[데이터 파일 규칙]
지원 파일 형식:
- .csv
- .xlsx

필수 컬럼명은 정확히 아래와 같다:
- Time_Index
- Amplitude
- S1-Start_RS_Score
- S1-End_RS_Score
- S2-Start_RS_Score
- S2-End_RS_Score

중요:
- Time_Index는 그래프를 그릴 때 완전히 무시한다.
- X축은 파일의 row index(0, 1, 2, ...)를 사용한다.
- 한 파일 안에는 위 컬럼들이 모두 존재한다고 가정하지만, 실제 구현에서는 누락 여부를 검증해야 한다.
- 그래프에 사용할 값들은 numeric이어야 하며, 숫자로 처리할 수 없는 파일은 업로드 실패로 처리한다.

[그래프 규칙]
한 패널에는 파일 1개만 배치한다. 한 패널 안에서 여러 파일을 겹쳐 비교하지 않는다.
한 패널의 그래프는 아래 방식으로 그린다:
- Amplitude: line chart
- 4개의 RS score:
  - S1-Start_RS_Score
  - S1-End_RS_Score
  - S2-Start_RS_Score
  - S2-End_RS_Score
  를 서로 다른 색상의 overlapped vertical bar 형태로 표시한다.
- Amplitude는 주축(left y-axis)
- RS score들은 보조축(right y-axis)
- 그래프 제목은 넣지 않는다.
- 대신 패널 헤더에 현재 파일명을 표시한다.

[레이아웃 규칙]
- 기본 레이아웃은 1분할
- 2분할은 반드시 좌우 분할
- 4분할은 2x2
- 각 패널은 독립적으로 파일/범위/표시 옵션을 가진다.
- 페이지 전체는 100vh 기준으로 구성하고, 메인 대시보드는 일반적인 27인치 모니터에서 세로 스크롤 없이 보이도록 한다.
- GitHub dark UI 느낌의 차분한 스타일로 만든다.

[사이드바 규칙]
왼쪽 사이드바에는 다음이 있어야 한다:
- 앱 이름
- 파일 업로드 버튼
- 폴더 업로드 버튼
- 업로드된 파일 목록
- 삭제 버튼
- 파일 검색창(가능하면 v1에 포함)

파일을 클릭하면 현재 활성 패널(active panel)에 할당한다.
삭제 버튼을 누르면 팝업 모달이 열리고, 체크박스로 여러 파일을 선택해서 삭제할 수 있어야 한다.

[패널 규칙]
각 패널에는 다음이 있어야 한다:
- 패널 번호
- 파일명
- 우측 상단 series 표시/숨기기 체크박스
  - Amplitude
  - S1-Start_RS_Score
  - S1-End_RS_Score
  - S2-Start_RS_Score
  - S2-End_RS_Score
- 우측 상단 톱니바퀴 버튼
- 초기화 버튼

[데이터 보기 방식]
중요:
- 사용자는 단순한 마우스 확대만 하는 것이 아니라, 데이터 범위를 선택해서 봐야 한다.
- 처음에는 항상 파일의 전체 구조가 보이도록 렌더링한다.
- 이후 사용자는 중요한 구간만 선택해서 자세히 볼 수 있어야 한다.
- 범위 선택은 두 가지 모두 지원한다:
  1) 시작 index / 끝 index 숫자 입력
  2) 전체 구조를 보며 범위를 선택하는 navigator/slider 방식
- 각 패널은 자기 범위를 따로 가진다.
- 각 패널마다 초기화 시 전체 범위로 돌아가야 한다.

[성능 규칙]
데이터 크기는 대략 6 x 30,000 에서 6 x 100,000 수준까지 가능하다.
따라서 아래를 반드시 반영한다:
- 전체 보기에서는 원본 전체를 그대로 다 렌더링하지 말고 성능 최적화를 한다.
- 상세 구간 보기에서는 필요 시 원본 또는 더 촘촘한 데이터를 사용한다.
- 각 패널은 독립적으로 렌더링하고, 한 패널 설정 변경이 다른 패널 전체 재렌더를 유발하지 않게 한다.
- 대용량 데이터를 고려한 API와 캐시 구조를 도입한다.

[대시보드 상태]
저장해야 하는 전역 상태 예시:
- splitMode: 1 | 2 | 4
- activePanelId
- 각 panel의:
  - fileId
  - rangeStart
  - rangeEnd
  - visibleSeries
  - style options
이 상태는 서버 재시작 후에도 유지되어야 한다.

[스타일 가이드]
GitHub dark 느낌으로 차분하게 만든다.
권장 색상:
- background: #0d1117
- panel: #161b22
- border: #30363d
- text: #c9d1d9
- Amplitude: #79c0ff
- S1-Start_RS_Score: #2ea043
- S1-End_RS_Score: #d29922
- S2-Start_RS_Score: #db6d28
- S2-End_RS_Score: #f85149

[절대 하지 말 것]
- Time_Index를 x축으로 사용하지 말 것
- 패널 하나에 여러 파일을 겹쳐 비교하지 말 것
- 원본 표/스프레드시트 편집 기능을 만들지 말 것
- 인증 시스템, 사용자 계정 시스템, 실시간 협업 기능을 v1에 넣지 말 것
- 차트 제목을 넣지 말 것
- Plotly 등 다른 차트 라이브러리로 바꾸지 말 것

[매 Part 공통 응답 형식]
각 Part 작업이 끝나면 반드시 아래 형식으로 응답해라:
1. 이번 Part에서 변경한 파일 목록
2. 구현한 기능 요약
3. 실행 방법
4. 아직 남아 있는 TODO
5. 확인해야 할 수동 테스트 시나리오

"""
