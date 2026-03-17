# HeartSound Analysis Tool

Browser-based dashboard for uploading heart sound and ECG result files, reviewing charts, and managing linked parameter/unsupervised files from one local launcher.

## Main Features

- Upload `data`, `wave`, `parameter`, and `unsupervised` files by workspace
- Visualize heart sound and ECG series in one or two panels
- Toggle RS score overlays, `S1/S2 Area`, and parameter highlights per panel
- Resize chart/parameter split vertically inside each panel
- Use one-time code access mode for local/private sharing

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
