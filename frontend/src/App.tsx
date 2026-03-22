import {
  type ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import type { EChartsOption, SeriesOption } from "echarts";
import ReactECharts from "echarts-for-react";

type SplitMode = 1 | 2 | 4;
type PanelId = 1 | 2 | 3 | 4;
type HealthStatus = "checking" | "connected" | "failed";
type PlotMode = "overview" | "range";
type FileRole = "data" | "parameter" | "unsupervised" | "wave";
type EcgMarkerMode = "major" | "point";
type SeriesKey =
  | "amplitude"
  | "s1Area"
  | "s2Area"
  | "s3Candidates"
  | "s4Candidates"
  | "s1Start"
  | "s1End"
  | "s2Start"
  | "s2End"
  | "majorPs"
  | "majorPe"
  | "majorQrss"
  | "majorQrse"
  | "majorTs"
  | "pointPs";
type AccessMode = "open" | "code";
type WorkspaceKind = "heartsound" | "ecg";
type ViewMode = "analysis" | "labeling";
type PanelLinkedFileRole = Extract<FileRole, "parameter" | "unsupervised" | "wave">;

interface VisibleSeries {
  amplitude: boolean;
  s1Area: boolean;
  s2Area: boolean;
  s3Candidates: boolean;
  s4Candidates: boolean;
  s1Start: boolean;
  s1End: boolean;
  s2Start: boolean;
  s2End: boolean;
  majorPs: boolean;
  majorPe: boolean;
  majorQrss: boolean;
  majorQrse: boolean;
  majorTs: boolean;
  pointPs: boolean;
}

interface SeriesDescriptor {
  key: SeriesKey;
  label: string;
  color: string;
  fillColor?: string;
  borderColor?: string;
}

interface PanelStyleOptions {
  amplitudeLineWidth: number;
  rsBarOpacity: number;
  yAxisAutoScale: boolean;
  ecgMarkerMode: EcgMarkerMode;
}

interface PanelState {
  panelId: PanelId;
  workspaceKind: WorkspaceKind;
  fileId: string | null;
  fileName: string | null;
  waveFileId: string | null;
  waveFileName: string | null;
  parameterFileId: string | null;
  parameterFileName: string | null;
  unsupervisedFileId: string | null;
  unsupervisedFileName: string | null;
  showParameterSummary: boolean;
  showSelectedCycleHighlight: boolean;
  showUnsupervisedOverlay: boolean;
  totalRows: number | null;
  previousRangeStart: number | null;
  previousRangeEnd: number | null;
  rangeStart: number;
  rangeEnd: number;
  visibleSeries: VisibleSeries;
  styleOptions: PanelStyleOptions;
  chartNoteMarkers: ChartNoteMarker[];
}

type ChartNoteMarkerKey = "q" | "w" | "e" | "r";

interface ChartNoteMarker {
  id: string;
  index: number;
  keyTag: ChartNoteMarkerKey;
}

interface UploadedFileMetadata {
  fileId: string;
  originalName: string;
  relativePath: string | null;
  workspaceKind: WorkspaceKind;
  fileRole: FileRole;
  extension: string;
  uploadedAt: string;
  rowCount: number;
  fileSizeBytes: number;
}

interface UploadResult {
  uploaded: UploadedFileMetadata[];
  errors: Array<{ fileName: string; message: string }>;
  ignored: Array<{ fileName: string; message: string }>;
}

interface PlotDataPayload {
  fileId: string;
  workspaceKind: WorkspaceKind;
  originalRowCount: number;
  returnedPointCount: number;
  startIndex: number;
  endIndex: number;
  isDownsampled: boolean;
  x: number[];
  amplitude: number[];
  s1Start: number[];
  s1End: number[];
  s2Start: number[];
  s2End: number[];
  majorPs: number[];
  majorPe: number[];
  majorQrss: number[];
  majorQrse: number[];
  majorTs: number[];
  pointPs: number[];
  pointPe: number[];
  pointQrss: number[];
  pointQrse: number[];
  pointTs: number[];
}

interface PanelPlotState {
  overview: PlotDataPayload | null;
  current: PlotDataPayload | null;
  loading: boolean;
  error: string | null;
}

interface ParameterMetricSummary {
  key: string;
  label: string;
  description?: string | null;
  unit?: string | null;
  mean: number;
  min: number;
  max: number;
}

interface ParameterSummaryGroup {
  key: string;
  label: string;
  description?: string | null;
  metrics: ParameterMetricSummary[];
}

interface ParameterSummaryCycle {
  cycleIndex: number;
  startIndex: number;
  endIndex: number;
  groups: ParameterSummaryGroup[];
}

interface HeartsoundParameterSection {
  key: string;
  title: string;
  subtitle: string;
  toneClassName: string;
  groups: ParameterSummaryGroup[];
  metrics: ParameterMetricSummary[];
}

interface ParameterSummaryPayload {
  fileId: string;
  workspaceKind: WorkspaceKind;
  fileRole: FileRole;
  rowCount: number;
  startIndex: number;
  endIndex: number;
  groups: ParameterSummaryGroup[];
  cycles?: ParameterSummaryCycle[];
}

interface PanelParameterState {
  summary: ParameterSummaryPayload | null;
  selectedCycleIndex: number | null;
  selectedMetricKey: string | null;
  loading: boolean;
  error: string | null;
}

interface UnsupervisedCycleAnnotation {
  cycleNumber: number;
  startIndex: number;
  endIndex: number;
  cluster: string;
}

interface UnsupervisedSummaryPayload {
  fileId: string;
  workspaceKind: WorkspaceKind;
  fileRole: FileRole;
  rowCount: number;
  startIndex: number;
  endIndex: number;
  cycles: UnsupervisedCycleAnnotation[];
}

interface PanelUnsupervisedState {
  summary: UnsupervisedSummaryPayload | null;
  loading: boolean;
  error: string | null;
}

interface PrefetchedRangeEntry {
  fileId: string;
  start: number;
  end: number;
  payload: PlotDataPayload | null;
  pending: boolean;
}

type PrefetchedRangeStore = Partial<Record<PanelId, Record<string, PrefetchedRangeEntry>>>;

interface SettingsDraft {
  rangeStart: string;
  rangeEnd: string;
  amplitudeLineWidth: string;
  rsBarOpacity: string;
  yAxisAutoScale: boolean;
  ecgMarkerMode: EcgMarkerMode;
}

interface AuthState {
  accessMode: AccessMode;
  adminUsername: string | null;
  hasAdminPassword: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface HeartsoundCandidateSettings {
  s3DeltaThresholdRatio: number;
  s4DeltaThresholdRatio: number;
  s3S4MinGapMs: number;
}

interface AppState {
  splitMode: SplitMode;
  activePanelId: PanelId;
  activeFileRole: FileRole;
  panels: PanelState[];
  panelPlots: Record<PanelId, PanelPlotState>;
  panelParameters: Record<PanelId, PanelParameterState>;
  panelUnsupervised: Record<PanelId, PanelUnsupervisedState>;
  filesByWorkspace: Record<WorkspaceKind, UploadedFileMetadata[]>;
  filesLoadingByWorkspace: Record<WorkspaceKind, boolean>;
  uploadingByWorkspace: Record<WorkspaceKind, boolean>;
  heartsoundCandidateSettings: HeartsoundCandidateSettings;
  searchText: string;
  statusMessage: string;
  selectedDeleteIds: string[];
}

interface PanelCardProps {
  workspaceKind: WorkspaceKind;
  panel: PanelState;
  plotState: PanelPlotState;
  parameterState: PanelParameterState;
  unsupervisedState: PanelUnsupervisedState;
  heartsoundCandidateSettings: HeartsoundCandidateSettings;
  isActive: boolean;
  onActivate: (panelId: PanelId) => void;
  onToggleParameterSummary: (panelId: PanelId) => void;
  onToggleSelectedCycleHighlight: (panelId: PanelId) => void;
  onToggleUnsupervisedOverlay: (panelId: PanelId) => void;
  onOpenSeriesPicker: (panelId: PanelId) => void;
  onResetDisplayDefaults: (panelId: PanelId) => void;
  onOpenSettings: (panelId: PanelId) => void;
  onResetPanel: (panelId: PanelId) => void;
  onSliderRangeCommit: (
    panelId: PanelId,
    start: number,
    end: number,
    forceFetch?: boolean,
    skipLinkedFetch?: boolean
  ) => void;
  onPrefetchRange: (panelId: PanelId, start: number, end: number) => void;
  onSelectCycle: (panelId: PanelId, cycleIndex: number) => void;
  onSelectParameterMetric: (panelId: PanelId, metricKey: string) => void;
  onDownloadParameterExport: (panelId: PanelId) => void;
  onDownloadLabelingExport: (panelId: PanelId) => void;
  onClearLabelingMarkers: (panelId: PanelId) => void;
  onSelectLabelingAnchor: (panelId: PanelId, index: number) => void;
  onAddLabelingMarker: (panelId: PanelId, index: number, keyTag: ChartNoteMarkerKey) => void;
  isLabelingMode: boolean;
  labelingAnchorIndex: number | null;
  isParameterExporting: boolean;
  isLabelingExporting: boolean;
}

type DataPair = [number, number];

interface HeartsoundRegionOverlay {
  label: "S1" | "S2" | "S3" | "S4";
  startPeak: DataPair;
  endPeak: DataPair;
  areaStart: number;
  areaEnd: number;
  centerIndex?: number;
  peakPoint?: DataPair;
  fillColor: string;
  borderColor: string;
}

interface HeartsoundCycleMeasurementContext {
  s1Overlay: HeartsoundRegionOverlay | null;
  s2Overlay: HeartsoundRegionOverlay | null;
  nextS1Overlay: HeartsoundRegionOverlay | null;
}

interface ParameterMeasurementAnnotation {
  key: string;
  label: string;
  color: string;
  kind: "range" | "point";
  startIndex: number;
  endIndex: number;
}

interface HeartsoundParameterTooltipContent {
  title: string;
  summary: string;
  schematic: string;
}

const PANEL_IDS_BY_MODE: Record<SplitMode, PanelId[]> = {
  1: [1],
  2: [1, 2],
  4: [1, 2]
};

const SPLIT_BUTTONS: SplitMode[] = [1, 2];

const HEARTSOUND_SERIES_ITEMS: SeriesDescriptor[] = [
  { key: "amplitude", label: "Amplitude", color: "#79c0ff" },
  {
    key: "s1Area",
    label: "S1 Area",
    color: "rgba(46, 160, 67, 0.42)",
    fillColor: "rgba(46, 160, 67, 0.14)",
    borderColor: "rgba(46, 160, 67, 0.42)"
  },
  {
    key: "s2Area",
    label: "S2 Area",
    color: "rgba(248, 81, 73, 0.38)",
    fillColor: "rgba(248, 81, 73, 0.13)",
    borderColor: "rgba(248, 81, 73, 0.38)"
  },
  {
    key: "s3Candidates",
    label: "Show S3 Candidates",
    color: "rgba(255, 230, 0, 0.99)",
    fillColor: "rgba(255, 230, 0, 0.40)",
    borderColor: "rgba(255, 230, 0, 0.98)"
  },
  {
    key: "s4Candidates",
    label: "Show S4 Candidates",
    color: "rgba(0, 245, 255, 0.99)",
    fillColor: "rgba(0, 245, 255, 0.34)",
    borderColor: "rgba(0, 245, 255, 0.96)"
  },
  { key: "s1Start", label: "S1-Start_RS_Score", color: "#2ea043" },
  { key: "s1End", label: "S1-End_RS_Score", color: "#d29922" },
  { key: "s2Start", label: "S2-Start_RS_Score", color: "#db6d28" },
  { key: "s2End", label: "S2-End_RS_Score", color: "#f85149" }
];

const CHART_NOTE_MARKER_STYLES: Record<ChartNoteMarkerKey, { label: string; color: string }> = {
  q: { label: "Q", color: "#ff4d6d" },
  w: { label: "W", color: "#ff9f1c" },
  e: { label: "E", color: "#00d1ff" },
  r: { label: "R", color: "#a855f7" }
};

const ECG_SERIES_COLORS = {
  amplitude: "#79c0ff",
  majorPs: "#00c853",
  majorPe: "#2979ff",
  majorQrss: "#ff6d00",
  majorQrse: "#aa00ff",
  majorTs: "#00bcd4",
  pointPs: "#ff1744",
  pointPe: "#00b0ff",
  pointQrss: "#ffab00",
  pointQrse: "#d500f9",
  pointTs: "#1de9b6"
} as const;

const ECG_SERIES_ITEMS_BY_MODE: Record<EcgMarkerMode, SeriesDescriptor[]> = {
  major: [
    { key: "amplitude", label: "raw", color: ECG_SERIES_COLORS.amplitude },
    { key: "majorPs", label: "major_ps", color: ECG_SERIES_COLORS.majorPs },
    { key: "majorPe", label: "major_pe", color: ECG_SERIES_COLORS.majorPe },
    { key: "majorQrss", label: "major_qrss", color: ECG_SERIES_COLORS.majorQrss },
    { key: "majorQrse", label: "major_qrse", color: ECG_SERIES_COLORS.majorQrse },
    { key: "majorTs", label: "major_ts", color: ECG_SERIES_COLORS.majorTs }
  ],
  point: [
    { key: "amplitude", label: "raw", color: ECG_SERIES_COLORS.amplitude },
    { key: "majorPs", label: "point_ps", color: ECG_SERIES_COLORS.pointPs },
    { key: "majorPe", label: "point_pe", color: ECG_SERIES_COLORS.pointPe },
    { key: "majorQrss", label: "point_qrss", color: ECG_SERIES_COLORS.pointQrss },
    { key: "majorQrse", label: "point_qrse", color: ECG_SERIES_COLORS.pointQrse },
    { key: "majorTs", label: "point_ts", color: ECG_SERIES_COLORS.pointTs }
  ]
};

const DEFAULT_VISIBLE_SERIES: VisibleSeries = {
  amplitude: true,
  s1Area: true,
  s2Area: true,
  s3Candidates: true,
  s4Candidates: true,
  s1Start: false,
  s1End: false,
  s2Start: false,
  s2End: false,
  majorPs: false,
  majorPe: false,
  majorQrss: false,
  majorQrse: false,
  majorTs: false,
  pointPs: false
};

const DEFAULT_STYLE_OPTIONS: PanelStyleOptions = {
  amplitudeLineWidth: 1.6,
  rsBarOpacity: 0.9,
  yAxisAutoScale: true,
  ecgMarkerMode: "point"
};

const FILE_ROLE_TABS: Array<{ key: FileRole; label: string }> = [
  { key: "data", label: "Data" },
  { key: "wave", label: "Wave" },
  { key: "parameter", label: "Parameter" },
  { key: "unsupervised", label: "Unsupervised" }
];

const getAvailableFileRoleTabs = (
  workspaceKind: WorkspaceKind
): Array<{ key: FileRole; label: string }> =>
  workspaceKind === "heartsound"
    ? FILE_ROLE_TABS.filter((tab) => tab.key !== "parameter")
    : FILE_ROLE_TABS;
const FILE_NAME_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

const createDefaultPanelState = (panelId: PanelId, workspaceKind?: WorkspaceKind): PanelState => ({
  panelId,
  workspaceKind:
    workspaceKind ?? (panelId === 2 ? "ecg" : "heartsound"),
  fileId: null,
  fileName: null,
  waveFileId: null,
  waveFileName: null,
  parameterFileId: null,
  parameterFileName: null,
  unsupervisedFileId: null,
  unsupervisedFileName: null,
  showParameterSummary: true,
  showSelectedCycleHighlight: false,
  showUnsupervisedOverlay: false,
  totalRows: null,
  previousRangeStart: null,
  previousRangeEnd: null,
  rangeStart: 0,
  rangeEnd: 0,
  visibleSeries: { ...DEFAULT_VISIBLE_SERIES },
  styleOptions: { ...DEFAULT_STYLE_OPTIONS },
  chartNoteMarkers: []
});

const createEmptyPlotState = (): PanelPlotState => ({
  overview: null,
  current: null,
  loading: false,
  error: null
});

const createEmptyParameterState = (): PanelParameterState => ({
  summary: null,
  selectedCycleIndex: null,
  selectedMetricKey: null,
  loading: false,
  error: null
});

const createEmptyUnsupervisedState = (): PanelUnsupervisedState => ({
  summary: null,
  loading: false,
  error: null
});

const INITIAL_PANELS: PanelState[] = [
  createDefaultPanelState(1, "heartsound"),
  createDefaultPanelState(2, "ecg"),
  createDefaultPanelState(3, "heartsound"),
  createDefaultPanelState(4, "ecg")
];

const INITIAL_AUTH_STATE: AuthState = {
  accessMode: "open",
  adminUsername: "ms",
  hasAdminPassword: false,
  isAuthenticated: true,
  isAdmin: false
};

const PANEL_TARGET_POINTS = 2400;
const HEARTSOUND_INITIAL_RANGE_SIZE = 30000;
const ECG_INITIAL_RANGE_SIZE = 1000;
const RS_SCORE_AXIS_MIN = 0;
const HEARTSOUND_SECONDARY_AXIS_MAX = 100;
const HEARTSOUND_REGION_THRESHOLD = 15;
const ECG_SECONDARY_AXIS_MAX = 30;
const ECG_POINT_SECONDARY_AXIS_MAX = 1;
const HEARTSOUND_RS_BAR_WIDTH = 0.9;
const ECG_BAR_WIDTH = 1.8;
const RAW_SERIES_Z = 1;
const BAR_SERIES_Z = 3;
const PANEL_SPLIT_HANDLE_HEIGHT = 10;
const MIN_CHART_SECTION_HEIGHT = 220;
const MIN_PARAMETER_SECTION_HEIGHT = 160;
const PLAYHEAD_HANDLE_TOP = 21;
const PLAYHEAD_PIXEL_OFFSET = 0.5;
const SEARCH_COMMAND_PREFIX = "/search";
const AUTO_ADVANCE_PREFETCH_RATIO = 0.12;
const AUTO_ADVANCE_PREFETCH_MIN_ROWS = 240;
const KEYBOARD_RANGE_COMMIT_DEBOUNCE_MS = 180;
const HEARTSOUND_CANDIDATE_SAMPLE_RATE_FALLBACK = 8000;
const HEARTSOUND_CANDIDATE_MIN_WINDOW_MULTIPLIER = 2;
const QUICK_RANGE_SHIFT_STEP = 30000;
const ECG_RANGE_SHIFT_STEP = 200;
const KEYBOARD_RANGE_SHIFT_STEP = 3000;

const DEFAULT_HEARTSOUND_CANDIDATE_SETTINGS: HeartsoundCandidateSettings = {
  s3DeltaThresholdRatio: 0.10,
  s4DeltaThresholdRatio: 0.10,
  s3S4MinGapMs: 120
};

const HEARTSOUND_CANDIDATE_CONFIG = {
  fallbackSampleRate: HEARTSOUND_CANDIDATE_SAMPLE_RATE_FALLBACK,
  smoothingWindowMs: 12,
  minDurationMs: 18,
  mergeDistanceMs: 20,
  noiseStdMultiplier: 2.4,
  minimumAbsoluteThreshold: 1e-4,
  s3: {
    label: "S3" as const,
    offsetStartMs: 120,
    offsetEndMs: 200,
    fallbackStartRatio: 0.18,
    fallbackEndRatio: 0.34,
    fillColor: "rgba(255, 77, 79, 0)",
    borderColor: "rgba(255, 77, 79, 0.98)"
  },
  s4: {
    label: "S4" as const,
    offsetStartMs: 200,
    offsetEndMs: 80,
    fallbackStartRatio: 0.72,
    fallbackEndRatio: 0.88,
    fillColor: "rgba(255, 77, 79, 0)",
    borderColor: "rgba(255, 77, 79, 0.98)"
  }
};
const QUICK_RANGE_PRESETS = [15000, 30000, 50000] as const;
const WORKSPACE_TABS: Array<{ key: WorkspaceKind; label: string; title: string; emptyLabel: string }> = [
  {
    key: "heartsound",
    label: "HeartSound",
    title: "HeartSound Analysis Tool",
    emptyLabel: "No uploaded heart sound files"
  },
  {
    key: "ecg",
    label: "ECG",
    title: "ECG Analysis Tool",
    emptyLabel: "No uploaded ECG files"
  }
];

const createAppState = (): AppState => ({
  splitMode: 1,
  activePanelId: 1,
  activeFileRole: "data",
  panels: INITIAL_PANELS.map((panel) => ({
    ...panel,
    visibleSeries: { ...panel.visibleSeries },
    styleOptions: { ...panel.styleOptions }
  })),
  panelPlots: {
    1: createEmptyPlotState(),
    2: createEmptyPlotState(),
    3: createEmptyPlotState(),
    4: createEmptyPlotState()
  },
  panelParameters: {
    1: createEmptyParameterState(),
    2: createEmptyParameterState(),
    3: createEmptyParameterState(),
    4: createEmptyParameterState()
  },
  panelUnsupervised: {
    1: createEmptyUnsupervisedState(),
    2: createEmptyUnsupervisedState(),
    3: createEmptyUnsupervisedState(),
    4: createEmptyUnsupervisedState()
  },
  filesByWorkspace: {
    heartsound: [],
    ecg: []
  },
  filesLoadingByWorkspace: {
    heartsound: false,
    ecg: false
  },
  uploadingByWorkspace: {
    heartsound: false,
    ecg: false
  },
  heartsoundCandidateSettings: { ...DEFAULT_HEARTSOUND_CANDIDATE_SETTINGS },
  searchText: "",
  statusMessage: "",
  selectedDeleteIds: []
});

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toDataPairs = (xValues: number[], yValues: number[]) =>
  xValues.map((x, index) => [x, yValues[index] ?? 0] as DataPair);

const extractSegmentPeaks = (pairs: DataPair[], threshold: number): DataPair[] => {
  const peaks: DataPair[] = [];
  let bestPair: DataPair | null = null;
  let activeLength = 0;

  for (const pair of pairs) {
    if (!Number.isFinite(pair[1]) || pair[1] < threshold) {
      if (bestPair && activeLength > 0) {
        peaks.push(bestPair);
      }
      bestPair = null;
      activeLength = 0;
      continue;
    }

    activeLength += 1;
    if (bestPair === null || pair[1] > bestPair[1]) {
      bestPair = pair;
    }
  }

  if (bestPair && activeLength > 0) {
    peaks.push(bestPair);
  }

  return peaks;
};

const estimatePeakSpacing = (peaks: DataPair[]): number | null => {
  if (peaks.length < 2) {
    return null;
  }

  const spacings = peaks
    .slice(1)
    .map((peak, index) => peak[0] - peaks[index][0])
    .filter((spacing) => Number.isFinite(spacing) && spacing > 0)
    .sort((left, right) => left - right);

  if (spacings.length === 0) {
    return null;
  }

  return spacings[Math.floor(spacings.length / 2)] ?? null;
};

const buildHeartsoundRegionOverlays = (
  label: "S1" | "S2",
  startPairs: DataPair[],
  endPairs: DataPair[],
  fillColor: string,
  borderColor: string
): HeartsoundRegionOverlay[] => {
  const startPeaks = extractSegmentPeaks(startPairs, HEARTSOUND_REGION_THRESHOLD);
  const endPeaks = extractSegmentPeaks(endPairs, HEARTSOUND_REGION_THRESHOLD);
  if (startPeaks.length === 0 || endPeaks.length === 0) {
    return [];
  }

  const cycleSpacing =
    estimatePeakSpacing(startPeaks) ??
    estimatePeakSpacing(endPeaks) ??
    4000;
  const maxRegionWidth = Math.max(1, Math.floor(cycleSpacing * 0.45));

  const overlays: HeartsoundRegionOverlay[] = [];
  let endPeakIndex = 0;

  for (let index = 0; index < startPeaks.length; index += 1) {
    const startPeak = startPeaks[index];
    const nextStartX = startPeaks[index + 1]?.[0] ?? Number.POSITIVE_INFINITY;

    while (endPeakIndex < endPeaks.length && endPeaks[endPeakIndex][0] <= startPeak[0]) {
      endPeakIndex += 1;
    }

    const endPeak = endPeaks[endPeakIndex];
    if (!endPeak) {
      break;
    }
    if (endPeak[0] >= nextStartX) {
      continue;
    }

    const regionWidth = endPeak[0] - startPeak[0];
    if (regionWidth <= 0 || regionWidth > maxRegionWidth) {
      continue;
    }

    overlays.push({
      label,
      startPeak,
      endPeak,
      areaStart: startPeak[0],
      areaEnd: endPeak[0],
      fillColor,
      borderColor
    });
    endPeakIndex += 1;
  }

  return overlays;
};

const getHeartsoundRegionOverlayScore = (overlay: HeartsoundRegionOverlay): number =>
  Math.max(overlay.startPeak[1] ?? 0, overlay.endPeak[1] ?? 0);

const overlapsHeartsoundRegionOverlay = (
  left: HeartsoundRegionOverlay,
  right: HeartsoundRegionOverlay
): boolean => left.areaStart <= right.areaEnd && right.areaStart <= left.areaEnd;

const resolveOverlappingHeartsoundRegionOverlays = (
  s1Overlays: HeartsoundRegionOverlay[],
  s2Overlays: HeartsoundRegionOverlay[]
): { s1Overlays: HeartsoundRegionOverlay[]; s2Overlays: HeartsoundRegionOverlay[] } => {
  const orderedOverlays = [...s1Overlays, ...s2Overlays].sort((left, right) => {
    if (left.areaStart !== right.areaStart) {
      return left.areaStart - right.areaStart;
    }
    return getHeartsoundRegionOverlayScore(right) - getHeartsoundRegionOverlayScore(left);
  });

  const resolvedOverlays: HeartsoundRegionOverlay[] = [];
  for (const overlay of orderedOverlays) {
    const previous = resolvedOverlays[resolvedOverlays.length - 1];
    if (!previous || previous.label === overlay.label || !overlapsHeartsoundRegionOverlay(previous, overlay)) {
      resolvedOverlays.push(overlay);
      continue;
    }

    if (getHeartsoundRegionOverlayScore(overlay) > getHeartsoundRegionOverlayScore(previous)) {
      resolvedOverlays[resolvedOverlays.length - 1] = overlay;
    }
  }

  return {
    s1Overlays: resolvedOverlays.filter((overlay) => overlay.label === "S1"),
    s2Overlays: resolvedOverlays.filter((overlay) => overlay.label === "S2")
  };
};

const msToSampleCount = (durationMs: number, sampleRate: number): number =>
  Math.max(1, Math.round((durationMs / 1000) * sampleRate));

const estimatePointStep = (xValues: number[]): number => {
  if (xValues.length < 2) {
    return 1;
  }

  const diffs: number[] = [];
  for (let index = 1; index < xValues.length; index += 1) {
    const diff = xValues[index] - xValues[index - 1];
    if (Number.isFinite(diff) && diff > 0) {
      diffs.push(diff);
    }
  }

  if (diffs.length === 0) {
    return 1;
  }

  diffs.sort((left, right) => left - right);
  return Math.max(1, Math.round(diffs[Math.floor(diffs.length / 2)] ?? 1));
};

const sampleValues = (values: number[], maxSamples = 4096): number[] => {
  if (values.length <= maxSamples) {
    return values.slice();
  }

  const step = Math.max(1, Math.floor(values.length / maxSamples));
  const sampled: number[] = [];
  for (let index = 0; index < values.length; index += step) {
    sampled.push(values[index]);
  }
  return sampled;
};

const getPercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = values
    .filter((value) => Number.isFinite(value))
    .slice()
    .sort((left, right) => left - right);
  if (sorted.length === 0) {
    return 0;
  }

  const safePercentile = clampNumber(percentile, 0, 1);
  const position = (sorted.length - 1) * safePercentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lowerValue = sorted[lowerIndex] ?? sorted[sorted.length - 1];
  const upperValue = sorted[upperIndex] ?? lowerValue;
  if (lowerIndex === upperIndex) {
    return lowerValue;
  }

  const ratio = position - lowerIndex;
  return lowerValue + (upperValue - lowerValue) * ratio;
};

const getMean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  let total = 0;
  let count = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    total += value;
    count += 1;
  }

  return count > 0 ? total / count : 0;
};

const getStandardDeviation = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const mean = getMean(values);
  let total = 0;
  let count = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    total += (value - mean) ** 2;
    count += 1;
  }

  return count > 0 ? Math.sqrt(total / count) : 0;
};

