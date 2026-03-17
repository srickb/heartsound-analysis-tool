import {
  type ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import type { EChartsOption } from "echarts";
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
type PanelLinkedFileRole = Extract<FileRole, "parameter" | "unsupervised">;

interface VisibleSeries {
  amplitude: boolean;
  s1Area: boolean;
  s2Area: boolean;
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
  mean: number;
  min: number;
  max: number;
}

interface ParameterSummaryGroup {
  key: string;
  label: string;
  metrics: ParameterMetricSummary[];
}

interface ParameterSummaryCycle {
  cycleIndex: number;
  startIndex: number;
  endIndex: number;
  groups: ParameterSummaryGroup[];
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
  searchText: string;
  chartSearchIndexText: string;
  statusMessage: string;
  selectedDeleteIds: string[];
}

interface PanelCardProps {
  workspaceKind: WorkspaceKind;
  panel: PanelState;
  plotState: PanelPlotState;
  parameterState: PanelParameterState;
  unsupervisedState: PanelUnsupervisedState;
  searchMarkerIndex: number | null;
  showSearchInput: boolean;
  searchInputValue: string;
  onSearchInputChange: (value: string) => void;
  isActive: boolean;
  onActivate: (panelId: PanelId) => void;
  onToggleParameterSummary: (panelId: PanelId) => void;
  onToggleSelectedCycleHighlight: (panelId: PanelId) => void;
  onToggleUnsupervisedOverlay: (panelId: PanelId) => void;
  onOpenSeriesPicker: (panelId: PanelId) => void;
  onResetDisplayDefaults: (panelId: PanelId) => void;
  onOpenSettings: (panelId: PanelId) => void;
  onResetPanel: (panelId: PanelId) => void;
  onSliderRangeCommit: (panelId: PanelId, start: number, end: number) => void;
  onSelectCycle: (panelId: PanelId, cycleIndex: number) => void;
}

type DataPair = [number, number];

interface HeartsoundRegionOverlay {
  label: "S1" | "S2";
  startPeak: DataPair;
  endPeak: DataPair;
  areaStart: number;
  areaEnd: number;
  fillColor: string;
  borderColor: string;
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
  { key: "s1Start", label: "S1-Start_RS_Score", color: "#2ea043" },
  { key: "s1End", label: "S1-End_RS_Score", color: "#d29922" },
  { key: "s2Start", label: "S2-Start_RS_Score", color: "#db6d28" },
  { key: "s2End", label: "S2-End_RS_Score", color: "#f85149" }
];

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
  styleOptions: { ...DEFAULT_STYLE_OPTIONS }
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
const QUICK_RANGE_SHIFT_STEP = 30000;
const ECG_RANGE_SHIFT_STEP = 200;
const KEYBOARD_RANGE_SHIFT_STEP = 3000;
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
  searchText: "",
  chartSearchIndexText: "",
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

const parseNumericInput = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed);
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

