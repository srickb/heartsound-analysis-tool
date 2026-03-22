# Daily Log Usage

## Purpose

This file explains how the daily research log system reads input files and how to use the generated outputs.

## Input Files

The generator reads only files for the current date in Asia/Seoul timezone.

- `Auto_Github/notes/daily_raw/YYYY-MM-DD.md`
- `Auto_Github/experiments/YYYY-MM-DD.json`
- `Auto_Github/project_context.json`

The note markdown file is optional.
If it exists, the script reads it as UTF-8, trims whitespace, ignores empty content, and uses non-empty lines as evidence.
Code blocks are ignored so that pasted code does not become research summary text.

The experiment JSON file is also optional.
If it exists, the script parses it safely and uses non-empty values as evidence.
If the file is malformed, the run does not fail. The log records that the file could not be read.

Git history is also used.
The script collects only today's commits, commit SHAs, timestamps, and changed files.
It does not copy raw diffs into the log.

## Generated Files

When the day is meaningful, the script creates:

- `Auto_Github/daily_logs/YYYY-MM-DD.md`
- `Auto_Github/daily_logs/structured/YYYY-MM-DD.json`

If the day is not meaningful, the script exits successfully and creates nothing.

## How To Read The Markdown Log

`Auto_Github/daily_logs/YYYY-MM-DD.md` is the human-readable daily report.

- `One-line Summary`: a short summary of the day.
- `Research Intent`: the most conservative statement of the day's purpose.
- `What I Worked On`: the evidence-backed tasks worked on that day.
- `Key Ideas`: only ideas that actually appeared in notes or experiment context.
- `Code Changes`: changed files with a short reason connected to the research purpose.
- `Results / Findings`: observed results only. If there was no result, it says `실험 실행 없음`.
- `How These Results Can Be Used`: practical interpretation of today's findings.
- `Problems / Open Questions`: unresolved issues found in notes.
- `Next Actions`: short next steps supported by existing evidence.
- `Knowledge Update`: lessons or clarified understanding from the day.
- `Referenced Files`: the files used to build the log.

Use this markdown file when you want a quick human review of what happened that day.

## How To Use The Structured JSON

`Auto_Github/daily_logs/structured/YYYY-MM-DD.json` is for machine-readable reuse.

- It includes evidence such as commit count, commit SHAs, note usage, and experiment usage.
- It includes a Korean prompt and strict rules for later summarization.
- It references `Auto_Github/project_context.json` instead of copying the full project context every day.

Use this JSON when you want to paste a precise daily record into ChatGPT web or another manual analysis workflow.

## Typical Workflow

1. Write notes in `Auto_Github/notes/daily_raw/YYYY-MM-DD.md` if you have research thoughts, problems, or next steps.
2. Save experiment metadata in `Auto_Github/experiments/YYYY-MM-DD.json` if you ran an experiment.
3. Commit research-related code changes as usual.
4. Run `python Auto_Github/scripts/generate_daily_log.py` locally or let GitHub Actions run it.
5. Open `Auto_Github/daily_logs/YYYY-MM-DD.md` to review the human-readable log.
6. If needed, open `Auto_Github/daily_logs/structured/YYYY-MM-DD.json` and paste it into ChatGPT web for a stricter narrative summary.

## Notes

- The system is conservative by design. Weak evidence is skipped rather than inflated.
- If you want better daily logs, write clearer notes and experiment summaries on the same date.
- Update `Auto_Github/project_context.json` when the stable project goal or environment changes.
