"""

공통 고정 명세를 기준으로 Part 1만 구현해라.

[이번 Part의 목표]
프로젝트의 기본 골격을 만든다.
아직 업로드/차트/최적화 로직은 깊게 구현하지 말고, 전체 앱 구조와 화면 프레임을 만든다.

[반드시 구현할 것]
1. Monorepo 또는 명확히 분리된 구조로 아래를 만든다:
   - frontend/
   - backend/
2. Frontend는 React + TypeScript + Vite로 세팅한다.
3. Backend는 FastAPI 프로젝트를 세팅한다.
4. Frontend와 backend가 동시에 실행될 수 있도록 기본 실행 스크립트를 만든다.
5. 메인 화면 UI 셸을 만든다:
   - 좌측 사이드바
   - 상단 툴바
   - 중앙 대시보드 영역
6. 대시보드 레이아웃 전환 버튼을 만든다:
   - 1분할
   - 좌우 2분할
   - 4분할
7. 각 분할 패널은 카드 형태 placeholder로 보이게 한다.
8. 현재 active panel 개념을 만든다.
   - active panel은 시각적으로 강조 표시한다.
   - 패널 클릭 시 active panel이 바뀌어야 한다.
9. GitHub dark 느낌의 기본 테마를 적용한다.
10. 페이지 전체를 100vh로 구성하고, 메인 대시보드 기준으로 세로 스크롤이 생기지 않게 한다.
11. backend에 health check API를 만들고 frontend에서 연결 테스트가 가능하게 한다.

[이번 Part에서는 하지 말 것]
- 실제 파일 업로드 기능
- 실제 차트 렌더링
- 실제 파일 목록 API
- 실제 SQLite 저장
- 실제 데이터 파싱
- 실제 패널 설정 모달

[구현 세부 요구]
- Frontend 첫 화면에서 사이드바는 비어 있어도 되지만, 다음 placeholder는 있어야 한다:
  - App title
  - Upload button placeholder
  - Folder upload button placeholder
  - File list placeholder
  - Delete button placeholder
- 상단 툴바에는 split mode 버튼이 있어야 한다.
- 중앙 패널은 분할 모드에 따라 즉시 UI가 바뀌어야 한다.
- 패널 헤더에는 최소한 "Panel 1", "Panel 2" 등이 보여야 한다.
- empty state 문구를 넣는다:
  - "No file assigned"
- FastAPI backend에는 최소한 /api/health 를 만든다.
- Frontend는 mount 시 /api/health 를 호출해서 연결 상태를 확인한다.

[완료 기준]
- frontend와 backend가 각각 실행된다.
- 메인 화면에서 1/2/4 분할 전환이 동작한다.
- active panel 선택이 동작한다.
- dark theme가 적용된다.
- backend health API 연결이 성공한다.

[응답 시 포함]
- 생성/수정한 파일 목록
- 실행 명령어
- 이후 Part 2를 위해 남겨둔 구조 설명

"""
