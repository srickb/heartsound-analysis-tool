# Product Requirements Document (PRD)

Project: HeartSound Analysis Tool  
Location: `/Users/ms/Desktop/Tool`  
Document status: Derived from the current repository state on 2026-03-19  
Authoring basis: Source code, launcher scripts, docs, process notes, and adjacent repository folders

## 1. Executive Summary

The Tool project is a local-first browser application for reviewing and analyzing biomedical signal files, with a strong current emphasis on heart sound analysis and a secondary ECG workspace.

At its current stage, the product combines:

- file upload and file-role management
- synchronized signal visualization
- RS-score-guided heart sound event visualization
- data-derived parameter extraction for heart sound cycles
- optional wave playback synchronized with chart navigation
- unsupervised cycle overlay review
- local/private access control plus temporary public sharing

The repository also includes an adjacent research-log automation subsystem and idea/spec folders that inform future product direction.

The product is best understood as:

- a research and review workstation
- a clinician/researcher-facing signal inspection UI
- a local launcher with optional public sharing
- a growing foundation for richer parameter extraction, documentation, and reproducible workflows

## 2. Product Context

### 2.1 Why this product exists

The product addresses the need to:

- inspect heart sound and ECG data interactively
- link raw signal, derived metrics, and audio playback in one workspace
- review cycle-level events such as S1, S2, and candidate late/early diastolic abnormalities
- avoid switching between spreadsheets, plotting scripts, audio players, and notebooks
- support iterative research workflows locally without cloud dependency

### 2.2 Current product posture

The current product is not a generalized medical platform or a cloud SaaS system.
It is currently a local workstation-style application with selective sharing and admin access control.

### 2.3 Product maturity

Current maturity is best described as:

- implemented and usable for local research workflows
- feature-rich in the HeartSound inspection path
- still evolving in naming, reporting, and higher-level workflow formalization
- partially supported by historical documents that include earlier concepts outside the current codebase

## 3. Repository-Level Product Inventory

This PRD reflects the full Tool repository, not only the currently visible UI.

### 3.1 Top-level folders and roles

- `frontend/`
  Product UI, interaction logic, chart orchestration, playback control, modals, and per-panel state handling.

- `backend/`
  API, file ingestion, validation, plot preparation, parameter derivation, auth state, and SQLite persistence.

- `scripts/`
  Launcher, health, share, code generation, and process management scripts.

- `docs/`
  Project-facing documentation. Some files reflect earlier or adjacent concepts; they remain relevant as product context but not always as exact implementation truth.

- `Auto_Github/`
  Research-log automation subsystem for generating daily project logs. This is product-adjacent rather than a core end-user runtime feature.

- `ideas/`
  Design and calculation idea notes for future or evolving parameter systems and automation concepts.

- `process/`
  Generated process and product documentation folder. This PRD lives here.

- `.launcher/`
  Runtime state and launcher artifacts such as logs, PID files, tunnel URL file, and bundled helpers.

## 4. Product Vision

The long-term product vision implied by the repository is:

> A local-first biomedical signal analysis workspace that lets a researcher or operator upload structured signal files, inspect event-aligned waveform behavior, review cycle-level derived parameters, align optional audio, and preserve research context with minimal operational friction.

## 5. Primary Product Goals

### 5.1 Current goals

- Support practical HeartSound data review from uploaded RS-score signal files.
- Make S1/S2 event structure visible without requiring custom scripts.
- Provide cycle-level derived metrics directly from the data file.
- Allow chart review and wave playback in one panel.
- Let users review unsupervised cycle overlays in the same workspace.
- Keep the tool easy to run locally.
- Provide temporary public access when needed.

### 5.2 Secondary goals

- Maintain an ECG workspace using the same application shell.
- Preserve a path for human-readable and machine-readable research logs.
- Keep the system understandable and modifiable by a single researcher or small team.

## 6. Non-Goals

The current repository does not support, and this PRD does not assume:

- diagnostic-grade medical decision support
- automatic pathology confirmation
- cloud multi-user collaboration
- enterprise identity management
- remote persistence beyond local files and SQLite
- end-to-end ML training inside the UI
- arbitrary no-code parameter authoring by end users

## 7. Target Users

### 7.1 Primary users

- heart sound researchers
- biomedical signal analysts
- prototype tool operators
- data reviewers comparing event candidates, derived metrics, and audio

### 7.2 Secondary users

- ECG reviewers using the same launcher and panel framework
- developers maintaining or extending the repository
- researchers who want daily research-log generation through repository evidence

