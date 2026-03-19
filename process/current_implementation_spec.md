# HeartSound Analysis Tool: Current Implemented Process and Feature Specification

Last updated: 2026-03-19

This document records the current implemented behavior of the Tool project under `/Users/ms/Desktop/Tool`.

It intentionally excludes discarded experiments, temporary trial logic, and historical missteps.
It describes only the functionality that is currently implemented in code.

## 1. Project Purpose

The project is a browser-based local analysis tool for two workspaces:

- `HeartSound`
- `ECG`

The primary current focus of the recent implementation is the `HeartSound` workflow, including:

- loading RS-score-based heart sound data
- visualizing S1/S2/S3/S4-related overlays
- linking wave audio playback
- extracting derived parameter values directly from the uploaded `data` file
- showing cycle-aware parameter values and graph annotations

## 2. Runtime and Entry Points

Top-level launcher commands:

- `./start`
  Starts frontend and backend locally.

- `./stop_dev.sh`
  Stops local frontend and backend processes.

- `./status_dev.sh`
  Prints launcher, frontend, backend, and share-tunnel status.

- `./health_dev.sh`
  Checks local app health.

- `./code`
  Generates a one-time numeric access code for access mode `code`.

- `./share`
  Starts a Cloudflare public tunnel for the frontend.
  Current behavior:
  - prints the public URL
  - stores the URL in the runtime share URL file
  - automatically copies the public URL to the macOS clipboard using `pbcopy`
  - if a share tunnel is already running, the existing URL is reprinted and re-copied

- `./stop_share.sh`
  Stops the public share tunnel.

## 3. Access and Authentication

The app supports two access modes:

- `open`
  No viewer code required.

- `code`
  A one-time numeric code is required.

Current default database behavior:

- default access mode is `code`
- default admin username is `ms`

Frontend admin UI supports:

- switching access mode between `open` and `code`
- generating a one-time access code

## 4. Workspace and File Roles

### 4.1 Workspaces

- `heartsound`
- `ecg`

### 4.2 File roles

Supported file roles:

- `data`
- `wave`
- `parameter`
- `unsupervised`

### 4.3 File role availability by workspace

Current visible tabs in the left file area:

- `HeartSound`:
  - `Data`
  - `Wave`
  - `Unsupervised`
  - `Parameter` tab is hidden in the sidebar for heartsound because the current parameter workflow is data-derived, not manually uploaded, even though backend support for heartsound parameter files still exists.

- `ECG`:
  - `Data`
  - `Wave`
  - `Parameter`
  - `Unsupervised`

### 4.4 Validation rules

HeartSound `data` files must contain:

- `Time_Index`
- `Amplitude`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

Wave files:

- `.wav` only

Unsupervised files must contain:

- `Cycle Num`
- `Cycle Start`
- `Cycle End`
- `Cluster`

## 5. Panel Layout and General UI Structure

The tool supports one-panel and two-panel modes.

Each panel contains:

- a panel header
- a chart area
- an optional parameter area below the chart

Panel header contents:

- panel title
- current assigned data filename
- linked `Wave`, `Parameter`, and `Unsupervised` file labels when available
- centered audio playback controls
- right-side panel action buttons

Panel action controls:

- `Default`
  Restores default visible series configuration.

- `Detail`
  Opens the series picker modal.

- parameter toggle button
  Shows or hides the parameter section.

- settings button
  Opens panel settings.

- reset button
  Resets the panel.

## 6. Series Visibility and Display Controls

### 6.1 Default visible series for HeartSound

Current default visible series:

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `S3 Candidates`
- `S4 Candidates`

Default hidden series:

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 6.2 Detail modal

The `Detail` button opens a modal for per-panel series visibility.

Behavior:

- contains a top-level `All` checkbox
- contains individual checkboxes for each visible series supported by the current workspace
- toggles series on or off without altering unrelated panel state

For HeartSound, the series list includes:

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `Show S3 Candidates`
- `Show S4 Candidates`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 6.3 Secondary axis behavior

For HeartSound, the right-side secondary axis is shown only when at least one RS score series is visible:

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

If all four are hidden, the secondary axis is hidden.

## 7. HeartSound Plot Behavior

HeartSound chart currently supports:

