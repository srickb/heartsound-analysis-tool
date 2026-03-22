# 3D Heart Modeling

## Daily Research Log Automation

This repository includes a lightweight research logging system.

- `Auto_Github/scripts/generate_daily_log.py` collects today's Git activity, optional notes, and optional experiment metadata.
- The script writes `Auto_Github/daily_logs/YYYY-MM-DD.md` and `Auto_Github/daily_logs/structured/YYYY-MM-DD.json` only when the day looks meaningful.
- `Auto_Github/project_context.json` stores stable project context and should be updated manually as the project evolves.
- `.github/workflows/daily_research_log.yml` runs the generator on push and at 23:00 Asia/Seoul time, then commits generated logs only when files changed.
- `Auto_Github/DAILY_LOG_USAGE.md` explains how to prepare input files and how to read and use the generated markdown log.

Optional input files:

- `Auto_Github/notes/daily_raw/YYYY-MM-DD.md`
- `Auto_Github/experiments/YYYY-MM-DD.json`
