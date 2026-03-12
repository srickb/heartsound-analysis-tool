"""

공통 고정 명세를 기준으로 Part 2만 구현해라.
기존 Part 1 구조를 유지하고 확장하라.

[이번 Part의 목표]
csv/xlsx 파일 업로드, 폴더 업로드, 파일 목록 조회, 삭제, SQLite 기반 메타데이터 저장을 구현한다.
아직 차트 렌더링은 하지 않는다.

[반드시 구현할 것]
1. backend에 SQLite를 추가한다.
2. 업로드된 파일 메타데이터를 저장하는 구조를 만든다.
3. 서버 재시작 후에도 업로드된 파일 목록이 유지되게 한다.
4. 파일 저장 디렉토리를 만든다.
5. 아래 backend API를 구현한다:
   - GET /api/files
   - POST /api/upload/files
   - POST /api/upload/folder
   - DELETE /api/files
   - GET /api/files/{fileId}/metadata
6. 업로드 시 csv/xlsx만 허용한다.
7. pandas를 사용해 파일을 열고 필수 컬럼을 검증한다.
8. 필수 컬럼이 하나라도 없거나 numeric 처리 불가이면 업로드 실패로 처리한다.
9. 동일 파일명 충돌을 피하기 위해 내부 저장명은 UUID 기반으로 저장한다.
10. 원래 파일명(original name)과 상대 경로(relative path)는 메타데이터에 저장한다.
11. Frontend 사이드바에서 실제 업로드와 파일 목록 표시를 연결한다.
12. 삭제 버튼을 누르면 체크박스 기반 팝업 모달이 열리고, 여러 파일을 선택 삭제할 수 있게 한다.
13. 삭제된 파일은 실제 저장소와 메타데이터에서 제거한다.

[데이터 검증 규칙]
필수 컬럼은 정확히 아래 6개다:
- Time_Index
- Amplitude
- S1-Start_RS_Score
- S1-End_RS_Score
- S2-Start_RS_Score
- S2-End_RS_Score

추가 규칙:
- Time_Index는 나중에 그래프에서 안 쓰지만, 현재는 컬럼 존재 여부는 검증한다.
- Amplitude와 4개의 RS 컬럼은 numeric으로 변환 가능해야 한다.
- 변환 불가능하면 업로드 실패
- row count와 file size를 저장한다.

[폴더 업로드 규칙]
- 폴더 업로드는 프론트에서 폴더 내 파일들을 한 번에 업로드하는 방식으로 구현한다.
- 폴더 내 csv/xlsx만 처리한다.
- 상대 경로를 가능하면 유지해서 저장한다.
- 폴더 내 비지원 파일 형식은 무시하거나 명확히 경고한다.

[Frontend 요구]
- 사이드바에 실제 파일 목록을 표시한다.
- 각 파일에 대해 최소한 아래를 보여라:
  - original file name
  - relative path가 있으면 함께 표시
  - 업로드 시각
  - row count
- 파일 검색 input을 추가한다.
- 파일 클릭 시 active panel에 할당하는 동작은 아직 local state 수준으로만 구현해도 된다.
- 삭제 모달 UI를 실제로 동작하게 한다.

[이번 Part에서는 하지 말 것]
- 실제 차트 그리기
- 데이터 범위 선택 UI
- 패널별 설정 모달 상세 기능
- 대시보드 상태의 서버 저장
- 대용량 downsampling API

[완료 기준]
- csv/xlsx 업로드 가능
- 폴더 업로드 가능
- 잘못된 파일은 명확한 에러 메시지 반환
- 파일 목록이 화면에 표시됨
- 삭제 모달에서 다중 선택 삭제 가능
- 서버 재시작 후 파일 목록이 유지됨

[응답 시 포함]
- DB 스키마
- API 목록
- 프론트 업로드 플로우 설명
- 수동 테스트 시나리오

"""
