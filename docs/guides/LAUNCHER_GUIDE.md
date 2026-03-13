# HeartSound Launcher Detailed Guide

이 문서는 `/Users/ms/Desktop/HeartSound-Analysis-Tool` 프로젝트의 launcher를 실제로 사용하는 방법을 자세히 설명합니다.

launcher의 목적은 다음과 같습니다.

- backend와 frontend를 각각 따로 켜지 않아도 되게 만들기
- 가능한 한 짧은 명령어 하나로 전체 프로젝트를 실행하기
- 실행 중 로그를 backend/frontend로 구분해서 보기 쉽게 만들기
- 종료, 상태 확인, health 확인을 쉽게 하기
- macOS에서는 더블클릭으로도 실행 가능하게 하기

## 1. launcher가 무엇을 해 주는가

현재 프로젝트에는 아래 실행 도구들이 추가되어 있습니다.

- `./start`
- `./code`
- `./run_dev.sh`
- `./stop_dev.sh`
- `./status_dev.sh`
- `./health_dev.sh`
- `HeartSound-Launcher.command`
- `Makefile`

이 도구들은 내부적으로 `scripts/` 아래의 launcher 스크립트를 호출합니다.

핵심 동작은 다음과 같습니다.

1. 프로젝트 루트를 자동으로 찾습니다.
2. backend와 frontend가 실제로 존재하는지 확인합니다.
3. backend용 Python 실행 파일을 찾습니다.
4. frontend용 `npm` 실행 파일을 찾습니다.
5. backend 의존성이 설치되어 있는지 확인합니다.
6. frontend의 `node_modules`가 존재하는지 확인합니다.
7. backend/frontend 포트가 이미 사용 중인지 검사합니다.
8. backend를 먼저 켭니다.
9. backend health check가 통과하면 frontend를 켭니다.
10. 두 서비스 로그를 각각 구분해서 출력합니다.
11. launcher 종료 시 backend/frontend도 함께 종료합니다.

## 2. 생성된 파일 구조

launcher 관련 파일은 아래와 같습니다.

### 루트 진입점

- `start`: 전체 실행용 기본 진입점
- `code`: 5분짜리 일회용 숫자 코드 생성
- `run_dev.sh`: 전체 실행
- `stop_dev.sh`: 전체 종료
- `status_dev.sh`: 프로세스/포트 상태 확인
- `health_dev.sh`: backend/frontend health 확인
- `HeartSound-Launcher.command`: macOS 더블클릭 실행용
- `launcher.env.example`: 사용자 환경별 설정 예시
- `Makefile`: `make dev`, `make stop`, `make status`, `make health` 제공

### 내부 구현

- `scripts/common.sh`: 공통 함수
- `scripts/run_dev.sh`: 실제 실행 로직
- `scripts/stop_dev.sh`: 실제 종료 로직
- `scripts/status_dev.sh`: 실제 상태 확인 로직
- `scripts/health_dev.sh`: 실제 health 확인 로직
- `scripts/dev.sh`: 기존 호환용 wrapper

### 실행 중 생성되는 파일

launcher 실행 후 아래 디렉터리가 자동 생성됩니다.

- `.launcher/logs/`
- `.launcher/pids/`

예시:

- `.launcher/logs/backend.log`
- `.launcher/logs/frontend.log`
- `.launcher/logs/launcher.log`
- `.launcher/pids/backend.pid`
- `.launcher/pids/frontend.pid`
- `.launcher/pids/launcher.pid`

## 3. 실행 전에 필요한 준비

launcher는 실행을 자동화하지만, 개발 도구 자체를 설치해 주지는 않습니다.

필요한 것은 다음과 같습니다.

### backend 쪽

- Python 3
- `backend/requirements.txt`에 있는 패키지 설치

권장 준비 방식:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

launcher는 backend Python을 아래 순서로 찾습니다.

1. `launcher.env`에 지정한 `BACKEND_PYTHON`
2. `backend/.venv/bin/python`
3. `backend/venv/bin/python`
4. `python3`
5. `python`

### frontend 쪽

- Node.js
- npm
- `frontend/node_modules`

준비:

```bash
cd frontend
npm install
```

launcher는 frontend npm을 아래 순서로 찾습니다.

1. `launcher.env`에 지정한 `FRONTEND_NPM`
2. 시스템의 `npm`

## 4. 가장 기본적인 사용 방법

프로젝트 루트에서 아래 명령만 실행하면 됩니다.

```bash
./start
```

성공하면 대략 다음 순서로 진행됩니다.