- amplitude waveform line
- RS score bar overlays
- S1 area overlay
- S2 area overlay
- S3 candidate overlay
- S4 candidate overlay
- selected cycle highlight overlay
- selected parameter measurement overlay
- unsupervised cycle overlay
- audio playhead overlay

## 8. S1 and S2 Area Detection

### 8.1 Source signals

S1 and S2 areas are built from the four RS-score channels:

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

### 8.2 Peak extraction

For each RS-score channel:

- the signal is segmented into contiguous regions where score is at least the threshold
- the best local peak is chosen per contiguous region

Current threshold:

- `15`

### 8.3 Area construction

For S1:

- pair `S1 start peaks` with the next compatible `S1 end peak`

For S2:

- pair `S2 start peaks` with the next compatible `S2 end peak`

Maximum allowed region width is derived from estimated cycle spacing:

- region width must not exceed `45%` of estimated cycle spacing

### 8.4 Overlap resolution

If an S1 area and an S2 area overlap:

- both are not kept
- the stronger one is retained
- strength is based on the stronger peak score inside the overlay

This produces non-overlapping resolved S1 and S2 area overlays.

### 8.5 Current visual styling

- `S1 Area`
  - green-toned translucent band

- `S2 Area`
  - red-toned translucent band

## 9. S3 and S4 Candidate Detection

S3 and S4 are currently treated as amplitude-based candidates, not as confirmed diagnoses.

### 9.1 Signal basis

Candidate detection uses:

- the currently displayed `Amplitude` signal
- already resolved `S1` and `S2` areas

### 9.2 Diastolic interpretation

Detection is built on the interval:

- `S2_end -> next_S1_start`

Current conceptual interpretation:

- `S3`
  early diastolic candidate after S2

- `S4`
  late diastolic candidate before the next S1

### 9.3 Current default timing windows

Current fixed windows:

- `S3`
  from `S2 + 120 ms` to `S2 + 200 ms`

- `S4`
  from `next S1 - 200 ms` to `next S1 - 80 ms`

Fallback diastolic-ratio windows:

- `S3`
  front part of diastole, roughly `18% -> 34%`

- `S4`
  late part of diastole, roughly `72% -> 88%`

### 9.4 Current candidate detection method

The current detector:

- smooths absolute amplitude
- estimates a robust amplitude scale
- computes deviations over local baseline
- requires a minimum duration
- merges nearby candidate fragments
- chooses the strongest candidate inside each window

Config currently used in frontend:

- fallback sample rate: `8000`
- smoothing window: `12 ms`
- minimum duration: `18 ms`
- merge distance: `20 ms`
- noise standard deviation multiplier: `2.4`
- minimum absolute threshold: `1e-4`
- candidate distance floor between S3 and S4: user-configurable, default `120 ms`
- S3 delta threshold ratio: default `0.10`
- S4 delta threshold ratio: default `0.10`

### 9.5 S3/S4 ordering normalization

After initial detection:

- S3 is forced to remain in the early half of diastole
- S4 is forced to remain in the late half of diastole
- if ordering is reversed, labels are normalized
- if S3 and S4 are too close, only the stronger candidate remains

### 9.6 Current S3/S4 visual styling

S3 and S4 are displayed as:

- red outlined boxes
- no interior fill
- white small label placed above the box

Current labels:

- `S3`
- `S4`

### 9.7 Visibility controls

The following series can be toggled:

- `Show S3 Candidates`
- `Show S4 Candidates`

Both are enabled by default.

### 9.8 Runtime tuning command

The search box supports the `/search` command for S3/S4 candidate thresholds:

- `/search`
  shows current S3/S4 settings

- `/search reset`
  resets candidate settings to default

- `/search s3=... s4=... gap=...`
  updates threshold ratios and minimum S3/S4 separation

## 10. Audio / Wave Workflow

### 10.1 Upload and linking

Wave files are uploaded through the `Wave` file role.

When a `data` file is assigned to a panel:

- matching `wave`
- matching `parameter`
- matching `unsupervised`

files are auto-linked using the existing filename-base matching rule.

### 10.2 Panel wave label

If a wave file is linked, the panel header shows:

- `Wave: <filename>`

### 10.3 Playback controls

The center of the panel header contains:

