#!/usr/bin/env python3
"""Generate conservative daily research logs from Git, notes, and experiments."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None


AUTOMATION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = AUTOMATION_ROOT.parent
PROJECT_CONTEXT_PATH = AUTOMATION_ROOT / "project_context.json"
DAILY_LOG_DIR = AUTOMATION_ROOT / "daily_logs"
STRUCTURED_LOG_DIR = DAILY_LOG_DIR / "structured"
NOTE_DIR = AUTOMATION_ROOT / "notes" / "daily_raw"
EXPERIMENT_DIR = AUTOMATION_ROOT / "experiments"
KST = ZoneInfo("Asia/Seoul") if ZoneInfo else timezone(timedelta(hours=9))
AUTO_COMMIT_MESSAGE = "chore: update daily research log"
LLM_PROMPT = (
    "이 JSON은 하루 연구 기록입니다. 이 내용을 과장 없이 사람이 읽기 좋은 연구일지 형태로 "
    "정리해주세요. 실제 기록만 기반으로 작성하고 존재하지 않는 결과는 추측하지 마세요. "
    "모든 문장은 '입니다.' 체로 작성하세요."
)
RULES = [
    "의미 없는 날에는 기록을 생성하지 않는다.",
    "코드 diff를 그대로 복사하지 않는다.",
    "존재하지 않는 결과를 추측하지 않는다.",
    '모든 문장은 "입니다." 체로 작성한다.',
    "연구 맥락 없는 기술적 설명은 작성하지 않는다.",
    "추상적인 표현(예: 좋아졌다, 개선됐다)은 가능한 한 피한다.",
    "미래 예측을 사실처럼 작성하지 않는다.",
    "커밋 메시지를 그대로 복붙하지 않는다.",
    '실험이 없으면 "실험 실행 없음"으로 명시한다.',
    "새로운 연구 아이디어는 반드시 Key Ideas 섹션에 정리한다.",
    '코드 변경은 반드시 "아이디어 또는 연구 목적"과 연결해서 설명한다.',
    "과거 연구를 재해석하거나 추가 가정을 만들지 않는다.",
]
GENERATED_PREFIXES = ("daily_logs/", "daily_logs\\")
TRIVIAL_FILE_NAMES = {".gitkeep"}
NOTE_HINTS = ("목표", "목적", "intent", "goal", "plan", "가설", "아이디어", "idea")
RESULT_HINTS = ("결과", "result", "metric", "accuracy", "loss", "score", "관찰", "성능")
QUESTION_HINTS = ("?", "문제", "이슈", "확인 필요", "unclear", "question")
NEXT_HINTS = ("다음", "todo", "to do", "next", "할 일", "후속")
KNOWLEDGE_HINTS = ("배운", "알게", "확인", "파악", "정리", "learned", "insight")
EXPERIMENT_HINT_KEYS = ("goal", "intent", "purpose", "summary", "description", "task")
EXPERIMENT_RESULT_KEYS = ("result", "results", "metrics", "summary", "observation")


@dataclass
class CommitRecord:
    sha: str
    timestamp: str
    message: str
    files: list[str]


@dataclass
class ExperimentReadResult:
    data: Any | None
    used: bool
    status: str
    path: str


def ensure_base_structure() -> None:
    for directory in (DAILY_LOG_DIR, STRUCTURED_LOG_DIR, NOTE_DIR, EXPERIMENT_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    if not PROJECT_CONTEXT_PATH.exists():
        PROJECT_CONTEXT_PATH.write_text(
            json.dumps(
                {
                    "project_name": "Heart Sound Analysis",
                    "goal": "Detect murmur and abnormal heart sounds from PCG data",
                    "data_type": "PCG heart sound",
                    "sampling_rate": 4000,
                    "framework": "TensorFlow",
                    "language": "Python",
                    "notes": (
                        "This file stores stable project-level context and should be edited "
                        "manually as the project evolves."
                    ),
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )


def load_project_context() -> dict[str, Any]:
    ensure_base_structure()
    with PROJECT_CONTEXT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_today_date_kst() -> tuple[str, datetime, datetime]:
    now = datetime.now(KST)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.date().isoformat(), start, end


def run_git_command(args: list[str]) -> str | None:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError:
        return None
    if completed.returncode != 0:
        return None
    return completed.stdout


def is_git_repository() -> bool:
    output = run_git_command(["rev-parse", "--is-inside-work-tree"])
    return (output or "").strip() == "true"


def get_today_commits(start: datetime, end: datetime) -> list[CommitRecord]:
    if not is_git_repository():
        return []
    log_output = run_git_command(
        [
            "log",
            f"--since={start.isoformat()}",
            f"--until={end.isoformat()}",
            "--date=iso-strict",
            "--no-renames",
            "--pretty=format:%x1e%H%x1f%cI%x1f%s",
            "--name-only",
        ]
    )
    if not log_output:
        return []

    commits: list[CommitRecord] = []
    for block in log_output.split("\x1e"):
        block = block.strip()
        if not block:
            continue
        lines = [line.rstrip() for line in block.splitlines()]
        meta = lines[0].split("\x1f")
        if len(meta) != 3:
            continue
        files = [line.strip() for line in lines[1:] if line.strip()]
        commits.append(
            CommitRecord(
                sha=meta[0],
                timestamp=meta[1],
                message=meta[2],
                files=files,
            )
        )
    return commits


def get_changed_files_from_commits(commits: list[CommitRecord]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for commit in commits:
        for file_path in commit.files:
            normalized = file_path.replace("\\", "/")
            if normalized not in seen:
                seen.add(normalized)
                ordered.append(normalized)
    return ordered


def read_optional_note(target_date: str) -> tuple[str, str]:
    note_path = NOTE_DIR / f"{target_date}.md"
    if not note_path.exists():
        return "", ""
    content = note_path.read_text(encoding="utf-8").strip()
    return content, note_path.relative_to(REPO_ROOT).as_posix()


def _has_meaningful_experiment_content(data: Any) -> bool:
    if data is None:
        return False
    if isinstance(data, dict):
        return any(_has_meaningful_experiment_content(value) for value in data.values())
    if isinstance(data, list):
        return any(_has_meaningful_experiment_content(value) for value in data)
    if isinstance(data, str):
        return bool(data.strip())
    return True


def read_optional_experiment(target_date: str) -> ExperimentReadResult:
    experiment_path = EXPERIMENT_DIR / f"{target_date}.json"
    relative_path = experiment_path.relative_to(REPO_ROOT).as_posix()
    if not experiment_path.exists():
        return ExperimentReadResult(data=None, used=False, status="missing", path="")

    raw_text = experiment_path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return ExperimentReadResult(data=None, used=False, status="empty", path=relative_path)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return ExperimentReadResult(data=None, used=False, status="malformed", path=relative_path)

    if not _has_meaningful_experiment_content(parsed):
        return ExperimentReadResult(data=parsed, used=False, status="empty", path=relative_path)
    return ExperimentReadResult(data=parsed, used=True, status="loaded", path=relative_path)


def _clean_markdown_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"^#{1,6}\s*", "", line)
    line = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s*", "", line)
    return line.strip()


def extract_note_lines(note_text: str) -> list[str]:
    lines: list[str] = []
    in_code_block = False
    for raw_line in note_text.splitlines():
        stripped = raw_line.rstrip()
        if stripped.strip().startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        cleaned = _clean_markdown_line(stripped)
        if cleaned:
            lines.append(cleaned)
    return lines


def unique_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _strip_sentence_ending(text: str) -> str:
    return re.sub(r"(입니다|이다|했다|함)?[.!?。]+$", "", text.strip())


def ensure_sentence(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return ""
    stripped = stripped.rstrip()
    if stripped.endswith("입니다."):
        return stripped
    stripped = re.sub(r"[.!?。]+$", "", stripped)
    if stripped.endswith("입니다"):
        return stripped + "."
    return stripped + "입니다."


def _first_matching_line(lines: list[str], hints: tuple[str, ...]) -> str:
    for line in lines:
        lowered = line.lower()
        if any(hint.lower() in lowered for hint in hints):
            return line
    return ""


def _collect_scalar_pairs(data: Any, prefix: str = "") -> list[tuple[str, Any]]:
    pairs: list[tuple[str, Any]] = []
    if isinstance(data, dict):
        for key, value in data.items():
            next_prefix = f"{prefix}.{key}" if prefix else str(key)
            pairs.extend(_collect_scalar_pairs(value, next_prefix))
    elif isinstance(data, list):
        for index, value in enumerate(data):
            next_prefix = f"{prefix}[{index}]"
            pairs.extend(_collect_scalar_pairs(value, next_prefix))
    else:
        pairs.append((prefix or "value", data))
    return pairs


def _format_scalar_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def infer_research_intent(note_text: str, experiment_data: Any) -> str:
    note_lines = extract_note_lines(note_text)
    note_candidate = _first_matching_line(note_lines, NOTE_HINTS)
    if note_candidate:
        return ensure_sentence(_strip_sentence_ending(note_candidate))
    for line in note_lines:
        if len(line) >= 12:
            return ensure_sentence(_strip_sentence_ending(line))

    if isinstance(experiment_data, dict):
        for key in EXPERIMENT_HINT_KEYS:
            value = experiment_data.get(key)
            if isinstance(value, str) and value.strip():
                return ensure_sentence(_strip_sentence_ending(value))
    return ""


def extract_research_topics(note_text: str, changed_files: list[str], experiment_data: Any) -> list[str]:
    topics: list[str] = []
    note_lines = extract_note_lines(note_text)
    for line in note_lines:
        if 4 <= len(line) <= 80:
            topics.append(line)
        if len(topics) >= 3:
            break

    if isinstance(experiment_data, dict):
        for key in experiment_data:
            key_text = str(key).replace("_", " ").strip()
            if key_text and key_text not in topics:
                topics.append(f"{key_text} 관련 실험")
            if len(topics) >= 5:
                break

    for file_path in changed_files:
        if is_generated_log_file(file_path) or Path(file_path).name in TRIVIAL_FILE_NAMES:
            continue
        topics.append(f"{file_path} 관련 작업")
        if len(topics) >= 5:
            break
    return unique_preserve_order(topics)[:5]


def extract_key_ideas(note_text: str, experiment_data: Any) -> list[str]:
    ideas: list[str] = []
    note_lines = extract_note_lines(note_text)
    for line in note_lines:
        lowered = line.lower()
        if any(token in lowered for token in ("idea", "아이디어", "가설", "hypothesis", "제안")):
            ideas.append(ensure_sentence(_strip_sentence_ending(line)))

    if isinstance(experiment_data, dict):
        for key in ("idea", "ideas", "hypothesis", "insight"):
            value = experiment_data.get(key)
            if isinstance(value, str) and value.strip():
                ideas.append(ensure_sentence(_strip_sentence_ending(value)))
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, str) and item.strip():
                        ideas.append(ensure_sentence(_strip_sentence_ending(item)))
    return unique_preserve_order(ideas)[:5]


def extract_results(note_text: str, experiment_result: ExperimentReadResult) -> list[str]:
    results: list[str] = []
    if experiment_result.used and experiment_result.data is not None:
        if isinstance(experiment_result.data, dict):
            for key in EXPERIMENT_RESULT_KEYS:
                value = experiment_result.data.get(key)
                if value is None:
                    continue
                if isinstance(value, str) and value.strip():
                    results.append(ensure_sentence(_strip_sentence_ending(value)))
                else:
                    for pair_key, pair_value in _collect_scalar_pairs(value):
                        formatted = _format_scalar_value(pair_value)
                        if formatted:
                            results.append(f"{pair_key} 값은 {formatted}입니다.")
                        if len(results) >= 5:
                            break
                if len(results) >= 5:
                    break
        if not results:
            for pair_key, pair_value in _collect_scalar_pairs(experiment_result.data):
                formatted = _format_scalar_value(pair_value)
                if formatted:
                    results.append(f"{pair_key} 값은 {formatted}입니다.")
                if len(results) >= 5:
                    break

    if not results:
        for line in extract_note_lines(note_text):
            lowered = line.lower()
            if any(hint in lowered for hint in RESULT_HINTS):
                results.append(ensure_sentence(_strip_sentence_ending(line)))
            if len(results) >= 5:
                break

    if not results:
        return ["실험 실행 없음"]
    return unique_preserve_order(results)[:5]


def extract_open_questions(note_text: str) -> list[str]:
    questions: list[str] = []
    for line in extract_note_lines(note_text):
        lowered = line.lower()
        if any(hint.lower() in lowered for hint in QUESTION_HINTS):
            questions.append(ensure_sentence(_strip_sentence_ending(line)))
        if len(questions) >= 5:
            break
    return unique_preserve_order(questions)[:5]


def extract_next_actions(note_text: str) -> list[str]:
    actions: list[str] = []
    for line in extract_note_lines(note_text):
        lowered = line.lower()
        if any(hint.lower() in lowered for hint in NEXT_HINTS):
            actions.append(ensure_sentence(_strip_sentence_ending(line)))
        if len(actions) >= 5:
            break
    return unique_preserve_order(actions)[:5]


def extract_knowledge_update(note_text: str) -> list[str]:
    updates: list[str] = []
    for line in extract_note_lines(note_text):
        lowered = line.lower()
        if any(hint.lower() in lowered for hint in KNOWLEDGE_HINTS):
            updates.append(ensure_sentence(_strip_sentence_ending(line)))
        if len(updates) >= 5:
            break
    return unique_preserve_order(updates)[:5]


def is_generated_log_file(file_path: str) -> bool:
    normalized = file_path.replace("\\", "/")
    return normalized.startswith(GENERATED_PREFIXES)


def get_meaningful_changed_files(changed_files: list[str]) -> list[str]:
    meaningful: list[str] = []
    for file_path in changed_files:
        name = Path(file_path).name
        if is_generated_log_file(file_path) or name in TRIVIAL_FILE_NAMES:
            continue
        meaningful.append(file_path)
    return meaningful


def is_meaningful_day(
    commits: list[CommitRecord],
    changed_files: list[str],
    note_text: str,
    experiment_result: ExperimentReadResult,
) -> bool:
    meaningful_files = get_meaningful_changed_files(changed_files)
    note_score = len(note_text.strip())
    has_note = note_score >= 60
    has_experiment = experiment_result.used
    strong_commit_signal = len(commits) >= 2 or (len(commits) >= 1 and len(meaningful_files) >= 2)
    supported_commit_signal = len(commits) >= 1 and len(meaningful_files) >= 1 and (has_note or has_experiment)
    return has_note or has_experiment or strong_commit_signal or supported_commit_signal


def build_code_changes(
    changed_files: list[str],
    research_intent: str,
    research_topics: list[str],
) -> list[dict[str, str]]:
    code_changes: list[dict[str, str]] = []
    anchor = _strip_sentence_ending(research_intent)
    if not anchor and research_topics:
        anchor = _strip_sentence_ending(research_topics[0])

    for file_path in get_meaningful_changed_files(changed_files)[:10]:
        if anchor:
            reason = f"{anchor}과 연결된 변경입니다."
        else:
            reason = "오늘 확인된 연구 관련 변경입니다."
        code_changes.append({"file": file_path, "reason": reason})
    return code_changes


def determine_confidence_level(
    note_text: str,
    experiment_result: ExperimentReadResult,
    commits: list[CommitRecord],
) -> str:
    note_length = len(note_text.strip())
    if note_length >= 150 and experiment_result.used:
        return "high"
    if note_length >= 80 or experiment_result.used or len(commits) >= 2:
        return "medium"
    return "low"


def build_structured_json(
    target_date: str,
    project_context: dict[str, Any],
    commits: list[CommitRecord],
    changed_files: list[str],
    note_text: str,
    note_path: str,
    experiment_result: ExperimentReadResult,
) -> dict[str, Any]:
    research_intent = infer_research_intent(note_text, experiment_result.data)
    research_topics = extract_research_topics(note_text, changed_files, experiment_result.data)
    key_ideas = extract_key_ideas(note_text, experiment_result.data)
    results = extract_results(note_text, experiment_result)
    open_questions = extract_open_questions(note_text)
    next_actions = extract_next_actions(note_text)
    knowledge_update = extract_knowledge_update(note_text)
    code_changes = build_code_changes(changed_files, research_intent, research_topics)

    structured = {
        "ai_instruction": (
            "이 JSON은 ChatGPT 웹에 붙여 넣어 연구일지 요약을 만들기 위한 구조화된 하루 연구 기록입니다."
        ),
        "llm_task": {
            "task": "summarize_research_log",
            "prompt": LLM_PROMPT,
        },
        "rules": RULES,
        "project_context_ref": "project_context.json",
        "daily_record": {
            "date": target_date,
            "research_intent": research_intent,
            "research_topics": research_topics,
            "key_ideas": key_ideas,
            "code_changes": code_changes,
            "today_commit_files": changed_files,
            "results": results,
            "open_questions": open_questions,
            "next_actions": next_actions,
            "knowledge_update": knowledge_update,
            "confidence_level": determine_confidence_level(note_text, experiment_result, commits),
            "source_evidence": {
                "commit_count": len(commits),
                "commit_shas": [commit.sha for commit in commits],
                "notes_used": bool(note_text.strip()),
                "experiment_used": experiment_result.used,
                "note_file": note_path,
                "experiment_file": experiment_result.path,
                "experiment_status": experiment_result.status,
                "project_goal": project_context.get("goal", ""),
            },
        },
    }
    return structured


def _markdown_list(items: list[str], empty_message: str) -> list[str]:
    if not items:
        return [f"- {ensure_sentence(empty_message)}"]
    lines: list[str] = []
    for item in items:
        sentence = ensure_sentence(item) if not item.endswith("입니다.") else item
        lines.append(f"- {sentence}")
    return lines


def _markdown_code_changes(items: list[dict[str, str]]) -> list[str]:
    if not items:
        return ["- 연구 목적과 연결된 코드 변경 근거가 충분하지 않습니다."]
    return [f"- `{item['file']}`: {ensure_sentence(item['reason'])}" for item in items]


def _build_usage_section(research_intent: str, results: list[str]) -> list[str]:
    if results == ["실험 실행 없음"]:
        return ["- 실험 결과가 없어서 즉시 활용할 수 있는 정량 근거는 없습니다."]
    anchor = _strip_sentence_ending(research_intent)
    if anchor:
        return [f"- 오늘 정리된 결과는 {anchor}의 다음 판단 근거로 사용할 수 있습니다."]
    return ["- 오늘 정리된 결과는 후속 실험 또는 구현 비교 기준으로 사용할 수 있습니다."]


def _build_referenced_files(note_path: str, experiment_result: ExperimentReadResult, changed_files: list[str]) -> list[str]:
    referenced: list[str] = ["project_context.json"]
    if note_path:
        referenced.append(note_path)
    if experiment_result.path:
        referenced.append(experiment_result.path)
    referenced.extend(changed_files)
    return unique_preserve_order(referenced)


def build_markdown_log(structured_data: dict[str, Any]) -> str:
    record = structured_data["daily_record"]
    research_intent = record["research_intent"]
    research_topics = record["research_topics"]
    code_changes = record["code_changes"]
    results = record["results"]
    referenced_files = _build_referenced_files(
        record["source_evidence"]["note_file"],
        ExperimentReadResult(
            data=None,
            used=record["source_evidence"]["experiment_used"],
            status=record["source_evidence"].get("experiment_status", "missing"),
            path=record["source_evidence"]["experiment_file"],
        ),
        record["today_commit_files"],
    )

    summary = research_intent or (
        ensure_sentence(_strip_sentence_ending(research_topics[0])) if research_topics else "오늘 연구 활동을 정리한 기록입니다."
    )
    worked_on: list[str] = []
    worked_on.append(
        f"오늘 커밋은 {record['source_evidence']['commit_count']}건이며 변경 파일은 {len(record['today_commit_files'])}개입니다."
    )
    if record["source_evidence"]["notes_used"]:
        worked_on.append(f"`{record['source_evidence']['note_file']}` 메모를 반영했습니다.")
    if record["source_evidence"]["experiment_used"]:
        worked_on.append(f"`{record['source_evidence']['experiment_file']}` 실험 파일을 반영했습니다.")
    elif record["source_evidence"].get("experiment_status") == "malformed":
        worked_on.append(
            f"`{record['source_evidence']['experiment_file']}` 파일은 형식 오류로 읽지 못했습니다."
        )
    worked_on.extend(ensure_sentence(topic) for topic in research_topics[:3])

    lines = [
        f"# Daily Research Log - {record['date']}",
        "",
        "## One-line Summary",
        ensure_sentence(summary),
        "",
        "## Research Intent",
        ensure_sentence(research_intent) if research_intent else "명확히 추론 가능한 연구 방향은 비워 두었습니다.",
        "",
        "## What I Worked On",
        *_markdown_list(worked_on, "오늘 작업 내역을 추가로 확인하지 못했습니다"),
        "",
        "## Key Ideas",
        *_markdown_list(record["key_ideas"], "명확히 기록된 새로운 아이디어는 없습니다"),
        "",
        "## Code Changes",
        *_markdown_code_changes(code_changes),
        "",
        "## Results / Findings",
        *_markdown_list(results, "실험 실행 없음"),
        "",
        "## How These Results Can Be Used",
        *_build_usage_section(research_intent, results),
        "",
        "## Problems / Open Questions",
        *_markdown_list(record["open_questions"], "명시적으로 기록된 미해결 문제는 없습니다"),
        "",
        "## Next Actions",
        *_markdown_list(record["next_actions"], "명시적으로 기록된 다음 행동은 없습니다"),
        "",
        "## Knowledge Update",
        *_markdown_list(record["knowledge_update"], "명확히 확인된 지식 업데이트는 없습니다"),
        "",
        "## Referenced Files",
        *[f"- 참고 파일은 `{path}`입니다." for path in referenced_files],
        "",
    ]
    return "\n".join(lines)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_markdown(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def main() -> int:
    ensure_base_structure()
    project_context = load_project_context()
    target_date, start, end = get_today_date_kst()
    commits = get_today_commits(start, end)
    changed_files = get_changed_files_from_commits(commits)
    note_text, note_path = read_optional_note(target_date)
    experiment_result = read_optional_experiment(target_date)

    if not is_meaningful_day(commits, changed_files, note_text, experiment_result):
        print(f"[skip] No meaningful activity detected for {target_date}.")
        return 0

    structured_payload = build_structured_json(
        target_date=target_date,
        project_context=project_context,
        commits=commits,
        changed_files=changed_files,
        note_text=note_text,
        note_path=note_path,
        experiment_result=experiment_result,
    )
    markdown_content = build_markdown_log(structured_payload)

    structured_path = STRUCTURED_LOG_DIR / f"{target_date}.json"
    markdown_path = DAILY_LOG_DIR / f"{target_date}.md"
    write_json(structured_path, structured_payload)
    write_markdown(markdown_path, markdown_content)
    print(f"[ok] Wrote {structured_path.relative_to(REPO_ROOT).as_posix()}")
    print(f"[ok] Wrote {markdown_path.relative_to(REPO_ROOT).as_posix()}")
    print(f"[info] Auto-commit message for workflow: {AUTO_COMMIT_MESSAGE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