1. launcher가 프로젝트 구조를 검사합니다.
2. Python과 npm을 찾습니다.
3. 포트 충돌을 검사합니다.
4. backend를 실행합니다.
5. `http://127.0.0.1:8000/api/health`로 backend가 살아 있는지 확인합니다.
6. frontend를 실행합니다.
7. `http://127.0.0.1:5173/`에 접근 가능한지 확인합니다.
8. 터미널에 backend/frontend 로그가 prefix와 함께 출력됩니다.

성공 후 접속 주소:

- frontend: `http://127.0.0.1:5173`
- backend health: `http://127.0.0.1:8000/api/health`

## 5. 터미널 출력은 어떻게 보이나

launcher는 로그를 구분해서 보여줍니다.

예시 형태:

```text
[INFO] Starting backend on http://127.0.0.1:8000
[OK] Backend is ready.
[INFO] Starting frontend on http://127.0.0.1:5173
[OK] Frontend is ready.
[backend] INFO:     Uvicorn running on ...
[frontend] VITE v5...
```

즉:

- launcher 자체 메시지는 `[INFO]`, `[OK]`, `[WARN]`, `[ERROR]`
- backend 로그는 `[backend]`
- frontend 로그는 `[frontend]`

## 6. 종료 방법

### 현재 띄운 터미널에서 종료

가장 쉬운 방법은 `Ctrl+C` 입니다.

이 경우 launcher가 backend와 frontend를 함께 종료합니다.

### 다른 터미널에서 종료

launcher를 띄운 터미널을 그대로 두고, 다른 터미널에서 다음 명령을 실행해도 됩니다.

```bash
./stop_dev.sh
```

이 스크립트는:

1. 저장된 PID 파일을 읽고
2. launcher/backend/frontend 프로세스를 찾고
3. 정상 종료를 시도한 후
4. 필요하면 강제 종료까지 수행합니다

## 7. 상태 확인 방법

실행 중인지 빠르게 확인하려면:

```bash
./status_dev.sh
```

출력 내용:

- launcher가 실행 중인지
- backend가 실행 중인지
- frontend가 실행 중인지
- backend 포트가 listening 중인지
- frontend 포트가 listening 중인지
- 로그 파일 위치가 어디인지

예시:

```text
launcher: running (pid=12345)
backend: running (pid=12346)
frontend: running (pid=12347)
[INFO] backend port 8000 is listening
[INFO] frontend port 5173 is listening
```

## 8. health 확인 방법

서비스가 실제 HTTP 요청에 응답하는지 확인하려면:

```bash
./health_dev.sh
```

이 스크립트는 다음 URL을 확인합니다.

- backend: `http://127.0.0.1:8000/api/health`
- frontend: `http://127.0.0.1:5173/`

예시:

```text
backend=up url=http://127.0.0.1:8000/api/health
frontend=up url=http://127.0.0.1:5173/
```

둘 중 하나라도 죽어 있으면 non-zero exit code로 끝납니다. 따라서 추후 CI나 간단한 자동 점검에도 붙이기 쉽습니다.

## 9. Makefile로 쓰는 방법

터미널에서 아래처럼 더 짧게 쓸 수도 있습니다.

```bash
make dev
make code
make stop
make status
make health
```

동작은 각각 `./start`, `./code`, `./stop_dev.sh`, `./status_dev.sh`, `./health_dev.sh`와 같습니다.

## 10. 일회용 숫자 코드를 호스트 컴퓨터에서 발급하는 방법

관리자 UI에 들어가지 않고, 이 툴을 실제로 실행 중인 메인 컴퓨터에서 바로 일회용 코드를 만들고 싶다면 아래 명령을 사용하면 됩니다.

```bash
./code
```

이 스크립트는 다음을 수행합니다.

1. backend Python 실행 파일을 찾습니다.
2. backend 의존성이 설치되어 있는지 확인합니다.
3. DB가 없으면 초기화합니다.
4. 사이트 접근 모드를 자동으로 `code`로 바꿉니다.
5. 5분짜리 숫자 코드 하나를 생성합니다.
6. 생성된 코드를 현재 터미널에 출력합니다.

예시 출력:

```text
[INFO] Generating a new 5-minute numeric access code...
One-time access code generated: 482193 (valid for 5 minutes, expires ...)
Access mode set to: code
Access code expires at: ...
[OK] A one-time access code was generated on this machine.
```

즉, 운영자는 메인 컴퓨터에서 `./code`만 치고, 방문 사용자에게 그 숫자만 전달하면 됩니다. 사용자는 사이트 첫 화면에서 이 숫자를 입력하면 곧바로 툴 화면으로 들어갑니다.

## 11. macOS에서 더블클릭 실행하는 방법

Finder에서 아래 파일을 더블클릭하면 됩니다.

