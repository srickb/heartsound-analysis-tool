"""
You are implementing a GitHub-based research logging automation system.

Your job is to build a complete, minimal, maintainable system inside the current repository.

The purpose of this system is:

- Automatically collect daily research-related activity from GitHub
- Optionally read user-written notes and experiment logs stored in the repo
- Generate:
  1. a human-readable markdown daily log
  2. a machine-readable structured JSON daily log
- Run automatically on:
  - every push
  - every day at 23:00
- Avoid generating logs on meaningless / empty days
- Do NOT use any paid external API
- Do NOT depend on OpenAI API
- The structured JSON will later be manually pasted by the user into ChatGPT web for final natural-language summarization

This system must be deterministic, simple, and easy to inspect.

================================
1. REQUIRED OUTPUT FILES
================================

Create these files and directories if they do not exist:

project_context.json

daily_logs/
daily_logs/structured/

notes/daily_raw/

experiments/

scripts/generate_daily_log.py

.github/workflows/daily_research_log.yml

Also add a small README section or comments in code explaining how the system works.

================================
2. REPOSITORY STRUCTURE
================================

Expected structure:

project_context.json

daily_logs/
    YYYY-MM-DD.md

daily_logs/structured/
    YYYY-MM-DD.json

notes/daily_raw/
    YYYY-MM-DD.md

experiments/
    YYYY-MM-DD.json

scripts/
    generate_daily_log.py

.github/workflows/
    daily_research_log.yml

================================
3. SYSTEM BEHAVIOR
================================

The system must run on:
1. push
2. schedule at 23:00 every day

On each run, the script must:

1. Determine today's date using Asia/Seoul timezone if possible.
2. Collect only today's commit activity.
3. Collect today's changed file list from commits.
4. Read optional notes file:
   notes/daily_raw/YYYY-MM-DD.md
5. Read optional experiment log:
   experiments/YYYY-MM-DD.json
6. Load fixed project context from:
   project_context.json
7. Decide whether today has enough meaningful activity.
8. If there is enough meaningful activity:
   - generate daily_logs/structured/YYYY-MM-DD.json
   - generate daily_logs/YYYY-MM-DD.md
9. If there is not enough meaningful activity:
   - do not generate a log
   - exit successfully without failure
10. Commit and push generated files back to the repository only if there are actual changes.

================================
4. IMPORTANT DESIGN CONSTRAINTS
================================

This system must NOT use:
- OpenAI API
- Notion API
- any paid LLM API
- any database
- any external service requiring payment

This system should rely only on:
- Python standard library if possible
- git CLI available in GitHub Actions
- repository files

Avoid unnecessary dependencies.

================================
5. DAILY ACTIVITY DETECTION LOGIC
================================

Use only today's activity.

Meaningful activity may include:
- one or more meaningful commits today
- non-empty note file for today
- non-empty experiment file for today

Meaningless activity examples:
- whitespace only notes
- trivial generated file touch
- extremely small/no-op activity
- empty experiment JSON
- empty commit set

Implement conservative behavior:
- when unsure, prefer skipping log generation
- do not force a daily log

You must create a helper function such as:
is_meaningful_day(...)

This function should use multiple signals:
- commit count
- changed files count
- note content length
- experiment content presence

================================
6. COMMIT ANALYSIS RULES
================================

Analyze only today's commits.

From today's commits extract:
- commit SHAs
- commit timestamps
- commit messages
- changed files

BUT:
- do not paste commit messages verbatim as the final research journal
- do not paste diffs
- do not generate long technical patch explanations
- use commit/file information only as evidence for summarization

Also create:
today_commit_files
as a unique ordered list of changed files.

================================
7. STRUCTURED JSON OUTPUT SPEC
================================

Generate:

daily_logs/structured/YYYY-MM-DD.json

The JSON must include all of the following fields.

Top-level structure:

{
  "ai_instruction": "...",
  "llm_task": {
    "task": "summarize_research_log",
    "prompt": "..."
  },
  "rules": [...],
  "project_context_ref": "project_context.json",
  "daily_record": {
    "date": "YYYY-MM-DD",
    "research_intent": "",
    "research_topics": [],
    "key_ideas": [],
    "code_changes": [],
    "today_commit_files": [],
    "results": [],
    "open_questions": [],
    "next_actions": [],
    "knowledge_update": [],
    "confidence_level": "low | medium | high",
    "source_evidence": {
      "commit_count": 0,
      "commit_shas": [],
      "notes_used": false,
      "experiment_used": false,
      "note_file": "",
      "experiment_file": ""
    }
  }
}

Detailed rules for fields:

ai_instruction:
A short explanation that this JSON is a structured research log intended to be pasted into ChatGPT web for summarization.

llm_task.prompt:
Must instruct the LLM in Korean.
Use wording close to:
"이 JSON은 하루 연구 기록입니다. 이 내용을 과장 없이 사람이 읽기 좋은 연구일지 형태로 정리해주세요. 실제 기록만 기반으로 작성하고 존재하지 않는 결과는 추측하지 마세요. 모든 문장은 '입니다.' 체로 작성하세요."

rules:
Must include exactly these principles in Korean:

1. 의미 없는 날에는 기록을 생성하지 않는다.
2. 코드 diff를 그대로 복사하지 않는다.
3. 존재하지 않는 결과를 추측하지 않는다.
4. 모든 문장은 "입니다." 체로 작성한다.
5. 연구 맥락 없는 기술적 설명은 작성하지 않는다.
6. 추상적인 표현(예: 좋아졌다, 개선됐다)은 가능한 한 피한다.
7. 미래 예측을 사실처럼 작성하지 않는다.
8. 커밋 메시지를 그대로 복붙하지 않는다.
9. 실험이 없으면 "실험 실행 없음"으로 명시한다.
10. 새로운 연구 아이디어는 반드시 Key Ideas 섹션에 정리한다.
11. 코드 변경은 반드시 "아이디어 또는 연구 목적"과 연결해서 설명한다.
12. 과거 연구를 재해석하거나 추가 가정을 만들지 않는다.

research_intent:
A concise statement of the day's research direction inferred from notes, experiment file, and commit/file activity.
If it cannot be inferred safely, leave it empty rather than hallucinating.

research_topics:
List of main topics worked on that day.

key_ideas:
List only ideas actually supported by evidence from notes/experiment/commit context.

code_changes:
List of objects, for example:
[
  {
    "file": "path/to/file.py",
    "reason": "연구 목적과 연결된 간단한 설명입니다."
  }
]

today_commit_files:
Unique list of changed files from today's commits.

results:
List of observed results only.
If there was no experiment/result, include:
["실험 실행 없음"]

open_questions:
Open problems or unresolved questions evidenced by notes or activity.

next_actions:
Conservative candidate next steps inferred from existing evidence only.
Do not invent a long plan.
These should be short and practical.

knowledge_update:
List newly learned facts, lessons, or clarified understandings from the day.
If none are clearly supported, use an empty list.

confidence_level:
- high: when notes/experiments clearly describe the work
- medium: when evidence is partial but enough
- low: when only weak commit/file evidence exists

source_evidence:
Must document what sources were used.

================================
8. MARKDOWN OUTPUT SPEC
================================

Generate:

daily_logs/YYYY-MM-DD.md

This file must be human-readable and written in Korean.
Technical terms like parameter, threshold, FFT, mel spectrogram may remain in English.

Use this structure:

# Daily Research Log - YYYY-MM-DD

## One-line Summary
...

## Research Intent
...

## What I Worked On
...

## Key Ideas
...

## Code Changes
...

## Results / Findings
...

## How These Results Can Be Used
...

## Problems / Open Questions
...

## Next Actions
...

## Knowledge Update
...

## Referenced Files
...

Markdown writing rules:
- Write in "입니다." style only
- At least about 15 meaningful lines when a log is generated
- Do not inflate content to make it longer
- If there is not enough meaningful content, skip log generation instead
- Do not paste raw diffs
- Do not paste commit messages verbatim in bulk
- Do not invent results
- Code changes must be explained as supporting the research direction
- Emphasize research context more than low-level development detail

If there is no experiment result, write:
"실험 실행 없음"

================================
9. PROJECT CONTEXT FILE
================================

Create project_context.json if it does not exist.

Use a reasonable default template like:

{
  "project_name": "Heart Sound Analysis",
  "goal": "Detect murmur and abnormal heart sounds from PCG data",
  "data_type": "PCG heart sound",
  "sampling_rate": 4000,
  "framework": "TensorFlow",
  "language": "Python",
  "notes": "This file stores stable project-level context and should be edited manually as the project evolves."
}

Do not duplicate full project_context into every daily JSON.
Instead reference it using:
"project_context_ref": "project_context.json"

================================
10. NOTES AND EXPERIMENT FILE HANDLING
================================

Notes file:
notes/daily_raw/YYYY-MM-DD.md

- optional
- if present, read as UTF-8
- trim whitespace
- ignore if effectively empty

Experiment file:
experiments/YYYY-MM-DD.json

- optional
- if present, parse safely
- ignore malformed JSON gracefully
- do not crash entire workflow because of malformed experiment file
- if malformed, record that experiment file was unreadable in logs or source_evidence if useful

Experiment JSON is optional and may vary slightly.
Be tolerant.

================================
11. IMPLEMENTATION REQUIREMENTS
================================

Implement scripts/generate_daily_log.py with clear functions, for example:

- load_project_context(...)
- get_today_date_kst(...)
- get_today_commits(...)
- get_changed_files_from_commits(...)
- read_optional_note(...)
- read_optional_experiment(...)
- is_meaningful_day(...)
- infer_research_intent(...)
- build_structured_json(...)
- build_markdown_log(...)
- write_json(...)
- write_markdown(...)
- main()

Use subprocess to call git commands.

The script must work both:
- locally
- in GitHub Actions

Use robust error handling.
Fail only for real system issues, not for missing optional note/experiment files.

================================
12. GIT COMMAND EXPECTATIONS
================================

Use git to gather today's commits.

A practical approach is acceptable, for example using:
- git log
- git show --name-only
- date filtering

Be careful with date range handling and timezone.
Prefer a simple, maintainable approach over a perfect but fragile one.

================================
13. GITHUB ACTIONS WORKFLOW
================================

Create .github/workflows/daily_research_log.yml

Requirements:
- run on push
- run on schedule at 23:00
- setup Python
- checkout full history if needed
- run the script
- if new files changed, commit and push them back

The workflow should avoid infinite loops if possible.
Implement a reasonable safeguard, such as:
- ignore workflow-generated commit message
or
- skip when the actor/commit message indicates auto-generated log commit

Use a commit message such as:
"chore: update daily research log"

================================
14. INFINITE LOOP PREVENTION
================================

This is important.

Because the workflow commits generated files, it may retrigger itself.

Prevent that.
Use one or more of:
- commit message guard
- path filtering
- actor check

Implement something practical and readable.

================================
15. QUALITY PRIORITIES
================================

Prioritize:
1. no hallucination
2. skip meaningless days
3. conservative summaries
4. maintainable code
5. clean file structure

Do NOT try to sound smart.
Do NOT over-summarize weak evidence.
Do NOT create fake research conclusions.

================================
16. EXAMPLES OF DESIRED BEHAVIOR
================================

Example A:
- commits today exist
- note file exists with research ideas
- experiment exists
=> generate JSON and markdown

Example B:
- one tiny commit touching only formatting
- no note
- no experiment
=> skip generation

Example C:
- no commit
- detailed note exists
=> generation is allowed

================================
17. WHAT TO DO RIGHT NOW
================================

Do all of the following:

1. Inspect the current repository structure.
2. Create missing directories/files.
3. Implement scripts/generate_daily_log.py.
4. Implement .github/workflows/daily_research_log.yml.
5. Create project_context.json template if missing.
6. Make the system runnable immediately.
7. Add brief comments/docstrings where useful.
8. Do not ask the user unnecessary follow-up questions unless absolutely required.

If there is ambiguity, choose the most conservative implementation that respects the rules above.

Return a concise summary of:
- files created
- key logic decisions
- anything the user should manually edit first

Please implement this directly in the current repository.
"""