const getParameterMetricUnit = (workspaceKind: WorkspaceKind, metricKey: string): string | null => {
  if (/_ratio$/i.test(metricKey) || metricKey === "sys_dia_ratio" || metricKey === "S1_ratio" || metricKey === "S2_ratio") {
    return "ratio";
  }

  if (
    /(?:_width|_duration|_interval|_segment)$/i.test(metricKey) ||
    ["p_rs", "qrs_rs", "t_rs", "cycle_duration"].includes(metricKey)
  ) {
    return workspaceKind === "ecg" ? "samples" : "index";
  }

  if (/(?:^area_|_area$)/i.test(metricKey)) {
    return workspaceKind === "ecg" ? "a.u. * samples" : "a.u. * index";
  }

  if (/(?:^Peak_|_peak_|_amp$|_avg$|^rms_)/i.test(metricKey)) {
    return "a.u.";
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
  if (fileRole === "parameter") {
    return `Click file to link as parameter to Panel ${panelId}`;
  }
  if (fileRole === "wave") {
    return "Uploaded wave files will appear here";
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
  fileRole === "parameter" || fileRole === "unsupervised";

const getLinkedFileIdForPanelRole = (panel: PanelState, fileRole: FileRole): string | null => {
  if (fileRole === "data") {
    return panel.fileId;
  }
  if (fileRole === "parameter") {
    return panel.parameterFileId;
  }
  if (fileRole === "unsupervised") {
    return panel.unsupervisedFileId;
  }
  return null;
};

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

const PanelCard = memo(function PanelCard({
  workspaceKind,
  panel,
  plotState,
  parameterState,
  unsupervisedState,
  searchMarkerIndex,
  showSearchInput,
  searchInputValue,
  onSearchInputChange,
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
  onSelectCycle
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
  const showParameterSection = panel.showParameterSummary;
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
  const displayedParameterGroups = selectedCycle?.groups ?? parameterSummary?.groups ?? [];
  const [parameterSplitRatio, setParameterSplitRatio] = useState<number>(0.5);
  const [isSplitDragging, setIsSplitDragging] = useState<boolean>(false);
  const panelWrapperRef = useRef<HTMLDivElement | null>(null);

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
    const s1RegionOverlays =
      workspaceKind === "heartsound" && panel.visibleSeries.s1Area
        ? buildHeartsoundRegionOverlays(
            "S1",
            s1StartPairs,
            s1EndPairs,
            "rgba(46, 160, 67, 0.14)",
            "rgba(46, 160, 67, 0.42)"
          )
        : [];
    const s2RegionOverlays =
      workspaceKind === "heartsound" && panel.visibleSeries.s2Area
        ? buildHeartsoundRegionOverlays(
            "S2",
            s2StartPairs,
            s2EndPairs,
            "rgba(248, 81, 73, 0.13)",
            "rgba(248, 81, 73, 0.38)"
          )
        : [];
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
    if (searchMarkerIndex !== null) {
      const markerIndex = clampNumber(searchMarkerIndex, 0, maxIndex);
      mainSeries.push({
        name: "Search Marker",
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        silent: true,
        showSymbol: false,
        animation: false,
        lineStyle: { opacity: 0 },
        itemStyle: { opacity: 0 },
        tooltip: { show: false },
        data: amplitudePairs.length > 0 ? [amplitudePairs[0]] : [[markerIndex, 0]],
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          animation: false,
          label: { show: false },
          lineStyle: {
            color: "#ff4d4f",
            width: 1
          },
          data: [{ xAxis: markerIndex }]
        }
      });
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
          label: { show: false },
          itemStyle: {
            color: "rgba(255, 166, 87, 0.22)",
            borderColor: "rgba(255, 166, 87, 0.62)"
          },
          data: [[{ xAxis: selectedCycle.startIndex }, { xAxis: selectedCycle.endIndex }]]
        }
      });
    }
    for (const regionOverlay of [...s1RegionOverlays, ...s2RegionOverlays]) {
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
          label: { show: false },
          itemStyle: {
            color: regionOverlay.fillColor,
            borderColor: regionOverlay.borderColor
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
  }, [activePlot, overviewPlot, panel, searchMarkerIndex, selectedCycle, unsupervisedSummary, workspaceKind]);

  const chartLegendItems = useMemo(() => {
    const seriesItems =
      workspaceKind === "heartsound"
        ? HEARTSOUND_SERIES_ITEMS
        : ECG_SERIES_ITEMS_BY_MODE[panel.styleOptions.ecgMarkerMode];

    return seriesItems.filter(
      (seriesItem) => seriesItem.key !== "amplitude" && panel.visibleSeries[seriesItem.key]
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

  const onNavigatorClick = useCallback(
    (event: { seriesName?: string; value?: unknown }) => {
      if (
        event.seriesName !== "Navigator" ||
        !panel.fileId ||
        panel.totalRows === null ||
        panel.totalRows <= 0
      ) {
        return;
      }

      const rawValue = Array.isArray(event.value) ? event.value[0] : event.value;
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return;
      }

      const maxIndex = Math.max(panel.totalRows - 1, 0);
      const currentWidth = Math.max(panel.rangeEnd - panel.rangeStart, 0);
      const centeredIndex = clampNumber(Math.round(rawValue), 0, maxIndex);
      const halfWidth = Math.floor(currentWidth / 2);

      let nextStart = centeredIndex - halfWidth;
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
    [onSliderRangeCommit, panel.fileId, panel.panelId, panel.rangeEnd, panel.rangeStart, panel.totalRows]
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
          {panel.parameterFileName ? (
            <div className="panel-linked-parameter">Parameter: {panel.parameterFileName}</div>
          ) : null}
          {panel.unsupervisedFileName ? (
            <div className="panel-linked-parameter">Unsupervised: {panel.unsupervisedFileName}</div>
          ) : null}
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
          {showSearchInput ? (
            <input
              type="number"
              inputMode="numeric"
              className="panel-index-input"
              placeholder="Index"
              value={searchInputValue}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          ) : null}
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
              <div className="panel-chart-host">
                <ReactECharts
                  option={chartOption}
                  style={{ width: "100%", height: "100%" }}
                  onEvents={{ datazoom: onDataZoom, click: onNavigatorClick }}
                  notMerge
                  lazyUpdate
                />
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
                {panel.parameterFileId ? (
                  <div className="parameter-summary-shell">
                    <div className="parameter-summary-header">
                      <div className="parameter-summary-title">Linked parameter window</div>
                      <div className="parameter-summary-header-actions">
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
                        {workspaceKind === "heartsound" && (parameterSummary.cycles?.length ?? 0) > 0 ? (
                          <div className="parameter-cycle-toolbar">
                            <label className="parameter-cycle-field">
                              <span className="parameter-cycle-label">Cycle</span>
                              <select
                                className="settings-input parameter-cycle-select"
                                value={String(selectedCycle?.cycleIndex ?? parameterSummary.cycles?.[0]?.cycleIndex ?? "")}
                                onChange={(event) => onSelectCycle(panel.panelId, Number(event.target.value))}
                              >
                                {parameterSummary.cycles?.map((cycle) => (
                                  <option key={cycle.cycleIndex} value={cycle.cycleIndex}>
                                    Cycle {cycle.cycleIndex}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {selectedCycle ? (
                              <div className="parameter-cycle-range">
                                highlight {formatRowNumber(selectedCycle.startIndex)} -{" "}
                                {formatRowNumber(selectedCycle.endIndex)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="parameter-group-list">
                          {displayedParameterGroups.map((group) => {
                            const scaleMax = Math.max(
                              ...group.metrics.flatMap((metric) => [
                                Math.abs(metric.mean),
                                Math.abs(metric.min),
                                Math.abs(metric.max)
                              ]),
                              1
                            );
                            return (
                              <section key={group.key} className="parameter-group-card">
                                <div className="parameter-group-title">{group.label}</div>
                                <div className="parameter-metric-list">
                                  {group.metrics.map((metric) => {
                                    const barWidth = `${Math.min(100, (Math.abs(metric.mean) / scaleMax) * 100)}%`;
                                    const metricUnit = getParameterMetricUnit(workspaceKind, metric.key);
                                    return (
                                      <div key={metric.key} className="parameter-metric-row">
                                        <div className="parameter-metric-label">
                                          <span>{metric.label}</span>
                                          {metricUnit ? <span className="parameter-metric-unit">{metricUnit}</span> : null}
                                        </div>
                                        <div className="parameter-metric-meter">
                                          <div className="parameter-metric-meter-fill" style={{ width: barWidth }} />
                                        </div>
                                        <div className="parameter-metric-value">{formatMetricValue(metric.mean)}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="parameter-summary-empty">
                        Attach a parameter file to this panel to view the current-range summary.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="parameter-summary-shell parameter-summary-shell-empty">
                    <div className="parameter-summary-empty">
                      Attach a parameter file to this panel to view the current-range summary.
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
});

function App() {
  const [appState, setAppState] = useState<AppState>(createAppState());
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
  const [adminAccessModeDraft, setAdminAccessModeDraft] = useState<AccessMode>("open");
  const [latestAccessCodeExpiresAt, setLatestAccessCodeExpiresAt] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [settingsPanelId, setSettingsPanelId] = useState<PanelId | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [seriesPanelId, setSeriesPanelId] = useState<PanelId | null>(null);

  const requestSeqRef = useRef<Record<PanelId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
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
    searchText,
    chartSearchIndexText,
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
  const settingsTargetWorkspace = settingsPanel?.workspaceKind ?? activeWorkspace;
  const settingsRangeShiftStep = getRangeShiftStep(settingsTargetWorkspace);
  const files = filesByWorkspace[activeWorkspace];
  const filesLoading = filesLoadingByWorkspace[activeWorkspace];
  const uploading = uploadingByWorkspace[activeWorkspace];
  const chartSearchMarkerIndex = splitMode === 1 ? parseNumericInput(chartSearchIndexText) : null;

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

  const selectPanelCycle = useCallback(
    (panelId: PanelId, cycleIndex: number) => {
      setPanelParameterState(panelId, (state) => ({
        ...state,
        selectedCycleIndex: cycleIndex
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
          const selectedCycleIndex =
            availableCycles.find((cycle) => cycle.cycleIndex === state.selectedCycleIndex)?.cycleIndex ??
            availableCycles[0]?.cycleIndex ??
            null;
          return {
            summary: payload,
            selectedCycleIndex,
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
    return roleFilteredFiles.filter((file) => {
      const originalNameMatched = file.originalName.toLowerCase().includes(query);
      const relativePathMatched = file.relativePath?.toLowerCase().includes(query) ?? false;
      return originalNameMatched || relativePathMatched;
    });
  }, [activeFileRole, files, searchText]);
  const allFilteredDeleteSelected =
    filteredFiles.length > 0 && filteredFiles.every((file) => selectedDeleteIds.includes(file.fileId));

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
    (panelId: PanelId, nextStart: number, nextEnd: number, forceFetch = false) => {
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
      if (isFullRange) {
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
        if (panel.parameterFileId) {
          void requestParameterSummaryForPanel(panelId, panel.parameterFileId, clampedStart, clampedEnd);
        } else {
          clearPanelParameterState(panelId);
        }
        if (panel.unsupervisedFileId) {
          void requestUnsupervisedSummaryForPanel(panelId, panel.unsupervisedFileId, clampedStart, clampedEnd);
        } else {
          clearPanelUnsupervisedState(panelId);
        }
        return;
      }

      if (panel.parameterFileId) {
        void requestParameterSummaryForPanel(panelId, panel.parameterFileId, clampedStart, clampedEnd);
      } else {
        clearPanelParameterState(panelId);
      }
      if (panel.unsupervisedFileId) {
        void requestUnsupervisedSummaryForPanel(panelId, panel.unsupervisedFileId, clampedStart, clampedEnd);
      } else {
        clearPanelUnsupervisedState(panelId);
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

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
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
      applyPanelRange(activePanelId, nextStart, nextEnd);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePanelId, applyPanelRange, panels, settingsPanelId]);

  const assignDataFileToActivePanel = useCallback(
    (file: UploadedFileMetadata) => {
      const initialRangeEnd = getInitialRangeEnd(file.rowCount, activePanel.workspaceKind);
      const matchedParameterFile = findAutoLinkedFile(files, file, "parameter");
      const matchedUnsupervisedFile = findAutoLinkedFile(files, file, "unsupervised");

      updatePanelState(activePanelId, (panel) => ({
        ...panel,
        fileId: file.fileId,
        fileName: file.originalName,
        parameterFileId: matchedParameterFile?.fileId ?? null,
        parameterFileName: matchedParameterFile?.originalName ?? null,
        unsupervisedFileId: matchedUnsupervisedFile?.fileId ?? null,
        unsupervisedFileName: matchedUnsupervisedFile?.originalName ?? null,
        totalRows: file.rowCount,
        previousRangeStart: null,
        previousRangeEnd: null,
        rangeStart: 0,
        rangeEnd: initialRangeEnd
      }));
      clearPanelPlotState(activePanelId);
      void (async () => {
        const overviewPayload = await requestOverviewPlot(activePanelId, file.fileId, false);
        if (overviewPayload !== null) {
          await requestRangePlot(activePanelId, file.fileId, 0, initialRangeEnd);
          if (matchedParameterFile) {
            await requestParameterSummaryForPanel(activePanelId, matchedParameterFile.fileId, 0, initialRangeEnd);
          } else {
            clearPanelParameterState(activePanelId);
          }
          if (matchedUnsupervisedFile) {
            await requestUnsupervisedSummaryForPanel(activePanelId, matchedUnsupervisedFile.fileId, 0, initialRangeEnd);
          } else {
            clearPanelUnsupervisedState(activePanelId);
          }
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
      requestRangePlot,
      updatePanelState
    ]
  );

  const assignSupportFileToActivePanel = useCallback(
    (file: UploadedFileMetadata, fileRole: PanelLinkedFileRole) => {
      updatePanelState(activePanelId, (panel) => ({
        ...panel,
        parameterFileId: fileRole === "parameter" ? file.fileId : panel.parameterFileId,
        parameterFileName: fileRole === "parameter" ? file.originalName : panel.parameterFileName,
        unsupervisedFileId: fileRole === "unsupervised" ? file.fileId : panel.unsupervisedFileId,
        unsupervisedFileName: fileRole === "unsupervised" ? file.originalName : panel.unsupervisedFileName
      }));

      const currentPanel = panels.find((panel) => panel.panelId === activePanelId);
      if (fileRole === "parameter" && currentPanel?.fileId && currentPanel.totalRows !== null && currentPanel.totalRows > 0) {
        void requestParameterSummaryForPanel(activePanelId, file.fileId, currentPanel.rangeStart, currentPanel.rangeEnd);
      } else if (fileRole === "parameter") {
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

      if (affectedDataPanels.length > 0 || affectedParameterPanels.length > 0 || affectedUnsupervisedPanels.length > 0) {
        updateAppState((previous) => ({
          ...previous,
          panels: previous.panels.map((panel) =>
            panel.fileId && deletedSet.has(panel.fileId)
              ? createDefaultPanelState(panel.panelId, panel.workspaceKind)
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
              {FILE_ROLE_TABS.map((tab) => (
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
              placeholder="Search files"
              value={searchText}
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
                      workspace.key === activeWorkspace
                        ? "workspace-switch-button active"
                        : "workspace-switch-button"
                    }
                    onClick={() => {
                      closeSettingsModal();
                      setIsDeleteModalOpen(false);
                      void updatePanelWorkspace(activePanelId, workspace.key);
                    }}
                  >
                    {workspace.label}
                  </button>
                ))}
              </div>
              <div className="toolbar-status">
                <span className={`health-badge ${healthStatus}`}>API: {healthStatus}</span>
                <span className="health-badge">
                  {authState.accessMode === "code" ? "Access: code" : "Access: open"}
                </span>
                <span>{activeWorkspace === "heartsound" ? "Workspace: HeartSound" : "Workspace: ECG"}</span>
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
                    searchMarkerIndex={chartSearchMarkerIndex}
                    showSearchInput={splitMode === 1}
                    searchInputValue={chartSearchIndexText}
                    onSearchInputChange={(value) =>
                      updateAppState((previous) => ({
                        ...previous,
                        chartSearchIndexText: value
                      }))
                    }
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
                    onSelectCycle={selectPanelCycle}
                  />
                );
              })}
            </section>
          </main>
        </div>
      )}

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
              <div className="series-modal-grid">
                {getSeriesItemsForWorkspace(
                  seriesPanel.workspaceKind,
                  seriesPanel.styleOptions.ecgMarkerMode
                ).map((series) => (
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