- back 5 seconds
- play / pause
- forward 5 seconds
- reset to 0 seconds
- slow-speed cycle button

Current speed options:

- `1x`
- `0.75x`
- `0.5x`
- `0.25x`

The speed button cycles through those values.

### 10.4 Playback behavior

Current implemented behavior:

- play / pause toggles the assigned wave file
- if the playhead is outside the visible graph range, play/pause first brings it into view
- rewind and forward seek by 5 seconds
- reset returns audio to `0s`
- reset also moves the graph viewport back to the origin
- if playback reaches the end:
  - audio resets to the start
  - graph viewport also resets to the start

### 10.5 Public wave serving

Backend exposes uploaded wave files through the file endpoint and serves them with `audio/wav` media type.

### 10.6 Playhead

The old red dotted marker is no longer used for playback.

Current playback indicator is a unified custom playhead overlay:

- red vertical line
- red round handle at the top

They move as one structure.

### 10.7 Playhead interaction

Current implemented interaction:

- the playhead moves during playback
- the handle can be dragged horizontally
- dragging updates audio current time
- audio seek operations move the playhead and the graph view together when needed

### 10.8 Graph follow behavior

Wave navigation and graph viewport are linked.

Implemented follow cases:

- play / pause visibility correction
- rewind
- forward
- reset
- end-of-track reset
- playhead drag

For cycle selection:

- selecting a cycle moves the graph viewport if the cycle is outside the current visible range

## 11. Parameter Panel Structure

### 11.1 General behavior

The lower panel section is the `Parameter window`.

It can be shown or hidden with the parameter toggle in the panel header.

It contains:

- cycle controls
- cycle highlight toggle
- unsupervised overlay toggle
- heartsound parameter sections or ECG parameter summary groups

The chart / parameter split is vertically resizable by dragging the horizontal split handle.

### 11.2 Header controls inside the parameter window

Current controls:

- `Cycle` checkbox
  toggles selected cycle highlight on the graph

- `Unsupervised` checkbox
  toggles unsupervised cycle overlay on the graph

- current row range text

### 11.3 Heartsound parameter layout

For heartsound, the parameter UI is custom and currently divided into top-level sections:

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

In addition:

- `HR` is displayed separately next to the cycle selector instead of appearing as a normal metric card inside the section list

### 11.4 HR card

Current HR display:

- label: `HR`
- value example: `72 bpm`
- separate card to the right of cycle controls
- visually emphasized using a distinct highlighted color theme

The HR card is clickable and participates in graph measurement annotation.

### 11.5 Parameter card content

Each heartsound parameter card currently shows:

- metric label
- current selected cycle value
- unit inline beside the value when applicable

Current values do not show min-max range bars or gauges.

### 11.6 Hover tooltip explanation

Parameter cards now support hover tooltips.

Tooltip contents:

- short title
- short plain-language measurement summary
- small schematic string

Current tooltip style:

- dark floating box
- shown on hover or focus
- also available on the `HR` card

### 11.7 Current tooltip wording style

Tooltip wording is intentionally short.

Examples:

- `S1 start ~ S1 end`
- `S1 peak ~ S2 peak`
- `peak 50% height contiguous width`

## 12. Current Derived HeartSound Parameter Extraction

HeartSound parameters are currently derived directly from the `data` file rather than requiring a separate uploaded parameter file.

### 12.1 Sampling assumptions

Current backend assumptions:

- `SamplingRate = 4000 Hz`
- `1 sample = 0.25 ms`
- amplitude signal unit = `mV`

### 12.2 Derived column families

Current derived families:

- S1 parameters
- S2 parameters
- S1/S2 relation parameters
- RS Peak parameters
- RS Width parameters
- RS STD parameters
- Heart Rate

### 12.3 S1 parameter columns

Current extracted columns:

- `S1_Duration_ms`
- `S1_Peak_mV`
- `S1_mean_mV`
- `S1_RMS_mV`
- `S1_Area_mVms`
- `S1_Middle_ms`
- `S1_S_centroid_pct`
- `S1_E_centroid_pct`

Current formulas:

- `Duration`
  `(S1_end - S1_start) * 0.25`

- `Peak`
  `max(abs(x[S1_start:S1_end]))`