const smoothAbsoluteAmplitude = (values: number[], radiusPoints: number): number[] => {
  if (values.length === 0) {
    return [];
  }

  const safeRadius = Math.max(1, radiusPoints);
  const prefix: number[] = new Array(values.length + 1).fill(0);
  for (let index = 0; index < values.length; index += 1) {
    prefix[index + 1] = prefix[index] + Math.abs(values[index] ?? 0);
  }

  return values.map((_value, index) => {
    const start = Math.max(0, index - safeRadius);
    const end = Math.min(values.length - 1, index + safeRadius);
    const sum = prefix[end + 1] - prefix[start];
    const width = end - start + 1;
    return width > 0 ? sum / width : 0;
  });
};

const findIndexAtOrAfter = (xValues: number[], target: number): number | null => {
  let left = 0;
  let right = xValues.length - 1;
  let result: number | null = null;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const value = xValues[middle];
    if (value >= target) {
      result = middle;
      right = middle - 1;
    } else {
      left = middle + 1;
    }
  }

  return result;
};

const findIndexAtOrBefore = (xValues: number[], target: number): number | null => {
  let left = 0;
  let right = xValues.length - 1;
  let result: number | null = null;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const value = xValues[middle];
    if (value <= target) {
      result = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return result;
};

const getRobustAmplitudeScale = (amplitudeValues: number[]): number => {
  const sampledAbsValues = sampleValues(amplitudeValues.map((value) => Math.abs(value)));
  const p50 = getPercentile(sampledAbsValues, 0.5);
  const p90 = getPercentile(sampledAbsValues, 0.9);
  return Math.max(p90 - p50, HEARTSOUND_CANDIDATE_CONFIG.minimumAbsoluteThreshold);
};

const resolveHeartsoundSampleRate = (
  rowCount: number | null,
  durationSeconds: number | null,
  fallbackSampleRate: number
): number => {
  if (
    rowCount !== null &&
    rowCount > 0 &&
    durationSeconds !== null &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
  ) {
    return Math.max(1, Math.round(rowCount / durationSeconds));
  }

  return fallbackSampleRate;
};

const resolveDiastolicCandidateWindow = (
  candidateKind: "S3" | "S4",
  diastoleStart: number,
  diastoleEnd: number,
  currentS2End: number,
  nextS1Start: number,
  sampleRate: number
): { start: number; end: number } | null => {
  if (diastoleEnd <= diastoleStart) {
    return null;
  }

  const diastolicLength = diastoleEnd - diastoleStart;
  const minimumWindowLength = msToSampleCount(
    HEARTSOUND_CANDIDATE_CONFIG.minDurationMs * HEARTSOUND_CANDIDATE_MIN_WINDOW_MULTIPLIER,
    sampleRate
  );
  const config =
    candidateKind === "S3" ? HEARTSOUND_CANDIDATE_CONFIG.s3 : HEARTSOUND_CANDIDATE_CONFIG.s4;

  const defaultWindow =
    candidateKind === "S3"
      ? {
          start: currentS2End + msToSampleCount(config.offsetStartMs, sampleRate),
          end: currentS2End + msToSampleCount(config.offsetEndMs, sampleRate)
        }
      : {
          start: nextS1Start - msToSampleCount(config.offsetStartMs, sampleRate),
          end: nextS1Start - msToSampleCount(config.offsetEndMs, sampleRate)
        };

  const clippedDefaultStart = clampNumber(defaultWindow.start, diastoleStart, diastoleEnd);
  const clippedDefaultEnd = clampNumber(defaultWindow.end, clippedDefaultStart, diastoleEnd);
  if (clippedDefaultEnd - clippedDefaultStart >= minimumWindowLength) {
    return {
      start: clippedDefaultStart,
      end: clippedDefaultEnd
    };
  }

  const fallbackStart = diastoleStart + Math.floor(diastolicLength * config.fallbackStartRatio);
  const fallbackEnd = diastoleStart + Math.floor(diastolicLength * config.fallbackEndRatio);
  const clippedFallbackStart = clampNumber(fallbackStart, diastoleStart, diastoleEnd);
  const clippedFallbackEnd = clampNumber(fallbackEnd, clippedFallbackStart, diastoleEnd);
  if (clippedFallbackEnd - clippedFallbackStart < minimumWindowLength) {
    return null;
  }

  return {
    start: clippedFallbackStart,
    end: clippedFallbackEnd
  };
};

const detectHeartsoundCandidateInWindow = (
  candidateKind: "S3" | "S4",
  xValues: number[],
  amplitudeValues: number[],
  diastolicStart: number,
  diastolicEnd: number,
  windowStart: number,
  windowEnd: number,
  sampleRate: number,
  globalAmplitudeScale: number,
  settings: HeartsoundCandidateSettings
): HeartsoundRegionOverlay | null => {
  const diastolicStartIndex = findIndexAtOrAfter(xValues, diastolicStart);
  const diastolicEndIndex = findIndexAtOrBefore(xValues, diastolicEnd);
  const startIndex = findIndexAtOrAfter(xValues, windowStart);
  const endIndex = findIndexAtOrBefore(xValues, windowEnd);
  if (
    diastolicStartIndex === null ||
    diastolicEndIndex === null ||
    diastolicEndIndex <= diastolicStartIndex ||
    startIndex === null ||
    endIndex === null ||
    endIndex <= startIndex
  ) {
    return null;
  }

  const diastolicAmplitude = amplitudeValues.slice(diastolicStartIndex, diastolicEndIndex + 1);
  const xWindow = xValues.slice(startIndex, endIndex + 1);
  const amplitudeWindow = amplitudeValues.slice(startIndex, endIndex + 1);
  if (diastolicAmplitude.length < 3 || xWindow.length < 3 || amplitudeWindow.length < 3) {
    return null;
  }

  const diastolicXWindow = xValues.slice(diastolicStartIndex, diastolicEndIndex + 1);
  const pointStep = estimatePointStep(diastolicXWindow);
  const smoothingRadiusPoints = Math.max(
    1,
    Math.round(msToSampleCount(HEARTSOUND_CANDIDATE_CONFIG.smoothingWindowMs, sampleRate) / pointStep)
  );
  const mergeDistancePoints = Math.max(
    1,
    Math.round(msToSampleCount(HEARTSOUND_CANDIDATE_CONFIG.mergeDistanceMs, sampleRate) / pointStep)
  );
  const minimumDurationSamples = msToSampleCount(HEARTSOUND_CANDIDATE_CONFIG.minDurationMs, sampleRate);
  const smoothedDiastolicEnvelope = smoothAbsoluteAmplitude(diastolicAmplitude, smoothingRadiusPoints);
  const localBaseline = getPercentile(sampleValues(smoothedDiastolicEnvelope), 0.3);
  const diastolicDeviations = smoothedDiastolicEnvelope.map((value) => Math.max(0, value - localBaseline));
  const localNoiseStd = getStandardDeviation(diastolicDeviations);
  const windowOffset = startIndex - diastolicStartIndex;
  const smoothedEnvelope = smoothedDiastolicEnvelope.slice(
    windowOffset,
    windowOffset + amplitudeWindow.length
  );
  const deviations = smoothedEnvelope.map((value) => Math.max(0, value - localBaseline));
  const deltaThresholdRatio =
    candidateKind === "S3"
      ? settings.s3DeltaThresholdRatio
      : settings.s4DeltaThresholdRatio;
  const threshold = Math.max(
    globalAmplitudeScale * deltaThresholdRatio,
    localNoiseStd * HEARTSOUND_CANDIDATE_CONFIG.noiseStdMultiplier,
    HEARTSOUND_CANDIDATE_CONFIG.minimumAbsoluteThreshold
  );

  const segments: Array<{ startIndex: number; endIndex: number }> = [];
  let activeSegmentStart: number | null = null;

  for (let index = 0; index < deviations.length; index += 1) {
    if (deviations[index] >= threshold) {
      if (activeSegmentStart === null) {
        activeSegmentStart = index;
      }
      continue;
    }

    if (activeSegmentStart !== null) {
      segments.push({ startIndex: activeSegmentStart, endIndex: index - 1 });
      activeSegmentStart = null;
    }
  }

  if (activeSegmentStart !== null) {
    segments.push({ startIndex: activeSegmentStart, endIndex: deviations.length - 1 });
  }

  if (segments.length === 0) {
    return null;
  }

  const mergedSegments: Array<{ startIndex: number; endIndex: number }> = [];
  for (const segment of segments) {
    const previous = mergedSegments[mergedSegments.length - 1];
    if (previous && segment.startIndex - previous.endIndex <= mergeDistancePoints) {
      previous.endIndex = segment.endIndex;
      continue;
    }
    mergedSegments.push({ ...segment });
  }

  let strongestCandidate: HeartsoundRegionOverlay | null = null;
  let strongestScore = Number.NEGATIVE_INFINITY;

  for (const segment of mergedSegments) {
    const startX = xWindow[segment.startIndex];
    const endX = xWindow[segment.endIndex];
    if (endX - startX < minimumDurationSamples) {
      continue;
    }

    let localPeakIndex = segment.startIndex;
    let localPeakScore = deviations[segment.startIndex] ?? 0;
    for (let index = segment.startIndex + 1; index <= segment.endIndex; index += 1) {
      const score = deviations[index] ?? 0;
      if (score > localPeakScore) {
        localPeakScore = score;
        localPeakIndex = index;
      }
    }

    if (localPeakScore <= strongestScore) {
      continue;
    }

    const config =
      candidateKind === "S3" ? HEARTSOUND_CANDIDATE_CONFIG.s3 : HEARTSOUND_CANDIDATE_CONFIG.s4;
    strongestScore = localPeakScore;
    strongestCandidate = {
      label: config.label,
      startPeak: [xWindow[segment.startIndex], amplitudeWindow[segment.startIndex] ?? 0],
      endPeak: [xWindow[segment.endIndex], amplitudeWindow[segment.endIndex] ?? 0],
      areaStart: startX,
      areaEnd: endX,
      centerIndex: xWindow[localPeakIndex],
      peakPoint: [xWindow[localPeakIndex], amplitudeWindow[localPeakIndex] ?? 0],
      fillColor: config.fillColor,
      borderColor: config.borderColor
    };
  }

  return strongestCandidate;
};

const retagHeartsoundCandidateOverlay = (
  overlay: HeartsoundRegionOverlay,
  candidateKind: "S3" | "S4"
): HeartsoundRegionOverlay => {
  const config =
    candidateKind === "S3" ? HEARTSOUND_CANDIDATE_CONFIG.s3 : HEARTSOUND_CANDIDATE_CONFIG.s4;

  return {
    ...overlay,
    label: config.label,
    fillColor: config.fillColor,
    borderColor: config.borderColor
  };
};

const normalizeHeartsoundCandidateOrdering = (
  s3Candidate: HeartsoundRegionOverlay | null,
  s4Candidate: HeartsoundRegionOverlay | null,
  diastoleStart: number,
  diastoleEnd: number
): { s3Candidate: HeartsoundRegionOverlay | null; s4Candidate: HeartsoundRegionOverlay | null } => {
  const diastoleMidpoint = diastoleStart + (diastoleEnd - diastoleStart) / 2;
  const s3Center = s3Candidate?.centerIndex ?? null;
  const s4Center = s4Candidate?.centerIndex ?? null;

  // Keep the final labels tied to time ordering within diastole:
  // S3 should stay in the early half, S4 in the late half.
  if (s3Candidate && s3Center !== null && s3Center > diastoleMidpoint) {
    if (!s4Candidate) {
      s4Candidate = retagHeartsoundCandidateOverlay(s3Candidate, "S4");
    }
    s3Candidate = null;
  }

  if (s4Candidate && s4Center !== null && s4Center < diastoleMidpoint) {
    if (!s3Candidate) {
      s3Candidate = retagHeartsoundCandidateOverlay(s4Candidate, "S3");
    }
    s4Candidate = null;
  }

  if (
    s3Candidate &&
    s4Candidate &&
    s3Candidate.centerIndex !== undefined &&
    s4Candidate.centerIndex !== undefined &&
    s3Candidate.centerIndex > s4Candidate.centerIndex
  ) {
    const previousS3Candidate = s3Candidate;
    s3Candidate = retagHeartsoundCandidateOverlay(s4Candidate, "S3");
    s4Candidate = retagHeartsoundCandidateOverlay(previousS3Candidate, "S4");
  }

  return { s3Candidate, s4Candidate };
};

// Build S3/S4 candidate overlays from S2_end -> next_S1_start using fixed early/late
// diastolic windows plus ratio fallback. This keeps the logic tied to the user's
// intended "S3 right after S2" and "S4 right before S1" definition.
const buildHeartsoundCandidateOverlays = (
  amplitudePairs: DataPair[],
  s1RegionOverlays: HeartsoundRegionOverlay[],
  s2RegionOverlays: HeartsoundRegionOverlay[],
  sampleRate: number,
  settings: HeartsoundCandidateSettings
): { s3Candidates: HeartsoundRegionOverlay[]; s4Candidates: HeartsoundRegionOverlay[] } => {
  if (amplitudePairs.length < 3 || s1RegionOverlays.length === 0 || s2RegionOverlays.length === 0) {
    return { s3Candidates: [], s4Candidates: [] };
  }

  const xValues = amplitudePairs.map((pair) => pair[0]);
  const amplitudeValues = amplitudePairs.map((pair) => pair[1]);
  const globalAmplitudeScale = getRobustAmplitudeScale(amplitudeValues);
  const minimumS3S4GapSamples = msToSampleCount(settings.s3S4MinGapMs, sampleRate);
  const sortedS1Overlays = s1RegionOverlays.slice().sort((left, right) => left.areaStart - right.areaStart);
  const sortedS2Overlays = s2RegionOverlays.slice().sort((left, right) => left.areaStart - right.areaStart);
  const s3Candidates: HeartsoundRegionOverlay[] = [];
  const s4Candidates: HeartsoundRegionOverlay[] = [];

  let nextS1Index = 0;
  for (const s2Overlay of sortedS2Overlays) {
    while (
      nextS1Index < sortedS1Overlays.length &&
      sortedS1Overlays[nextS1Index].areaStart <= s2Overlay.areaEnd
    ) {
      nextS1Index += 1;
    }

    const nextS1Overlay = sortedS1Overlays[nextS1Index];
    if (!nextS1Overlay) {
      break;
    }

    const diastoleStart = s2Overlay.areaEnd + 1;
    const diastoleEnd = nextS1Overlay.areaStart - 1;
    if (diastoleEnd <= diastoleStart) {
      continue;
    }

    const s3Window = resolveDiastolicCandidateWindow(
      "S3",
      diastoleStart,
      diastoleEnd,
      s2Overlay.areaEnd,
      nextS1Overlay.areaStart,
      sampleRate
    );
    const s4Window = resolveDiastolicCandidateWindow(
      "S4",
      diastoleStart,
      diastoleEnd,
      s2Overlay.areaEnd,
      nextS1Overlay.areaStart,
      sampleRate
    );

    let s3Candidate =
      s3Window
        ? detectHeartsoundCandidateInWindow(
            "S3",
            xValues,
            amplitudeValues,
            diastoleStart,
            diastoleEnd,
            s3Window.start,
            s3Window.end,
            sampleRate,
            globalAmplitudeScale,
            settings
          )
        : null;
    let s4Candidate =
      s4Window
        ? detectHeartsoundCandidateInWindow(
            "S4",
            xValues,
            amplitudeValues,
            diastoleStart,
            diastoleEnd,
            s4Window.start,
            s4Window.end,
            sampleRate,
            globalAmplitudeScale,
            settings
          )
        : null;

    const normalizedCandidates = normalizeHeartsoundCandidateOrdering(
      s3Candidate,
      s4Candidate,
      diastoleStart,
      diastoleEnd
    );
    s3Candidate = normalizedCandidates.s3Candidate;
    s4Candidate = normalizedCandidates.s4Candidate;

    if (
      s3Candidate &&
      s4Candidate &&
      s3Candidate.centerIndex !== undefined &&
      s4Candidate.centerIndex !== undefined &&
      Math.abs(s4Candidate.centerIndex - s3Candidate.centerIndex) < minimumS3S4GapSamples
    ) {
      const s3Width = Math.abs((s3Candidate.areaEnd - s3Candidate.areaStart) || 1);
      const s4Width = Math.abs((s4Candidate.areaEnd - s4Candidate.areaStart) || 1);
      const s3Strength = Math.abs((s3Candidate.peakPoint?.[1] ?? 0) - (s3Candidate.startPeak[1] ?? 0)) * s3Width;
      const s4Strength = Math.abs((s4Candidate.peakPoint?.[1] ?? 0) - (s4Candidate.startPeak[1] ?? 0)) * s4Width;
      if (s3Strength >= s4Strength) {
        s4Candidate = null;
      } else {
        s3Candidate = null;
      }
    }

    if (s3Candidate) {
      s3Candidates.push(s3Candidate);
    }
    if (s4Candidate) {
      s4Candidates.push(s4Candidate);
    }
  }

  return { s3Candidates, s4Candidates };
};

const formatHeartsoundCandidateSettings = (settings: HeartsoundCandidateSettings): string =>
  `S3=${settings.s3DeltaThresholdRatio.toFixed(3)} | S4=${settings.s4DeltaThresholdRatio.toFixed(3)} | Gap=${settings.s3S4MinGapMs}ms`;

const tryApplyHeartsoundSearchCommand = (
  rawInput: string,
  currentSettings: HeartsoundCandidateSettings
): { nextSettings: HeartsoundCandidateSettings; message: string } | null => {
  const trimmed = rawInput.trim();
  if (!trimmed.toLowerCase().startsWith(SEARCH_COMMAND_PREFIX)) {
    return null;
  }

  const commandText = trimmed.slice(SEARCH_COMMAND_PREFIX.length).trim();
  if (!commandText) {
    return {
      nextSettings: currentSettings,
      message: `S3/S4 candidate settings | ${formatHeartsoundCandidateSettings(currentSettings)}`
    };
  }

  if (commandText.toLowerCase() === "reset") {
    return {
      nextSettings: { ...DEFAULT_HEARTSOUND_CANDIDATE_SETTINGS },
      message: `S3/S4 candidate settings reset | ${formatHeartsoundCandidateSettings(DEFAULT_HEARTSOUND_CANDIDATE_SETTINGS)}`
    };
  }

  const nextSettings = { ...currentSettings };
  const tokens = commandText.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const [rawKey, rawValue] = token.split("=");
    if (!rawKey || rawValue === undefined) {
      return {
        nextSettings: currentSettings,
        message: "Use /search s3=0.08 s4=0.08 gap=120 or /search reset"
      };
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      return {
        nextSettings: currentSettings,
        message: `Invalid /search value for ${rawKey}`
      };
    }

    const key = rawKey.toLowerCase();
    if (key === "s3" || key === "s3delta") {
      nextSettings.s3DeltaThresholdRatio = clampNumber(value, 0.001, 10);
      continue;
    }
    if (key === "s4" || key === "s4delta") {
      nextSettings.s4DeltaThresholdRatio = clampNumber(value, 0.001, 10);
      continue;
    }
    if (key === "gap" || key === "distance" || key === "gapms") {
      nextSettings.s3S4MinGapMs = clampNumber(value, 1, 2000);
      continue;
    }

    return {
      nextSettings: currentSettings,
      message: `Unknown /search key: ${rawKey}`
    };
  }

  return {
    nextSettings,
    message: `Updated S3/S4 candidate settings | ${formatHeartsoundCandidateSettings(nextSettings)}`
  };
};

const parseNumericInput = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed);
};

const isFullResolutionPlotPayload = (
  payload: PlotDataPayload | null,
  totalRows: number | null
): payload is PlotDataPayload => {
  if (!payload || totalRows === null || totalRows <= 0) {
    return false;
  }

  return (
    !payload.isDownsampled &&
    payload.startIndex === 0 &&
    payload.endIndex >= totalRows - 1 &&
    payload.returnedPointCount >= totalRows
  );
};

const getSeriesItemsForWorkspace = (workspaceKind: WorkspaceKind, ecgMarkerMode: EcgMarkerMode) =>
  workspaceKind === "ecg" ? ECG_SERIES_ITEMS_BY_MODE[ecgMarkerMode] : HEARTSOUND_SERIES_ITEMS;

const extractErrorMessage = (payload: unknown): string => {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object") {
      const errors = (detail as { errors?: Array<{ message?: string }> }).errors;
      if (Array.isArray(errors) && errors.length > 0 && errors[0].message) {
        return errors.map((error) => error.message).join(", ");
      }
    }
  }

  return "request failed";
};

const extractDownloadFilename = (response: Response, fallback: string): string => {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  return fallback;
};

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
};

const formatRowNumber = (value: number): string => value.toLocaleString();
const getInitialRangeEnd = (rowCount: number, workspaceKind: WorkspaceKind): number =>
  Math.min(
    Math.max(rowCount - 1, 0),
    workspaceKind === "ecg" ? ECG_INITIAL_RANGE_SIZE : HEARTSOUND_INITIAL_RANGE_SIZE
  );
const getRangeShiftStep = (workspaceKind: WorkspaceKind): number =>
  workspaceKind === "ecg" ? ECG_RANGE_SHIFT_STEP : QUICK_RANGE_SHIFT_STEP;
const getKeyboardRangeShiftStep = (workspaceKind: WorkspaceKind): number =>
  workspaceKind === "ecg" ? ECG_RANGE_SHIFT_STEP : KEYBOARD_RANGE_SHIFT_STEP;
const formatMetricValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return value.toFixed(0);
  }
  if (absValue >= 100) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
};

const formatHeartsoundParameterMetricValue = (value: number, metricKey?: string): string => {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (metricKey && /^S[12][SE]_RS_Peak$/.test(metricKey)) {
    return String(Math.round(value));
  }
  return formatMetricValue(value);
};

const buildPairValueLookup = (pairs: DataPair[]): Map<number, number> => {
  const lookup = new Map<number, number>();
  for (const [index, value] of pairs) {
    lookup.set(index, value);
  }
  return lookup;
};

const getLookupValue = (lookup: Map<number, number>, index: number | null | undefined): number | null => {
  if (index === null || index === undefined) {
    return null;
  }
  const value = lookup.get(index);
  return value !== undefined && Number.isFinite(value) ? value : null;
};

const getRsWidthBounds = (lookup: Map<number, number>, peakIndex: number | null | undefined): [number, number] | null => {
  if (peakIndex === null || peakIndex === undefined) {
    return null;
  }

  const peakValue = getLookupValue(lookup, peakIndex);
  if (peakValue === null || peakValue <= 0) {
    return null;
  }

  const threshold = peakValue * 0.5;
  let left = peakIndex;
  while (true) {
    const nextValue = getLookupValue(lookup, left - 1);
    if (nextValue === null || nextValue < threshold) {
      break;
    }
    left -= 1;
  }

  let right = peakIndex;
  while (true) {
    const nextValue = getLookupValue(lookup, right + 1);
    if (nextValue === null || nextValue < threshold) {
      break;
    }
    right += 1;
  }

  return left <= right ? [left, right] : null;
};

const buildChartNoteMarkerSeries = (
  markers: ChartNoteMarker[],
  amplitudePairs: DataPair[]
): SeriesOption | null => {
  if (markers.length === 0 || amplitudePairs.length === 0) {
    return null;
  }

  const amplitudeValues = amplitudePairs.map((pair) => pair[1]);
  const amplitudeMin = Math.min(...amplitudeValues);
  const amplitudeMax = Math.max(...amplitudeValues);
  const amplitudeSpan = Math.max(amplitudeMax - amplitudeMin, 1);
  const noteMarkerLow = amplitudeMin - amplitudeSpan * 0.04;
  const noteMarkerHigh = amplitudeMax + amplitudeSpan * 0.04;

  return {
    name: "Chart Notes",
    type: "custom",
    xAxisIndex: 0,
    yAxisIndex: 0,
    silent: true,
    clip: true,
    animation: false,
    encode: {
      x: 0,
      y: [1, 2],
      tooltip: []
    },
    data: markers.map((marker) => {
      const markerStyle = CHART_NOTE_MARKER_STYLES[marker.keyTag];
      return [
        marker.index,
        noteMarkerLow,
        noteMarkerHigh,
        markerStyle.label,
        markerStyle.color,
      ];
    }),
    renderItem(
      _params: unknown,
      api: {
        value: (dimension: number) => unknown;
        coord: (value: [number, number]) => number[];
      }
    ) {
      const xValue = Number(api.value(0));
      const lowValue = Number(api.value(1));
      const highValue = Number(api.value(2));
      const label = String(api.value(3) ?? "");
      const color = String(api.value(4) ?? "#ff4d6d");
      const topPoint = api.coord([xValue, highValue]);
      const bottomPoint = api.coord([xValue, lowValue]);

      return {
        type: "group",
        children: [
          {
            type: "line",
            shape: {
              x1: topPoint[0],
              y1: topPoint[1],
              x2: bottomPoint[0],
              y2: bottomPoint[1],
            },
            style: {
              stroke: color,
              lineWidth: 2.2,
              opacity: 0.98,
            },
          },
          {
            type: "rect",
            shape: {
              x: topPoint[0] - 9,
              y: topPoint[1] + 4,
              width: 18,
              height: 14,
              r: 4,
            },
            style: {
              fill: color,
              opacity: 0.98,
            },
          },
          {
            type: "text",
            style: {
              x: topPoint[0],
              y: topPoint[1] + 11,
              text: label,
              fill: "#ffffff",
              font: "700 10px sans-serif",
              textAlign: "center",
              textVerticalAlign: "middle",
            },
          },
        ],
      };
    },
    z: 9,
  };
};

