# 실행 및 접근 구조

## 목적

이 문서는 Tool이 어떻게 시작되고, 중지되며, 공유되고, 접근되는지를 설명한다.  
현재 구현에서의 운영 진입 지점(operational entry points)을 정의하고, local development mode, public sharing mode, 그리고 access control이 어떻게 함께 동작하는지를 정리한다.

이 문서는 내부 분석 로직보다는 제품의 runtime surface에 초점을 둔다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- local development startup
- backend 및 frontend process lifecycle
- public sharing URL 생성
- access mode 동작 방식
- authentication entry state
- 운영 의존성과 예상 runtime status

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- plot rendering logic
- heartsound parameter extraction
- file upload semantics
- wave playback behavior

## 현재 진입 지점

현재 Tool은 네 개의 주요 shell command를 통해 실행할 수 있다.

- `./bin/start`
- `./bin/stop_dev.sh`
- `./bin/share`
- `./bin/stop_share.sh`

이 명령어들은 사용자가 접하는 주요 운영 인터페이스이다.

## Local Development Runtime

### `./bin/start`

`./bin/start`는 표준 local launch command이다.  
이 명령의 역할은 interactive use에 필요한 application stack을 실행하는 것이다.

예상되는 runtime service는 다음과 같다.

- frontend dev server
- backend API server
- launcher/status supervision layer

사용자 관점의 결과는 다음과 같다.

- frontend는 `http://127.0.0.1:5173` 에서 접근 가능해진다
- backend는 `http://127.0.0.1:8000` 에서 접근 가능해진다

### `./bin/stop_dev.sh`

`./bin/stop_dev.sh`는 표준 local shutdown command이다.

이 명령의 역할은 다음과 같다.

- launcher가 활성화되어 있으면 이를 중지
- launcher가 관리하는 frontend 및 backend process 중지
- workspace를 깔끔하게 종료된 상태로 정리

### Runtime Status Script

현재 구현에는 status 확인용 routine도 포함되어 있다.

- `./scripts/status_dev.sh`

이 스크립트는 다음 항목을 확인하는 운영 검증 단계로 사용된다.

- launcher 실행 여부
- backend port listening 여부
- frontend port listening 여부
- log 파일 존재 여부 및 쓰기 가능 여부

## Public Sharing Runtime

### `./bin/share`

`./bin/share`는 frontend를 public URL로 노출하기 위해 사용하는 명령어이다.

현재 구현의 특징은 다음과 같다.

- `cloudflared` 기반
- 임시 `trycloudflare` tunnel 사용
- 별도의 deployment artifact가 아니라 frontend entry URL 자체를 외부에 노출

사용자 관점에서 기대되는 결과는 다음과 같다.

- public HTTPS URL이 생성된다
- 해당 URL은 local machine 외부에서도 열 수 있다

### Automatic Clipboard Copy

현재 구현에서는 `./bin/share`가 성공하면 생성된 public URL을 macOS clipboard에 자동으로 복사한다.

이 동작은 공유 및 테스트 과정의 마찰을 줄이기 위해 존재한다.

### `./bin/stop_share.sh`

`./bin/stop_share.sh`는 share tunnel을 종료하는 대응 명령어이다.

이 명령의 역할은 다음과 같다.

- 활성화된 `cloudflared` tunnel 중지
- 현재 public session 무효화
- 불필요하게 남아 있는 stale share process 방지

## Access Control Model

애플리케이션은 최소 두 가지 운영 access mode를 지원한다.

- `open`
- `code`

### `open`

`open` mode에서는 다음과 같이 동작한다.

- 사용자가 바로 진입한다
- login screen이 표시되지 않는다
- UI에 즉시 접근할 수 있다

이 mode는 다음 상황에 적합하다.

- local testing
- live demonstration
- temporary internal sharing

### `code`

`code` mode에서는 다음과 같이 동작한다.