## 8. Core Product Pillars

The repository currently supports four main pillars.

### 8.1 Data ingestion and validation

Users can upload structured files in defined roles and receive validation before using them in the interface.

### 8.2 Interactive chart review

Users can inspect amplitude data, RS-score signals, event areas, cycle highlights, and measurement overlays.

### 8.3 Parameter understanding

Users can view cycle-level derived parameters and click them to see the graph context from which they were calculated.

### 8.4 Audio-context alignment

Users can attach a wave file to a signal record and navigate the graph using playback controls and a draggable playhead.

## 9. Product Scope by Folder

### 9.1 `frontend/` product scope

This folder implements the end-user application.

Current responsibilities:

- workspace switching
- split-panel layout
- file-role sidebar
- chart rendering
- parameter panel rendering
- series visibility controls
- admin/access UI
- wave playback controls
- cycle navigation
- chart overlays and graph annotations
- interaction state and fetch orchestration

### 9.2 `backend/` product scope

This folder implements the local service layer.

Current responsibilities:

- file upload validation
- file metadata persistence
- parameter summary generation
- plot data preparation
- heartsound derived parameter extraction
- auth and access mode support
- wave file serving

### 9.3 `scripts/` product scope

This folder implements local operational workflows.

Current responsibilities:

- start/stop local stack
- health check
- status reporting
- one-time access code helper
- public share tunnel creation
- clipboard copy of the public URL

### 9.4 `docs/` product scope

This folder contains human-facing documentation and design traces.

Role in product:

- onboarding and launcher guidance
- historical design direction
- adjacent or earlier specification context

### 9.5 `Auto_Github/` product scope

This subsystem is not a direct runtime UI feature.
It supports the research process around the product.

Current capabilities:

- generate human-readable daily markdown logs
- generate structured JSON research logs
- derive logs from commits, notes, and experiments

### 9.6 `ideas/` product scope

This folder captures future product logic and evolving design intent, especially around parameter extraction and automation.

It is currently best treated as:

- future design reference
- low-confidence roadmap input
- not the source of truth for shipped behavior

## 10. Core User Flows

### 10.1 Local startup flow

1. User runs `./start`.
2. Backend and frontend start locally.
3. User opens the UI locally.
4. Access mode determines whether immediate entry or one-time code entry is required.

### 10.2 HeartSound analysis flow

1. User selects the `HeartSound` workspace.
2. User uploads a `data` file.
3. User optionally uploads matching `wave` and `unsupervised` files.
4. User assigns the `data` file to a panel.
5. The panel auto-links support files when naming matches.
6. The chart renders amplitude plus available overlays.
7. The parameter window shows derived cycle parameters.
8. User selects cycles and metrics to inspect graph context.
9. User optionally uses wave playback to review audio-aligned behavior.

### 10.3 Public review flow

1. User runs `./share`.
2. The system generates a public URL.
3. The public URL is copied to the clipboard.
4. If access mode is `code`, the user also generates a one-time code.
5. An external reviewer can access the UI while the local share tunnel remains active.

### 10.4 Daily research log flow

1. Researcher works in the repository during the day.
2. Optional notes and experiment files are created.
3. The automation script reads repository activity.
4. Daily markdown and structured JSON logs are generated when the day is meaningful.

## 11. Product Functional Requirements

### 11.1 Workspace management

The product must:

- support at least `HeartSound` and `ECG` workspaces
- preserve panel state per panel
- allow switching active workspace through the UI

### 11.2 File-role management

The product must:

- support `data`, `wave`, `parameter`, and `unsupervised` file roles
- validate files based on workspace and role
- persist file metadata locally
- show uploaded files in the sidebar
- allow linking files to panels

### 11.3 Auto-linking

When a `data` file is assigned to a panel, the product should:

- find matching `wave`
- find matching `parameter`
- find matching `unsupervised`

based on existing filename-base matching logic.

### 11.4 Chart rendering

The product must render:

- amplitude waveform
- optional RS-score series
- derived overlay regions
- selected cycle highlight
- parameter measurement overlays
- unsupervised cycle overlays
- audio playhead

### 11.5 Parameter visibility

The product must allow:

- showing or hiding the parameter section
- selecting cycles
- selecting a parameter card
- seeing the graph measurement for the selected parameter

### 11.6 Audio playback

The product must allow:

- play / pause
- seek backward 5 seconds
- seek forward 5 seconds
- reset to 0 seconds
- slow playback rates
- draggable playhead seeking

### 11.7 Sharing

