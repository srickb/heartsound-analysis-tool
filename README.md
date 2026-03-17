# HeartSound Analysis Tool

하나의 로컬 런처에서 심장 소리 및 심전도 결과 파일을 업로드하고, 차트를 검토하며, 연결된 매개변수/비지도 파일을 관리하기 위한 브라우저 기반 대시보드입니다.

## Main Features

* workspace별로 `data`, `wave`, `parameter`, `unsupervised` 파일 업로드 지원
* 심음과 ECG series를 1개 또는 2개의 panel에서 시각화 가능
* panel별로 RS score overlay, `S1/S2 Area`, parameter highlight의 표시/숨김을 각각 토글 가능
* 각 panel 내부에서 chart와 parameter 영역의 분할 비율을 세로 방향으로 조절 가능
* 로컬 또는 비공개 공유를 위해 one-time code access mode 지원
* 여러 workspace를 기준으로 데이터를 정리하고 비교하기 쉽게 구성
* panel 단위 제어를 통해 신호와 parameter를 더 직관적으로 검토 가능

## Project Structure

- `frontend/`: React + TypeScript + Vite UI
- `backend/`: FastAPI + SQLite + pandas service
- `docs/`: launcher guide and spec notes
- `scripts/`: helper scripts used by the launcher
- `start`, `code`, `stop_dev.sh`, `status_dev.sh`: shortest local entrypoints

## Local Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Run

Start both frontend and backend:

```bash
./start
```

Stop the local stack:

```bash
./stop_dev.sh
```

Check current status:

```bash
./status_dev.sh
./health_dev.sh
```

Generate a 5-minute one-time access code:

```bash
./code
```

## Notes

- Default access mode is `code`
- Uploaded files are stored under `backend/storage/uploads`
- Launcher runtime logs and PID files are stored under `.launcher/`
- Playwright/output artifacts are intentionally ignored by git

## Docs

- `docs/README.md`
- `docs/guides/LAUNCHER_GUIDE.md`