- `HeartSound-Launcher.command`

이 파일은:

1. 자기 자신이 있는 프로젝트 루트로 이동하고
2. `./start`를 실행합니다

중요한 점:

- 실행에 성공하면 Terminal 창이 계속 열려 있어야 정상입니다
- launcher가 살아 있는 동안 backend/frontend도 같이 살아 있습니다
- 실패하면 바로 창이 닫히지 않도록 Enter 입력을 기다립니다

즉, macOS 사용자는 터미널 명령을 잘 몰라도 Finder 더블클릭으로 실행할 수 있습니다.

## 11. launcher.env로 설정 바꾸기

기본값을 바꾸고 싶으면 아래처럼 설정 파일을 만듭니다.

```bash
cp launcher.env.example launcher.env
```

지원되는 값:

- `BACKEND_HOST`
- `BACKEND_PORT`
- `FRONTEND_HOST`
- `FRONTEND_PORT`
- `BACKEND_PYTHON`
- `FRONTEND_NPM`

예시:

```bash
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8100
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=5200
BACKEND_PYTHON=/Users/yourname/miniconda3/bin/python
FRONTEND_NPM=/opt/homebrew/bin/npm
```

이렇게 해 두면 launcher는 기본값 대신 이 파일의 값을 사용합니다.

## 12. 포트 충돌이 났을 때

launcher는 backend와 frontend 포트를 실행 전에 검사합니다.

기본 포트는 다음과 같습니다.

- backend: `8000`
- frontend: `5173`

이미 누군가 이 포트를 사용 중이면 launcher는 실행을 중단하고 경고를 출력합니다.

예상 메시지:

```text
[ERROR] backend port 8000 is already in use
```

이 경우 해결 방법은 두 가지입니다.

### 방법 1. 기존 프로세스 종료

어떤 프로세스가 포트를 쓰고 있는지 확인하고 종료합니다.

### 방법 2. launcher 포트 변경

`launcher.env`를 만들어 포트를 바꿉니다.

예:

```bash
BACKEND_PORT=8100
FRONTEND_PORT=5200
```

## 13. 로그 파일은 어디서 보는가

launcher는 터미널에 로그를 보여 주는 동시에 파일에도 저장합니다.

로그 위치:

- `.launcher/logs/backend.log`
- `.launcher/logs/frontend.log`
- `.launcher/logs/launcher.log`

각 파일의 의미:

- `backend.log`: FastAPI/Uvicorn 및 backend 오류
- `frontend.log`: Vite 실행 로그 및 frontend 빌드/런타임 오류
- `launcher.log`: launcher 자체의 시작 단계 정보

문제 발생 시 가장 먼저 볼 파일은 보통 아래 둘입니다.

1. `.launcher/logs/backend.log`
2. `.launcher/logs/frontend.log`

## 14. PID 파일은 왜 필요한가

launcher는 실행된 프로세스를 다시 찾기 위해 PID 파일을 남깁니다.

위치:

- `.launcher/pids/backend.pid`
- `.launcher/pids/frontend.pid`
- `.launcher/pids/launcher.pid`

이 파일 덕분에:

- 다른 터미널에서 `./stop_dev.sh`로 종료할 수 있고
- `./status_dev.sh`로 관리 대상 프로세스를 식별할 수 있습니다

launcher는 stale PID가 있으면 자동으로 정리하려고 시도합니다.

## 15. 자주 발생하는 오류와 해결 방법

### 15-1. `npm was not found`

의미:

- 시스템에서 `npm`을 찾지 못했다는 뜻입니다.

해결:

1. Node.js를 설치합니다.
2. 새 터미널을 엽니다.
3. `npm -v`가 되는지 확인합니다.
4. 그래도 안 되면 `launcher.env`에 `FRONTEND_NPM` 절대경로를 지정합니다.

### 15-2. `frontend dependencies are missing`

의미:

- `frontend/node_modules`가 없다는 뜻입니다.

해결:

```bash
cd frontend
npm install
```

### 15-3. `backend dependencies are missing`

의미:

- backend Python은 찾았지만 필요한 패키지가 설치되지 않았다는 뜻입니다.

해결:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

또는 launcher가 사용하는 정확한 Python 경로로:

```bash
<python-path> -m pip install -r backend/requirements.txt
```

### 15-4. `backend failed to start correctly`

의미:

- backend 프로세스는 떴지만 health check까지 정상 완료되지 못한 것입니다.

점검 순서:

1. `.launcher/logs/backend.log` 확인
2. Python 패키지 설치 상태 확인
3. 포트 충돌 재확인
4. backend 코드 에러 여부 확인

### 15-5. `frontend failed to start correctly`