- `Mean`
  `mean(abs(x[S1_start:S1_end]))`

- `RMS`
  `sqrt(mean(x^2))`

- `Area`
  `sum(abs(x)) * 0.25`

- `Middle`
  midpoint of start and end, converted to ms

- `Start centroid percent`
  bias of weighted centroid toward the start half

- `End centroid percent`
  bias of weighted centroid toward the end half

### 12.4 S2 parameter columns

Current extracted columns:

- `S2_Duration_ms`
- `S2_Peak_mV`
- `S2_mean_mV`
- `S2_RMS_mV`
- `S2_Area_mVms`
- `S2_Middle_ms`
- `S2_S_centroid_pct`
- `S2_E_centroid_pct`

Formulas mirror the S1 calculation pattern.

### 12.5 S1/S2 relation parameter columns

Current extracted columns:

- `S1_S_to_S2_S_ms`
- `S1_E_to_S2_S_ms`
- `S1_mid_to_S2_mid_ms`
- `S1_E_to_S2_E_ms`
- `S1_S_to_S2_E_ms`
- `S1_peak_to_S2_peak_ms`

These describe inter-event distances between:

- starts
- ends
- midpoints
- local absolute peaks

### 12.6 Heart rate

Current extracted column:

- `HeartRate_bpm`

Current formula:

- `60000 / (next_S1_start - S1_start in ms)`

### 12.7 RS Peak parameter columns

Current extracted columns:

- `S1S_RS_Peak`
- `S1E_RS_Peak`
- `S2S_RS_Peak`
- `S2E_RS_Peak`

Meaning:

- the raw RS-score value at the selected representative event index

### 12.8 RS Width parameter columns

Current extracted columns:

- `S1S_RS_Width_ms`
- `S1E_RS_Width_ms`
- `S2S_RS_Width_ms`
- `S2E_RS_Width_ms`

Meaning:

- the contiguous width around the selected event peak where RS score stays above 50% of peak height

### 12.9 RS STD parameter columns

Current extracted columns:

- `S1S_RS_STD`
- `S1E_RS_STD`
- `S2S_RS_STD`
- `S2E_RS_STD`

Meaning:

- weighted temporal spread standard deviation around the event peak

Current local window:

- `+-80 samples`
- equivalent to `+-20 ms` at `4000 Hz`

## 13. Cycle Definition and Cycle Validation

### 13.1 Current cycle definition

A valid cycle is currently defined as:

- current `S1_start`
- current `S1_end`
- matched `S2_start`
- matched `S2_end`
- next `S1_start`

In words:

- cycle `n` starts at `S1_start(n)`
- cycle `n` ends at `next_S1_start(n)`

### 13.2 Required ordering rule

A cycle is considered valid only if:

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

This rule is now explicitly enforced.

### 13.3 S2 matching rule

For each S1:

- the tool searches forward for the first S2 whose:
  - `S2_start` is after `S1_end`
  - `S2_end` is after `S2_start`
  - `S2_end` is before `next_S1_start`

### 13.4 Last-cycle behavior

If the final S1 has no following valid S2 and no following S1:

- the last row may exist in the derived frame
- but it is not considered a valid cycle for the main cycle list shown to the user

### 13.5 Cycle list shown in the UI

Current behavior:

- the cycle selector now uses the full list of valid cycles for the file
- it is no longer restricted to the currently visible graph page
- when the parameter summary is refreshed, the currently visible graph range is used only to choose the default selected cycle

### 13.6 Cycle highlight on the chart

When the `Cycle` checkbox is enabled:

- the selected cycle is shown as an outlined box on the chart

Current styling:

- no fill
- strong outline
- label `Cycle`

The selected cycle uses:

- `startIndex = current S1_start`
- `endIndex = next_S1_start`

## 14. Parameter-to-Graph Measurement Annotation

Clicking a heartsound parameter card creates a graph annotation similar in spirit to the unsupervised measurement style.

Current implemented behavior by metric type:

- `S1_*`
  shows the S1 range

- `S2_*`
  shows the S2 range

- `S1-S2 relation`
  shows the measured interval between the corresponding landmarks

- `HeartRate_bpm`
  shows the current cycle-to-next-cycle interval

- `RS Peak`
  shows the selected RS event point