The product must support:

- local startup
- local health/status visibility
- one-time code generation
- public URL generation through a tunnel
- clipboard copy of the URL on macOS

## 12. HeartSound-Specific Requirements

### 12.1 Accepted HeartSound input

HeartSound `data` files must contain:

- `Time_Index`
- `Amplitude`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

These inputs form the basis for all current heartsound runtime behavior.

### 12.2 RS-score event visualization

The product must support:

- event-bar visualization for RS-score channels
- independent toggles per event series
- hiding the secondary axis when no RS-score series are visible

### 12.3 S1/S2 area generation

The product must construct S1 and S2 areas by:

- thresholding RS-score signals
- selecting local representative peaks
- pairing compatible start/end peaks
- limiting unreasonable region width
- resolving S1/S2 overlap conflicts

### 12.4 S3/S4 candidate support

The product must support:

- amplitude-based candidate detection only
- no confirmed pathology claims
- early diastolic S3 candidate windows
- late diastolic S4 candidate windows
- runtime threshold tuning using the search box
- graph display as strong outlined boxes

## 13. Cycle Model Requirements

### 13.1 Valid cycle definition

The current product requires a valid cycle to satisfy:

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

This rule is central to:

- parameter extraction
- cycle selection
- cycle highlight display
- HR calculation

### 13.2 Cycle list behavior

The product should expose the full list of valid cycles for the file, not only cycles that overlap the current graph page.

The default selected cycle should still prefer the one overlapping the visible viewport when available.

### 13.3 Cycle navigation

Users should be able to move cycles using:

- on-screen previous/next buttons
- keyboard shortcuts:
  - `[` previous cycle
  - `]` next cycle

### 13.4 Cycle viewport synchronization

If a selected cycle is outside the visible graph range:

- the graph viewport should move so the cycle becomes visible

## 14. Derived Parameter Requirements

### 14.1 Current parameter source policy

For HeartSound, the product currently derives parameters directly from the `data` file.
The main parameter workflow does not depend on uploading a separate parameter file.

### 14.2 S1 parameter requirements

The current product stores:

- duration
- peak
- mean absolute amplitude
- RMS
- area
- middle
- start centroid percent
- end centroid percent

### 14.3 S2 parameter requirements

The current product stores the S2 analogs of the S1 metric set.

### 14.4 S1/S2 relation requirements

The current product stores interval and relation metrics between:

- start and start
- end and start
- midpoint and midpoint
- end and end
- start and end
- local absolute peak and local absolute peak

### 14.5 Heart rate requirement

The product stores `HeartRate_bpm` from current S1 start to next S1 start.

### 14.6 RS event parameter requirements

The product stores:

- RS Peak
- RS Width
- RS STD

for:

- S1 start
- S1 end
- S2 start
- S2 end

### 14.7 Invalid computation policy

Where parameter calculation is not valid:

- values must be stored as `NaN`
- the product must not coerce invalid values to `0`

## 15. Parameter UI Requirements

### 15.1 Section structure

The heartsound parameter window must present separate sections for:

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

The `HR` display is intentionally separate from these sections.

### 15.2 Card design

Each metric card should show:

- metric name
- current value
- unit

The UI should remain compact and readable.

### 15.3 Hover help

Each heartsound metric card should provide:

- a short explanatory tooltip
- a simple schematic
- language that is concise rather than narrative

### 15.4 Click-to-measure behavior

Clicking a parameter should show where the measurement comes from on the chart.

This requirement is satisfied by:

- range annotations
- point annotations
- RS-window visual annotations

## 16. Wave UI Requirements

### 16.1 Header-centered controls

Wave playback controls must appear centered in the panel header.

### 16.2 Control set

Required controls:

- back 5 seconds
- play/pause
- forward 5 seconds
- reset to origin
- playback-rate selector

### 16.3 Playhead interaction

The playhead must:

- track playback time
- support drag-seek
- behave as a unified line-plus-handle structure

### 16.4 View synchronization

Wave navigation should coordinate with graph viewport state.

## 17. Admin and Access Requirements

The product must support:

- viewing current access mode
- changing access mode
- generating one-time viewer access codes

Access mode choices:

- `open`
- `code`

## 18. Research Logging Requirements

Although not part of the main visual analysis runtime, the repository includes a research-log automation module.

The PRD records it as a secondary product capability.

Current subsystem goals:

- generate daily markdown logs
- generate structured daily JSON logs
- infer meaningful work from commits, notes, and experiment files
- avoid generating logs for meaningless days