의미:

- frontend 프로세스가 실행되었지만 Vite가 정상 기동하지 못했을 가능성이 큽니다.

점검 순서:

1. `.launcher/logs/frontend.log` 확인
2. `npm install` 재실행
3. Node.js / npm 버전 확인
4. 포트 충돌 확인

### 15-6. launcher가 이미 실행 중이라고 나오는 경우

예상 상황:

- 이전 launcher가 아직 살아 있거나
- PID 파일은 남아 있는데 프로세스가 이미 죽었을 수 있습니다

해결:

```bash
./stop_dev.sh
./status_dev.sh
./start
```

## 16. 추천 사용 흐름

실제 개발 시 추천 순서는 다음과 같습니다.

### 처음 한 번만

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install
```

### 이후 평소 실행

```bash
cd /Users/ms/Desktop/HeartSound-Analysis-Tool
./start
```

### 상태 확인

```bash
./status_dev.sh
./health_dev.sh
```

### 종료

```bash
./stop_dev.sh
```

## 17. macOS 사용자에게 추천하는 가장 쉬운 사용법

터미널이 익숙하지 않다면 다음 두 가지만 기억하면 됩니다.

### 실행

- `HeartSound-Launcher.command` 더블클릭

### 종료

- launcher가 떠 있는 Terminal 창에서 `Ctrl+C`

또는

- 새 Terminal 창을 열고 프로젝트 폴더에서 `./stop_dev.sh`

## 18. Windows 확장 관점에서 현재 구조가 왜 괜찮은가

현재 launcher는 루트 wrapper와 `scripts/common.sh` 기반으로 정리되어 있습니다.

즉, 나중에 Windows용으로 확장할 때도 아래 요소를 그대로 유지할 수 있습니다.

- 프로젝트 루트 탐색 기준
- backend/frontend 존재 확인
- 포트 검사 정책
- health check 정책
- 로그/ PID 관리 구조
- 환경변수 이름 (`BACKEND_PORT`, `FRONTEND_PORT` 등)

추후 Windows 대응은 보통 아래처럼 추가하면 됩니다.

- `scripts/windows/start-dev.ps1`
- `scripts/windows/stop-dev.ps1`
- `scripts/windows/status-dev.ps1`
- `scripts/windows/health-dev.ps1`

즉, 지금 구조는 macOS 우선이지만 Windows 확장을 막는 방식으로 짜여 있지 않습니다.

## 19. FAQ

### Q. 왜 backend를 먼저 켜나요?

frontend는 API를 호출하므로 backend가 먼저 정상 기동하는 것이 실패 원인을 분리하기 쉽습니다.

### Q. 왜 포트가 사용 중이면 그냥 덮어쓰지 않나요?

이미 다른 프로세스가 쓰는 포트를 무시하고 실행하면 문제 원인을 찾기 더 어려워집니다. 명확하게 중단시키는 쪽이 안전합니다.

### Q. 왜 로그를 파일에도 저장하나요?

터미널 창을 닫았거나 출력이 너무 빨라서 놓친 경우에도 원인을 다시 볼 수 있어야 하기 때문입니다.

### Q. frontend/backend 중 하나만 따로 실행할 수 있나요?

현재 launcher의 목적은 둘을 함께 관리하는 것입니다. 필요하면 기존 방식대로 각 디렉터리에서 개별 실행도 가능합니다.

### Q. `scripts/dev.sh`는 이제 안 써도 되나요?

써도 됩니다. 다만 지금은 내부적으로 새 launcher를 호출하는 호환 wrapper입니다. 앞으로는 `./start`를 기본 진입점으로 생각하면 됩니다.

## 20. 빠른 명령어 요약

### 전체 실행

```bash
./start
```

### 전체 종료

```bash
./stop_dev.sh
```

### 상태 확인

```bash
./status_dev.sh
```

### health 확인

```bash
./health_dev.sh
```

### macOS 더블클릭 실행

- `HeartSound-Launcher.command`

## 21. 마지막 정리

이 launcher는 현재 프로젝트에서 다음 문제를 해결하기 위해 추가되었습니다.

- frontend와 backend를 따로 실행해야 하는 번거로움
- 어떤 로그가 어디서 나온 것인지 구분하기 어려운 문제
- 종료와 재시작이 번거로운 문제
- 포트 충돌이나 의존성 누락 같은 기본 실패 원인을 빨리 파악하기 어려운 문제

앞으로는 기본적으로 아래 한 줄만 기억하면 됩니다.

```bash
./start
```

문제가 생기면 다음 두 줄로 대부분 원인 파악이 가능합니다.

```bash
./status_dev.sh
./health_dev.sh
```