const getHeartsoundParameterTooltipContent = (
  metricKey: string,
  metricLabel: string
): HeartsoundParameterTooltipContent | null => {
  if (metricKey === "HeartRate_bpm") {
    return {
      title: "HR",
      summary: "현재 S1 start에서 다음 S1 start까지 측정",
      schematic: "S1_n ~ S1_n+1",
    };
  }

  if (/^S1_/.test(metricKey) || /^S2_/.test(metricKey)) {
    const isS1 = metricKey.startsWith("S1_");
    const prefix = isS1 ? "S1" : "S2";
    if (/_Duration_ms$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} start에서 ${prefix} end까지`,
        schematic: `${prefix} start ~ ${prefix} end`,
      };
    }
    if (/_Peak_mV$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 구간의 최대 |x|`,
        schematic: `${prefix} 구간 ~ |x| max`,
      };
    }
    if (/_mean_mV$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 구간의 평균 |x|`,
        schematic: `${prefix} 구간 ~ mean(|x[n]|)`,
      };
    }
    if (/_RMS_mV$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 구간의 RMS`,
        schematic: `${prefix} 구간 ~ sqrt(mean(x[n]^2))`,
      };
    }
    if (/_Area_mVms$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 구간의 |x| 적분값`,
        schematic: `${prefix} 구간 ~ sum(|x[n]|) * 0.25`,
      };
    }
    if (/_Middle_ms$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} start와 end의 중간점`,
        schematic: `${prefix} start ~ middle ~ ${prefix} end`,
      };
    }
    if (/_S_centroid_pct$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 중심의 start 쪽 치우침`,
        schematic: `${prefix} start ~ centroid ~ middle`,
      };
    }
    if (/_E_centroid_pct$/.test(metricKey)) {
      return {
        title: metricLabel,
        summary: `${prefix} 중심의 end 쪽 치우침`,
        schematic: `middle ~ centroid ~ ${prefix} end`,
      };
    }
  }

  if (/^S1[SE]_RS_Peak$|^S2[SE]_RS_Peak$/.test(metricKey)) {
    return {
      title: metricLabel,
      summary: "선택된 event peak 지점의 RS Score",
      schematic: "event peak ~ RS(tau)",
    };
  }

  if (/^S1[SE]_RS_Width_ms$|^S2[SE]_RS_Width_ms$/.test(metricKey)) {
    return {
      title: metricLabel,
      summary: "peak 50% 높이 연속 구간 폭",
      schematic: "left ~ peak ~ right",
    };
  }

  switch (metricKey) {
    case "S1S2_Duration_ms":
      return { title: metricLabel, summary: "S1 end에서 S2 start까지", schematic: "S1 end ~ S2 start" };
    case "S1S2_Peak_mV":
      return { title: metricLabel, summary: "S1-S2 구간의 최대 |x|", schematic: "S1 end ~ S2 start ~ |x| max" };
    case "S1S2_mean_mV":
      return { title: metricLabel, summary: "S1-S2 구간의 평균 |x|", schematic: "S1 end ~ S2 start ~ mean(|x[n]|)" };
    case "S1S2_Energy_mV2ms":
      return { title: metricLabel, summary: "S1-S2 구간의 에너지", schematic: "S1 end ~ S2 start ~ sum(x[n]^2) * 0.25" };
    case "S2S1_Duration_ms":
      return { title: metricLabel, summary: "S2 end에서 다음 S1 start까지", schematic: "S2 end ~ next S1 start" };
    case "S2S1_Peak_mV":
      return { title: metricLabel, summary: "S2-S1 구간의 최대 |x|", schematic: "S2 end ~ next S1 start ~ |x| max" };
    case "S2S1_mean_mV":
      return { title: metricLabel, summary: "S2-S1 구간의 평균 |x|", schematic: "S2 end ~ next S1 start ~ mean(|x[n]|)" };
    case "S2S1_Energy_mV2ms":
      return { title: metricLabel, summary: "S2-S1 구간의 에너지", schematic: "S2 end ~ next S1 start ~ sum(x[n]^2) * 0.25" };
    default:
      return null;
  }
};

const buildParameterMeasurementAnnotation = (
  metricKey: string,
  cycleContext: HeartsoundCycleMeasurementContext,
  rsLookups: {
    s1Start: Map<number, number>;
    s1End: Map<number, number>;
    s2Start: Map<number, number>;
    s2End: Map<number, number>;
  }
): ParameterMeasurementAnnotation | null => {
  const { s1Overlay, s2Overlay, nextS1Overlay } = cycleContext;
  if (!s1Overlay) {
    return null;
  }

  const s1Start = s1Overlay.areaStart;
  const s1End = s1Overlay.areaEnd;
  const s2Start = s2Overlay?.areaStart ?? null;
  const s2End = s2Overlay?.areaEnd ?? null;
  const nextS1Start = nextS1Overlay?.areaStart ?? null;

  const createRange = (label: string, color: string, startIndex: number | null, endIndex: number | null) => {
    if (startIndex === null || endIndex === null) {
      return null;
    }
    return {
      key: metricKey,
      label,
      color,
      kind: "range" as const,
      startIndex,
      endIndex,
    };
  };

  const createPoint = (label: string, color: string, index: number | null | undefined) => {
    if (index === null || index === undefined) {
      return null;
    }
    return {
      key: metricKey,
      label,
      color,
      kind: "point" as const,
      startIndex: index,
      endIndex: index,
    };
  };

  if (metricKey.startsWith("S1_")) {
    return createRange("S1", "#9b5cff", s1Start, s1End);
  }
  if (metricKey.startsWith("S2_")) {
    return createRange("S2", "#00c2a8", s2Start, s2End);
  }

  switch (metricKey) {
    case "S1S2_Duration_ms":
    case "S1S2_Peak_mV":
    case "S1S2_mean_mV":
    case "S1S2_Energy_mV2ms":
      return createRange("S1 end -> S2 start", "#f97316", s1End, s2Start);
    case "S2S1_Duration_ms":
    case "S2S1_Peak_mV":
    case "S2S1_mean_mV":
    case "S2S1_Energy_mV2ms":
      return createRange("S2 end -> next S1 start", "#22c55e", s2End, nextS1Start);
    case "HeartRate_bpm":
      return createRange("Cycle -> Cycle", "#f9c74a", s1Start, nextS1Start);
    case "S1S_RS_Peak":
      return createPoint("S1 start RS", "#ff7b72", s1Overlay.startPeak?.[0]);
    case "S1E_RS_Peak":
      return createPoint("S1 end RS", "#ff7b72", s1Overlay.endPeak?.[0]);
    case "S2S_RS_Peak":
      return createPoint("S2 start RS", "#ff7b72", s2Overlay?.startPeak?.[0]);
    case "S2E_RS_Peak":
      return createPoint("S2 end RS", "#ff7b72", s2Overlay?.endPeak?.[0]);
    case "S1S_RS_Width_ms": {
      const bounds = getRsWidthBounds(rsLookups.s1Start, s1Overlay.startPeak?.[0]);
      return createRange("S1 start RS width", "#ff7b72", bounds?.[0] ?? null, bounds?.[1] ?? null);
    }
    case "S1E_RS_Width_ms": {
      const bounds = getRsWidthBounds(rsLookups.s1End, s1Overlay.endPeak?.[0]);
      return createRange("S1 end RS width", "#ff7b72", bounds?.[0] ?? null, bounds?.[1] ?? null);
    }
    case "S2S_RS_Width_ms": {
      const bounds = getRsWidthBounds(rsLookups.s2Start, s2Overlay?.startPeak?.[0]);
      return createRange("S2 start RS width", "#ff7b72", bounds?.[0] ?? null, bounds?.[1] ?? null);
    }
    case "S2E_RS_Width_ms": {
      const bounds = getRsWidthBounds(rsLookups.s2End, s2Overlay?.endPeak?.[0]);
      return createRange("S2 end RS width", "#ff7b72", bounds?.[0] ?? null, bounds?.[1] ?? null);
    }
    default:
      return null;
  }
};

const mergeParameterGroupMetrics = (
  groups: Array<ParameterSummaryGroup | null>,
  nextKey: string,
  nextLabel: string
): ParameterSummaryGroup | null => {
  const metrics = groups.flatMap((group) => group?.metrics ?? []);
  if (metrics.length === 0) {
    return null;
  }

  return {
    key: nextKey,
    label: nextLabel,
    metrics,
  };
};

const getParameterMetricUnit = (metricKey: string): string | null => {
  if (/_ratio$/i.test(metricKey) || metricKey === "sys_dia_ratio" || metricKey === "S1_ratio" || metricKey === "S2_ratio") {
    return "무단위";
  }

  if (
    /(?:_width|_duration|_interval|_segment)$/i.test(metricKey) ||
    /(?:_center_time|_to_)/i.test(metricKey) ||
    ["p_rs", "qrs_rs", "t_rs", "cycle_duration"].includes(metricKey)
  ) {
    return "Sample";
  }

  if (/(?:^area_|_area$|^area_abs_)/i.test(metricKey)) {
    return "Amp×Sample";
  }

  if (/(?:^Peak_|^peak_abs_|^ptp_|^mean_abs_|_peak_|_amp$|_avg$|^rms_)/i.test(metricKey)) {
    return "Amp";
  }

  if (/^energy(?:_|$)|^log_energy_|^energy_per_sample_/i.test(metricKey)) {
    return "Amp²";
  }

  return null;
};

const getFileRoleEmptyLabel = (workspace: WorkspaceKind, fileRole: FileRole): string => {
  if (fileRole === "parameter") {
    return workspace === "ecg" ? "No uploaded ECG parameter files" : "No uploaded HeartSound parameter files";
  }
  if (fileRole === "unsupervised") {
    return workspace === "ecg"
      ? "No uploaded ECG unsupervised files"
      : "No uploaded HeartSound unsupervised files";
  }
  if (fileRole === "wave") {
    return workspace === "ecg" ? "No uploaded ECG wave files" : "No uploaded HeartSound wave files";
  }
  return WORKSPACE_TABS.find((item) => item.key === workspace)?.emptyLabel ?? "No files";
};

const getFileRoleLabel = (fileRole: FileRole): string => {
  if (fileRole === "parameter") {
    return "Parameter";
  }
  if (fileRole === "unsupervised") {
    return "Unsupervised";
  }
  if (fileRole === "wave") {
    return "Wave";
  }
  return "Data";
};

const getFileRoleActionLabel = (fileRole: FileRole, isFolderUpload: boolean): string => {
  const roleLabel = getFileRoleLabel(fileRole);
  return `${roleLabel} ${isFolderUpload ? "Folder" : "File"}`;
};

const getFileRoleListTitle = (fileRole: FileRole): string => `${getFileRoleLabel(fileRole)} Files`;

const getFileRoleListSubtitle = (fileRole: FileRole, panelId: PanelId): string => {
  if (fileRole === "data") {
    return `Click file to assign to Panel ${panelId}`;
  }
  if (fileRole === "wave") {
    return `Click file to link as wave to Panel ${panelId}`;
  }
  if (fileRole === "parameter") {
    return `Click file to link as parameter to Panel ${panelId}`;
  }
  return `Click file to link as unsupervised to Panel ${panelId}`;
};

const getFileAcceptValue = (fileRole: FileRole): string => {
  if (fileRole === "wave") {
    return ".wav";
  }
  return ".csv,.xlsx";
};

const getFileMetaText = (file: UploadedFileMetadata): string => {
  if (file.fileRole === "wave") {
    return file.extension ? file.extension.replace(".", "").toUpperCase() : "WAV";
  }
  return `rows ${file.rowCount}`;
};

const isPanelLinkedFileRole = (fileRole: FileRole): fileRole is PanelLinkedFileRole =>
  fileRole === "parameter" || fileRole === "unsupervised" || fileRole === "wave";

const getParameterSourceFileId = (panel: PanelState): string | null =>
  panel.workspaceKind === "heartsound" ? panel.fileId : panel.parameterFileId;

const getParameterSourceName = (panel: PanelState): string | null =>
  panel.workspaceKind === "heartsound" ? panel.fileName : panel.parameterFileName;

const getLinkedFileIdForPanelRole = (panel: PanelState, fileRole: FileRole): string | null => {
  if (fileRole === "data") {
    return panel.fileId;
  }
  if (fileRole === "wave") {
    return panel.waveFileId;
  }
  if (fileRole === "parameter") {
    return panel.parameterFileId;
  }
  if (fileRole === "unsupervised") {
    return panel.unsupervisedFileId;
  }
  return null;
};

const getWaveFileUrl = (fileId: string): string => `/api/files/${fileId}/content`;

const getWaveMarkerIndex = (currentTime: number, duration: number, maxIndex: number): number | null => {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0 || maxIndex < 0) {
    return null;
  }
  return clampNumber(Math.round((currentTime / duration) * maxIndex), 0, maxIndex);
};

const getPrefetchRangeKey = (start: number, end: number): string => `${start}:${end}`;

const extractAutoSyncKey = (fileName: string, workspaceKind: WorkspaceKind): string | null => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return null;
  }

  const stem = trimmed.replace(/\.[^.]+$/, "");
  if (workspaceKind === "heartsound") {
    const normalizedStem = stem
      .toLowerCase()
      .replace(/[_\s-]+/g, "_")
      .trim();
    const heartsoundMatch = normalizedStem.match(/^(\d+)_(av|mv|pv|tv)(?:_|$)/i);
    if (heartsoundMatch) {
      return `${heartsoundMatch[1]}_${heartsoundMatch[2].toLowerCase()}`;
    }
    return null;
  }

  const leadingNumberMatch = stem.match(/^\s*(\d+)/);
  if (leadingNumberMatch?.[1]) {
    return leadingNumberMatch[1];
  }
  const [firstToken] = stem.split("_");
  const syncKey = firstToken?.trim().toLowerCase();
  return syncKey || null;
};

const findAutoLinkedFile = (
  files: UploadedFileMetadata[],
  sourceFile: UploadedFileMetadata,
  targetRole: FileRole
): UploadedFileMetadata | null => {
  const sourceSyncKey = extractAutoSyncKey(sourceFile.originalName, sourceFile.workspaceKind);
  if (!sourceSyncKey) {
    return null;
  }

  return (
    files.find((candidate) => {
      if (candidate.fileId === sourceFile.fileId || candidate.fileRole !== targetRole) {
        return false;
      }
      return (
        candidate.workspaceKind === sourceFile.workspaceKind &&
        extractAutoSyncKey(candidate.originalName, candidate.workspaceKind) === sourceSyncKey
      );
    }) ?? null
  );
};

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.325 4.317a1 1 0 0 1 .95-.69h1.45a1 1 0 0 1 .95.69l.35 1.082a7.94 7.94 0 0 1 1.45.6l1.03-.525a1 1 0 0 1 1.14.18l1.025 1.025a1 1 0 0 1 .18 1.14l-.525 1.03c.236.46.437.946.6 1.45l1.082.35a1 1 0 0 1 .69.95v1.45a1 1 0 0 1-.69.95l-1.082.35a7.94 7.94 0 0 1-.6 1.45l.525 1.03a1 1 0 0 1-.18 1.14l-1.025 1.025a1 1 0 0 1-1.14.18l-1.03-.525a7.94 7.94 0 0 1-1.45.6l-.35 1.082a1 1 0 0 1-.95.69h-1.45a1 1 0 0 1-.95-.69l-.35-1.082a7.94 7.94 0 0 1-1.45-.6l-1.03.525a1 1 0 0 1-1.14-.18L5.7 18.3a1 1 0 0 1-.18-1.14l.525-1.03a7.94 7.94 0 0 1-.6-1.45l-1.082-.35a1 1 0 0 1-.69-.95v-1.45a1 1 0 0 1 .69-.95l1.082-.35c.163-.504.364-.99.6-1.45l-.525-1.03a1 1 0 0 1 .18-1.14L6.725 5.65a1 1 0 0 1 1.14-.18l1.03.525a7.94 7.94 0 0 1 1.45-.6l.35-1.082Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7V3.75M7 7H3.75M7 7l2.4-2.4A7 7 0 1 1 5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 6.5 9 12l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 6.5 15 12l-5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccessKeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 6.5a4.5 4.5 0 1 1-3.83 6.86L4 20v-3l1.8-1.8H8V13h2.2l1.3-1.3A4.48 4.48 0 0 1 14.5 6.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14.5" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ParameterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="geometricPrecision">
      <path
        d="M6.5 5.5v13M12 5.5v13M17.5 5.5v13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="6.5" cy="8.5" r="2.1" fill="currentColor" />
      <circle cx="12" cy="14.5" r="2.1" fill="currentColor" />
      <circle cx="17.5" cy="8" r="2.1" fill="currentColor" />
    </svg>
  );
}

function RewindFiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 7 5.5 12 11 17V7Z" fill="currentColor" />
      <path d="M18.5 7 13 12l5.5 5V7Z" fill="currentColor" />
      <path
        d="M6.2 5.4a7.5 7.5 0 0 1 7.1-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <text x="12.2" y="21" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
        5
      </text>
    </svg>
  );
}

function ForwardFiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m13 7 5.5 5-5.5 5V7Z" fill="currentColor" />
      <path d="M5.5 7 11 12l-5.5 5V7Z" fill="currentColor" />
      <path
        d="M17.8 5.4a7.5 7.5 0 0 0-7.1-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <text x="11.8" y="21" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
        5
      </text>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="6.5" width="3.2" height="11" rx="1.2" fill="currentColor" />
      <rect x="13.8" y="6.5" width="3.2" height="11" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.2 8.1V4.8L4.8 8.2l3.4 3.4V8.9a6 6 0 1 1-2.1 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="12.2" y="20.6" textAnchor="middle" fontSize="6.8" fontWeight="700" fill="currentColor">
        0
      </text>
    </svg>
  );
}

const WAVE_PLAYBACK_RATES = [1, 0.75, 0.5, 0.25] as const;

const PanelCard = memo(function PanelCard({
  workspaceKind,
  panel,
  plotState,
  parameterState,
  unsupervisedState,
  heartsoundCandidateSettings,
  isActive,
  onActivate,
  onToggleParameterSummary,
  onToggleSelectedCycleHighlight,
  onToggleUnsupervisedOverlay,
  onOpenSeriesPicker,
  onResetDisplayDefaults,
  onOpenSettings,
  onResetPanel,
  onSliderRangeCommit,
  onPrefetchRange,
  onSelectCycle,
  onSelectParameterMetric,
  onDownloadParameterExport,
  onDownloadLabelingExport,
  onClearLabelingMarkers,
  onSelectLabelingAnchor,
  onAddLabelingMarker,
  isLabelingMode,
  labelingAnchorIndex,
  isParameterExporting,
  isLabelingExporting
}: PanelCardProps) {
  const sliderDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (sliderDebounceRef.current !== null) {
        window.clearTimeout(sliderDebounceRef.current);
      }
    };
  }, []);

  const activePlot = plotState.current ?? plotState.overview;
  const overviewPlot = plotState.overview ?? activePlot;
  const showParameterSection = !isLabelingMode && panel.showParameterSummary;
  const parameterSourceFileId = getParameterSourceFileId(panel);
  const parameterSourceName = getParameterSourceName(panel);
  const rangeGuide = useMemo(() => {
    if (panel.previousRangeStart === null || panel.previousRangeEnd === null) {
      return null;
    }

    if (panel.rangeStart === panel.previousRangeStart && panel.rangeEnd === panel.previousRangeEnd) {
      return null;
    }

    const overlapStart = Math.max(panel.previousRangeStart, panel.rangeStart);
    const overlapEnd = Math.min(panel.previousRangeEnd, panel.rangeEnd);
    const overlapRows = Math.max(0, overlapEnd - overlapStart + 1);
    const currentRows = Math.max(0, panel.rangeEnd - panel.rangeStart + 1);
    const newRows = Math.max(0, currentRows - overlapRows);
    const direction = panel.rangeStart > panel.previousRangeStart ? "right" : "left";

    return {
      direction,
      newRows,
      overlapRows
    };
  }, [panel.previousRangeEnd, panel.previousRangeStart, panel.rangeEnd, panel.rangeStart]);
  const parameterSummary = parameterState.summary;
  const unsupervisedSummary = unsupervisedState.summary;
  const selectedCycle = useMemo(() => {
    const cycles = parameterSummary?.cycles ?? [];
    if (cycles.length === 0) {
      return null;
    }
    return (
      cycles.find((cycle) => cycle.cycleIndex === parameterState.selectedCycleIndex) ??
      cycles[0] ??
      null
    );
  }, [parameterState.selectedCycleIndex, parameterSummary]);
  const parameterCycles = parameterSummary?.cycles ?? [];
  const selectedCycleOffset = useMemo(() => {
    if (!selectedCycle) {
      return -1;
    }
    return parameterCycles.findIndex((cycle) => cycle.cycleIndex === selectedCycle.cycleIndex);
  }, [parameterCycles, selectedCycle]);
  const displayedParameterGroups = selectedCycle?.groups ?? parameterSummary?.groups ?? [];
  const selectedParameterMetricKey = parameterState.selectedMetricKey;
  const heartsoundParameterSections = useMemo<HeartsoundParameterSection[]>(() => {
    if (workspaceKind !== "heartsound" || displayedParameterGroups.length === 0) {
      return [];
    }

    const groupMap = new Map(displayedParameterGroups.map((group) => [group.key, group] as const));
    const findGroup = (key: string) => groupMap.get(key);
    const compactGroups = (groups: Array<ParameterSummaryGroup | null>) =>
      groups.filter((group): group is ParameterSummaryGroup => group !== null);

    const rsPeakGroup = findGroup("rs_peak");
    const rsWidthGroup = findGroup("rs_width");
    const rsScoreGroup = mergeParameterGroupMetrics(
      [
        rsPeakGroup ?? null,
        rsWidthGroup ?? null,
      ],
      "rs_score",
      "RS Score"
    );

    return [
      {
        key: "s1",
        title: "S1",
        subtitle: "첫 번째 심음 구간에서 계산된 값",
        toneClassName: "is-s1",
        groups: compactGroups([findGroup("s1_parameters") ?? null]),
        metrics: [],
      },
      {
        key: "s2",
        title: "S2",
        subtitle: "두 번째 심음 구간에서 계산된 값",
        toneClassName: "is-s2",
        groups: compactGroups([findGroup("s2_parameters") ?? null]),
        metrics: [],
      },
      {
        key: "relation",
        title: "S1-S2",
        subtitle: "S1-S2와 S2-S1 gap 구간에서 계산된 값",
        toneClassName: "is-relation",
        groups: compactGroups([findGroup("s1_s2_relation") ?? null, findGroup("s2_s1_relation") ?? null]),
        metrics: [],
      },
      {
        key: "rs-score",
        title: "RS Score",
        subtitle: "이벤트 peak에서 계산된 RS 관련 값",
        toneClassName: "is-rs-score",
        groups: compactGroups([rsScoreGroup]),
        metrics: [],
      },
    ].filter((section) => section.groups.length > 0);
  }, [displayedParameterGroups, workspaceKind]);
  const heartRateMetric = useMemo(
    () => displayedParameterGroups.find((group) => group.key === "heart_rate")?.metrics[0] ?? null,
    [displayedParameterGroups]
  );
  const [parameterSplitRatio, setParameterSplitRatio] = useState<number>(0.5);
  const [isSplitDragging, setIsSplitDragging] = useState<boolean>(false);
  const [isWavePlaying, setIsWavePlaying] = useState<boolean>(false);
  const [rewindAnimating, setRewindAnimating] = useState<boolean>(false);
  const [waveMarkerIndex, setWaveMarkerIndex] = useState<number | null>(null);
  const [wavePlaybackRate, setWavePlaybackRate] = useState<number>(WAVE_PLAYBACK_RATES[0]);
  const [waveDurationSeconds, setWaveDurationSeconds] = useState<number | null>(null);
  const [playheadPixelLeft, setPlayheadPixelLeft] = useState<number | null>(null);
  const [isPlayheadDragging, setIsPlayheadDragging] = useState<boolean>(false);
  const panelWrapperRef = useRef<HTMLDivElement | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const waveAudioRef = useRef<HTMLAudioElement | null>(null);
  const waveAnimationTimeoutRef = useRef<number | null>(null);
  const waveFrameRef = useRef<number | null>(null);
  const viewportRangeRef = useRef<{ start: number; end: number }>({
    start: panel.rangeStart,
    end: panel.rangeEnd
  });
  const waveSource = panel.waveFileId ? getWaveFileUrl(panel.waveFileId) : null;
  const syncChartViewport = useCallback(
    (nextStart: number, nextEnd: number) => {
      const totalRows = panel.totalRows ?? activePlot?.originalRowCount ?? 0;
      if (totalRows <= 0) {
        viewportRangeRef.current = { start: nextStart, end: nextEnd };
        return;
      }

      const maxIndex = Math.max(totalRows - 1, 0);
      const safeStart = clampNumber(Math.round(nextStart), 0, maxIndex);
      const safeEnd = clampNumber(Math.round(nextEnd), safeStart, maxIndex);
      const currentViewportRange = viewportRangeRef.current;
      const viewportUnchanged =
        currentViewportRange.start === safeStart && currentViewportRange.end === safeEnd;
      viewportRangeRef.current = { start: safeStart, end: safeEnd };
      if (viewportUnchanged) {
        return;
      }

      const instance = chartRef.current?.getEchartsInstance();
      if (!instance) {
        return;
      }

      instance.setOption(
        {
          xAxis: [
            { min: safeStart, max: safeEnd },
            { min: 0, max: maxIndex }
          ],
          dataZoom: [
            {
              startValue: safeStart,
              endValue: safeEnd
            }
          ]
        },
        false,
        true
      );
    },
    [activePlot?.originalRowCount, panel.totalRows]
  );
  const getViewportRange = useCallback(
    () => viewportRangeRef.current,
    []
  );
  const getCenteredViewportRange = useCallback(
    (centerIndex: number, maxIndex: number) => {
      const viewportRange = getViewportRange();
      const visibleWidth = Math.max(viewportRange.end - viewportRange.start, 0);
      const centeredStart = clampNumber(
        centerIndex - Math.floor(visibleWidth / 2),
        0,
        Math.max(maxIndex - visibleWidth, 0)
      );
      const centeredEnd = clampNumber(centeredStart + visibleWidth, centeredStart, maxIndex);

      return {
        centeredStart,
        centeredEnd
      };
    },
    [getViewportRange]
  );
  const resetWaveViewportToOrigin = useCallback(() => {
    if (!panel.fileId) {
      return;
    }

    const totalRows = panel.totalRows ?? activePlot?.originalRowCount ?? 0;
    if (totalRows <= 0) {
      return;
    }

    const maxIndex = Math.max(totalRows - 1, 0);
    const viewportRange = getViewportRange();
    const visibleWidth = Math.max(viewportRange.end - viewportRange.start, 0);
    const resetEnd = clampNumber(visibleWidth, 0, maxIndex);
    onSliderRangeCommit(panel.panelId, 0, resetEnd);
  }, [activePlot?.originalRowCount, getViewportRange, onSliderRangeCommit, panel.fileId, panel.panelId, panel.totalRows]);

  const updateParameterSplitRatio = useCallback((clientY: number) => {
    const wrapper = panelWrapperRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const availableHeight = rect.height - PANEL_SPLIT_HANDLE_HEIGHT;
    if (availableHeight <= MIN_CHART_SECTION_HEIGHT + MIN_PARAMETER_SECTION_HEIGHT) {
      return;
    }

    const nextRatio = (clientY - rect.top - PANEL_SPLIT_HANDLE_HEIGHT / 2) / availableHeight;
    const minRatio = MIN_CHART_SECTION_HEIGHT / availableHeight;
    const maxRatio = 1 - MIN_PARAMETER_SECTION_HEIGHT / availableHeight;
    setParameterSplitRatio(clampNumber(nextRatio, minRatio, maxRatio));
  }, []);

  const onSplitHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsSplitDragging(true);
      updateParameterSplitRatio(event.clientY);
    },
    [updateParameterSplitRatio]
  );

  useEffect(() => {
    if (!isSplitDragging) {
      return undefined;
    }

    const onPointerMove = (event: PointerEvent) => {
      updateParameterSplitRatio(event.clientY);
    };

    const stopDragging = () => {
      setIsSplitDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [isSplitDragging, updateParameterSplitRatio]);

  const chartSectionStyle = showParameterSection
    ? {
        flex: `${parameterSplitRatio} 1 0`,
        minHeight: `${MIN_CHART_SECTION_HEIGHT}px`
      }
    : undefined;
  const parameterSectionStyle = showParameterSection
    ? {
        flex: `${1 - parameterSplitRatio} 1 0`,
        minHeight: `${MIN_PARAMETER_SECTION_HEIGHT}px`
      }
    : undefined;

  useEffect(() => {
    const audio = waveAudioRef.current;
    if (!audio) {
      return undefined;
    }

    const stopMarkerLoop = () => {
      if (waveFrameRef.current !== null) {
        window.cancelAnimationFrame(waveFrameRef.current);
        waveFrameRef.current = null;
      }
    };

    const syncMarker = () => {
      const totalRows = panel.totalRows ?? activePlot?.originalRowCount ?? 0;
      const maxIndex = Math.max(totalRows - 1, 0);
      setWaveMarkerIndex(getWaveMarkerIndex(audio.currentTime, audio.duration, maxIndex));
    };

    const startMarkerLoop = () => {
      stopMarkerLoop();

      const tick = () => {
        syncMarker();
        if (!audio.paused && !audio.ended) {
          waveFrameRef.current = window.requestAnimationFrame(tick);
        } else {
          waveFrameRef.current = null;
        }
      };

      waveFrameRef.current = window.requestAnimationFrame(tick);
    };

    const handlePlay = () => {
      setIsWavePlaying(true);
      startMarkerLoop();
    };
    const handlePause = () => {
      setIsWavePlaying(false);
      syncMarker();
      stopMarkerLoop();
    };
    const handleEnded = () => {
      audio.currentTime = 0;
      setIsWavePlaying(false);
      setWaveMarkerIndex(0);
      syncMarker();
      resetWaveViewportToOrigin();
      stopMarkerLoop();
    };
    const handleLoadedMetadata = () => {
      setWaveDurationSeconds(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
      syncMarker();
    };
    const handleTimeUpdate = () => syncMarker();
    const handleSeeked = () => syncMarker();

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeked", handleSeeked);

    syncMarker();

    return () => {
      stopMarkerLoop();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeked", handleSeeked);
    };
  }, [
    activePlot,
    onSliderRangeCommit,
    panel.fileId,
    panel.panelId,
    panel.rangeEnd,
    panel.rangeStart,
    panel.totalRows,
    resetWaveViewportToOrigin
  ]);

  useEffect(() => {
    const audio = waveAudioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = WAVE_PLAYBACK_RATES[0];
    audio.defaultPlaybackRate = WAVE_PLAYBACK_RATES[0];
    setIsWavePlaying(false);
    setWavePlaybackRate(WAVE_PLAYBACK_RATES[0]);
    setWaveDurationSeconds(null);
    setWaveMarkerIndex(waveSource ? 0 : null);
  }, [waveSource]);

  useEffect(() => {
    const audio = waveAudioRef.current;
    if (!audio) {
      return;
    }

    audio.playbackRate = wavePlaybackRate;
    audio.defaultPlaybackRate = wavePlaybackRate;
  }, [wavePlaybackRate]);

  useEffect(() => {
    viewportRangeRef.current = {
      start: panel.rangeStart,
      end: panel.rangeEnd
    };

    const animationFrame = window.requestAnimationFrame(() => {
      syncChartViewport(panel.rangeStart, panel.rangeEnd);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [panel.rangeEnd, panel.rangeStart, syncChartViewport]);

  useEffect(() => {
    return () => {
      if (waveAnimationTimeoutRef.current !== null) {
        window.clearTimeout(waveAnimationTimeoutRef.current);
      }
      if (waveFrameRef.current !== null) {
        window.cancelAnimationFrame(waveFrameRef.current);
      }
    };
  }, []);

  const syncPlayheadPixelPosition = useCallback(
    (markerIndex: number | null) => {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance || markerIndex === null) {
        setPlayheadPixelLeft(null);
        return;
      }

      try {
        const pixel = instance.convertToPixel({ xAxisIndex: 0 }, markerIndex);
        if (typeof pixel === "number" && Number.isFinite(pixel)) {
          setPlayheadPixelLeft(pixel + PLAYHEAD_PIXEL_OFFSET);
          return;
        }
      } catch {
        // Ignore conversion errors during chart mount/resizes.
      }

      setPlayheadPixelLeft(null);
    },
    []
  );

  useEffect(() => {
    if (!panel.waveFileId) {
      setPlayheadPixelLeft(null);
      return;
    }

    const markerIndex = waveMarkerIndex;
    const animationFrame = window.requestAnimationFrame(() => {
      syncPlayheadPixelPosition(markerIndex);
    });

    const handleResize = () => syncPlayheadPixelPosition(markerIndex);
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    panel.rangeEnd,
    panel.rangeStart,
    panel.waveFileId,
    syncPlayheadPixelPosition,
    waveMarkerIndex
  ]);

  useEffect(() => {
    if (!isLabelingMode || !panel.fileId || panel.totalRows === null || panel.totalRows <= 0) {
      return undefined;
    }

    const instance = chartRef.current?.getEchartsInstance();
    const zr = instance?.getZr();
    if (!instance || !zr) {
      return undefined;
    }

    const handleZrClick = (event: { offsetX?: number; offsetY?: number }) => {
      const offsetX = event.offsetX;
      const offsetY = event.offsetY;
      if (
        typeof offsetX !== "number" ||
        !Number.isFinite(offsetX) ||
        typeof offsetY !== "number" ||
        !Number.isFinite(offsetY)
      ) {
        return;
      }

      try {
        if (!instance.containPixel({ gridIndex: 0 }, [offsetX, offsetY])) {
          return;
        }

        const axisValue = instance.convertFromPixel({ xAxisIndex: 0 }, offsetX);
        if (typeof axisValue !== "number" || !Number.isFinite(axisValue)) {
          return;
        }

        const maxIndex = Math.max((panel.totalRows ?? 0) - 1, 0);
        onSelectLabelingAnchor(panel.panelId, clampNumber(Math.round(axisValue), 0, maxIndex));
      } catch {
        // Ignore conversion errors during transient chart reflows.
      }
    };

    zr.on("click", handleZrClick);
    return () => {
      zr.off("click", handleZrClick);
    };
  }, [isLabelingMode, onSelectLabelingAnchor, panel.fileId, panel.panelId, panel.totalRows, panel.rangeEnd, panel.rangeStart]);

  const updateWavePlaybackFromMarker = useCallback(
    (nextMarkerIndex: number, shouldSyncViewport = true) => {
      const totalRows = panel.totalRows ?? activePlot?.originalRowCount ?? 0;
      const maxIndex = Math.max(totalRows - 1, 0);
      const clampedIndex = clampNumber(nextMarkerIndex, 0, maxIndex);
      setWaveMarkerIndex(clampedIndex);

      const audio = waveAudioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0 || maxIndex <= 0) {
        return;
      }

      audio.currentTime = (clampedIndex / maxIndex) * audio.duration;

      if (!shouldSyncViewport || !panel.fileId || panel.totalRows === null || panel.totalRows <= 0) {
        return;
      }

      const viewportRange = getViewportRange();
      if (clampedIndex >= viewportRange.start && clampedIndex <= viewportRange.end) {
        return;
      }

      const { centeredStart, centeredEnd } = getCenteredViewportRange(clampedIndex, maxIndex);
      if (isFullResolutionPlotPayload(plotState.current, panel.totalRows)) {
        syncChartViewport(centeredStart, centeredEnd);
        return;
      }

      onSliderRangeCommit(panel.panelId, centeredStart, centeredEnd);
    },
    [activePlot, getCenteredViewportRange, getViewportRange, onSliderRangeCommit, panel.fileId, panel.panelId, panel.totalRows, plotState.current, syncChartViewport]
  );

  const centerWaveViewportOnMarker = useCallback(
    (nextMarkerIndex: number | null) => {
      if (
        nextMarkerIndex === null ||
        !panel.fileId ||
        panel.totalRows === null ||
        panel.totalRows <= 0
      ) {
        return;
      }

      const maxIndex = Math.max(panel.totalRows - 1, 0);
      const clampedIndex = clampNumber(Math.round(nextMarkerIndex), 0, maxIndex);
      const { centeredStart, centeredEnd } = getCenteredViewportRange(clampedIndex, maxIndex);

      if (isFullResolutionPlotPayload(plotState.current, panel.totalRows)) {
        syncChartViewport(centeredStart, centeredEnd);
        window.requestAnimationFrame(() => {
          syncPlayheadPixelPosition(clampedIndex);
        });
        return;
      }

      onSliderRangeCommit(panel.panelId, centeredStart, centeredEnd);
    },
    [
      getCenteredViewportRange,
      onSliderRangeCommit,
      panel.fileId,
      panel.panelId,
      panel.totalRows,
      plotState.current,
      syncChartViewport,
      syncPlayheadPixelPosition
    ]
  );

  const updateWaveMarkerFromClientX = useCallback(
    (clientX: number) => {
      if (!panel.waveFileId) {
        return;
      }

      const instance = chartRef.current?.getEchartsInstance();
      const host = chartHostRef.current;
      if (!instance || !host) {
        return;
      }

      const rect = host.getBoundingClientRect();
      const localX = clampNumber(clientX - rect.left, 0, rect.width);

      try {
        const axisValue = instance.convertFromPixel({ xAxisIndex: 0 }, localX);
        if (typeof axisValue === "number" && Number.isFinite(axisValue)) {
          updateWavePlaybackFromMarker(Math.round(axisValue));
        }
      } catch {
        // Ignore conversion errors during drag.
      }
    },
    [panel.waveFileId, updateWavePlaybackFromMarker]
  );

  const onPlayheadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsPlayheadDragging(true);
      updateWaveMarkerFromClientX(event.clientX);
    },
    [updateWaveMarkerFromClientX]
  );

  useEffect(() => {
    if (!isPlayheadDragging) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateWaveMarkerFromClientX(event.clientX);
    };

    const stopDragging = () => {
      setIsPlayheadDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [isPlayheadDragging, updateWaveMarkerFromClientX]);

  const triggerRewindAnimation = useCallback(() => {
    if (waveAnimationTimeoutRef.current !== null) {
      window.clearTimeout(waveAnimationTimeoutRef.current);
    }
    setRewindAnimating(true);
    waveAnimationTimeoutRef.current = window.setTimeout(() => {
      setRewindAnimating(false);
      waveAnimationTimeoutRef.current = null;
    }, 260);
  }, []);

  const toggleWavePlayback = useCallback(async () => {
    const audio = waveAudioRef.current;
    if (!audio || !waveSource) {
      return;
    }

    const totalRows = panel.totalRows ?? activePlot?.originalRowCount ?? 0;
    const maxIndex = Math.max(totalRows - 1, 0);
    const markerToCenter = (
      waveMarkerIndex ??
      (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0 && maxIndex > 0
        ? getWaveMarkerIndex(audio.currentTime, audio.duration, maxIndex)
        : 0)
    ) ?? 0;
    const viewportRange = getViewportRange();
    const isMarkerVisible =
      markerToCenter >= viewportRange.start && markerToCenter <= viewportRange.end;
    if (!isMarkerVisible) {
      centerWaveViewportOnMarker(markerToCenter);
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsWavePlaying(false);
      }
      return;
    }

    audio.pause();
  }, [activePlot, centerWaveViewportOnMarker, getViewportRange, panel.totalRows, waveMarkerIndex, waveSource]);

  const seekWaveBySeconds = useCallback(
    (deltaSeconds: number) => {
      const audio = waveAudioRef.current;
      if (!audio || !waveSource) {
        return;
      }

      audio.currentTime = Math.max(0, Math.min(audio.duration || Number.POSITIVE_INFINITY, audio.currentTime + deltaSeconds));
      if (deltaSeconds < 0) {
        triggerRewindAnimation();
      }
    },
    [triggerRewindAnimation, waveSource]
  );

  const resetWavePlayback = useCallback(() => {
    const audio = waveAudioRef.current;
    if (!audio || !waveSource) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setIsWavePlaying(false);
    setWaveMarkerIndex(0);
    resetWaveViewportToOrigin();
  }, [resetWaveViewportToOrigin, waveSource]);

  const cycleWavePlaybackRate = useCallback(() => {
    setWavePlaybackRate((currentRate) => {
      const currentIndex = WAVE_PLAYBACK_RATES.findIndex((rate) => rate === currentRate);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % WAVE_PLAYBACK_RATES.length : 0;
      return WAVE_PLAYBACK_RATES[nextIndex];
    });
  }, []);

  useEffect(() => {
    if (
      !panel.waveFileId ||
      !panel.fileId ||
      waveMarkerIndex === null ||
      panel.totalRows === null ||
      panel.totalRows <= 0
    ) {
      return;
    }

    const hasFullResolutionCurrent = isFullResolutionPlotPayload(plotState.current, panel.totalRows);
    const viewportRange = getViewportRange();
    const visibleWidth = Math.max(viewportRange.end - viewportRange.start, 0);
    const maxIndex = Math.max(panel.totalRows - 1, 0);

    if (hasFullResolutionCurrent) {
      const maxStart = Math.max(maxIndex - visibleWidth, 0);

      if (!isWavePlaying || waveMarkerIndex <= viewportRange.end) {
        return;
      }

      const nextStart = clampNumber(viewportRange.start + visibleWidth + 1, 0, maxStart);
      const nextEnd = clampNumber(nextStart + visibleWidth, nextStart, maxIndex);

      if (nextStart === viewportRange.start && nextEnd === viewportRange.end) {
        return;
      }

      syncChartViewport(nextStart, nextEnd);
      return;
    }

    const pageWidth = visibleWidth + 1;
    const prefetchLead = Math.max(
      AUTO_ADVANCE_PREFETCH_MIN_ROWS,
      Math.floor(pageWidth * AUTO_ADVANCE_PREFETCH_RATIO)
    );
    const stepsForward = Math.floor((waveMarkerIndex - (viewportRange.end + 1)) / pageWidth) + 1;
    const nextStart = clampNumber(viewportRange.start + stepsForward * pageWidth, 0, maxIndex);
    const nextEnd = clampNumber(nextStart + visibleWidth, nextStart, maxIndex);

    if (isWavePlaying && waveMarkerIndex >= viewportRange.end - prefetchLead) {
      for (let lookahead = 1; lookahead <= 3; lookahead += 1) {
        const lookaheadStart = clampNumber(viewportRange.start + lookahead * pageWidth, 0, maxIndex);
        const lookaheadEnd = clampNumber(lookaheadStart + visibleWidth, lookaheadStart, maxIndex);
        if (lookaheadStart === viewportRange.start && lookaheadEnd === viewportRange.end) {
          continue;
        }
        onPrefetchRange(panel.panelId, lookaheadStart, lookaheadEnd);
      }
    }

    if (
      waveMarkerIndex <= viewportRange.end ||
      nextStart === viewportRange.start && nextEnd === viewportRange.end
    ) {
      return;
    }

    onSliderRangeCommit(panel.panelId, nextStart, nextEnd);
  }, [
    getViewportRange,
    isWavePlaying,
    onPrefetchRange,
    onSliderRangeCommit,
    panel.fileId,
    panel.panelId,
    panel.totalRows,
    panel.waveFileId,
    plotState.current,
    syncChartViewport,
    waveMarkerIndex
  ]);

  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!panel.fileId || !activePlot) {
      return null;
    }

    const totalRows = panel.totalRows ?? activePlot.originalRowCount;
    const maxIndex = Math.max(totalRows - 1, 0);
    const safeStart = clampNumber(panel.rangeStart, 0, maxIndex);
    const safeEnd = clampNumber(panel.rangeEnd, safeStart, maxIndex);

    const amplitudePairs = toDataPairs(activePlot.x, activePlot.amplitude);
    const s1StartPairs = toDataPairs(activePlot.x, activePlot.s1Start);
    const s1EndPairs = toDataPairs(activePlot.x, activePlot.s1End);
    const s2StartPairs = toDataPairs(activePlot.x, activePlot.s2Start);
    const s2EndPairs = toDataPairs(activePlot.x, activePlot.s2End);
    const majorPsPairs = toDataPairs(activePlot.x, activePlot.majorPs);
    const majorPePairs = toDataPairs(activePlot.x, activePlot.majorPe);
    const majorQrssPairs = toDataPairs(activePlot.x, activePlot.majorQrss);
    const majorQrsePairs = toDataPairs(activePlot.x, activePlot.majorQrse);
    const majorTsPairs = toDataPairs(activePlot.x, activePlot.majorTs);
    const pointPsPairs = toDataPairs(activePlot.x, activePlot.pointPs);
    const pointPePairs = toDataPairs(activePlot.x, activePlot.pointPe);
    const pointQrssPairs = toDataPairs(activePlot.x, activePlot.pointQrss);
    const pointQrsePairs = toDataPairs(activePlot.x, activePlot.pointQrse);
    const pointTsPairs = toDataPairs(activePlot.x, activePlot.pointTs);
    const amplitudeValues = amplitudePairs.map((pair) => pair[1]);
    const amplitudeMin = amplitudeValues.length > 0 ? Math.min(...amplitudeValues) : -1;
    const amplitudeMax = amplitudeValues.length > 0 ? Math.max(...amplitudeValues) : 1;
    const amplitudeSpan = Math.max(amplitudeMax - amplitudeMin, 1);
    const allS1RegionOverlays =
      workspaceKind === "heartsound"
        ? buildHeartsoundRegionOverlays(
            "S1",
            s1StartPairs,
            s1EndPairs,
            "rgba(46, 160, 67, 0.14)",
            "rgba(46, 160, 67, 0.42)"
          )
        : [];
    const allS2RegionOverlays =
      workspaceKind === "heartsound"
        ? buildHeartsoundRegionOverlays(
            "S2",
            s2StartPairs,
            s2EndPairs,
            "rgba(248, 81, 73, 0.13)",
            "rgba(248, 81, 73, 0.38)"
          )
        : [];
    const resolvedHeartsoundRegionOverlays =
      workspaceKind === "heartsound"
        ? resolveOverlappingHeartsoundRegionOverlays(allS1RegionOverlays, allS2RegionOverlays)
        : { s1Overlays: [], s2Overlays: [] };
    const normalizedS1RegionOverlays =
      workspaceKind === "heartsound"
        ? resolvedHeartsoundRegionOverlays.s1Overlays
        : [];
    const normalizedS2RegionOverlays =
      workspaceKind === "heartsound"
        ? resolvedHeartsoundRegionOverlays.s2Overlays
        : [];
    const s1RegionOverlays = panel.visibleSeries.s1Area ? normalizedS1RegionOverlays : [];
    const s2RegionOverlays = panel.visibleSeries.s2Area ? normalizedS2RegionOverlays : [];
    const heartsoundSampleRate =
      workspaceKind === "heartsound"
        ? resolveHeartsoundSampleRate(
            panel.totalRows ?? activePlot.originalRowCount,
            waveDurationSeconds,
            HEARTSOUND_CANDIDATE_CONFIG.fallbackSampleRate
          )
        : HEARTSOUND_CANDIDATE_CONFIG.fallbackSampleRate;
    const heartsoundCandidates =
      workspaceKind === "heartsound"
        ? buildHeartsoundCandidateOverlays(
            amplitudePairs,
            normalizedS1RegionOverlays,
            normalizedS2RegionOverlays,
            heartsoundSampleRate,
            heartsoundCandidateSettings
          )
        : { s3Candidates: [], s4Candidates: [] };
    const s3CandidateOverlays =
      workspaceKind === "heartsound" && panel.visibleSeries.s3Candidates
        ? heartsoundCandidates.s3Candidates
        : [];
    const s4CandidateOverlays =
      workspaceKind === "heartsound" && panel.visibleSeries.s4Candidates
        ? heartsoundCandidates.s4Candidates
        : [];
    const rsLookups = {
      s1Start: buildPairValueLookup(s1StartPairs),
      s1End: buildPairValueLookup(s1EndPairs),
      s2Start: buildPairValueLookup(s2StartPairs),
      s2End: buildPairValueLookup(s2EndPairs),
    };
    const selectedCycleMeasurementContext: HeartsoundCycleMeasurementContext | null =
      workspaceKind === "heartsound" && selectedCycle
        ? (() => {
            const s1Overlay =
              normalizedS1RegionOverlays.find((overlay) => overlay.areaStart === selectedCycle.startIndex) ?? null;
            if (!s1Overlay) {
              return null;
            }
            const s1OverlayIndex = normalizedS1RegionOverlays.findIndex(
              (overlay) => overlay.areaStart === s1Overlay.areaStart && overlay.areaEnd === s1Overlay.areaEnd
            );
            const nextS1Overlay =
              s1OverlayIndex >= 0 && s1OverlayIndex + 1 < normalizedS1RegionOverlays.length
                ? normalizedS1RegionOverlays[s1OverlayIndex + 1]
                : null;
            if (nextS1Overlay && nextS1Overlay.areaStart !== selectedCycle.endIndex) {
              return null;
            }
            const s2Overlay =
              normalizedS2RegionOverlays.find((overlay) => {
                if (overlay.areaStart < s1Overlay.areaEnd) {
                  return false;
                }
                if (nextS1Overlay && overlay.areaStart >= nextS1Overlay.areaStart) {
                  return false;
                }
                if (nextS1Overlay && overlay.areaEnd >= nextS1Overlay.areaStart) {
                  return false;
                }
                return true;
              }) ?? null;

            return {
              s1Overlay,
              s2Overlay,
              nextS1Overlay,
            };
          })()
        : null;
    const selectedParameterMeasurement =
      workspaceKind === "heartsound" &&
      selectedParameterMetricKey &&
      selectedCycleMeasurementContext
        ? buildParameterMeasurementAnnotation(
            selectedParameterMetricKey,
            selectedCycleMeasurementContext,
            rsLookups
          )
        : null;
    const overviewPairs = overviewPlot
      ? toDataPairs(overviewPlot.x, overviewPlot.amplitude)
      : amplitudePairs;
    const ecgMarkerMode = panel.styleOptions.ecgMarkerMode;
    const unsupervisedCycles = unsupervisedSummary?.cycles ?? [];
    const displayedUnsupervisedCycles = unsupervisedCycles;
    const secondaryAxisMax =
      workspaceKind === "ecg"
        ? ecgMarkerMode === "point"
          ? ECG_POINT_SECONDARY_AXIS_MAX
          : ECG_SECONDARY_AXIS_MAX
        : HEARTSOUND_SECONDARY_AXIS_MAX;
    const showSecondaryAxis =
      workspaceKind === "heartsound"
        ? panel.visibleSeries.s1Start ||
          panel.visibleSeries.s1End ||
          panel.visibleSeries.s2Start ||
          panel.visibleSeries.s2End
        : panel.visibleSeries.majorPs ||
          panel.visibleSeries.majorPe ||
          panel.visibleSeries.majorQrss ||
          panel.visibleSeries.majorQrse ||
          panel.visibleSeries.majorTs;
    const barWidth = workspaceKind === "heartsound" ? HEARTSOUND_RS_BAR_WIDTH : ECG_BAR_WIDTH;

    const mainSeries: NonNullable<EChartsOption["series"]> = [];
    if (panel.visibleSeries.amplitude) {
      mainSeries.push({
        name: workspaceKind === "ecg" ? "raw" : "Amplitude",
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: RAW_SERIES_Z,
        showSymbol: false,
        animation: false,
        lineStyle: {
          width: panel.styleOptions.amplitudeLineWidth,
          color: workspaceKind === "ecg" ? ECG_SERIES_COLORS.amplitude : "#79c0ff"
        },
        itemStyle: { color: workspaceKind === "ecg" ? ECG_SERIES_COLORS.amplitude : "#79c0ff" },
        data: amplitudePairs
      });
    }
    const noteSeries =
      isLabelingMode ? buildChartNoteMarkerSeries(panel.chartNoteMarkers, amplitudePairs) : null;
    if (noteSeries) {
      mainSeries.push(noteSeries);
    }
    if (workspaceKind === "heartsound" && selectedCycle && panel.showSelectedCycleHighlight) {
      mainSeries.push({
        name: "Selected Cycle",
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 0,
        silent: true,
        showSymbol: false,
        animation: false,
        lineStyle: { opacity: 0 },
        data: [],
        markArea: {
          silent: true,
          label: {
            show: true,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            position: "top",
            distance: 2,
            formatter: "Cycle"
          },
          itemStyle: {
            color: "rgba(255, 77, 166, 0)",
            borderColor: "rgba(255, 77, 166, 0.98)",
            borderWidth: 2.4,
            borderType: "solid"
          },
          data: [[{ xAxis: selectedCycle.startIndex }, { xAxis: selectedCycle.endIndex }]]
        }
      });
    }
    if (workspaceKind === "heartsound" && selectedParameterMeasurement && amplitudePairs.length > 0) {
      const annotationY = amplitudeMin + amplitudeSpan * 0.12;

      mainSeries.push({
        name: "Parameter Measurement",
        type: "custom",
        xAxisIndex: 0,
        yAxisIndex: 0,
        clip: true,
        silent: true,
        animation: false,
        encode: {
          x: [0, 1],
          y: 2,
          tooltip: []
        },
        data: [[
          selectedParameterMeasurement.startIndex,
          selectedParameterMeasurement.endIndex,
          annotationY,
          selectedParameterMeasurement.label,
          selectedParameterMeasurement.color,
          selectedParameterMeasurement.kind,
        ]],
        renderItem(_params, api) {
          const startValue = Number(api.value(0));
          const endValue = Number(api.value(1));
          const yValue = Number(api.value(2));
          const label = String(api.value(3) ?? "");
          const color = String(api.value(4) ?? "#f78166");
          const kind = String(api.value(5) ?? "range");
          const startPoint = api.coord([startValue, yValue]);
          const endPoint = api.coord([endValue, yValue]);
          const lineY = startPoint[1];
          const midX = (startPoint[0] + endPoint[0]) / 2;
          const arrowSize = Math.max(6, Math.min(10, Math.abs(endPoint[0] - startPoint[0]) / 8));

          if (kind === "point" || startValue === endValue) {
            return {
              type: "group",
              children: [
                {
                  type: "line",
                  shape: {
                    x1: startPoint[0],
                    y1: lineY - 18,
                    x2: startPoint[0],
                    y2: lineY + 18,
                  },
                  style: {
                    stroke: color,
                    lineWidth: 2,
                    opacity: 0.95,
                  },
                },
                {
                  type: "circle",
                  shape: {
                    cx: startPoint[0],
                    cy: lineY,
                    r: 4,
                  },
                  style: {
                    fill: color,
                    opacity: 0.98,
                  },
                },
                {
                  type: "text",
                  style: {
                    x: startPoint[0],
                    y: lineY - 22,
                    text: label,
                    fill: color,
                    font: "700 11px sans-serif",
                    textAlign: "center",
                    textVerticalAlign: "bottom",
                  },
                },
              ],
            };
          }

          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: {
                  x1: startPoint[0],
                  y1: lineY,
                  x2: endPoint[0],
                  y2: lineY
                },
                style: {
                  stroke: color,
                  lineWidth: 2.1,
                  opacity: 0.9
                }
              },
              {
                type: "polygon",
                shape: {
                  points: [
                    [startPoint[0], lineY],
                    [startPoint[0] + arrowSize, lineY - arrowSize / 2],
                    [startPoint[0] + arrowSize, lineY + arrowSize / 2]
                  ]
                },
                style: {
                  fill: color,
                  opacity: 0.9
                }
              },
              {
                type: "polygon",
                shape: {
                  points: [
                    [endPoint[0], lineY],
                    [endPoint[0] - arrowSize, lineY - arrowSize / 2],
                    [endPoint[0] - arrowSize, lineY + arrowSize / 2]
                  ]
                },
                style: {
                  fill: color,
                  opacity: 0.9
                }
              },
              {
                type: "text",
                style: {
                  x: midX,
                  y: lineY - 8,
                  text: label,
                  fill: color,
                  font: "700 11px sans-serif",
                  textAlign: "center",
                  textVerticalAlign: "bottom",
                }
              },
            ],
          };
        },
      });
    }
    for (const regionOverlay of [
      ...s1RegionOverlays,
      ...s2RegionOverlays,
      ...s3CandidateOverlays,
      ...s4CandidateOverlays
    ]) {
      const showCandidateLabel = regionOverlay.label === "S3" || regionOverlay.label === "S4";
      mainSeries.push({
        name: `${regionOverlay.label} Region`,
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 0,
        silent: true,
        showSymbol: false,
        animation: false,
        lineStyle: { opacity: 0 },
        itemStyle: { opacity: 0 },
        tooltip: { show: false },
        data: [],
        markArea: {
          silent: true,
          label: showCandidateLabel
            ? {
                show: true,
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 700,
                position: "top",
                distance: 2,
                formatter: regionOverlay.label
              }
            : { show: false },
          itemStyle: {
            color: regionOverlay.fillColor,
            borderColor: regionOverlay.borderColor,
            borderWidth:
              regionOverlay.label === "S3" || regionOverlay.label === "S4"
                ? 2.4
                : 1,
            borderType: "solid"
          },
          data: [[
            { name: regionOverlay.label, xAxis: regionOverlay.areaStart },
            { xAxis: regionOverlay.areaEnd }
          ]]
        }
      });
    }
    if (workspaceKind === "heartsound" && panel.visibleSeries.s1Start) {
      mainSeries.push({
        name: "S1-Start_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#2ea043",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s1StartPairs
      });
    }
    if (workspaceKind === "heartsound" && panel.visibleSeries.s1End) {
      mainSeries.push({
        name: "S1-End_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#d29922",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s1EndPairs
      });
    }
    if (workspaceKind === "heartsound" && panel.visibleSeries.s2Start) {
      mainSeries.push({
        name: "S2-Start_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#db6d28",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s2StartPairs
      });
    }
    if (workspaceKind === "heartsound" && panel.visibleSeries.s2End) {
      mainSeries.push({
        name: "S2-End_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#f85149",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s2EndPairs
      });
    }
    if (workspaceKind === "ecg" && panel.visibleSeries.majorPs) {
      mainSeries.push({
        name: ecgMarkerMode === "point" ? "point_ps" : "major_ps",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: ecgMarkerMode === "point" ? ECG_SERIES_COLORS.pointPs : ECG_SERIES_COLORS.majorPs,
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: ecgMarkerMode === "point" ? pointPsPairs : majorPsPairs
      });
    }
    if (workspaceKind === "ecg" && panel.visibleSeries.majorPe) {
      mainSeries.push({
        name: ecgMarkerMode === "point" ? "point_pe" : "major_pe",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: ecgMarkerMode === "point" ? ECG_SERIES_COLORS.pointPe : ECG_SERIES_COLORS.majorPe,
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: ecgMarkerMode === "point" ? pointPePairs : majorPePairs
      });
    }
    if (workspaceKind === "ecg" && panel.visibleSeries.majorQrss) {
      mainSeries.push({
        name: ecgMarkerMode === "point" ? "point_qrss" : "major_qrss",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: ecgMarkerMode === "point" ? ECG_SERIES_COLORS.pointQrss : ECG_SERIES_COLORS.majorQrss,
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: ecgMarkerMode === "point" ? pointQrssPairs : majorQrssPairs
      });
    }
    if (workspaceKind === "ecg" && panel.visibleSeries.majorQrse) {
      mainSeries.push({
        name: ecgMarkerMode === "point" ? "point_qrse" : "major_qrse",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: ecgMarkerMode === "point" ? ECG_SERIES_COLORS.pointQrse : ECG_SERIES_COLORS.majorQrse,
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: ecgMarkerMode === "point" ? pointQrsePairs : majorQrsePairs
      });
    }
    if (workspaceKind === "ecg" && panel.visibleSeries.majorTs) {
      mainSeries.push({
        name: ecgMarkerMode === "point" ? "point_ts" : "major_ts",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        z: BAR_SERIES_Z,
        barWidth,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: ecgMarkerMode === "point" ? ECG_SERIES_COLORS.pointTs : ECG_SERIES_COLORS.majorTs,
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: ecgMarkerMode === "point" ? pointTsPairs : majorTsPairs
      });
    }
    mainSeries.push({
      name: "Navigator",
      type: "line",
      xAxisIndex: 1,
      yAxisIndex: 3,
      showSymbol: false,
      animation: false,
      silent: true,
      lineStyle: {
        width: 1,
        color: "rgba(121,192,255,0.65)"
      },
      areaStyle: {
        color: "rgba(121,192,255,0.12)"
      },
      data: overviewPairs
    });

    if (panel.showUnsupervisedOverlay && panel.unsupervisedFileId && displayedUnsupervisedCycles.length > 0) {
      mainSeries.push({
        name: "Unsupervised Cycles",
        type: "custom",
        xAxisIndex: 0,
        yAxisIndex: 0,
        clip: true,
        silent: true,
        animation: false,
        encode: {
          x: [0, 1],
          y: 2,
          tooltip: []
        },
        data: displayedUnsupervisedCycles.map((cycle) => [
          cycle.startIndex,
          cycle.endIndex,
          0,
          cycle.cluster,
        ]),
        renderItem(_params, api) {
          const startValue = Number(api.value(0));
          const endValue = Number(api.value(1));
          const yValue = Number(api.value(2));
          const cluster = String(api.value(3) ?? "");

          const startPoint = api.coord([startValue, yValue]);
          const endPoint = api.coord([endValue, yValue]);
          const arrowSize = Math.max(6, Math.min(10, Math.abs(endPoint[0] - startPoint[0]) / 8));
          const lineY = startPoint[1];
          const midX = (startPoint[0] + endPoint[0]) / 2;
          const labelY = lineY + 15;

          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: {
                  x1: startPoint[0],
                  y1: lineY,
                  x2: endPoint[0],
                  y2: lineY
                },
                style: {
                  stroke: "#f2cc60",
                  lineWidth: 1.6,
                  opacity: 0.55
                }
              },
              {
                type: "polygon",
                shape: {
                  points: [
                    [startPoint[0], lineY],
                    [startPoint[0] + arrowSize, lineY - arrowSize / 2],
                    [startPoint[0] + arrowSize, lineY + arrowSize / 2]
                  ]
                },
                style: {
                  fill: "#f2cc60",
                  opacity: 0.55
                }
              },
              {
                type: "polygon",
                shape: {
                  points: [
                    [endPoint[0], lineY],
                    [endPoint[0] - arrowSize, lineY - arrowSize / 2],
                    [endPoint[0] - arrowSize, lineY + arrowSize / 2]
                  ]
                },
                style: {
                  fill: "#f2cc60",
                  opacity: 0.55
                }
              },
              {
                type: "text",
                style: {
                  x: midX,
                  y: labelY,
                  text: cluster,
                  fill: "#fff7d6",
                  stroke: "rgba(22, 27, 34, 0.92)",
                  lineWidth: 3,
                  textAlign: "center",
                  textVerticalAlign: "top",
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.92
                }
              }
            ]
          };
        }
      });
    }

    return {
      animation: false,
      grid: [
        {
          left: 48,
          right: 50,
          top: 28,
          bottom: 116
        },
        {
          left: 48,
          right: 50,
          height: 48,
          bottom: 52
        }
      ],
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line"
        },
        backgroundColor: "#161b22",
        borderColor: "#30363d",
        textStyle: {
          color: "#c9d1d9"
        }
      },
      xAxis: [
        {
          type: "value",
          min: safeStart,
          max: safeEnd,
          axisLine: {
            lineStyle: { color: "#30363d" }
          },
          axisLabel: { color: "#8b949e" },
          splitLine: {
            lineStyle: { color: "#21262d" }
          }
        },
        {
          type: "value",
          gridIndex: 1,
          min: 0,
          max: maxIndex,
          axisLine: {
            lineStyle: { color: "#30363d" }
          },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          type: "value",
          scale: panel.styleOptions.yAxisAutoScale,
          axisLine: {
            lineStyle: { color: "#30363d" }
          },
          axisLabel: { color: "#8b949e" },
          splitLine: {
            lineStyle: { color: "#21262d" }
          }
        },
        {
          type: "value",
          position: "right",
          min: RS_SCORE_AXIS_MIN,
          max: secondaryAxisMax,
          scale: panel.styleOptions.yAxisAutoScale,
          show: showSecondaryAxis,
          axisLine: {
            lineStyle: { color: "#30363d" }
          },
          axisLabel: { color: "#8b949e" },
          splitLine: { show: false }
        },
        {
          type: "value",
          min: 0,
          max: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        },
        {
          type: "value",
          gridIndex: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: [1],
          filterMode: "none",
          realtime: true,
          showDataShadow: true,
          startValue: safeStart,
          endValue: safeEnd,
          bottom: 10,
          height: 20,
          borderColor: "#30363d",
          fillerColor: "rgba(121,192,255,0.2)",
          handleStyle: {
            color: "#79c0ff",
            borderColor: "#58a6ff"
          },
          textStyle: { color: "#8b949e" }
        }
      ],
      series: mainSeries
    };
  }, [
    activePlot,
    heartsoundCandidateSettings,
    isLabelingMode,
    overviewPlot,
    panel,
    selectedCycle,
    unsupervisedSummary,
    waveDurationSeconds,
    workspaceKind
  ]);

  const chartLegendItems = useMemo(() => {
    const seriesItems =
      workspaceKind === "heartsound"
        ? HEARTSOUND_SERIES_ITEMS
        : ECG_SERIES_ITEMS_BY_MODE[panel.styleOptions.ecgMarkerMode];

    return seriesItems.filter(
      (seriesItem) =>
        seriesItem.key !== "amplitude" &&
        seriesItem.key !== "s3Candidates" &&
        seriesItem.key !== "s4Candidates" &&
        panel.visibleSeries[seriesItem.key]
    );
  }, [panel.styleOptions.ecgMarkerMode, panel.visibleSeries, workspaceKind]);

  const onDataZoom = useCallback(
    (event: {
      batch?: Array<{
        start?: number;
        end?: number;
        startValue?: number;
        endValue?: number;
      }>;
      start?: number;
      end?: number;
      startValue?: number;
      endValue?: number;
    }) => {
      if (!panel.fileId || panel.totalRows === null || panel.totalRows <= 0) {
        return;
      }

      const payload = Array.isArray(event.batch) && event.batch.length > 0 ? event.batch[0] : event;
      const maxIndex = Math.max(panel.totalRows - 1, 0);

      let nextStart: number | undefined;
      let nextEnd: number | undefined;

      if (typeof payload.startValue === "number" && typeof payload.endValue === "number") {
        nextStart = Math.round(payload.startValue);
        nextEnd = Math.round(payload.endValue);
      } else if (typeof payload.start === "number" && typeof payload.end === "number") {
        nextStart = Math.round((payload.start / 100) * maxIndex);
        nextEnd = Math.round((payload.end / 100) * maxIndex);
      }

      if (nextStart === undefined || nextEnd === undefined) {
        return;
      }

      const clampedStart = clampNumber(nextStart, 0, maxIndex);
      const clampedEnd = clampNumber(nextEnd, clampedStart, maxIndex);

      if (sliderDebounceRef.current !== null) {
        window.clearTimeout(sliderDebounceRef.current);
      }
      sliderDebounceRef.current = window.setTimeout(() => {
        onSliderRangeCommit(panel.panelId, clampedStart, clampedEnd);
      }, 240);
    },
    [onSliderRangeCommit, panel.fileId, panel.panelId, panel.totalRows]
  );

  const onChartClick = useCallback(
    (event: { seriesName?: string; value?: unknown }) => {
      const rawValue = Array.isArray(event.value) ? event.value[0] : event.value;
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return;
      }

      if (!panel.fileId || panel.totalRows === null || panel.totalRows <= 0) {
        return;
      }

      const maxIndex = Math.max(panel.totalRows - 1, 0);
      const clickedIndex = clampNumber(Math.round(rawValue), 0, maxIndex);

      if (isLabelingMode && event.seriesName !== "Navigator") {
        onSelectLabelingAnchor(panel.panelId, clickedIndex);
        return;
      }

      if (event.seriesName !== "Navigator") {
        return;
      }

      const currentWidth = Math.max(panel.rangeEnd - panel.rangeStart, 0);
      const halfWidth = Math.floor(currentWidth / 2);

      let nextStart = clickedIndex - halfWidth;
      let nextEnd = nextStart + currentWidth;

      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = Math.min(maxIndex, currentWidth);
      } else if (nextEnd > maxIndex) {
        nextEnd = maxIndex;
        nextStart = Math.max(0, maxIndex - currentWidth);
      }

      onSliderRangeCommit(panel.panelId, nextStart, nextEnd);
    },
    [
      isLabelingMode,
      onSelectLabelingAnchor,
      onSliderRangeCommit,
      panel.fileId,
      panel.panelId,
      panel.rangeEnd,
      panel.rangeStart,
      panel.totalRows,
    ]
  );

  return (
    <article
      className={isActive ? "panel-card active" : "panel-card"}
      onClick={() => onActivate(panel.panelId)}
    >
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-title">Panel {panel.panelId}</div>
          <div className="panel-file">{panel.fileName ?? "No file assigned"}</div>
          {panel.waveFileName ? (
            <div className="panel-linked-parameter">Wave: {panel.waveFileName}</div>
          ) : null}
          {parameterSourceName ? (
            <div className="panel-linked-parameter">Parameter: {parameterSourceName}</div>
          ) : null}
          {panel.unsupervisedFileName ? (
            <div className="panel-linked-parameter">Unsupervised: {panel.unsupervisedFileName}</div>
          ) : null}
          {isLabelingMode && isActive ? (
            <div className="panel-linked-parameter">
              Label sample: {labelingAnchorIndex === null ? "-" : formatRowNumber(labelingAnchorIndex)}
            </div>
          ) : null}
        </div>

        <div
          className="panel-media-controls panel-media-controls-centered"
          aria-label="Wave playback controls"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={rewindAnimating ? "media-control-button is-animating" : "media-control-button"}
            aria-label="Back 5 seconds"
            title={panel.waveFileId ? "Back 5 seconds" : "Link a wave file to use playback"}
            disabled={!panel.waveFileId}
            onClick={() => seekWaveBySeconds(-5)}
          >
            <RewindFiveIcon />
          </button>
          <button
            type="button"
            className="media-control-button media-control-button-primary"
            aria-label={isWavePlaying ? "Pause wave playback" : "Play wave playback"}
            title={panel.waveFileId ? (isWavePlaying ? "Pause" : "Play") : "Link a wave file to use playback"}
            disabled={!panel.waveFileId}
            onClick={() => {
              void toggleWavePlayback();
            }}
          >
            {isWavePlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="media-control-button"
            aria-label="Forward 5 seconds"
            title={panel.waveFileId ? "Forward 5 seconds" : "Link a wave file to use playback"}
            disabled={!panel.waveFileId}
            onClick={() => seekWaveBySeconds(5)}
          >
            <ForwardFiveIcon />
          </button>
          <button
            type="button"
            className="media-control-button"
            aria-label="Reset wave playback to 0 seconds"
            title={panel.waveFileId ? "Reset to 0 seconds" : "Link a wave file to use playback"}
            disabled={!panel.waveFileId}
            onClick={resetWavePlayback}
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            className="media-control-button media-control-button-rate"
            aria-label={`Wave playback speed ${wavePlaybackRate.toFixed(2)}x`}
            title={
              panel.waveFileId
                ? `Playback speed ${wavePlaybackRate.toFixed(2)}x`
                : "Link a wave file to use playback"
            }
            disabled={!panel.waveFileId}
            onClick={cycleWavePlaybackRate}
          >
            <span className="media-control-rate-label">{wavePlaybackRate.toFixed(2).replace(/\.00$/, "")}x</span>
          </button>
        </div>

        <div className="panel-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="panel-action-button"
            onClick={() => onResetDisplayDefaults(panel.panelId)}
          >
            Default
          </button>
          <button
            type="button"
            className="panel-action-button panel-action-button-danger"
            onClick={() => onOpenSeriesPicker(panel.panelId)}
          >
            Detail
          </button>
          {isLabelingMode ? (
            <>
              {(["q", "w", "e", "r"] as ChartNoteMarkerKey[]).map((keyTag) => {
                const markerStyle = CHART_NOTE_MARKER_STYLES[keyTag];
                return (
                  <button
                    key={keyTag}
                    type="button"
                    className="panel-action-button"
                    style={{ borderColor: markerStyle.color, color: markerStyle.color }}
                    onClick={() => {
                      if (labelingAnchorIndex === null) {
                        return;
                      }
                      onAddLabelingMarker(panel.panelId, labelingAnchorIndex, keyTag);
                    }}
                    disabled={labelingAnchorIndex === null}
                    title={labelingAnchorIndex === null ? "Click the graph first" : `Add ${markerStyle.label} label`}
                  >
                    {markerStyle.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="panel-action-button"
                onClick={() => onClearLabelingMarkers(panel.panelId)}
                disabled={panel.chartNoteMarkers.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="panel-action-button"
                onClick={() => onDownloadLabelingExport(panel.panelId)}
                disabled={!panel.fileId || isLabelingExporting}
              >
                {isLabelingExporting ? "Preparing..." : "Download xlsx"}
              </button>
            </>
          ) : (
            <label
              className={`panel-parameter-toggle${panel.showParameterSummary ? " is-active" : ""}`}
              title="Toggle parameter panel"
              aria-label="Toggle parameter panel"
            >
              <input
                className="panel-parameter-toggle-input"
                type="checkbox"
                checked={panel.showParameterSummary}
                onChange={() => onToggleParameterSummary(panel.panelId)}
              />
              <span className="panel-parameter-toggle-label">
                <ParameterIcon />
              </span>
            </label>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label={`Open settings for panel ${panel.panelId}`}
            title="Panel settings"
            onClick={() => onOpenSettings(panel.panelId)}
          >
            <GearIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Reset panel ${panel.panelId}`}
            title="Reset panel"
            onClick={() => onResetPanel(panel.panelId)}
          >
            <ResetIcon />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {!panel.fileId ? (
          <div className="empty-state">No file assigned</div>
        ) : !chartOption ? (
          <div className="empty-state">Loading chart data...</div>
        ) : (
          <div
            ref={panelWrapperRef}
            className={
              showParameterSection ? "panel-chart-wrapper dual-panel" : "panel-chart-wrapper"
            }
          >
            <div className="panel-chart-section" style={chartSectionStyle}>
              <div ref={chartHostRef} className="panel-chart-host">
                <ReactECharts
                  ref={chartRef}
                  option={chartOption}
                  style={{ width: "100%", height: "100%" }}
                  onEvents={{ datazoom: onDataZoom, click: onChartClick }}
                  notMerge
                  lazyUpdate
                />
                {panel.waveFileId && playheadPixelLeft !== null ? (
                  <div
                    className={
                      isPlayheadDragging
                        ? "chart-playhead-overlay is-dragging"
                        : "chart-playhead-overlay"
                    }
                    style={{ left: `${playheadPixelLeft}px` }}
                    aria-hidden="true"
                  >
                    <div className="chart-playhead-line" />
                    <button
                      type="button"
                      className="chart-playhead-handle"
                      aria-label="Drag audio playhead"
                      title="Drag to adjust audio position"
                      style={{ top: `${PLAYHEAD_HANDLE_TOP}px` }}
                      onPointerDown={onPlayheadPointerDown}
                    >
                      <span className="chart-playhead-handle-dot" />
                    </button>
                  </div>
                ) : null}
                {chartLegendItems.length > 0 ? (
                  <div className="panel-chart-legend" aria-label="Visible chart series">
                    {chartLegendItems.map((seriesItem) => (
                      <div key={seriesItem.key} className="panel-chart-legend-item">
                        <span
                          className={
                            seriesItem.fillColor
                              ? "panel-chart-legend-swatch area"
                              : "panel-chart-legend-swatch"
                          }
                          style={{
                            background: seriesItem.fillColor ?? seriesItem.color,
                            borderColor: seriesItem.borderColor ?? seriesItem.color
                          }}
                        />
                        <span
                          className="panel-chart-legend-label"
                          style={{ color: seriesItem.color }}
                        >
                          {seriesItem.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {plotState.loading ? <div className="panel-chart-overlay">Loading...</div> : null}
              </div>
              <div className="panel-range-info">
                rows {formatRowNumber(panel.rangeStart)} - {formatRowNumber(panel.rangeEnd)}
                {panel.totalRows !== null ? ` / total ${formatRowNumber(panel.totalRows)}` : ""}
                {plotState.current?.isDownsampled ? " (optimized view)" : ""}
              </div>
              {rangeGuide ? (
                <div className="panel-range-guide">
                  previous {formatRowNumber(panel.previousRangeStart ?? 0)} -{" "}
                  {formatRowNumber(panel.previousRangeEnd ?? 0)} | overlap{" "}
                  {formatRowNumber(rangeGuide.overlapRows)} rows | new on {rangeGuide.direction}{" "}
                  {formatRowNumber(rangeGuide.newRows)} rows
                </div>
              ) : null}
              {panel.unsupervisedFileId && unsupervisedState.loading ? (
                <div className="panel-range-guide">Loading unsupervised cycle overlays...</div>
              ) : null}
              {panel.unsupervisedFileId && unsupervisedState.error ? (
                <div className="panel-chart-error">{unsupervisedState.error}</div>
              ) : null}
              {plotState.error ? <div className="panel-chart-error">{plotState.error}</div> : null}
            </div>
            {showParameterSection ? (
              <button
                type="button"
                className={isSplitDragging ? "panel-split-handle dragging" : "panel-split-handle"}
                aria-label={`Resize chart and parameter sections for panel ${panel.panelId}`}
                title="Drag to resize"
                onPointerDown={onSplitHandlePointerDown}
                onClick={(event) => event.preventDefault()}
          >
            <span className="panel-split-handle-bar" />
          </button>
            ) : null}
            {showParameterSection ? (
              <div className="panel-parameter-section" style={parameterSectionStyle}>
                {parameterSourceFileId ? (
                  <div className="parameter-summary-shell">
                    <div className="parameter-summary-header">
                      <div className="parameter-summary-title">Parameter window</div>
                      <div className="parameter-summary-header-actions">
                        <button
                          type="button"
                          className="parameter-download-button"
                          onClick={() => onDownloadParameterExport(panel.panelId)}
                          disabled={isParameterExporting}
                        >
                          {isParameterExporting ? "Preparing xlsx..." : "Download xlsx"}
                        </button>
                        <label
                          className={`panel-parameter-toggle parameter-highlight-toggle${
                            panel.showSelectedCycleHighlight ? " is-active" : ""
                          }`}
                        >
                          <input
                            className="parameter-highlight-toggle-input"
                            type="checkbox"
                            checked={panel.showSelectedCycleHighlight}
                            onChange={() => onToggleSelectedCycleHighlight(panel.panelId)}
                          />
                          <span className="parameter-highlight-toggle-label">
                            <span className="parameter-highlight-toggle-box" aria-hidden="true">
                              <span className="parameter-highlight-toggle-check" />
                            </span>
                            <span>Cycle</span>
                          </span>
                        </label>
                        <label
                          className={`panel-parameter-toggle parameter-highlight-toggle${
                            panel.showUnsupervisedOverlay ? " is-active" : ""
                          }`}
                        >
                          <input
                            className="parameter-highlight-toggle-input"
                            type="checkbox"
                            checked={panel.showUnsupervisedOverlay}
                            onChange={() => onToggleUnsupervisedOverlay(panel.panelId)}
                          />
                          <span className="parameter-highlight-toggle-label">
                            <span className="parameter-highlight-toggle-box" aria-hidden="true">
                              <span className="parameter-highlight-toggle-check" />
                            </span>
                            <span>Unsupervised</span>
                          </span>
                        </label>
                        <div className="parameter-summary-range">
                          rows {formatRowNumber(panel.rangeStart)} - {formatRowNumber(panel.rangeEnd)}
                        </div>
                      </div>
                    </div>
                    {parameterState.loading ? (
                      <div className="parameter-summary-empty">Loading parameter summary...</div>
                    ) : parameterState.error ? (
                      <div className="panel-chart-error">{parameterState.error}</div>
                    ) : parameterSummary ? (
                      <>
                        {workspaceKind === "heartsound" &&
                        (parameterSummary.cycles?.length ?? 0) > 0 &&
                        displayedParameterGroups.length > 0 ? (
                          <div className="parameter-cycle-toolbar">
                            <div className="parameter-cycle-field">
                              <span className="parameter-cycle-label">Cycle</span>
                              <div className="parameter-cycle-stepper" role="group" aria-label="Cycle navigation">
                                <button
                                  type="button"
                                  className="parameter-cycle-stepper-button"
                                  aria-label="Previous cycle"
                                  title="Previous cycle"
                                  disabled={selectedCycleOffset <= 0}
                                  onClick={() => {
                                    const previousCycle = parameterCycles[selectedCycleOffset - 1];
                                    if (previousCycle) {
                                      onSelectCycle(panel.panelId, previousCycle.cycleIndex);
                                    }
                                  }}
                                >
                                  <svg viewBox="0 0 16 16" aria-hidden="true">
                                    <path
                                      d="M10.5 3.5 6 8l4.5 4.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <div className="parameter-cycle-current">
                                  {selectedCycle ? `Cycle ${selectedCycle.cycleIndex}` : "-"}
                                </div>
                                <button
                                  type="button"
                                  className="parameter-cycle-stepper-button"
                                  aria-label="Next cycle"
                                  title="Next cycle"
                                  disabled={
                                    selectedCycleOffset < 0 || selectedCycleOffset >= parameterCycles.length - 1
                                  }
                                  onClick={() => {
                                    const nextCycle = parameterCycles[selectedCycleOffset + 1];
                                    if (nextCycle) {
                                      onSelectCycle(panel.panelId, nextCycle.cycleIndex);
                                    }
                                  }}
                                >
                                  <svg viewBox="0 0 16 16" aria-hidden="true">
                                    <path
                                      d="M5.5 3.5 10 8l-4.5 4.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {selectedCycle ? (
                              <div className="parameter-cycle-range">
                                highlight {formatRowNumber(selectedCycle.startIndex)} -{" "}
                                {formatRowNumber(selectedCycle.endIndex)}
                              </div>
                            ) : null}
                            {heartRateMetric ? (
                              (() => {
                                const heartRateTooltip = getHeartsoundParameterTooltipContent(
                                  heartRateMetric.key,
                                  heartRateMetric.label
                                );
                                return (
                                  <button
                                    type="button"
                                    className={`parameter-cycle-heart-rate${
                                      selectedParameterMetricKey === heartRateMetric.key ? " is-active" : ""
                                    }`}
                                    onClick={() => onSelectParameterMetric(panel.panelId, heartRateMetric.key)}
                                  >
                                    <span className="parameter-cycle-heart-rate-label">HR</span>
                                    <span className="parameter-cycle-heart-rate-value">
                                      {formatHeartsoundParameterMetricValue(
                                        heartRateMetric.mean,
                                        heartRateMetric.key
                                      )}
                                      {heartRateMetric.unit ? ` ${heartRateMetric.unit}` : ""}
                                    </span>
                                    {heartRateTooltip ? (
                                      <span
                                        className="heartsound-parameter-tooltip parameter-cycle-heart-rate-tooltip"
                                        role="tooltip"
                                      >
                                        <span className="heartsound-parameter-tooltip-title">
                                          {heartRateTooltip.title}
                                        </span>
                                        <span className="heartsound-parameter-tooltip-summary">
                                          {heartRateTooltip.summary}
                                        </span>
                                        <span className="heartsound-parameter-tooltip-schematic">
                                          {heartRateTooltip.schematic}
                                        </span>
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })()
                            ) : null}
                          </div>
                        ) : null}
                        {workspaceKind === "heartsound" && heartsoundParameterSections.length > 0 ? (
                          <div className="heartsound-parameter-layout">
                            {heartsoundParameterSections.map((section) => (
                              <section
                                key={section.key}
                                className={`heartsound-parameter-section ${section.toneClassName}`}
                              >
                                <div className="heartsound-parameter-section-header">
                                  <div className="heartsound-parameter-section-title">{section.title}</div>
                                  <div className="heartsound-parameter-section-subtitle">{section.subtitle}</div>
                                </div>
                                <div className="heartsound-parameter-section-body">
                                  {section.groups.map((group) => (
                                    <div key={group.key} className="heartsound-parameter-block">
                                      {section.groups.length > 1 && section.key !== "relation" ? (
                                        <div
                                          className={`heartsound-parameter-block-title${
                                            group.key.startsWith("rs_score") ? " is-rs-score" : ""
                                          }`}
                                        >
                                          {group.label}
                                        </div>
                                      ) : null}
                                      <div className="heartsound-parameter-metric-grid">
                                        {group.metrics.map((metric) => {
                                          const metricUnit = metric.unit ?? getParameterMetricUnit(metric.key);
                                          const metricTooltip = getHeartsoundParameterTooltipContent(
                                            metric.key,
                                            metric.label
                                          );
                                          return (
                                            <button
                                              key={metric.key}
                                              type="button"
                                              className={`heartsound-parameter-metric-card${
                                                selectedParameterMetricKey === metric.key ? " is-active" : ""
                                              }`}
                                              onClick={() => onSelectParameterMetric(panel.panelId, metric.key)}
                                            >
                                              <div className="heartsound-parameter-metric-name">{metric.label}</div>
                                              <div className="heartsound-parameter-metric-value-row">
                                                <div className="heartsound-parameter-metric-value">
                                                  {formatHeartsoundParameterMetricValue(metric.mean, metric.key)}
                                                </div>
                                                {metricUnit && metricUnit !== "무단위" ? (
                                                  <div className="heartsound-parameter-metric-unit">{metricUnit}</div>
                                                ) : null}
                                              </div>
                                              {metricTooltip ? (
                                                <div className="heartsound-parameter-tooltip" role="tooltip">
                                                  <div className="heartsound-parameter-tooltip-title">
                                                    {metricTooltip.title}
                                                  </div>
                                                  <div className="heartsound-parameter-tooltip-summary">
                                                    {metricTooltip.summary}
                                                  </div>
                                                  <div className="heartsound-parameter-tooltip-schematic">
                                                    {metricTooltip.schematic}
                                                  </div>
                                                </div>
                                              ) : null}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        ) : displayedParameterGroups.length > 0 ? (
                          <div className="parameter-group-list">
                            {displayedParameterGroups.map((group) => {
                              return (
                                <section key={group.key} className="parameter-group-card">
                                  <div className="parameter-group-title">{group.label}</div>
                                  {group.description ? (
                                    <div className="parameter-group-description">{group.description}</div>
                                  ) : null}
                                  <div className="parameter-metric-list">
                                    {group.metrics.map((metric) => {
                                      const metricUnit = metric.unit ?? getParameterMetricUnit(metric.key);
                                      return (
                                        <div key={metric.key} className="parameter-metric-row">
                                          <div className="parameter-metric-label">
                                            <div className="parameter-metric-label-main">
                                              <span>{metric.label}</span>
                                            </div>
                                            {metric.description ? (
                                              <div className="parameter-metric-description">{metric.description}</div>
                                            ) : null}
                                          </div>
                                          <div className="parameter-metric-value">
                                            <span className="parameter-metric-value-label">값</span>
                                            <span className="parameter-metric-value-number">
                                              {metricUnit && metricUnit !== "무단위"
                                                ? `${formatMetricValue(metric.mean)} ${metricUnit}`
                                                : formatMetricValue(metric.mean)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </section>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="parameter-summary-empty">
                            아직 추가된 parameter가 없습니다.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="parameter-summary-empty">
                        아직 추가된 parameter가 없습니다.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="parameter-summary-shell parameter-summary-shell-empty">
                    <div className="parameter-summary-empty">
                      아직 추가된 parameter가 없습니다.
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <audio ref={waveAudioRef} preload="metadata" hidden src={waveSource ?? undefined} />
    </article>
  );
});

function App() {
  const [appState, setAppState] = useState<AppState>(createAppState());
  const [viewMode, setViewMode] = useState<ViewMode>("analysis");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [accessCodeInput, setAccessCodeInput] = useState<string>("");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>("ms");
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState<string>("");
  const [adminLoginUsername, setAdminLoginUsername] = useState<string>("ms");
  const [adminLoginPassword, setAdminLoginPassword] = useState<string>("");
  const [changeCurrentPassword, setChangeCurrentPassword] = useState<string>("");
  const [changeNewPassword, setChangeNewPassword] = useState<string>("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState<string>("");
  const [adminMessage, setAdminMessage] = useState<string>("");
  const [adminSubmitting, setAdminSubmitting] = useState<boolean>(false);
  const [parameterExportPanelId, setParameterExportPanelId] = useState<PanelId | null>(null);
  const [adminAccessModeDraft, setAdminAccessModeDraft] = useState<AccessMode>("open");
  const [latestAccessCodeExpiresAt, setLatestAccessCodeExpiresAt] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [settingsPanelId, setSettingsPanelId] = useState<PanelId | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [seriesPanelId, setSeriesPanelId] = useState<PanelId | null>(null);
  const [labelingPanelId, setLabelingPanelId] = useState<PanelId | null>(null);
  const [labelingExportPanelId, setLabelingExportPanelId] = useState<PanelId | null>(null);
  const [labelingAnchorIndex, setLabelingAnchorIndex] = useState<number | null>(null);

  const requestSeqRef = useRef<Record<PanelId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const prefetchedRangeRef = useRef<PrefetchedRangeStore>({});
  const keyboardRangeCommitTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const {
    splitMode,
    activePanelId,
    activeFileRole,
    panels,
    panelPlots,
    panelParameters,
    panelUnsupervised,
    filesByWorkspace,
    filesLoadingByWorkspace,
    uploadingByWorkspace,
    heartsoundCandidateSettings,
    searchText,
    statusMessage,
    selectedDeleteIds
  } = appState;
  const visiblePanelIds = PANEL_IDS_BY_MODE[splitMode];
  const activePanel = panels.find((panel) => panel.panelId === activePanelId) ?? panels[0];
  const activeWorkspace = activePanel.workspaceKind;
  const settingsPanel =
    settingsPanelId !== null ? panels.find((panel) => panel.panelId === settingsPanelId) ?? null : null;
  const seriesPanel =
    seriesPanelId !== null ? panels.find((panel) => panel.panelId === seriesPanelId) ?? null : null;
  const labelingPanel =
    labelingPanelId !== null ? panels.find((panel) => panel.panelId === labelingPanelId) ?? null : null;
  const settingsTargetWorkspace = settingsPanel?.workspaceKind ?? activeWorkspace;
  const settingsRangeShiftStep = getRangeShiftStep(settingsTargetWorkspace);
  const files = filesByWorkspace[activeWorkspace];
  const filesLoading = filesLoadingByWorkspace[activeWorkspace];
  const uploading = uploadingByWorkspace[activeWorkspace];
  const availableFileRoleTabs = useMemo(() => getAvailableFileRoleTabs(activeWorkspace), [activeWorkspace]);
  const labelingPlotState = labelingPanelId !== null ? panelPlots[labelingPanelId] : null;
  const labelingActivePlot = labelingPlotState?.current ?? labelingPlotState?.overview ?? null;
  const labelingAmplitudePairs = useMemo(
    () => (labelingActivePlot ? toDataPairs(labelingActivePlot.x, labelingActivePlot.amplitude) : []),
    [labelingActivePlot]
  );
  const labelingAmplitudeLookup = useMemo(
    () => buildPairValueLookup(labelingAmplitudePairs),
    [labelingAmplitudePairs]
  );
  const labelingAnchorAmplitude = useMemo(() => {
    if (labelingAnchorIndex === null) {
      return null;
    }
    return getLookupValue(labelingAmplitudeLookup, labelingAnchorIndex);
  }, [labelingAmplitudeLookup, labelingAnchorIndex]);
  const labelingMarkerCounts = useMemo(() => {
    const counts: Record<ChartNoteMarkerKey, number> = {
      q: 0,
      w: 0,
      e: 0,
      r: 0,
    };
    if (!labelingPanel) {
      return counts;
    }
    for (const marker of labelingPanel.chartNoteMarkers) {
      counts[marker.keyTag] += 1;
    }
    return counts;
  }, [labelingPanel]);
  const labelingModePanelId = viewMode === "labeling" ? activePanelId : null;

  const updateAppState = useCallback((updater: (state: AppState) => AppState) => {
    setAppState((previous) => updater(previous));
  }, []);
  const updateWorkspaceState = useCallback(
    (_workspace: WorkspaceKind, updater: (state: AppState) => AppState) => {
      updateAppState(updater);
    },
    [updateAppState]
  );

  const updatePanelState = useCallback(
    (panelId: PanelId, updater: (panel: PanelState) => PanelState) => {
      updateAppState((previous) => ({
        ...previous,
        panels: previous.panels.map((panel) => (panel.panelId === panelId ? updater(panel) : panel))
      }));
    },
    [updateAppState]
  );

  const setPanelPlotState = useCallback(
    (panelId: PanelId, updater: (state: PanelPlotState) => PanelPlotState) => {
      updateAppState((previous) => ({
        ...previous,
        panelPlots: {
          ...previous.panelPlots,
          [panelId]: updater(previous.panelPlots[panelId])
        }
      }));
    },
    [updateAppState]
  );

  const setPanelParameterState = useCallback(
    (
      panelId: PanelId,
      updater: (state: PanelParameterState) => PanelParameterState
    ) => {
      updateAppState((previous) => ({
        ...previous,
        panelParameters: {
          ...previous.panelParameters,
          [panelId]: updater(previous.panelParameters[panelId])
        }
      }));
    },
    [updateAppState]
  );

  const setPanelUnsupervisedState = useCallback(
    (
      panelId: PanelId,
      updater: (state: PanelUnsupervisedState) => PanelUnsupervisedState
    ) => {
      updateAppState((previous) => ({
        ...previous,
        panelUnsupervised: {
          ...previous.panelUnsupervised,
          [panelId]: updater(previous.panelUnsupervised[panelId])
        }
      }));
    },
    [updateAppState]
  );

  const clearPanelPlotState = useCallback(
    (panelId: PanelId) => {
      requestSeqRef.current[panelId] += 1;
      delete prefetchedRangeRef.current[panelId];
      setPanelPlotState(panelId, () => createEmptyPlotState());
    },
    [setPanelPlotState]
  );

  const clearPanelParameterState = useCallback(
    (panelId: PanelId) => {
      setPanelParameterState(panelId, () => createEmptyParameterState());
    },
    [setPanelParameterState]
  );

  const clearPanelUnsupervisedState = useCallback(
    (panelId: PanelId) => {
      setPanelUnsupervisedState(panelId, () => createEmptyUnsupervisedState());
    },
    [setPanelUnsupervisedState]
  );

  const addPanelChartNoteMarker = useCallback(
    (panelId: PanelId, index: number, keyTag: ChartNoteMarkerKey) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        chartNoteMarkers: panel.chartNoteMarkers.some(
          (marker) => marker.index === index && marker.keyTag === keyTag
        )
          ? panel.chartNoteMarkers
          : [
              ...panel.chartNoteMarkers,
              {
                id: `${keyTag}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                index,
                keyTag,
              },
            ],
      }));
    },
    [updatePanelState]
  );

  useEffect(() => {
    if (labelingModePanelId === null || labelingAnchorIndex === null) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "q" && key !== "w" && key !== "e" && key !== "r") {
        return;
      }

      event.preventDefault();
      addPanelChartNoteMarker(labelingModePanelId, labelingAnchorIndex, key);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [addPanelChartNoteMarker, labelingAnchorIndex, labelingModePanelId]);

  useEffect(() => {
    setLabelingAnchorIndex(null);
  }, [activePanelId, viewMode]);

  const selectPanelCycle = useCallback(
    (panelId: PanelId, cycleIndex: number) => {
      updateAppState((previous) => {
        const targetPanel = previous.panels.find((panel) => panel.panelId === panelId);
        const targetParameterState = previous.panelParameters[panelId];
        const targetCycle = targetParameterState.summary?.cycles?.find(
          (cycle) => cycle.cycleIndex === cycleIndex
        );

        const nextPanelParameters = {
          ...previous.panelParameters,
          [panelId]: {
            ...targetParameterState,
            selectedCycleIndex: cycleIndex,
          },
        };

        if (
          !targetPanel ||
          !targetCycle ||
          targetPanel.totalRows === null ||
          targetPanel.totalRows <= 0
        ) {
          return {
            ...previous,
            panelParameters: nextPanelParameters,
          };
        }

        const cycleIsVisible =
          targetCycle.startIndex >= targetPanel.rangeStart && targetCycle.endIndex <= targetPanel.rangeEnd;
        if (cycleIsVisible) {
          return {
            ...previous,
            panelParameters: nextPanelParameters,
          };
        }

        const maxIndex = Math.max(targetPanel.totalRows - 1, 0);
        const visibleWidth = Math.max(targetPanel.rangeEnd - targetPanel.rangeStart, 0);
        const cycleWidth = Math.max(targetCycle.endIndex - targetCycle.startIndex, 0);
        const viewportWidth = Math.max(visibleWidth, cycleWidth);
        const centeredStart = clampNumber(
          Math.round((targetCycle.startIndex + targetCycle.endIndex) / 2 - viewportWidth / 2),
          0,
          maxIndex
        );
        const centeredEnd = clampNumber(centeredStart + viewportWidth, centeredStart, maxIndex);

        return {
          ...previous,
          panels: previous.panels.map((panel) =>
            panel.panelId === panelId
              ? {
                  ...panel,
                  previousRangeStart: panel.rangeStart,
                  previousRangeEnd: panel.rangeEnd,
                  rangeStart: centeredStart,
                  rangeEnd: centeredEnd,
                }
              : panel
          ),
          panelParameters: nextPanelParameters,
        };
      });
    },
    [updateAppState]
  );

  const selectPanelParameterMetric = useCallback(
    (panelId: PanelId, metricKey: string) => {
      setPanelParameterState(panelId, (state) => ({
        ...state,
        selectedMetricKey: state.selectedMetricKey === metricKey ? null : metricKey
      }));
    },
    [setPanelParameterState]
  );

  const refreshAuthState = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setAuthLoading(true);
    }

    try {
      const response = await fetch("/api/auth/public-state");
      if (!response.ok) {
        throw new Error("failed to load auth state");
      }
      const payload = (await response.json()) as Partial<AuthState>;
      const nextState: AuthState = {
        accessMode: payload.accessMode === "code" ? "code" : "open",
        adminUsername: typeof payload.adminUsername === "string" ? payload.adminUsername : "ms",
        hasAdminPassword: Boolean(payload.hasAdminPassword),
        isAuthenticated: Boolean(payload.isAuthenticated),
        isAdmin: Boolean(payload.isAdmin)
      };
      setAuthState(nextState);
      setAdminAccessModeDraft(nextState.accessMode);
      return nextState;
    } catch {
      setAuthMessage("Failed to load access state.");
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const fetchFileList = useCallback(async (workspace: WorkspaceKind) => {
    updateAppState((previous) => ({
      ...previous,
      filesLoadingByWorkspace: {
        ...previous.filesLoadingByWorkspace,
        [workspace]: true
      }
    }));
    try {
      const response = await fetch(`/api/files?workspaceKind=${workspace}`);
      if (response.status === 401) {
        await refreshAuthState();
        updateAppState((previous) => ({
          ...previous,
          filesByWorkspace: {
            ...previous.filesByWorkspace,
            [workspace]: []
          }
        }));
        return;
      }
      if (!response.ok) {
        throw new Error("failed to load files");
      }
      const payload = (await response.json()) as { files?: UploadedFileMetadata[] };
      updateAppState((previous) => ({
        ...previous,
        filesByWorkspace: {
          ...previous.filesByWorkspace,
          [workspace]: payload.files ?? []
        }
      }));
    } catch {
      updateAppState((previous) => ({
        ...previous,
        statusMessage: "Failed to load file list."
      }));
    } finally {
      updateAppState((previous) => ({
        ...previous,
        filesLoadingByWorkspace: {
          ...previous.filesLoadingByWorkspace,
          [workspace]: false
        }
      }));
    }
  }, [refreshAuthState, updateAppState]);

  const fetchPlotData = useCallback(
    async (
      fileId: string,
      params: {
        mode: PlotMode;
        start?: number;
        end?: number;
        panelWidth?: number;
        targetPoints?: number;
        fullResolution?: boolean;
      }
    ): Promise<PlotDataPayload> => {
      const query = new URLSearchParams();
      query.set("mode", params.mode);
      if (typeof params.start === "number") {
        query.set("start", String(params.start));
      }
      if (typeof params.end === "number") {
        query.set("end", String(params.end));
      }
      if (typeof params.panelWidth === "number") {
        query.set("panelWidth", String(params.panelWidth));
      }
      if (typeof params.targetPoints === "number") {
        query.set("targetPoints", String(params.targetPoints));
      }
      if (params.fullResolution) {
        query.set("fullResolution", "true");
      }

      const response = await fetch(`/api/files/${fileId}/plot-data?${query.toString()}`);
      if (response.status === 401) {
        await refreshAuthState();
        throw new Error("login required");
      }
      const payload = (await response.json().catch(() => null)) as PlotDataPayload | null;

      if (!response.ok || payload === null) {
        throw new Error(extractErrorMessage(payload));
      }

      return payload;
    },
    [refreshAuthState]
  );

  const fetchParameterSummary = useCallback(
    async (fileId: string, start: number, end: number): Promise<ParameterSummaryPayload> => {
      const query = new URLSearchParams({
        start: String(start),
        end: String(end)
      });
      const response = await fetch(`/api/files/${fileId}/parameter-summary?${query.toString()}`);
      if (response.status === 401) {
        await refreshAuthState();
        throw new Error("login required");
      }
      const payload = (await response.json().catch(() => null)) as ParameterSummaryPayload | null;
      if (!response.ok || payload === null) {
        throw new Error(extractErrorMessage(payload));
      }
      return payload;
    },
    [refreshAuthState]
  );

  const downloadParameterExportForPanel = useCallback(
    async (panelId: PanelId) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel) {
        return;
      }

      const fileId = getParameterSourceFileId(panel);
      if (!fileId) {
        updateAppState((previous) => ({
          ...previous,
          statusMessage: "No parameter source is linked to this panel."
        }));
        return;
      }

      const sourceName = getParameterSourceName(panel) ?? "parameters";
      const fallbackFilename = `${sourceName.replace(/\.[^.]+$/, "")}_parameters.xlsx`;
      setParameterExportPanelId(panelId);

      try {
        const response = await fetch(`/api/files/${fileId}/parameter-export`);
        if (response.status === 401) {
          await refreshAuthState();
          throw new Error("login required");
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(extractErrorMessage(payload));
        }

        const blob = await response.blob();
        const filename = extractDownloadFilename(response, fallbackFilename);
        triggerBlobDownload(blob, filename);
        updateAppState((previous) => ({
          ...previous,
          statusMessage: `Downloaded ${filename}`
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to download parameter xlsx";
        updateAppState((previous) => ({
          ...previous,
          statusMessage: `Download failed: ${message}`
        }));
      } finally {
        setParameterExportPanelId((current) => (current === panelId ? null : current));
      }
    },
    [panels, refreshAuthState, updateAppState]
  );

  const downloadLabelingExportForPanel = useCallback(
    async (panelId: PanelId) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel?.fileId) {
        updateAppState((previous) => ({
          ...previous,
          statusMessage: "No data file is linked to this panel."
        }));
        return;
      }

      const sourceName = panel.fileName ?? "labels";
      const fallbackFilename = `${sourceName.replace(/\.[^.]+$/, "")}_labels.xlsx`;
      setLabelingExportPanelId(panelId);

      try {
        const response = await fetch(`/api/files/${panel.fileId}/labeling-export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markers: panel.chartNoteMarkers.map((marker) => ({
              index: marker.index,
              keyTag: marker.keyTag,
            })),
          }),
        });
        if (response.status === 401) {
          await refreshAuthState();
          throw new Error("login required");
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(extractErrorMessage(payload));
        }

        const blob = await response.blob();
        const filename = extractDownloadFilename(response, fallbackFilename);
        triggerBlobDownload(blob, filename);
        updateAppState((previous) => ({
          ...previous,
          statusMessage: `Downloaded ${filename}`
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to download labeling xlsx";
        updateAppState((previous) => ({
          ...previous,
          statusMessage: `Download failed: ${message}`
        }));
      } finally {
        setLabelingExportPanelId((current) => (current === panelId ? null : current));
      }
    },
    [panels, refreshAuthState, updateAppState]
  );

  const fetchUnsupervisedSummary = useCallback(
    async (fileId: string, start: number, end: number): Promise<UnsupervisedSummaryPayload> => {
      const query = new URLSearchParams({
        start: String(start),
        end: String(end)
      });
      const response = await fetch(`/api/files/${fileId}/unsupervised-summary?${query.toString()}`);
      if (response.status === 401) {
        await refreshAuthState();
        throw new Error("login required");
      }
      const payload = (await response.json().catch(() => null)) as UnsupervisedSummaryPayload | null;
      if (!response.ok || payload === null) {
        throw new Error(extractErrorMessage(payload));
      }
      return payload;
    },
    [refreshAuthState]
  );

  const requestOverviewPlot = useCallback(
    async (panelId: PanelId, fileId: string, setAsCurrent = true) => {
      const requestSeq = ++requestSeqRef.current[panelId];
      setPanelPlotState(panelId, (state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const payload = await fetchPlotData(fileId, {
          mode: "overview",
          targetPoints: PANEL_TARGET_POINTS
        });

        if (requestSeq !== requestSeqRef.current[panelId]) {
          return null;
        }

        setPanelPlotState(panelId, (state) => ({
          overview: payload,
          current: setAsCurrent ? payload : state.current,
          loading: false,
          error: null
        }));
        return payload;
      } catch (error) {
        if (requestSeq !== requestSeqRef.current[panelId]) {
          return null;
        }
        const message = error instanceof Error ? error.message : "failed to load overview data";
        setPanelPlotState(panelId, (state) => ({
          ...state,
          loading: false,
          error: message
        }));
        return null;
      }
    },
    [fetchPlotData, setPanelPlotState]
  );

  const requestRangePlot = useCallback(
    async (panelId: PanelId, fileId: string, start: number, end: number) => {
      const requestSeq = ++requestSeqRef.current[panelId];
      setPanelPlotState(panelId, (state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const payload = await fetchPlotData(fileId, {
          mode: "range",
          start,
          end,
          targetPoints: PANEL_TARGET_POINTS
        });

        if (requestSeq !== requestSeqRef.current[panelId]) {
          return;
        }

        setPanelPlotState(panelId, (state) => ({
          ...state,
          current: payload,
          loading: false,
          error: null
        }));
      } catch (error) {
        if (requestSeq !== requestSeqRef.current[panelId]) {
          return;
        }
        const message = error instanceof Error ? error.message : "failed to load range data";
        setPanelPlotState(panelId, (state) => ({
          ...state,
          loading: false,
          error: message
        }));
      }
    },
    [fetchPlotData, setPanelPlotState]
  );

  const requestFullResolutionPlot = useCallback(
    async (panelId: PanelId, fileId: string, totalRows: number) => {
      if (totalRows <= 0) {
        return null;
      }

      const requestSeq = ++requestSeqRef.current[panelId];
      setPanelPlotState(panelId, (state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const payload = await fetchPlotData(fileId, {
          mode: "range",
          start: 0,
          end: Math.max(totalRows - 1, 0),
          fullResolution: true
        });

        if (requestSeq !== requestSeqRef.current[panelId]) {
          return null;
        }

        setPanelPlotState(panelId, (state) => ({
          ...state,
          current: payload,
          loading: false,
          error: null
        }));
        return payload;
      } catch (error) {
        if (requestSeq !== requestSeqRef.current[panelId]) {
          return null;
        }

        const message = error instanceof Error ? error.message : "failed to load full-resolution data";
        setPanelPlotState(panelId, (state) => ({
          ...state,
          loading: false,
          error: message
        }));
        return null;
      }
    },
    [fetchPlotData, setPanelPlotState]
  );

  const prefetchRangePlot = useCallback(
    async (panelId: PanelId, start: number, end: number) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel?.fileId) {
        return;
      }

      if (isFullResolutionPlotPayload(panelPlots[panelId]?.current ?? null, panel.totalRows)) {
        return;
      }

      const rangeKey = getPrefetchRangeKey(start, end);
      const panelPrefetches = prefetchedRangeRef.current[panelId] ?? {};
      const existing = panelPrefetches[rangeKey];
      if (existing && existing.fileId === panel.fileId && (existing.pending || existing.payload !== null)) {
        return;
      }

      prefetchedRangeRef.current[panelId] = {
        ...panelPrefetches,
        [rangeKey]: {
          fileId: panel.fileId,
          start,
          end,
          payload: null,
          pending: true
        }
      };

      try {
        const payload = await fetchPlotData(panel.fileId, {
          mode: "range",
          start,
          end,
          targetPoints: PANEL_TARGET_POINTS
        });
        const latest = prefetchedRangeRef.current[panelId]?.[rangeKey];
        if (latest && latest.fileId === panel.fileId) {
          prefetchedRangeRef.current[panelId] = {
            ...(prefetchedRangeRef.current[panelId] ?? {}),
            [rangeKey]: {
              fileId: panel.fileId,
              start,
              end,
              payload,
              pending: false
            }
          };
        }
      } catch {
        const latest = prefetchedRangeRef.current[panelId]?.[rangeKey];
        if (latest && latest.fileId === panel.fileId) {
          const nextPanelPrefetches = { ...(prefetchedRangeRef.current[panelId] ?? {}) };
          delete nextPanelPrefetches[rangeKey];
          if (Object.keys(nextPanelPrefetches).length === 0) {
            delete prefetchedRangeRef.current[panelId];
          } else {
            prefetchedRangeRef.current[panelId] = nextPanelPrefetches;
          }
        }
      }
    },
    [fetchPlotData, panelPlots, panels]
  );

  const requestParameterSummaryForPanel = useCallback(
    async (panelId: PanelId, fileId: string, start: number, end: number) => {
      setPanelParameterState(panelId, (state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const payload = await fetchParameterSummary(fileId, start, end);
        setPanelParameterState(panelId, (state) => {
          const availableCycles = payload.cycles ?? [];
          const overlappingCycle =
            availableCycles.find((cycle) => cycle.startIndex <= end && cycle.endIndex >= start) ?? null;
          const selectedCycleIndex =
            availableCycles.find((cycle) => cycle.cycleIndex === state.selectedCycleIndex)?.cycleIndex ??
            overlappingCycle?.cycleIndex ??
            availableCycles[0]?.cycleIndex ??
            null;
          return {
            summary: payload,
            selectedCycleIndex,
            selectedMetricKey: state.selectedMetricKey,
            loading: false,
            error: null
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to load parameter summary";
        setPanelParameterState(panelId, (state) => ({
          ...state,
          loading: false,
          error: message
        }));
      }
    },
    [fetchParameterSummary, setPanelParameterState]
  );

  const requestUnsupervisedSummaryForPanel = useCallback(
    async (panelId: PanelId, fileId: string, start: number, end: number) => {
      setPanelUnsupervisedState(panelId, (state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const payload = await fetchUnsupervisedSummary(fileId, start, end);
        setPanelUnsupervisedState(panelId, () => ({
          summary: payload,
          loading: false,
          error: null
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to load unsupervised summary";
        setPanelUnsupervisedState(panelId, (state) => ({
          ...state,
          loading: false,
          error: message
        }));
      }
    },
    [fetchUnsupervisedSummary, setPanelUnsupervisedState]
  );

  useEffect(() => {
    const controller = new AbortController();

    const checkHealth = async () => {
      setHealthStatus("checking");
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Health check failed");
        }
        const payload = (await response.json()) as { status?: string };
        setHealthStatus(payload.status === "ok" ? "connected" : "failed");
      } catch {
        if (!controller.signal.aborted) {
          setHealthStatus("failed");
        }
      }
    };

    void checkHealth();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!folderInputRef.current) {
      return;
    }
    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    void refreshAuthState(true);
  }, [refreshAuthState]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (authState.accessMode === "open" || authState.isAuthenticated) {
      void fetchFileList("heartsound");
      void fetchFileList("ecg");
      return;
    }

    updateAppState((previous) => ({
      ...previous,
      filesByWorkspace: {
        heartsound: [],
        ecg: []
      }
    }));
  }, [authLoading, authState.accessMode, authState.isAuthenticated, fetchFileList, updateAppState]);

  useEffect(() => {
    if (!visiblePanelIds.includes(activePanelId)) {
      updateAppState((previous) => ({
        ...previous,
        activePanelId: visiblePanelIds[0]
      }));
    }
  }, [activePanelId, updateAppState, visiblePanelIds]);

  useEffect(() => {
    if (availableFileRoleTabs.some((tab) => tab.key === activeFileRole)) {
      return;
    }

    updateAppState((previous) => ({
      ...previous,
      activeFileRole: availableFileRoleTabs[0]?.key ?? "data",
      selectedDeleteIds: []
    }));
  }, [activeFileRole, availableFileRoleTabs, updateAppState]);

  const filteredFiles = useMemo(() => {
    const roleFilteredFiles = files
      .filter((file) => file.fileRole === activeFileRole)
      .slice()
      .sort((left, right) => {
        const nameComparison = FILE_NAME_COLLATOR.compare(left.originalName, right.originalName);
        if (nameComparison !== 0) {
          return nameComparison;
        }

        const pathComparison = FILE_NAME_COLLATOR.compare(left.relativePath ?? "", right.relativePath ?? "");
        if (pathComparison !== 0) {
          return pathComparison;
        }

        return left.uploadedAt.localeCompare(right.uploadedAt);
      });
    if (!searchText.trim()) {
      return roleFilteredFiles;
    }
    const query = searchText.trim().toLowerCase();
    if (query.startsWith(SEARCH_COMMAND_PREFIX)) {
      return roleFilteredFiles;
    }
    return roleFilteredFiles.filter((file) => {
      const originalNameMatched = file.originalName.toLowerCase().includes(query);
      const relativePathMatched = file.relativePath?.toLowerCase().includes(query) ?? false;
      return originalNameMatched || relativePathMatched;
    });
  }, [activeFileRole, files, searchText]);
  const allFilteredDeleteSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selectedDeleteIds.includes(file.fileId));

  const handleSearchInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      const result = tryApplyHeartsoundSearchCommand(searchText, heartsoundCandidateSettings);
      if (!result) {
        return;
      }

      event.preventDefault();
      updateAppState((previous) => ({
        ...previous,
        heartsoundCandidateSettings: result.nextSettings,
        searchText: "",
        statusMessage: result.message
      }));
    },
    [heartsoundCandidateSettings, searchText, updateAppState]
  );

  const summarizeUploadResult = (result: UploadResult) => {
    const summaryParts = [`Uploaded: ${result.uploaded.length}`];
    if (result.errors.length > 0) {
      summaryParts.push(`Errors: ${result.errors.length}`);
    }
    if (result.ignored.length > 0) {
      summaryParts.push(`Ignored: ${result.ignored.length}`);
    }
    return summaryParts.join(" | ");
  };

  const uploadFiles = async (
    workspace: WorkspaceKind,
    fileRole: FileRole,
    fileList: FileList,
    isFolderUpload: boolean
  ) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) {
      return;
    }

    updateAppState((previous) => ({
      ...previous,
      uploadingByWorkspace: {
        ...previous.uploadingByWorkspace,
        [workspace]: true
      },
      statusMessage: ""
    }));

    const formData = new FormData();
    for (const file of filesToUpload) {
      formData.append("files", file);
      if (isFolderUpload) {
        formData.append("relative_paths", file.webkitRelativePath || file.name);
      }
    }
    formData.append("workspace_kind", workspace);
    formData.append("file_role", fileRole);

    try {
      const endpoint = isFolderUpload ? "/api/upload/folder" : "/api/upload/files";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });
      if (response.status === 401) {
        await refreshAuthState();
        throw new Error("login required");
      }
      const payload = (await response.json().catch(() => null)) as UploadResult | null;

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      updateAppState((previous) => ({
        ...previous,
        statusMessage: payload ? `${fileRole} | ${summarizeUploadResult(payload)}` : "Upload complete"
      }));
      await fetchFileList(workspace);
    } catch (error) {
      updateAppState((previous) => ({
        ...previous,
        statusMessage: error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed"
      }));
    } finally {
      updateAppState((previous) => ({
        ...previous,
        uploadingByWorkspace: {
          ...previous.uploadingByWorkspace,
          [workspace]: false
        }
      }));
    }
  };

  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      void uploadFiles(activeWorkspace, activeFileRole, selectedFiles, false);
    }
    event.target.value = "";
  };

  const handleFolderInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      void uploadFiles(activeWorkspace, activeFileRole, selectedFiles, true);
    }
    event.target.value = "";
  };

  const applyPanelRange = useCallback(
    (
      panelId: PanelId,
      nextStart: number,
      nextEnd: number,
      forceFetch = false,
      skipLinkedFetch = false
    ) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel || !panel.fileId || panel.totalRows === null || panel.totalRows <= 0) {
        return;
      }

      const maxIndex = Math.max(panel.totalRows - 1, 0);
      const clampedStart = clampNumber(Math.round(nextStart), 0, maxIndex);
      const clampedEnd = clampNumber(Math.round(nextEnd), clampedStart, maxIndex);
      const currentRangeUnchanged =
        clampedStart === panel.rangeStart && clampedEnd === panel.rangeEnd && !forceFetch;

      if (currentRangeUnchanged) {
        return;
      }

      updatePanelState(panelId, (targetPanel) => ({
        ...targetPanel,
        previousRangeStart: targetPanel.rangeStart,
        previousRangeEnd: targetPanel.rangeEnd,
        rangeStart: clampedStart,
        rangeEnd: clampedEnd
      }));

      const isFullRange = clampedStart === 0 && clampedEnd === maxIndex;
      const currentPlot = panelPlots[panelId].current;
      const hasFullResolutionCurrent = isFullResolutionPlotPayload(currentPlot, panel.totalRows);
      const parameterSourceFileId = getParameterSourceFileId(panel);
      if (isFullRange) {
        if (hasFullResolutionCurrent && currentPlot) {
          setPanelPlotState(panelId, (state) => ({
            ...state,
            current: currentPlot,
            loading: false,
            error: null
          }));
        } else {
          const overview = panelPlots[panelId].overview;
          if (overview) {
            setPanelPlotState(panelId, (state) => ({
              ...state,
              current: overview,
              loading: false,
              error: null
            }));
          } else {
            void requestOverviewPlot(panelId, panel.fileId);
          }
        }
        if (!skipLinkedFetch && parameterSourceFileId) {
          void requestParameterSummaryForPanel(panelId, parameterSourceFileId, clampedStart, clampedEnd);
        } else if (!skipLinkedFetch) {
          clearPanelParameterState(panelId);
        }
        if (!skipLinkedFetch && panel.unsupervisedFileId) {
          void requestUnsupervisedSummaryForPanel(panelId, panel.unsupervisedFileId, clampedStart, clampedEnd);
        } else if (!skipLinkedFetch) {
          clearPanelUnsupervisedState(panelId);
        }
        return;
      }

      if (!skipLinkedFetch && parameterSourceFileId) {
        void requestParameterSummaryForPanel(panelId, parameterSourceFileId, clampedStart, clampedEnd);
      } else if (!skipLinkedFetch) {
        clearPanelParameterState(panelId);
      }
      if (!skipLinkedFetch && panel.unsupervisedFileId) {
        void requestUnsupervisedSummaryForPanel(panelId, panel.unsupervisedFileId, clampedStart, clampedEnd);
      } else if (!skipLinkedFetch) {
        clearPanelUnsupervisedState(panelId);
      }

      if (hasFullResolutionCurrent && currentPlot) {
        setPanelPlotState(panelId, (state) => ({
          ...state,
          current: currentPlot,
          loading: false,
          error: null
        }));
        return;
      }

      const rangeKey = getPrefetchRangeKey(clampedStart, clampedEnd);
      const prefetched = prefetchedRangeRef.current[panelId]?.[rangeKey];
      if (prefetched && prefetched.fileId === panel.fileId && prefetched.payload) {
        setPanelPlotState(panelId, (state) => ({
          ...state,
          current: prefetched.payload,
          loading: false,
          error: null
        }));
        const nextPanelPrefetches = { ...(prefetchedRangeRef.current[panelId] ?? {}) };
        delete nextPanelPrefetches[rangeKey];
        if (Object.keys(nextPanelPrefetches).length === 0) {
          delete prefetchedRangeRef.current[panelId];
        } else {
          prefetchedRangeRef.current[panelId] = nextPanelPrefetches;
        }
        return;
      }

      void requestRangePlot(panelId, panel.fileId, clampedStart, clampedEnd);
    },
    [
      clearPanelUnsupervisedState,
      clearPanelParameterState,
      panelPlots,
      panels,
      requestOverviewPlot,
      requestUnsupervisedSummaryForPanel,
      requestParameterSummaryForPanel,
      requestRangePlot,
      setPanelPlotState,
      updatePanelState
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (settingsPanelId !== null || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const activeTargetPanel = panels.find((panel) => panel.panelId === activePanelId);
      if (
        !activeTargetPanel ||
        !activeTargetPanel.fileId ||
        activeTargetPanel.totalRows === null ||
        activeTargetPanel.totalRows <= 0
      ) {
        return;
      }

      if (event.key === "[" || event.key === "]") {
        if (activeTargetPanel.workspaceKind !== "heartsound") {
          return;
        }

        const availableCycles = panelParameters[activePanelId].summary?.cycles ?? [];
        if (availableCycles.length === 0) {
          return;
        }

        const currentCycleIndex =
          availableCycles.findIndex(
            (cycle) => cycle.cycleIndex === panelParameters[activePanelId].selectedCycleIndex
          ) ?? -1;
        const resolvedCurrentIndex = currentCycleIndex >= 0 ? currentCycleIndex : 0;
        const targetOffset = event.key === "[" ? -1 : 1;
        const nextCycle = availableCycles[resolvedCurrentIndex + targetOffset];
        if (!nextCycle) {
          return;
        }

        event.preventDefault();
        selectPanelCycle(activePanelId, nextCycle.cycleIndex);
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const width = Math.max(activeTargetPanel.rangeEnd - activeTargetPanel.rangeStart, 0);
      const maxIndex = Math.max(activeTargetPanel.totalRows - 1, 0);
      const rangeShiftStep = getKeyboardRangeShiftStep(activeTargetPanel.workspaceKind);

      let nextStart = activeTargetPanel.rangeStart + direction * rangeShiftStep;
      let nextEnd = activeTargetPanel.rangeEnd + direction * rangeShiftStep;

      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = Math.min(maxIndex, width);
      } else if (nextEnd > maxIndex) {
        nextEnd = maxIndex;
        nextStart = Math.max(0, maxIndex - width);
      }

      event.preventDefault();
      applyPanelRange(activePanelId, nextStart, nextEnd, false, true);

      if (keyboardRangeCommitTimeoutRef.current !== null) {
        window.clearTimeout(keyboardRangeCommitTimeoutRef.current);
      }

      keyboardRangeCommitTimeoutRef.current = window.setTimeout(() => {
        applyPanelRange(activePanelId, nextStart, nextEnd, true, false);
        keyboardRangeCommitTimeoutRef.current = null;
      }, KEYBOARD_RANGE_COMMIT_DEBOUNCE_MS);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (keyboardRangeCommitTimeoutRef.current !== null) {
        window.clearTimeout(keyboardRangeCommitTimeoutRef.current);
        keyboardRangeCommitTimeoutRef.current = null;
      }
    };
  }, [activePanelId, applyPanelRange, panelParameters, panels, selectPanelCycle, settingsPanelId]);

  const assignDataFileToActivePanel = useCallback(
    (file: UploadedFileMetadata) => {
      const initialRangeEnd = getInitialRangeEnd(file.rowCount, activePanel.workspaceKind);
      const matchedParameterFile = findAutoLinkedFile(files, file, "parameter");
      const matchedUnsupervisedFile = findAutoLinkedFile(files, file, "unsupervised");
      const matchedWaveFile = findAutoLinkedFile(files, file, "wave");

      updatePanelState(activePanelId, (panel) => ({
        ...panel,
        fileId: file.fileId,
        fileName: file.originalName,
        waveFileId: matchedWaveFile?.fileId ?? null,
        waveFileName: matchedWaveFile?.originalName ?? null,
        parameterFileId: matchedParameterFile?.fileId ?? null,
        parameterFileName: matchedParameterFile?.originalName ?? null,
        unsupervisedFileId: matchedUnsupervisedFile?.fileId ?? null,
        unsupervisedFileName: matchedUnsupervisedFile?.originalName ?? null,
        totalRows: file.rowCount,
        previousRangeStart: null,
        previousRangeEnd: null,
        rangeStart: 0,
        rangeEnd: initialRangeEnd,
        chartNoteMarkers: []
      }));
      clearPanelPlotState(activePanelId);
      void (async () => {
        const overviewPayload = await requestOverviewPlot(activePanelId, file.fileId, false);
        const fullResolutionPayload = await requestFullResolutionPlot(activePanelId, file.fileId, file.rowCount);
        const hasPlot = overviewPayload !== null || fullResolutionPayload !== null;

        if (!hasPlot) {
          return;
        }

        if (fullResolutionPayload === null) {
          await requestRangePlot(activePanelId, file.fileId, 0, initialRangeEnd);
        }

        const parameterSourceFileId =
          activePanel.workspaceKind === "heartsound" ? file.fileId : matchedParameterFile?.fileId ?? null;
        if (parameterSourceFileId) {
          await requestParameterSummaryForPanel(activePanelId, parameterSourceFileId, 0, initialRangeEnd);
        } else {
          clearPanelParameterState(activePanelId);
        }
        if (matchedUnsupervisedFile) {
          await requestUnsupervisedSummaryForPanel(activePanelId, matchedUnsupervisedFile.fileId, 0, initialRangeEnd);
        } else {
          clearPanelUnsupervisedState(activePanelId);
        }
      })();
    },
    [
      activePanelId,
      activePanel.workspaceKind,
      clearPanelUnsupervisedState,
      clearPanelParameterState,
      clearPanelPlotState,
      files,
      requestOverviewPlot,
      requestUnsupervisedSummaryForPanel,
      requestParameterSummaryForPanel,
      requestFullResolutionPlot,
      requestRangePlot,
      updatePanelState
    ]
  );

  const assignSupportFileToActivePanel = useCallback(
    (file: UploadedFileMetadata, fileRole: PanelLinkedFileRole) => {
      const currentPanel = panels.find((panel) => panel.panelId === activePanelId);
      const acceptsParameterFile = currentPanel?.workspaceKind === "ecg";

      updatePanelState(activePanelId, (panel) => ({
        ...panel,
        waveFileId: fileRole === "wave" ? file.fileId : panel.waveFileId,
        waveFileName: fileRole === "wave" ? file.originalName : panel.waveFileName,
        parameterFileId:
          fileRole === "parameter" && acceptsParameterFile ? file.fileId : panel.parameterFileId,
        parameterFileName:
          fileRole === "parameter" && acceptsParameterFile ? file.originalName : panel.parameterFileName,
        unsupervisedFileId: fileRole === "unsupervised" ? file.fileId : panel.unsupervisedFileId,
        unsupervisedFileName: fileRole === "unsupervised" ? file.originalName : panel.unsupervisedFileName
      }));

      if (
        fileRole === "parameter" &&
        acceptsParameterFile &&
        currentPanel?.fileId &&
        currentPanel.totalRows !== null &&
        currentPanel.totalRows > 0
      ) {
        void requestParameterSummaryForPanel(activePanelId, file.fileId, currentPanel.rangeStart, currentPanel.rangeEnd);
      } else if (fileRole === "parameter" && acceptsParameterFile) {
        clearPanelParameterState(activePanelId);
      }

      if (fileRole === "unsupervised" && currentPanel?.fileId && currentPanel.totalRows !== null && currentPanel.totalRows > 0) {
        void requestUnsupervisedSummaryForPanel(activePanelId, file.fileId, currentPanel.rangeStart, currentPanel.rangeEnd);
      } else if (fileRole === "unsupervised") {
        clearPanelUnsupervisedState(activePanelId);
      }
    },
    [
      activePanelId,
      clearPanelUnsupervisedState,
      panels,
      requestUnsupervisedSummaryForPanel,
      clearPanelParameterState,
      requestParameterSummaryForPanel,
      updatePanelState
    ]
  );

  const resetPanel = useCallback(
    (panelId: PanelId) => {
      const targetPanel = panels.find((panel) => panel.panelId === panelId);
      if (!targetPanel) {
        return;
      }
      updateAppState((previous) => ({
        ...previous,
        panels: previous.panels.map((panel) =>
          panel.panelId === panelId ? createDefaultPanelState(panelId, targetPanel.workspaceKind) : panel
        )
      }));
      clearPanelPlotState(panelId);
      clearPanelParameterState(panelId);
      clearPanelUnsupervisedState(panelId);
      if (settingsPanelId === panelId) {
        setSettingsPanelId(null);
        setSettingsDraft(null);
      }
    },
    [
      clearPanelUnsupervisedState,
      clearPanelParameterState,
      clearPanelPlotState,
      panels,
      settingsPanelId,
      updateAppState
    ]
  );

  const updatePanelWorkspace = useCallback(
    async (panelId: PanelId, workspaceKind: WorkspaceKind) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel || panel.workspaceKind === workspaceKind) {
        return;
      }
      updateAppState((previous) => ({
        ...previous,
        panels: previous.panels.map((item) =>
          item.panelId === panelId ? createDefaultPanelState(panelId, workspaceKind) : item
        ),
        selectedDeleteIds: []
      }));
      clearPanelPlotState(panelId);
      clearPanelParameterState(panelId);
      clearPanelUnsupervisedState(panelId);
      if (settingsPanelId === panelId) {
        setSettingsPanelId(null);
        setSettingsDraft(null);
      }
      await fetchFileList(workspaceKind);
    },
    [
      clearPanelUnsupervisedState,
      clearPanelParameterState,
      clearPanelPlotState,
      fetchFileList,
      panels,
      settingsPanelId,
      updateAppState
    ]
  );

  const togglePanelSeries = useCallback(
    (panelId: PanelId, seriesKey: SeriesKey) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        visibleSeries: {
          ...panel.visibleSeries,
          [seriesKey]: !panel.visibleSeries[seriesKey]
        }
      }));
    },
    [updatePanelState]
  );

  const setPanelSeriesVisibility = useCallback(
    (panelId: PanelId, nextVisible: boolean) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel) {
        return;
      }

      const seriesItems = getSeriesItemsForWorkspace(
        panel.workspaceKind,
        panel.styleOptions.ecgMarkerMode
      );

      updatePanelState(panelId, (currentPanel) => {
        const nextVisibleSeries = { ...currentPanel.visibleSeries };
        for (const series of seriesItems) {
          nextVisibleSeries[series.key] = nextVisible;
        }

        return {
          ...currentPanel,
          visibleSeries: nextVisibleSeries
        };
      });
    },
    [panels, updatePanelState]
  );

  const togglePanelParameterSummary = useCallback(
    (panelId: PanelId) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        showParameterSummary: !panel.showParameterSummary
      }));
    },
    [updatePanelState]
  );

  const resetPanelDisplayDefaults = useCallback(
    (panelId: PanelId) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        visibleSeries: { ...DEFAULT_VISIBLE_SERIES },
        showParameterSummary: true
      }));
    },
    [updatePanelState]
  );

  const togglePanelSelectedCycleHighlight = useCallback(
    (panelId: PanelId) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        showSelectedCycleHighlight: !panel.showSelectedCycleHighlight
      }));
    },
    [updatePanelState]
  );

  const togglePanelUnsupervisedOverlay = useCallback(
    (panelId: PanelId) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        showUnsupervisedOverlay: !panel.showUnsupervisedOverlay
      }));
    },
    [updatePanelState]
  );

  const openSettingsForPanel = useCallback(
    (panelId: PanelId) => {
      const panel = panels.find((item) => item.panelId === panelId);
      if (!panel) {
        return;
      }

      setSettingsPanelId(panelId);
      setSettingsDraft({
        rangeStart: String(panel.rangeStart),
        rangeEnd: String(panel.rangeEnd),
        amplitudeLineWidth: String(panel.styleOptions.amplitudeLineWidth),
        rsBarOpacity: String(panel.styleOptions.rsBarOpacity),
        yAxisAutoScale: panel.styleOptions.yAxisAutoScale,
        ecgMarkerMode: panel.styleOptions.ecgMarkerMode
      });
    },
    [panels]
  );

  const closeSettingsModal = useCallback(() => {
    setSettingsPanelId(null);
    setSettingsDraft(null);
  }, []);

  const openSeriesPickerForPanel = useCallback((panelId: PanelId) => {
    setSeriesPanelId(panelId);
  }, []);

  const closeSeriesPicker = useCallback(() => {
    setSeriesPanelId(null);
  }, []);

  const closeLabelingWorkspace = useCallback(() => {
    setLabelingPanelId(null);
    setLabelingAnchorIndex(null);
  }, []);

  const clearLabelingMarkersForPanel = useCallback(
    (panelId: PanelId) => {
      updatePanelState(panelId, (panel) => ({
        ...panel,
        chartNoteMarkers: [],
      }));
      setLabelingAnchorIndex(null);
    },
    [updatePanelState]
  );

  const onLabelingChartClick = useCallback(
    (event: { value?: unknown }) => {
      if (!labelingPanel?.fileId || labelingPanel.totalRows === null || labelingPanel.totalRows <= 0) {
        return;
      }

      const rawValue = Array.isArray(event.value) ? event.value[0] : event.value;
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return;
      }

      const maxIndex = Math.max(labelingPanel.totalRows - 1, 0);
      setLabelingAnchorIndex(clampNumber(Math.round(rawValue), 0, maxIndex));
    },
    [labelingPanel]
  );

  const onLabelingDataZoom = useCallback(
    (event: {
      batch?: Array<{
        start?: number;
        end?: number;
        startValue?: number;
        endValue?: number;
      }>;
      start?: number;
      end?: number;
      startValue?: number;
      endValue?: number;
    }) => {
      if (!labelingPanel?.fileId || labelingPanel.totalRows === null || labelingPanel.totalRows <= 0) {
        return;
      }

      const payload = Array.isArray(event.batch) && event.batch.length > 0 ? event.batch[0] : event;
      const maxIndex = Math.max(labelingPanel.totalRows - 1, 0);

      let nextStart: number | undefined;
      let nextEnd: number | undefined;
      if (typeof payload.startValue === "number" && typeof payload.endValue === "number") {
        nextStart = Math.round(payload.startValue);
        nextEnd = Math.round(payload.endValue);
      } else if (typeof payload.start === "number" && typeof payload.end === "number") {
        nextStart = Math.round((payload.start / 100) * maxIndex);
        nextEnd = Math.round((payload.end / 100) * maxIndex);
      }

      if (nextStart === undefined || nextEnd === undefined) {
        return;
      }

      applyPanelRange(
        labelingPanel.panelId,
        clampNumber(nextStart, 0, maxIndex),
        clampNumber(nextEnd, clampNumber(nextStart, 0, maxIndex), maxIndex)
      );
    },
    [applyPanelRange, labelingPanel]
  );

  const labelingChartOption = useMemo<EChartsOption | null>(() => {
    if (!labelingPanel?.fileId || !labelingActivePlot) {
      return null;
    }

    const totalRows = labelingPanel.totalRows ?? labelingActivePlot.originalRowCount;
    const maxIndex = Math.max(totalRows - 1, 0);
    const safeStart = clampNumber(labelingPanel.rangeStart, 0, maxIndex);
    const safeEnd = clampNumber(labelingPanel.rangeEnd, safeStart, maxIndex);
    const amplitudePairs = labelingAmplitudePairs;
    const series: NonNullable<EChartsOption["series"]> = [
      {
        name: labelingPanel.workspaceKind === "ecg" ? "raw" : "Amplitude",
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        animation: false,
        lineStyle: {
          width: labelingPanel.styleOptions.amplitudeLineWidth,
          color: labelingPanel.workspaceKind === "ecg" ? ECG_SERIES_COLORS.amplitude : "#79c0ff",
        },
        itemStyle: {
          color: labelingPanel.workspaceKind === "ecg" ? ECG_SERIES_COLORS.amplitude : "#79c0ff",
        },
        data: amplitudePairs,
      },
    ];

    if (labelingPanel.workspaceKind === "heartsound") {
      const s1StartPairs = toDataPairs(labelingActivePlot.x, labelingActivePlot.s1Start);
      const s1EndPairs = toDataPairs(labelingActivePlot.x, labelingActivePlot.s1End);
      const s2StartPairs = toDataPairs(labelingActivePlot.x, labelingActivePlot.s2Start);
      const s2EndPairs = toDataPairs(labelingActivePlot.x, labelingActivePlot.s2End);
      const resolved = resolveOverlappingHeartsoundRegionOverlays(
        buildHeartsoundRegionOverlays("S1", s1StartPairs, s1EndPairs, "rgba(46, 160, 67, 0.14)", "rgba(46, 160, 67, 0.42)"),
        buildHeartsoundRegionOverlays("S2", s2StartPairs, s2EndPairs, "rgba(248, 81, 73, 0.13)", "rgba(248, 81, 73, 0.38)")
      );
      for (const regionOverlay of [...resolved.s1Overlays, ...resolved.s2Overlays]) {
        series.push({
          name: `${regionOverlay.label} Region`,
          type: "line",
          xAxisIndex: 0,
          yAxisIndex: 0,
          z: 0,
          silent: true,
          showSymbol: false,
          animation: false,
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          tooltip: { show: false },
          data: [],
          markArea: {
            silent: true,
            label: { show: false },
            itemStyle: {
              color: regionOverlay.fillColor,
              borderColor: regionOverlay.borderColor,
              borderWidth: 1,
              borderType: "solid",
            },
            data: [[
              { name: regionOverlay.label, xAxis: regionOverlay.areaStart },
              { xAxis: regionOverlay.areaEnd },
            ]],
          },
        });
      }
    }

    const noteSeries = buildChartNoteMarkerSeries(labelingPanel.chartNoteMarkers, amplitudePairs);
    if (noteSeries) {
      series.push(noteSeries);
    }

    return {
      animation: false,
      grid: {
        left: 48,
        right: 24,
        top: 24,
        bottom: 68,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
      },
      xAxis: [
        {
          type: "value",
          min: safeStart,
          max: safeEnd,
          boundaryGap: false,
          axisLabel: { color: "#8b949e" },
          axisLine: { lineStyle: { color: "#30363d" } },
          splitLine: { lineStyle: { color: "rgba(48, 54, 61, 0.35)" } },
        },
      ],
      yAxis: [
        {
          type: "value",
          scale: true,
          axisLabel: { color: "#8b949e" },
          axisLine: { lineStyle: { color: "#30363d" } },
          splitLine: { lineStyle: { color: "rgba(48, 54, 61, 0.35)" } },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          startValue: safeStart,
          endValue: safeEnd,
          zoomLock: false,
          filterMode: "none",
        },
        {
          type: "slider",
          xAxisIndex: 0,
          startValue: safeStart,
          endValue: safeEnd,
          height: 28,
          bottom: 18,
          filterMode: "none",
        },
      ],
      series,
    };
  }, [labelingActivePlot, labelingAmplitudePairs, labelingPanel]);

  const updateSettingsRange = useCallback(
    (nextStart: number, nextEnd: number) => {
      if (!settingsPanel || settingsPanel.totalRows === null || settingsPanel.totalRows <= 0) {
        return;
      }

      const maxIndex = Math.max(settingsPanel.totalRows - 1, 0);
      const clampedStart = clampNumber(Math.round(nextStart), 0, maxIndex);
      const clampedEnd = clampNumber(Math.round(nextEnd), clampedStart, maxIndex);

      setSettingsDraft((previous) =>
        previous
          ? {
              ...previous,
              rangeStart: String(clampedStart),
              rangeEnd: String(clampedEnd)
            }
          : previous
      );

      applyPanelRange(settingsPanel.panelId, clampedStart, clampedEnd, true);
    },
    [applyPanelRange, settingsPanel]
  );

  const applySettings = useCallback(() => {
    if (!settingsPanel || !settingsDraft) {
      return;
    }

    const parsedStart = parseNumericInput(settingsDraft.rangeStart);
    const parsedEnd = parseNumericInput(settingsDraft.rangeEnd);
    const parsedLineWidth = Number(settingsDraft.amplitudeLineWidth);
    const parsedOpacity = Number(settingsDraft.rsBarOpacity);

    if (parsedStart === null || parsedEnd === null) {
      updateWorkspaceState(settingsTargetWorkspace, (previous) => ({
        ...previous,
        statusMessage: "Range start/end must be valid numbers."
      }));
      return;
    }
    if (!Number.isFinite(parsedLineWidth) || !Number.isFinite(parsedOpacity)) {
      updateWorkspaceState(settingsTargetWorkspace, (previous) => ({
        ...previous,
        statusMessage: "Style values must be valid numbers."
      }));
      return;
    }

    updatePanelState(settingsPanel.panelId, (panel) => ({
      ...panel,
      styleOptions: {
        amplitudeLineWidth: clampNumber(parsedLineWidth, 0.5, 6),
        rsBarOpacity: clampNumber(parsedOpacity, 0.1, 1),
        yAxisAutoScale: settingsDraft.yAxisAutoScale,
        ecgMarkerMode: settingsDraft.ecgMarkerMode
      }
    }));

    applyPanelRange(settingsPanel.panelId, parsedStart, parsedEnd, true);
    closeSettingsModal();
  }, [applyPanelRange, closeSettingsModal, settingsDraft, settingsPanel, updatePanelState, updateWorkspaceState, settingsTargetWorkspace]);

  const resetSettingsRangeToFull = useCallback(() => {
    if (!settingsPanel || settingsPanel.totalRows === null || settingsPanel.totalRows <= 0 || !settingsDraft) {
      return;
    }
    const fullEnd = Math.max(settingsPanel.totalRows - 1, 0);
    updateSettingsRange(0, fullEnd);
  }, [settingsDraft, settingsPanel, updateSettingsRange]);

  const applyQuickRangePreset = useCallback(
    (presetEnd: number) => {
      if (!settingsPanel) {
        return;
      }
      updateSettingsRange(0, presetEnd);
    },
    [settingsPanel, updateSettingsRange]
  );

  const shiftSettingsRange = useCallback(
    (direction: -1 | 1) => {
      if (!settingsPanel || !settingsDraft || settingsPanel.totalRows === null || settingsPanel.totalRows <= 0) {
        return;
      }

      const parsedStart = parseNumericInput(settingsDraft.rangeStart);
      const parsedEnd = parseNumericInput(settingsDraft.rangeEnd);
      if (parsedStart === null || parsedEnd === null) {
        updateWorkspaceState(settingsTargetWorkspace, (previous) => ({
          ...previous,
          statusMessage: "Range start/end must be valid numbers."
        }));
        return;
      }

      const maxIndex = Math.max(settingsPanel.totalRows - 1, 0);
      const width = Math.max(parsedEnd - parsedStart, 0);

      const rangeShiftStep = getRangeShiftStep(settingsTargetWorkspace);
      let nextStart = parsedStart + direction * rangeShiftStep;
      let nextEnd = parsedEnd + direction * rangeShiftStep;

      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = Math.min(maxIndex, width);
      } else if (nextEnd > maxIndex) {
        nextEnd = maxIndex;
        nextStart = Math.max(0, maxIndex - width);
      }

      updateSettingsRange(nextStart, nextEnd);
    },
    [settingsDraft, settingsPanel, settingsTargetWorkspace, updateSettingsRange, updateWorkspaceState]
  );

  const toggleDeleteSelection = (fileId: string) => {
    updateWorkspaceState(activeWorkspace, (previous) => ({
      ...previous,
      selectedDeleteIds: previous.selectedDeleteIds.includes(fileId)
        ? previous.selectedDeleteIds.filter((id) => id !== fileId)
        : [...previous.selectedDeleteIds, fileId]
    }));
  };

  const toggleSelectAllDeleteItems = () => {
    updateWorkspaceState(activeWorkspace, (previous) => ({
      ...previous,
      selectedDeleteIds:
        filteredFiles.length > 0 && filteredFiles.every((file) => previous.selectedDeleteIds.includes(file.fileId))
          ? previous.selectedDeleteIds.filter((id) => !filteredFiles.some((file) => file.fileId === id))
          : Array.from(new Set([...previous.selectedDeleteIds, ...filteredFiles.map((file) => file.fileId)]))
    }));
  };

  const handleDeleteFiles = async () => {
    if (selectedDeleteIds.length === 0) {
      return;
    }

    setDeleteSubmitting(true);
    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fileIds: selectedDeleteIds })
      });
      if (response.status === 401) {
        await refreshAuthState();
        throw new Error("login required");
      }
      const payload = (await response.json().catch(() => null)) as
        | { deletedFileIds?: string[] }
        | null;

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      const deletedIds = payload?.deletedFileIds ?? [];
      const deletedSet = new Set(deletedIds);
      const affectedDataPanels = panels
        .filter((panel) => panel.fileId && deletedSet.has(panel.fileId))
        .map((panel) => panel.panelId);
      const affectedParameterPanels = panels
        .filter((panel) => panel.parameterFileId && deletedSet.has(panel.parameterFileId))
        .map((panel) => panel.panelId);
      const affectedUnsupervisedPanels = panels
        .filter((panel) => panel.unsupervisedFileId && deletedSet.has(panel.unsupervisedFileId))
        .map((panel) => panel.panelId);
      const affectedWavePanels = panels
        .filter((panel) => panel.waveFileId && deletedSet.has(panel.waveFileId))
        .map((panel) => panel.panelId);

      if (
        affectedDataPanels.length > 0 ||
        affectedParameterPanels.length > 0 ||
        affectedUnsupervisedPanels.length > 0 ||
        affectedWavePanels.length > 0
      ) {
        updateAppState((previous) => ({
          ...previous,
          panels: previous.panels.map((panel) =>
            panel.fileId && deletedSet.has(panel.fileId)
              ? createDefaultPanelState(panel.panelId, panel.workspaceKind)
              : panel.waveFileId && deletedSet.has(panel.waveFileId)
                ? {
                    ...panel,
                    waveFileId: null,
                    waveFileName: null
                  }
              : panel.parameterFileId && deletedSet.has(panel.parameterFileId)
                ? {
                    ...panel,
                    parameterFileId: null,
                    parameterFileName: null
                  }
                : panel.unsupervisedFileId && deletedSet.has(panel.unsupervisedFileId)
                  ? {
                      ...panel,
                      unsupervisedFileId: null,
                      unsupervisedFileName: null
                    }
                : panel
          )
        }));
        affectedDataPanels.forEach((panelId) => {
          clearPanelPlotState(panelId);
          clearPanelParameterState(panelId);
          clearPanelUnsupervisedState(panelId);
          if (settingsPanelId === panelId) {
            setSettingsPanelId(null);
            setSettingsDraft(null);
          }
        });
        affectedParameterPanels.forEach((panelId) => {
          if (!affectedDataPanels.includes(panelId)) {
            clearPanelParameterState(panelId);
          }
        });
        affectedUnsupervisedPanels.forEach((panelId) => {
          if (!affectedDataPanels.includes(panelId)) {
            clearPanelUnsupervisedState(panelId);
          }
        });
      }

      updateAppState((previous) => ({
        ...previous,
        statusMessage: `Deleted ${deletedIds.length} file(s).`,
        selectedDeleteIds: []
      }));
      setIsDeleteModalOpen(false);
      await fetchFileList(activeWorkspace);
    } catch (error) {
      updateAppState((previous) => ({
        ...previous,
        statusMessage: error instanceof Error ? `Delete failed: ${error.message}` : "Delete failed"
      }));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const handleAccessCodeLogin = async () => {
    const trimmedCode = accessCodeInput.trim();
    if (!trimmedCode) {
      setAuthMessage("Enter the one-time access code.");
      return;
    }

    try {
      const response = await fetch("/api/auth/access-code/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode })
      });
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setAccessCodeInput("");
      setAuthMessage("");
      await refreshAuthState();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "access code login failed");
    }
  };

  const openAdminModal = () => {
    setAdminMessage("");
    setIsAdminModalOpen(true);
    setAdminAccessModeDraft(authState.accessMode);
    setAdminUsernameInput(authState.adminUsername ?? "ms");
    setAdminLoginUsername(authState.adminUsername ?? "ms");
  };

  const closeAdminModal = () => {
    setAdminMessage("");
    setIsAdminModalOpen(false);
    setAdminUsernameInput(authState.adminUsername ?? "ms");
    setAdminPasswordInput("");
    setAdminPasswordConfirm("");
    setAdminLoginUsername(authState.adminUsername ?? "ms");
    setAdminLoginPassword("");
    setChangeCurrentPassword("");
    setChangeNewPassword("");
    setChangeConfirmPassword("");
  };

  const handleAdminSetup = async () => {
    if (adminPasswordInput !== adminPasswordConfirm) {
      setAdminMessage("Admin password confirmation does not match.");
      return;
    }

    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsernameInput.trim(),
          password: adminPasswordInput
        })
      });
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setAdminMessage("Admin account saved. Log in to manage access.");
      await refreshAuthState();
      setAdminPasswordInput("");
      setAdminPasswordConfirm("");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "failed to configure admin password");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleAdminLogin = async () => {
    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminLoginUsername.trim(),
          password: adminLoginPassword
        })
      });
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setAdminLoginPassword("");
      setAdminMessage("");
      await refreshAuthState();
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "admin login failed");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleAdminAccessModeSave = async () => {
    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/access-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessMode: adminAccessModeDraft })
      });
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setAdminMessage(`Access mode set to ${adminAccessModeDraft}.`);
      await refreshAuthState();
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "failed to update access mode");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleGenerateAccessCode = async () => {
    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/generate-access-code", {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as
        | { detail?: unknown; expiresAt?: string }
        | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setLatestAccessCodeExpiresAt(payload?.expiresAt ?? null);
      setAdminMessage("One-time numeric code printed to the backend terminal. It is valid for 5 minutes.");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "failed to generate access code");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleAdminPasswordChange = async () => {
    if (changeNewPassword !== changeConfirmPassword) {
      setAdminMessage("New password confirmation does not match.");
      return;
    }

    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: changeCurrentPassword,
          newPassword: changeNewPassword
        })
      });
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeConfirmPassword("");
      setAdminMessage("Admin password updated.");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "failed to change admin password");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    setAdminSubmitting(true);
    try {
      await fetch("/api/auth/admin/logout", { method: "POST" });
      await refreshAuthState();
      setAdminMessage("Admin logged out.");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const isAccessLocked = !authLoading && authState.accessMode === "code" && !authState.isAuthenticated;

  return (
    <>
      {isAccessLocked ? (
        <div className="auth-shell">
          <div className="auth-hero">
            <div className="auth-brand-mark">
              <AccessKeyIcon />
            </div>
            <div className="auth-hero-title">HeartSound Analysis Tool</div>
            <div className="auth-hero-text">
              Temporary access is protected. Enter the 5-minute numeric code printed in the backend terminal.
            </div>
            <div className="auth-hero-badges">
              <span className={`health-badge ${healthStatus}`}>API: {healthStatus}</span>
              <span className="health-badge">Access: code</span>
            </div>
          </div>

          <form
            className="auth-card auth-login-card"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAccessCodeLogin();
            }}
          >
            <div className="auth-card-header">
              <div className="auth-card-title">Sign in with one-time code</div>
              <div className="auth-card-subtitle">Valid for 5 minutes after the admin generates it.</div>
            </div>
            <label className="settings-field">
              <span className="settings-label">One-time numeric code</span>
              <input
                className="settings-input auth-code-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                placeholder="6-digit code"
                value={accessCodeInput}
                onChange={(event) => setAccessCodeInput(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button type="submit" className="auth-primary-button">
              Open Tool
            </button>
            <button type="button" className="auth-secondary-button" onClick={openAdminModal}>
              Admin settings
            </button>
            {authMessage ? <div className="auth-message auth-message-error">{authMessage}</div> : null}
            <div className="auth-help-text">
              If you do not have a code, ask the administrator to generate one from the running launcher session.
            </div>
          </form>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-title">
              {WORKSPACE_TABS.find((workspace) => workspace.key === activeWorkspace)?.title}
            </div>
            <div className="file-role-tabs">
              {availableFileRoleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={tab.key === activeFileRole ? "file-role-tab active" : "file-role-tab"}
                  onClick={() =>
                    updateAppState((previous) => ({
                      ...previous,
                      activeFileRole: tab.key,
                      selectedDeleteIds: []
                    }))
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="placeholder-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Upload {getFileRoleActionLabel(activeFileRole, false)}
            </button>
            <button
              type="button"
              className="placeholder-button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
            >
              Upload {getFileRoleActionLabel(activeFileRole, true)}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={getFileAcceptValue(activeFileRole)}
              multiple
              className="hidden-input"
              onChange={handleUploadInputChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden-input"
              onChange={handleFolderInputChange}
            />

            <input
              type="text"
              className="file-search-input"
              placeholder="Search files or /search ..."
              value={searchText}
              onKeyDown={handleSearchInputKeyDown}
              onChange={(event) =>
                updateAppState((previous) => ({
                  ...previous,
                  searchText: event.target.value
                }))
              }
            />

            <div className="file-list-placeholder">
              <div className="file-list-title">
                {getFileRoleListTitle(activeFileRole)}
              </div>
              <div className="file-list-subtitle">
                {getFileRoleListSubtitle(activeFileRole, activePanelId)}
              </div>
              <div className="file-list-scroller">
                {filesLoading ? (
                  <div className="file-list-empty">Loading...</div>
                ) : filteredFiles.length === 0 ? (
                  <div className="file-list-empty">{getFileRoleEmptyLabel(activeWorkspace, activeFileRole)}</div>
                ) : (
                  filteredFiles.map((file) => (
                    <button
                      key={file.fileId}
                      type="button"
                      className={
                        (file.fileId === getLinkedFileIdForPanelRole(activePanel, activeFileRole))
                          ? "file-item active-target"
                          : "file-item"
                      }
                      onClick={() =>
                        activeFileRole === "data"
                          ? assignDataFileToActivePanel(file)
                          : isPanelLinkedFileRole(activeFileRole)
                            ? assignSupportFileToActivePanel(file, activeFileRole)
                            : undefined
                      }
                    >
                      <div className="file-item-name">{file.originalName}</div>
                      {file.relativePath ? <div className="file-item-path">{file.relativePath}</div> : null}
                      <div className="file-item-meta">
                        <span>{formatTimestamp(file.uploadedAt)}</span>
                        <span>{getFileMetaText(file)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              className="danger-button sidebar-delete-button"
              disabled={filteredFiles.length === 0}
              onClick={() => {
                updateAppState((previous) => ({
                  ...previous,
                  selectedDeleteIds: []
                }));
                setIsDeleteModalOpen(true);
              }}
            >
              Delete Files
            </button>

            <div className="sidebar-future-space" aria-hidden="true" />
            {statusMessage ? <div className="status-message">{statusMessage}</div> : null}
          </aside>

          <main className="main-area">
            <header className="toolbar">
              <div className="split-buttons">
                {SPLIT_BUTTONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={mode === splitMode ? "split-button active" : "split-button"}
                    onClick={() =>
                      updateAppState((previous) => ({
                        ...previous,
                        splitMode: mode
                      }))
                    }
                  >
                    {mode === 1 ? "1 Panel" : "2 Panels"}
                  </button>
                ))}
              </div>
              <div className="toolbar-center">
                {WORKSPACE_TABS.map((workspace) => (
                  <button
                    key={workspace.key}
                    type="button"
                    className={
                      viewMode === "analysis" && workspace.key === activeWorkspace
                        ? "workspace-switch-button active"
                        : "workspace-switch-button"
                    }
                    onClick={() => {
                      closeSettingsModal();
                      setIsDeleteModalOpen(false);
                      setViewMode("analysis");
                      void updatePanelWorkspace(activePanelId, workspace.key);
                    }}
                  >
                    {workspace.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={viewMode === "labeling" ? "workspace-switch-button active" : "workspace-switch-button"}
                  onClick={() => {
                    closeSettingsModal();
                    setIsDeleteModalOpen(false);
                    setViewMode("labeling");
                  }}
                >
                  Labeling
                </button>
              </div>
              <div className="toolbar-status">
                <span className={`health-badge ${healthStatus}`}>API: {healthStatus}</span>
                <span className="health-badge">
                  {authState.accessMode === "code" ? "Access: code" : "Access: open"}
                </span>
                <span>{viewMode === "labeling" ? "Mode: Labeling" : activeWorkspace === "heartsound" ? "Workspace: HeartSound" : "Workspace: ECG"}</span>
                <span>{`Files: ${getFileRoleLabel(activeFileRole)}`}</span>
                <span>Active Panel: {activePanelId}</span>
                <button type="button" className="split-button" onClick={openAdminModal}>
                  Admin
                </button>
              </div>
            </header>

            <section className={`dashboard split-${splitMode}`}>
              {visiblePanelIds.map((panelId) => {
                const panel = panels.find((item) => item.panelId === panelId)!;
                return (
                  <PanelCard
                    key={panelId}
                    workspaceKind={panel.workspaceKind}
                    panel={panel}
                    plotState={panelPlots[panelId]}
                    parameterState={panelParameters[panelId]}
                    unsupervisedState={panelUnsupervised[panelId]}
                    heartsoundCandidateSettings={heartsoundCandidateSettings}
                    isActive={panelId === activePanelId}
                    onActivate={(nextPanelId) =>
                      updateAppState((previous) => ({
                        ...previous,
                        activePanelId: nextPanelId
                      }))
                    }
                    onToggleParameterSummary={togglePanelParameterSummary}
                    onToggleSelectedCycleHighlight={togglePanelSelectedCycleHighlight}
                    onToggleUnsupervisedOverlay={togglePanelUnsupervisedOverlay}
                    onOpenSeriesPicker={openSeriesPickerForPanel}
                    onResetDisplayDefaults={resetPanelDisplayDefaults}
                    onOpenSettings={openSettingsForPanel}
                    onResetPanel={resetPanel}
                    onSliderRangeCommit={applyPanelRange}
                    onPrefetchRange={prefetchRangePlot}
                    onSelectCycle={selectPanelCycle}
                    onSelectParameterMetric={selectPanelParameterMetric}
                    onDownloadParameterExport={downloadParameterExportForPanel}
                    onDownloadLabelingExport={downloadLabelingExportForPanel}
                    onClearLabelingMarkers={clearLabelingMarkersForPanel}
                    onSelectLabelingAnchor={(targetPanelId, index) => {
                      if (targetPanelId !== activePanelId) {
                        updateAppState((previous) => ({
                          ...previous,
                          activePanelId: targetPanelId
                        }));
                      }
                      setLabelingAnchorIndex(index);
                    }}
                    onAddLabelingMarker={addPanelChartNoteMarker}
                    isLabelingMode={viewMode === "labeling"}
                    labelingAnchorIndex={panelId === activePanelId ? labelingAnchorIndex : null}
                    isParameterExporting={parameterExportPanelId === panelId}
                    isLabelingExporting={labelingExportPanelId === panelId}
                  />
                );
              })}
            </section>
          </main>
        </div>
      )}

      {!isAccessLocked && labelingPanel ? (
        <div className="modal-overlay" role="presentation" onClick={closeLabelingWorkspace}>
          <div
            className="modal-card labeling-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Labeling workspace"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-title labeling-modal-title">
              <div className="labeling-modal-title-group">
                <div>Panel {labelingPanel.panelId} Labeling Workspace</div>
                <div className="labeling-modal-subtitle">
                  Click one sample, then press <strong>Q</strong>, <strong>W</strong>, <strong>E</strong>, or <strong>R</strong> to place a label line.
                </div>
              </div>
            </div>
            <div className="modal-body labeling-modal-body">
              <div className="labeling-toolbar">
                <div className="labeling-toolbar-section">
                  <div className="labeling-toolbar-label">File</div>
                  <div className="labeling-toolbar-value">
                    {labelingPanel.fileName ?? "No data file linked"}
                  </div>
                </div>
                <div className="labeling-toolbar-section">
                  <div className="labeling-toolbar-label">Selected Sample</div>
                  <div className="labeling-toolbar-value">
                    {labelingAnchorIndex === null ? "-" : formatRowNumber(labelingAnchorIndex)}
                  </div>
                </div>
                <div className="labeling-toolbar-section">
                  <div className="labeling-toolbar-label">Amplitude</div>
                  <div className="labeling-toolbar-value">
                    {labelingAnchorAmplitude === null
                      ? "-"
                      : `${formatMetricValue(labelingAnchorAmplitude)} mV`}
                  </div>
                </div>
                <div className="labeling-toolbar-section">
                  <div className="labeling-toolbar-label">Range</div>
                  <div className="labeling-toolbar-value">
                    {formatRowNumber(labelingPanel.rangeStart)} - {formatRowNumber(labelingPanel.rangeEnd)}
                  </div>
                </div>
              </div>

              <div className="labeling-key-grid" aria-label="Labeling key legend">
                {(["q", "w", "e", "r"] as ChartNoteMarkerKey[]).map((keyTag) => {
                  const style = CHART_NOTE_MARKER_STYLES[keyTag];
                  return (
                    <div key={keyTag} className="labeling-key-card">
                      <span
                        className="labeling-key-swatch"
                        style={{ background: style.color, borderColor: style.color }}
                        aria-hidden="true"
                      />
                      <span className="labeling-key-name">{style.label}</span>
                      <span className="labeling-key-shortcut">{keyTag.toUpperCase()}</span>
                      <span className="labeling-key-count">{labelingMarkerCounts[keyTag]} labels</span>
                    </div>
                  );
                })}
              </div>

              <div className="labeling-chart-shell">
                {!labelingChartOption ? (
                  <div className="empty-state">Load a data file to start labeling.</div>
                ) : (
                  <ReactECharts
                    option={labelingChartOption}
                    style={{ width: "100%", height: "100%" }}
                    onEvents={{ click: onLabelingChartClick, datazoom: onLabelingDataZoom }}
                    notMerge
                    lazyUpdate
                  />
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="danger-action"
                onClick={() => clearLabelingMarkersForPanel(labelingPanel.panelId)}
                disabled={labelingPanel.chartNoteMarkers.length === 0}
              >
                Clear labels
              </button>
              <button
                type="button"
                className="parameter-download-button"
                onClick={() => {
                  void downloadLabelingExportForPanel(labelingPanel.panelId);
                }}
                disabled={labelingExportPanelId === labelingPanel.panelId || !labelingPanel.fileId}
              >
                {labelingExportPanelId === labelingPanel.panelId ? "Preparing xlsx..." : "Download xlsx"}
              </button>
              <button type="button" className="split-button" onClick={closeLabelingWorkspace}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isAccessLocked && settingsPanel && settingsDraft ? (
        <div className="modal-overlay" role="presentation">
          <form
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Panel settings modal"
            onSubmit={(event) => {
              event.preventDefault();
              applySettings();
            }}
          >
            <div className="modal-title">Panel {settingsPanel.panelId} Settings</div>
            <div className="modal-body settings-form">
              <label className="settings-field">
                <span className="settings-label">Start Index</span>
                <input
                  className="settings-input"
                  type="number"
                  value={settingsDraft.rangeStart}
                  onChange={(event) =>
                    setSettingsDraft({ ...settingsDraft, rangeStart: event.target.value })
                  }
                />
              </label>
              <label className="settings-field">
                <span className="settings-label">End Index</span>
                <input
                  className="settings-input"
                  type="number"
                  value={settingsDraft.rangeEnd}
                  onChange={(event) =>
                    setSettingsDraft({ ...settingsDraft, rangeEnd: event.target.value })
                  }
                />
              </label>
              <div className="settings-field">
                <span className="settings-label">Quick Range</span>
                <div className="range-toolbar">
                  <div className="quick-range-group">
                    {QUICK_RANGE_PRESETS.map((presetEnd) => (
                      <button
                        key={presetEnd}
                        type="button"
                        className="range-chip-button"
                        onClick={() => applyQuickRangePreset(presetEnd)}
                      >
                        0 - {presetEnd.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="range-shift-group">
                    <button
                      type="button"
                      className="range-shift-button"
                      onClick={() => shiftSettingsRange(-1)}
                    >
                      <ChevronLeftIcon />
                      <span>{settingsRangeShiftStep.toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      className="range-shift-button"
                      onClick={() => shiftSettingsRange(1)}
                    >
                      <span>{settingsRangeShiftStep.toLocaleString()}</span>
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              </div>
              <label className="settings-field">
                <span className="settings-label">Amplitude Line Width</span>
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="6"
                  value={settingsDraft.amplitudeLineWidth}
                  onChange={(event) =>
                    setSettingsDraft({ ...settingsDraft, amplitudeLineWidth: event.target.value })
                  }
                />
              </label>
              <label className="settings-field">
                <span className="settings-label">RS Bar Opacity</span>
                <input
                  className="settings-input"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1"
                  value={settingsDraft.rsBarOpacity}
                  onChange={(event) =>
                    setSettingsDraft({ ...settingsDraft, rsBarOpacity: event.target.value })
                  }
                />
              </label>
              {settingsTargetWorkspace === "ecg" ? (
                <div className="settings-field">
                  <span className="settings-label">ECG Marker Source</span>
                  <div className="settings-segmented">
                    <button
                      type="button"
                      className={
                        settingsDraft.ecgMarkerMode === "major"
                          ? "settings-segmented-button active"
                          : "settings-segmented-button"
                      }
                      onClick={() => setSettingsDraft({ ...settingsDraft, ecgMarkerMode: "major" })}
                    >
                      Major
                    </button>
                    <button
                      type="button"
                      className={
                        settingsDraft.ecgMarkerMode === "point"
                          ? "settings-segmented-button active"
                          : "settings-segmented-button"
                      }
                      onClick={() => setSettingsDraft({ ...settingsDraft, ecgMarkerMode: "point" })}
                    >
                      Point
                    </button>
                  </div>
                </div>
              ) : null}
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={settingsDraft.yAxisAutoScale}
                  onChange={(event) =>
                    setSettingsDraft({ ...settingsDraft, yAxisAutoScale: event.target.checked })
                  }
                />
                Y-axis Auto Scale
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="split-button" onClick={closeSettingsModal}>
                Cancel
              </button>
              <button type="button" className="split-button" onClick={resetSettingsRangeToFull}>
                View Full Range
              </button>
              <button type="submit" className="split-button">
                Apply
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  resetPanel(settingsPanel.panelId);
                  closeSettingsModal();
                }}
              >
                Panel Reset
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {!isAccessLocked && seriesPanel ? (
        <div className="modal-overlay" role="presentation" onClick={closeSeriesPicker}>
          <div
            className="modal-card series-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Series selection modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-title">Panel {seriesPanel.panelId} Series</div>
            <div className="modal-body">
              {(() => {
                const seriesItems = getSeriesItemsForWorkspace(
                  seriesPanel.workspaceKind,
                  seriesPanel.styleOptions.ecgMarkerMode
                );
                const allSeriesEnabled = seriesItems.every(
                  (series) => seriesPanel.visibleSeries[series.key]
                );

                return (
                  <>
                    <label className="series-modal-item series-modal-item-all">
                      <input
                        type="checkbox"
                        checked={allSeriesEnabled}
                        onChange={() =>
                          setPanelSeriesVisibility(seriesPanel.panelId, !allSeriesEnabled)
                        }
                      />
                      <span>All</span>
                    </label>
                    <div className="series-modal-grid">
                      {seriesItems.map((series) => (
                        <label key={series.key} className="series-modal-item">
                          <input
                            type="checkbox"
                            checked={seriesPanel.visibleSeries[series.key]}
                            onChange={() => togglePanelSeries(seriesPanel.panelId, series.key)}
                          />
                          <span style={{ color: series.color }}>{series.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="modal-actions">
              <button type="button" className="split-button" onClick={closeSeriesPicker}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAdminModalOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Admin access settings">
            <div className="modal-title">Admin Access Settings</div>
            <div className="modal-body settings-form">
              {!authState.hasAdminPassword ? (
                <>
                  <div className="settings-label">
                    Set the first admin ID and password. This account is used to open the access settings later.
                  </div>
                  <label className="settings-field">
                    <span className="settings-label">Admin ID</span>
                    <input
                      className="settings-input"
                      type="text"
                      value={adminUsernameInput}
                      onChange={(event) => setAdminUsernameInput(event.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span className="settings-label">Admin Password</span>
                    <input
                      className="settings-input"
                      type="password"
                      value={adminPasswordInput}
                      onChange={(event) => setAdminPasswordInput(event.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span className="settings-label">Confirm Password</span>
                    <input
                      className="settings-input"
                      type="password"
                      value={adminPasswordConfirm}
                      onChange={(event) => setAdminPasswordConfirm(event.target.value)}
                    />
                  </label>
                </>
              ) : !authState.isAdmin ? (
                <>
                  <div className="settings-label">Enter the admin ID and password to manage login settings.</div>
                  <label className="settings-field">
                    <span className="settings-label">Admin ID</span>
                    <input
                      className="settings-input"
                      type="text"
                      value={adminLoginUsername}
                      onChange={(event) => setAdminLoginUsername(event.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span className="settings-label">Admin Password</span>
                    <input
                      className="settings-input"
                      type="password"
                      value={adminLoginPassword}
                      onChange={(event) => setAdminLoginPassword(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="settings-label">
                    Admin ID: <strong>{authState.adminUsername ?? "ms"}</strong>
                  </div>
                  <label className="settings-field">
                    <span className="settings-label">Access Mode</span>
                    <select
                      className="settings-input"
                      value={adminAccessModeDraft}
                      onChange={(event) => setAdminAccessModeDraft(event.target.value as AccessMode)}
                    >
                      <option value="open">Open access</option>
                      <option value="code">One-time code required</option>
                    </select>
                  </label>
                  <div className="settings-field">
                    <span className="settings-label">One-time Access Code</span>
                    <button
                      type="button"
                      className="split-button"
                      disabled={adminSubmitting}
                      onClick={() => void handleGenerateAccessCode()}
                    >
                      Generate 5-Minute Numeric Code
                    </button>
                    {latestAccessCodeExpiresAt ? (
                      <div className="settings-label">
                        Last code expiry: {formatTimestamp(latestAccessCodeExpiresAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="settings-field">
                    <span className="settings-label">Change Admin Password</span>
                    <input
                      className="settings-input"
                      type="password"
                      placeholder="Current password"
                      value={changeCurrentPassword}
                      onChange={(event) => setChangeCurrentPassword(event.target.value)}
                    />
                    <input
                      className="settings-input"
                      type="password"
                      placeholder="New password"
                      value={changeNewPassword}
                      onChange={(event) => setChangeNewPassword(event.target.value)}
                    />
                    <input
                      className="settings-input"
                      type="password"
                      placeholder="Confirm new password"
                      value={changeConfirmPassword}
                      onChange={(event) => setChangeConfirmPassword(event.target.value)}
                    />
                  </div>
                </>
              )}
              {adminMessage ? <div className="auth-message">{adminMessage}</div> : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="split-button" onClick={closeAdminModal}>
                Close
              </button>
              {!authState.hasAdminPassword ? (
                <button
                  type="button"
                  className="split-button"
                  disabled={adminSubmitting}
                  onClick={() => void handleAdminSetup()}
                >
                  Save Admin Account
                </button>
              ) : !authState.isAdmin ? (
                <button
                  type="button"
                  className="split-button"
                  disabled={adminSubmitting}
                  onClick={() => void handleAdminLogin()}
                >
                  Admin Login
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="split-button"
                    disabled={adminSubmitting}
                    onClick={() => void handleAdminAccessModeSave()}
                  >
                    Save Access Mode
                  </button>
                  <button
                    type="button"
                    className="split-button"
                    disabled={adminSubmitting}
                    onClick={() => void handleAdminPasswordChange()}
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    disabled={adminSubmitting}
                    onClick={() => void handleAdminLogout()}
                  >
                    Admin Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!isAccessLocked && isDeleteModalOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Delete files modal">
            <div className="modal-title">Delete Files</div>
            <div className="modal-body">
              {filteredFiles.length === 0 ? (
                <div className="file-list-empty">No files to delete.</div>
              ) : (
                <>
                  <label className="delete-select-all">
                    <input
                      type="checkbox"
                      checked={allFilteredDeleteSelected}
                      onChange={toggleSelectAllDeleteItems}
                    />
                    <span>Select all visible files</span>
                  </label>
                  {filteredFiles.map((file) => (
                    <label key={file.fileId} className="delete-item">
                      <input
                        type="checkbox"
                        checked={selectedDeleteIds.includes(file.fileId)}
                        onChange={() => toggleDeleteSelection(file.fileId)}
                      />
                      <span>{file.originalName}</span>
                      {file.relativePath ? <span className="delete-path">{file.relativePath}</span> : null}
                    </label>
                  ))}
                </>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="split-button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  updateWorkspaceState(activeWorkspace, (previous) => ({
                    ...previous,
                    selectedDeleteIds: []
                  }));
                }}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-action"
                disabled={selectedDeleteIds.length === 0 || deleteSubmitting}
                onClick={() => void handleDeleteFiles()}
              >
                {deleteSubmitting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
