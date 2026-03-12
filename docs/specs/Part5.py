"""

공통 고정 명세를 기준으로 Part 5만 구현해라.
기존 Part 1~4 구조를 유지하고 확장하라.

[이번 Part의 목표]
각 패널에 실제 차트를 렌더링하고, 전체 구조를 먼저 보여준 뒤, 숫자 입력과 navigator/slider 두 가지 방식으로 범위를 선택할 수 있게 만든다.
각 패널은 독립적으로 동작해야 한다.

[반드시 구현할 것]
1. Frontend에 Apache ECharts를 연결한다.
2. 파일이 할당된 패널은 실제 차트를 보여라.
3. 각 패널이 처음 로드될 때는 항상 전체 구조를 먼저 보여라.
   - 이때 backend의 overview 데이터를 사용한다.
4. 차트 구성:
   - left y-axis: Amplitude line
   - right y-axis: 4 RS scores overlapped bars
   - x-axis: row index
   - title 없음
5. 패널 헤더 우측 상단에 시리즈 표시/숨기기 체크박스를 구현한다:
   - Amplitude
   - S1-Start_RS_Score
   - S1-End_RS_Score
   - S2-Start_RS_Score
   - S2-End_RS_Score
6. 체크를 끄면 해당 시리즈를 완전히 숨긴다.
7. 각 패널마다 톱니바퀴 버튼을 누르면 설정 모달 또는 드로어가 열리게 한다.
8. 설정 UI에서 아래를 구현한다:
   - start index 입력
   - end index 입력
   - apply button
   - reset to full range button
9. 숫자 입력 외에 navigator/slider 방식의 범위 선택도 넣는다.
   - 사용자는 전체 구조를 보면서 범위를 선택할 수 있어야 한다.
   - 단순 wheel zoom만 주 기능으로 두지 말 것
10. range가 바뀌면 해당 패널만 다시 요청/렌더링한다.
11. 각 패널 하단 또는 적절한 위치에 현재 표시 구간 정보를 보여라:
   - 예: rows 12000 - 18000 / total 100000
12. 각 패널은 독립적으로 동작해야 한다.
   - Panel 1 범위 변경이 Panel 2 전체 재렌더를 유발하면 안 된다.

[스타일/표현 옵션]
gear 설정 안에 최소한 아래 옵션을 넣어라:
- Amplitude line width
- RS bar opacity
- Y-axis auto scale on/off
- Panel reset

[성능 관련 요구]
- assigned file이 없는 패널은 차트를 렌더링하지 말 것
- 패널별 데이터 요청을 분리할 것
- 불필요한 re-render를 줄일 것
- split mode가 4일 때도 UI가 무너지지 않게 할 것

[이번 Part에서는 하지 말 것]
- dashboard state의 서버 저장
- 최종 배포 정리
- 인증/실시간 협업

[완료 기준]
- 패널에 실제 차트가 그려진다
- 처음에는 전체 구조가 보인다
- 숫자 입력과 navigator/slider 둘 다로 범위 선택이 가능하다
- 시리즈 숨김/표시 체크박스가 동작한다
- 패널별 초기화가 동작한다

[응답 시 포함]
- ECharts option 구성 설명
- panel별 요청 흐름
- range selection 동작 방식
- 시각적 테스트 포인트

"""