This subsystem should remain:

- deterministic
- local/repository-based
- easy to inspect
- not dependent on paid services

## 19. Documentation Requirements

The repository should maintain:

- launcher documentation
- usage documentation
- implementation and process documents
- product documentation under `process/`

The current docs folder contains mixed recency and some legacy references.
This should be treated as a documentation hygiene opportunity rather than a functional blocker.

## 20. Non-Functional Requirements

### 20.1 Local-first operation

The product should run fully on a local machine without cloud service dependency for core analysis.

### 20.2 Maintainability

Key product behavior should remain understandable from:

- frontend source
- backend source
- launcher scripts
- repository documentation

### 20.3 Responsiveness

The UI should remain usable when:

- chart ranges change frequently
- playback is active
- parameter and unsupervised overlays are linked to the current viewport

### 20.4 Safety

The product should fail conservatively:

- no speculative diagnosis
- invalid parameter states become `NaN`
- absent files do not crash the app

### 20.5 Portability

The current launcher assumes a local development environment and includes macOS conveniences such as `pbcopy`.
Cross-platform behavior is partially supported, but macOS remains a first-class path in the current implementation.

## 21. Dependencies and Infrastructure

### 21.1 Frontend stack

- React
- TypeScript
- Vite
- ECharts

### 21.2 Backend stack

- FastAPI
- pandas
- openpyxl
- SQLite

### 21.3 Runtime helpers

- local shell scripts
- `cloudflared` for sharing
- `pbcopy` for clipboard copy on macOS

## 22. Current Risks and Limitations

### 22.1 Documentation drift

Some repository docs appear to include older naming or earlier project direction.

### 22.2 Full-resolution playback memory pressure

The current playback strategy may keep full-resolution data available for smoother navigation, which can raise memory usage on large files.

### 22.3 HeartSound-first bias

The current product is significantly more developed in the HeartSound path than in the ECG path.

### 22.4 Parameter breadth

The current derived HeartSound parameter set is practical but not exhaustive.
Ideas in `ideas/Parameter.py` indicate a broader future roadmap not yet implemented.

### 22.5 Legacy folder ambiguity

Some files in `docs/` and `ideas/` are informative rather than authoritative.

## 23. Product Success Indicators

This repository does not currently define formal analytics, but practical success can be evaluated through:

- successful local startup without manual debugging
- successful upload and linking of HeartSound records
- accurate cycle-aware parameter display
- usable synchronized wave playback
- understandable graph annotations from parameter clicks
- stable public sharing flow when needed
- maintainable research logging output

## 24. Roadmap Themes Implied by the Repository

The repository suggests several future product directions.

### 24.1 Short-term likely directions

- richer HeartSound parameter extraction
- improved parameter naming and explanation
- further UI refinement for cycle and measurement review
- documentation consolidation

### 24.2 Medium-term possible directions

- broader statistical and shape-based parameter families
- more advanced S3/S4 candidate review workflows
- stronger ECG integration parity
- export/reporting improvements

### 24.3 Adjacent research-process directions

- stronger daily research logging
- reproducible experiment metadata patterns
- tighter alignment between notes, commits, and generated summaries

## 25. Open Areas With Limited Confidence

The following areas are not fully specified in the current repository and should be treated as lightly defined:

- formal external user personas beyond research/operator use
- long-term deployment model beyond local launcher plus ad hoc sharing
- formal roadmap ordering across HeartSound, ECG, and automation subsystems
- explicit business or regulatory objectives
- exact intended lifecycle for legacy docs/spec files

## 26. Recommended Next Documentation Outputs

To complement this PRD, the repository should ideally maintain:

- a concise user guide focused only on current behavior
- a system architecture note
- an API surface note for backend endpoints
- a derived-parameter math appendix for HeartSound
- a launcher operations note

## 27. Source Basis for This PRD

This PRD was derived from:

- top-level launcher scripts
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `backend/app/services/file_service.py`
- `backend/app/services/plot_data_service.py`
- `backend/app/services/auth_service.py`
- `backend/app/db.py`
- `README.md`
- `docs/`
- `Auto_Github/`
- `ideas/`

## 28. Final Product Statement

The Tool repository currently represents a local biomedical signal review product centered on HeartSound analysis, with synchronized charting, derived cycle parameters, optional audio playback, selective sharing, and a strong emphasis on inspectable research workflows.

Its current strength is not generic platform breadth, but an unusually integrated local workflow for signal review, event reasoning, cycle-based metrics, and research process capture.

