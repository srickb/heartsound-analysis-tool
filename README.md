# HeartSound Analysis Tool

Internal dashboard for uploading heart sound result files and visualizing them in a browser.

## Structure

- `docs/`: guides and project specs
- `frontend/`: React + TypeScript + Vite client
- `backend/`: FastAPI + SQLite + pandas service
- `scripts/`: launcher and helper scripts
- `start`: shortest CLI entrypoint for starting frontend + backend together
- `run_dev.sh`: compatibility wrapper for the launcher
- `HeartSound-Launcher.command`: macOS double-click launcher
- `backend/storage/uploads`: uploaded raw files
- `backend/storage/heartsound.db`: SQLite metadata DB

## One-time setup

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

## Launcher usage

### Start everything with one command

```bash
./start
```

What the launcher does:

- finds the project root relative to the script location
- checks that `backend/app/main.py` and `frontend/package.json` exist
- auto-detects backend Python from `backend/.venv/bin/python`, `backend/venv/bin/python`, `python3`, then `python`
- checks that backend Python packages are installed
- checks that `frontend/node_modules` exists and that `npm` is available
- warns and stops if port `8000` or `5173` is already in use
- starts backend and frontend together
- streams prefixed logs as `[backend] ...` and `[frontend] ...`
- stops both services when you press `Ctrl+C`

### Alternative entrypoints

```bash
make dev
./start
./scripts/run_dev.sh
./scripts/dev.sh
```

### Stop everything

If the launcher is running in the current terminal, press `Ctrl+C`.

From another terminal:

```bash
./stop_dev.sh
```

### Check status / health

```bash
./status_dev.sh
./health_dev.sh
```

`./health_dev.sh` returns a non-zero exit code if either frontend or backend is down.

## macOS double-click launcher

Use the file below from Finder:

```text
HeartSound-Launcher.command
```

Double-clicking it opens Terminal and runs the same launcher as `./start`. If startup fails immediately, the window waits for Enter so the error message stays visible.

Preferred terminal entrypoint:

- `./start`

Detailed launcher documentation:

- `docs/guides/LAUNCHER_GUIDE.md`

## Launcher configuration

If you need custom ports or explicit executable paths:

```bash
cp launcher.env.example launcher.env
```

Supported overrides:

- `BACKEND_HOST`
- `BACKEND_PORT`
- `FRONTEND_HOST`
- `FRONTEND_PORT`
- `BACKEND_PYTHON`
- `FRONTEND_NPM`

## Runtime files

Launcher state is written under `.launcher/`:

- `.launcher/logs/backend.log`
- `.launcher/logs/frontend.log`
- `.launcher/logs/launcher.log`
- `.launcher/pids/*.pid`

These files are ignored by git.

## Troubleshooting

- `npm was not found`: install Node.js or set `FRONTEND_NPM` in `launcher.env`
- `frontend dependencies are missing`: run `cd frontend && npm install`
- `backend dependencies are missing`: run `cd backend && <python> -m pip install -r requirements.txt`
- `port 8000/5173 is already in use`: stop the old process first, or change the port in `launcher.env`
- launcher starts but one service exits: inspect `.launcher/logs/backend.log` or `.launcher/logs/frontend.log`

## Backend APIs

- `GET /api/health`
- `GET /api/files`
- `GET /api/files/{fileId}/metadata`
- `GET /api/files/{fileId}/plot-data?mode=overview|range&start=&end=&panelWidth=&targetPoints=`
- `POST /api/upload/files` (multipart `files`)
- `POST /api/upload/folder` (multipart `files` + `relative_paths`)
- `DELETE /api/files` (json body: `{"fileIds": ["..."]}`)

## Project Docs

- `docs/README.md`
- `docs/guides/LAUNCHER_GUIDE.md`
- `docs/specs/Guide_ver1.py`
