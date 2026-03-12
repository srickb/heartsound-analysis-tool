"""

공통 고정 명세를 기준으로 Part 4만 구현해라.
기존 Part 1~3 구조를 유지하고 확장하라.

[이번 Part의 목표]
실제 차트를 그리기 전에, 대용량 데이터를 안정적으로 전달하는 backend API를 만든다.
핵심은 전체 보기용 overview 데이터와 선택 구간용 range 데이터를 분리하는 것이다.

[반드시 구현할 것]
1. backend에 차트 데이터 API를 구현한다.
2. 아래 endpoint를 만든다:
   - GET /api/files/{fileId}/plot-data
3. query parameter 예시:
   - mode=overview | range
   - start
   - end
   - panelWidth
   - targetPoints
4. 응답에는 최소한 아래가 포함되게 한다:
   - fileId
   - originalRowCount
   - returnedPointCount
   - startIndex
   - endIndex
   - isDownsampled
   - x
   - amplitude
   - s1Start
   - s1End
   - s2Start
   - s2End

[중요 구현 규칙]
- Time_Index는 사용하지 말고, row index를 x축으로 사용한다.
- mode=overview 일 때는 전체 구간을 대상으로 한다.
- mode=range 일 때는 start~end 구간만 반환한다.
- 전체 보기에서는 성능을 위해 downsampling을 반드시 수행한다.
- 상세 범위가 충분히 작으면 raw data를 반환해도 된다.

[권장 알고리즘]
아래 규칙으로 구현해라:
1. overview 모드:
   - 전체 row 수가 많아도 반환 포인트 수를 제한한다.
   - panelWidth 또는 targetPoints를 참고해서 최대 약 2000~3000 x-position 수준으로 줄인다.
2. amplitude:
   - waveform peak를 보존하는 방향의 downsampling을 구현한다.
   - 단순히 N개마다 1개 추출하지 말 것
   - min/max bucket 기반 downsampling 또는 그와 동등한 peak-preserving 방식 사용
3. RS score 4개:
   - overview/large range에서는 bucket 기반 집계값을 사용한다.
   - 중요한 값이 사라지지 않도록 max 또는 적절한 representative strategy를 사용한다.
4. range 모드:
   - 요청 구간 길이가 충분히 작으면 raw data 반환
   - 요청 구간 길이가 너무 크면 다시 downsampling
5. 같은 요청 반복에 대비해 캐시를 넣어라.
   - 최소한 in-memory cache 또는 간단한 cache key 구조를 사용

[검증/안정성]
- start/end 범위가 잘못되면 400 에러
- 존재하지 않는 fileId는 404
- end < start 이면 400
- 범위가 파일 크기를 벗어나면 clamp 또는 명확한 에러 처리

[이번 Part에서는 하지 말 것]
- 프론트 차트 렌더링
- gear modal UI
- dashboard state server persistence
- 공유용 final packaging

[완료 기준]
- overview 데이터를 받을 수 있다
- 특정 range 데이터를 받을 수 있다
- 100k row 파일에서도 API가 과도하게 무겁지 않다
- 테스트 가능한 downsampling 유틸이 존재한다

[응답 시 포함]
- downsampling 알고리즘 설명
- cache key 설계
- plot-data API 예시 응답
- 성능 테스트 방법

"""
