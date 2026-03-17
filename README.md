# HeartSound Analysis Tool

하나의 로컬 런처에서 HeartSound 및 ECG 분석 파일을 업로드하고, 동기화된 차트를 검토하며, 연결된 `wave`, `parameter`, `unsupervised` 파일을 함께 다루기 위한 브라우저 기반 대시보드입니다.

## Main Features

- Upload `data`, `wave`, `parameter`, and `unsupervised` files by workspace
- Visualize HeartSound and ECG series in one or two panels
- Auto-link matching `wave`, `parameter`, and `unsupervised` files when a `data` file is assigned
- Toggle RS score overlays, `S1/S2 Area`, and parameter highlights per panel
- Control wave playback from the chart header with `-5s`, `play/pause`, `+5s`, `reset`, and slow-speed controls
- Track audio position with a draggable playhead over the chart
- Resize chart/parameter split vertically inside each panel
- Use one-time code access mode for local/private sharing
- Organize and compare files across multiple workspaces
- Review signal and linked parameter context with panel-level controls

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

Generate a public share URL:

```bash
./share
```

Stop the share tunnel:

```bash
./stop_share.sh
```

## File Roles

- `Data`: main chart source file for HeartSound or ECG
- `Wave`: optional `.wav` file linked to the active panel for playback
- `Parameter`: summary/metric file shown in the linked parameter window
- `Unsupervised`: cycle/cluster overlay file

Matching support files are auto-linked when filenames follow the same base naming rule inside the same workspace.

## Wave Playback

- `Wave` files are uploaded from the left sidebar just like other file roles
- Linked wave files appear in the panel header as `Wave: <filename>`
- Playback controls live in the center of the panel header
- The red chart playhead shows current audio position and can be dragged to seek
- The `1x` speed button cycles through slower playback rates down to `0.25x`
- Reset returns playback to `0s` and moves the graph window back to the origin
- When the playhead is outside the visible graph range, play/pause brings it back into view

## Chart Behavior

- HeartSound panels can show `Amplitude`, `S1 Area`, `S2 Area`, and RS score overlays
- `Detail` opens the per-panel series picker
- `Default` restores the default visible series set
- The right-side secondary axis only appears when RS score series are visible
- Parameter and Unsupervised summaries stay linked to the current visible graph range
- Full-resolution plot loading is used for smoother audio-followed playback on assigned data files

## Notes

- Default access mode is `code`
- Uploaded files are stored under `backend/storage/uploads`
- Launcher runtime logs and PID files are stored under `.launcher/`
- Playwright/output artifacts are intentionally ignored by git
- Large files can increase browser memory usage because playback keeps a full-resolution plot available for smoother navigation

## Docs

- `docs/README.md`
- `docs/guides/LAUNCHER_GUIDE.md`