- login screen이 표시된다
- 일회용 숫자 코드(one-time numeric code)가 필요하다
- 접근은 현재 code entry flow를 통해 제어된다

이 mode는 다음 상황에 적합하다.

- controlled demonstration
- temporary restricted sharing
- full account management 없이 세션 접근을 단순하게 제한해야 하는 경우

## 현재 Authentication Surface

현재 access state는 backend의 public-state endpoint를 통해 노출된다.

운영상 이는 frontend가 다음 정보를 판단할 수 있음을 의미한다.

- 현재 access mode
- login UI 표시 여부
- admin state 존재 여부

현재 제품은 full user account system이 아니라 lightweight access gating 구조를 사용하고 있다.

## Admin Entry

현재 UI는 상단 status 영역에 `Admin` 버튼을 제공한다.

이 영역은 다음 기능을 담당한다.

- access 관련 설정 조회 또는 변경
- `open`, `code`와 같은 mode 전환 제어

admin surface는 content-oriented가 아니라 configuration-oriented 영역이다.

## 운영 의존성

현재 runtime은 다음 요소들에 의존한다.

- Python backend environment
- frontend Node/Vite environment
- 쓰기 가능한 local log directory
- public sharing을 위한 `cloudflared` 사용 가능 여부
- tunnel 기반 공유를 위한 network connectivity

## 알려진 Runtime 동작 특성

### Sleep and Sharing

Tool은 local Mac에서 실행되므로 다음 사항을 고려해야 한다.

- 장치가 sleep 상태가 되면 local access가 일시 중단될 수 있다
- public share tunnel이 끊길 수 있다
- `trycloudflare` 링크가 일시적으로 동작하지 않을 수 있다

이는 장시간 데모를 진행할 때 운영상 중요하다.

### 530 Tunnel Errors

임시 public URL에서 다음과 같은 메시지가 표시될 수 있다.

- `530 The origin has been unregistered from Argo Tunnel`

이는 일반적으로 다음 상황을 의미한다.

- tunnel interruption
- network instability
- local machine sleep
- tunnel restart 또는 reconnection 상태

즉, 이는 public tunnel lifecycle 이슈이며, 반드시 Tool 내부 로직의 실패를 의미하는 것은 아니다.

## Logs and Operational Observability

현재 시스템은 `.launcher/logs` 경로에 launcher log를 유지한다.

중요한 runtime log category는 다음과 같다.

- backend log
- frontend log
- share log

이 log들은 다음 사항을 확인하는 데 사용된다.

- server startup
- share URL 생성
- reconnect attempt
- process failure

## Core Files

이 카테고리와 연결되는 대표적인 파일은 다음과 같다.

- `scripts/share.sh`
- `scripts/status_dev.sh`
- project root의 launcher script
- backend auth/public-state endpoint
- frontend app boot 및 access-state handling

## 설계 의도

현재 execution/access structure는 다음 목적에 맞게 최적화되어 있다.

- 빠른 local startup
- 마찰이 적은 demo sharing
- 반복적인 research use
- deployment overhead 없이 가능한 임시 access gating

반면 현재는 다음 목적에 최적화되어 있지 않다.

- permanent cloud hosting
- multi-user production tenancy
- 강한 수준의 identity management

## 향후 확장 메모

이 카테고리는 향후 다음 방향으로 확장될 수 있다.

- persistent hosted deployment
- stable share domain
- 더 강한 auth mode
- role-based access
- reconnect-aware share status UI

## 요약

현재 execution and access structure는 local-first runtime model이며, 다음 특성을 가진다.

- command 기반 startup 및 shutdown
- 임시 tunnel을 통한 선택적 public sharing
- `open` 및 `code` mode 기반의 전환 가능한 access gating
- log 기반 운영 검증

이 구조는 Tool의 진입 계층(entry layer)에 해당하며, 다른 모든 카테고리의 기반이 된다.