- `RS Width`
  shows the 50%-height width bounds around the selected RS event peak

- `RS STD`
  shows the local RS spread window

The selected metric card gets an active state.

## 15. Unsupervised Overlay Behavior

Unsupervised data can be linked to a panel.

Current behavior:

- unsupervised cycles are loaded for the visible range
- an `Unsupervised` checkbox in the parameter header toggles graph overlay visibility
- unsupervised overlays remain distinct from selected cycle and parameter measurement overlays

## 16. Keyboard Behavior

Current implemented keyboard behavior:

- `ArrowLeft`
  moves the graph range left

- `ArrowRight`
  moves the graph range right

- `[` 
  moves to the previous cycle in the current heartsound panel

- `]`
  moves to the next cycle in the current heartsound panel

Cycle keyboard navigation:

- uses the current full cycle list
- updates selected cycle
- also moves the graph viewport if the selected cycle is outside the visible graph range

Arrow navigation:

- shifts graph range by a fixed step
- delays heavier linked summary refresh until movement settles

## 17. Graph Range and Viewport Behavior

Current implemented range features:

- panel keeps current `rangeStart` and `rangeEnd`
- parameter and unsupervised summaries are linked to the visible graph range
- when a cycle is selected and it is outside the visible viewport, the viewport recenters so the cycle becomes visible

For full-resolution heartsound playback:

- full-resolution data can be kept in memory
- the chart viewport can be moved without always refetching plot data

## 18. Sharing Behavior

The public share flow currently works as follows:

1. `./share` verifies frontend availability.
2. It resolves or downloads `cloudflared`.
3. It starts a detached tunnel process.
4. It waits for a `trycloudflare.com` URL.
5. It stores the URL in the runtime share URL file.
6. It prints the URL in the terminal.
7. It copies the URL to the clipboard automatically on macOS.

If a share tunnel is already running:

- the stored share URL is reprinted
- the same URL is copied to the clipboard again

## 19. File Storage and Persistence

Current storage locations:

- uploaded files:
  `/Users/ms/Desktop/Tool/backend/storage/uploads`

- metadata database:
  `/Users/ms/Desktop/Tool/backend/storage/heartsound.db`

- launcher runtime files:
  `/Users/ms/Desktop/Tool/.launcher`

Metadata persisted for uploaded files includes:

- original filename
- stored filename
- workspace kind
- file role
- extension
- row count
- file size
- upload timestamp

## 20. Current HeartSound Derived-Parameter Summary Source Rule

For heartsound panels:

- the parameter window is fed from the active `data` file
- not from a manually uploaded heartsound parameter file

That means:

- assigning a heartsound `data` file is enough to populate the parameter window
- the panel still retains linked file labels, but the actual heartsound parameter summary source is the derived data summary

## 21. Current Visual Semantics Summary

### 21.1 Main categories

- `Amplitude`
  main waveform

- `S1 Area`
  resolved S1 region

- `S2 Area`
  resolved S2 region

- `S3`
  candidate box

- `S4`
  candidate box

- `Cycle`
  selected cycle box

- `Parameter annotation`
  selected metric measurement range or point

- `Wave playhead`
  current audio position

### 21.2 Parameter sections

- `S1`
- `S2`
- `S1-S2`
- `RS Score`
- `HR` shown separately beside cycle controls

## 22. Current Scope Boundaries

The following are implemented:

- heartsound data upload
- wave upload and playback
- auto-linking support files
- S1/S2 area detection
- S3/S4 candidate detection
- cycle-aware parameter extraction
- parameter cards and graph annotations
- cycle navigation
- keyboard cycle navigation
- public share URL generation with clipboard copy

The following are not part of the current derived-parameter implementation:

- frequency-domain parameter extraction
- pathology labeling
- confirmed S3/S4 diagnosis
- ECG-driven S3/S4 validation
- arbitrary user-defined parameter formulas from UI

## 23. Recommended Reference Files

Main frontend implementation:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

Main backend implementation:

- `backend/app/services/plot_data_service.py`
- `backend/app/services/file_service.py`
- `backend/app/services/auth_service.py`
- `backend/app/db.py`

Launcher and sharing:

- `scripts/share.sh`
- `scripts/common.sh`

Top-level usage:

- `README.md`

