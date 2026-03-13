import { type ChangeEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

type SplitMode = 1 | 2 | 4;
type PanelId = 1 | 2 | 3 | 4;
type HealthStatus = "checking" | "connected" | "failed";
type PlotMode = "overview" | "range";
type SeriesKey = "amplitude" | "s1Start" | "s1End" | "s2Start" | "s2End";
type AccessMode = "open" | "code";

interface VisibleSeries {
  amplitude: boolean;
  s1Start: boolean;
  s1End: boolean;
  s2Start: boolean;
  s2End: boolean;
}

interface PanelStyleOptions {
  amplitudeLineWidth: number;
  rsBarOpacity: number;
  yAxisAutoScale: boolean;
}

interface PanelState {
  panelId: PanelId;
  fileId: string | null;
  fileName: string | null;
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
}

interface PanelPlotState {
  overview: PlotDataPayload | null;
  current: PlotDataPayload | null;
  loading: boolean;
  error: string | null;
}

interface SettingsDraft {
  rangeStart: string;
  rangeEnd: string;
  amplitudeLineWidth: string;
  rsBarOpacity: string;
  yAxisAutoScale: boolean;
}

interface AuthState {
  accessMode: AccessMode;
  adminUsername: string | null;
  hasAdminPassword: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface PanelCardProps {
  panel: PanelState;
  plotState: PanelPlotState;
  isActive: boolean;
  onActivate: (panelId: PanelId) => void;
  onToggleSeries: (panelId: PanelId, key: SeriesKey) => void;
  onOpenSettings: (panelId: PanelId) => void;
  onResetPanel: (panelId: PanelId) => void;
  onSliderRangeCommit: (panelId: PanelId, start: number, end: number) => void;
}

const PANEL_IDS_BY_MODE: Record<SplitMode, PanelId[]> = {
  1: [1],
  2: [1, 2],
  4: [1, 2, 3, 4]
};

const SPLIT_BUTTONS: SplitMode[] = [1, 2, 4];

const SERIES_ITEMS: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "amplitude", label: "Amplitude", color: "#79c0ff" },
  { key: "s1Start", label: "S1-Start_RS_Score", color: "#2ea043" },
  { key: "s1End", label: "S1-End_RS_Score", color: "#d29922" },
  { key: "s2Start", label: "S2-Start_RS_Score", color: "#db6d28" },
  { key: "s2End", label: "S2-End_RS_Score", color: "#f85149" }
];

const DEFAULT_VISIBLE_SERIES: VisibleSeries = {
  amplitude: true,
  s1Start: true,
  s1End: true,
  s2Start: true,
  s2End: true
};

const DEFAULT_STYLE_OPTIONS: PanelStyleOptions = {
  amplitudeLineWidth: 1.6,
  rsBarOpacity: 0.9,
  yAxisAutoScale: true
};

const createDefaultPanelState = (panelId: PanelId): PanelState => ({
  panelId,
  fileId: null,
  fileName: null,
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

const INITIAL_PANELS: PanelState[] = [
  createDefaultPanelState(1),
  createDefaultPanelState(2),
  createDefaultPanelState(3),
  createDefaultPanelState(4)
];

const INITIAL_PANEL_PLOTS: Record<PanelId, PanelPlotState> = {
  1: createEmptyPlotState(),
  2: createEmptyPlotState(),
  3: createEmptyPlotState(),
  4: createEmptyPlotState()
};

const INITIAL_AUTH_STATE: AuthState = {
  accessMode: "open",
  adminUsername: "ms",
  hasAdminPassword: false,
  isAuthenticated: true,
  isAdmin: false
};

const PANEL_TARGET_POINTS = 2400;
const DEFAULT_INITIAL_RANGE_SIZE = 30000;
const RS_SCORE_AXIS_MIN = 0;
const RS_SCORE_AXIS_MAX = 80;
const RS_BAR_WIDTH = 1.8;
const QUICK_RANGE_SHIFT_STEP = 30000;
const KEYBOARD_RANGE_SHIFT_STEP = 3000;
const QUICK_RANGE_PRESETS = [15000, 30000, 50000] as const;

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toDataPairs = (xValues: number[], yValues: number[]) =>
  xValues.map((x, index) => [x, yValues[index] ?? 0] as [number, number]);

const parseNumericInput = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed);
};

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
const getInitialRangeEnd = (rowCount: number): number =>
  Math.min(Math.max(rowCount - 1, 0), DEFAULT_INITIAL_RANGE_SIZE);

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

const PanelCard = memo(function PanelCard({
  panel,
  plotState,
  isActive,
  onActivate,
  onToggleSeries,
  onOpenSettings,
  onResetPanel,
  onSliderRangeCommit
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
    const overviewPairs = overviewPlot
      ? toDataPairs(overviewPlot.x, overviewPlot.amplitude)
      : amplitudePairs;

    const mainSeries: NonNullable<EChartsOption["series"]> = [];
    if (panel.visibleSeries.amplitude) {
      mainSeries.push({
        name: "Amplitude",
        type: "line",
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        animation: false,
        lineStyle: {
          width: panel.styleOptions.amplitudeLineWidth,
          color: "#79c0ff"
        },
        itemStyle: { color: "#79c0ff" },
        data: amplitudePairs
      });
    }
    if (panel.visibleSeries.s1Start) {
      mainSeries.push({
        name: "S1-Start_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        barWidth: RS_BAR_WIDTH,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#2ea043",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s1StartPairs
      });
    }
    if (panel.visibleSeries.s1End) {
      mainSeries.push({
        name: "S1-End_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        barWidth: RS_BAR_WIDTH,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#d29922",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s1EndPairs
      });
    }
    if (panel.visibleSeries.s2Start) {
      mainSeries.push({
        name: "S2-Start_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        barWidth: RS_BAR_WIDTH,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#db6d28",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s2StartPairs
      });
    }
    if (panel.visibleSeries.s2End) {
      mainSeries.push({
        name: "S2-End_RS_Score",
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 1,
        barWidth: RS_BAR_WIDTH,
        barGap: "-100%",
        animation: false,
        itemStyle: {
          color: "#f85149",
          opacity: panel.styleOptions.rsBarOpacity
        },
        data: s2EndPairs
      });
    }

    mainSeries.push({
      name: "Navigator",
      type: "line",
      xAxisIndex: 1,
      yAxisIndex: 2,
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

    return {
      animation: false,
      grid: [
        {
          left: 48,
          right: 50,
          top: 14,
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
          max: RS_SCORE_AXIS_MAX,
          scale: panel.styleOptions.yAxisAutoScale,
          axisLine: {
            lineStyle: { color: "#30363d" }
          },
          axisLabel: { color: "#8b949e" },
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
  }, [activePlot, overviewPlot, panel]);

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

  return (
    <article
      className={isActive ? "panel-card active" : "panel-card"}
      onClick={() => onActivate(panel.panelId)}
    >
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-title">Panel {panel.panelId}</div>
          <div className="panel-file">{panel.fileName ?? "No file assigned"}</div>
        </div>

        <div className="panel-actions" onClick={(event) => event.stopPropagation()}>
          <div className="series-group">
            {SERIES_ITEMS.map((series) => (
              <label key={series.key} className="series-toggle">
                <input
                  type="checkbox"
                  checked={panel.visibleSeries[series.key]}
                  onChange={() => onToggleSeries(panel.panelId, series.key)}
                />
                <span style={{ color: series.color }}>{series.label}</span>
              </label>
            ))}
          </div>
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
          <div className="panel-chart-wrapper">
            <div className="panel-chart-host">
              <ReactECharts
                option={chartOption}
                style={{ width: "100%", height: "100%" }}
                onEvents={{ datazoom: onDataZoom }}
                notMerge
                lazyUpdate
              />
              {plotState.loading ? <div className="panel-chart-overlay">Loading...</div> : null}
            </div>
            <div className="panel-range-info">
              rows {formatRowNumber(panel.rangeStart)} - {formatRowNumber(panel.rangeEnd)}
              {panel.totalRows !== null ? ` / total ${formatRowNumber(panel.totalRows)}` : ""}
              {plotState.current?.isDownsampled ? " (downsampled)" : ""}
            </div>
            {rangeGuide ? (
              <div className="panel-range-guide">
                previous {formatRowNumber(panel.previousRangeStart ?? 0)} -{" "}
                {formatRowNumber(panel.previousRangeEnd ?? 0)} | overlap{" "}
                {formatRowNumber(rangeGuide.overlapRows)} rows | new on {rangeGuide.direction}{" "}
                {formatRowNumber(rangeGuide.newRows)} rows
              </div>
            ) : null}
            {plotState.error ? <div className="panel-chart-error">{plotState.error}</div> : null}
          </div>
        )}
      </div>
    </article>
  );
});

function App() {
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [activePanelId, setActivePanelId] = useState<PanelId>(1);
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
  const [panels, setPanels] = useState<PanelState[]>(INITIAL_PANELS);
  const [panelPlots, setPanelPlots] = useState<Record<PanelId, PanelPlotState>>(INITIAL_PANEL_PLOTS);
  const [files, setFiles] = useState<UploadedFileMetadata[]>([]);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [settingsPanelId, setSettingsPanelId] = useState<PanelId | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);

  const requestSeqRef = useRef<Record<PanelId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const visiblePanelIds = PANEL_IDS_BY_MODE[splitMode];
  const activePanel = panels.find((panel) => panel.panelId === activePanelId) ?? panels[0];
  const settingsPanel =
    settingsPanelId !== null ? panels.find((panel) => panel.panelId === settingsPanelId) ?? null : null;

  const updatePanelState = useCallback(
    (panelId: PanelId, updater: (panel: PanelState) => PanelState) => {
      setPanels((previous) =>
        previous.map((panel) => (panel.panelId === panelId ? updater(panel) : panel))
      );
    },
    []
  );

  const setPanelPlotState = useCallback(
    (panelId: PanelId, updater: (state: PanelPlotState) => PanelPlotState) => {
      setPanelPlots((previous) => ({
        ...previous,
        [panelId]: updater(previous[panelId])
      }));
    },
    []
  );

  const clearPanelPlotState = useCallback(
    (panelId: PanelId) => {
      requestSeqRef.current[panelId] += 1;
      setPanelPlotState(panelId, () => createEmptyPlotState());
    },
    [setPanelPlotState]
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

  const fetchFileList = useCallback(async () => {
    setFilesLoading(true);
    try {
      const response = await fetch("/api/files");
      if (response.status === 401) {
        await refreshAuthState();
        setFiles([]);
        return;
      }
      if (!response.ok) {
        throw new Error("failed to load files");
      }
      const payload = (await response.json()) as { files?: UploadedFileMetadata[] };
      setFiles(payload.files ?? []);
    } catch {
      setStatusMessage("Failed to load file list.");
    } finally {
      setFilesLoading(false);
    }
  }, [refreshAuthState]);

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
      void fetchFileList();
      return;
    }

    setFiles([]);
  }, [authLoading, authState.accessMode, authState.isAuthenticated, fetchFileList]);

  useEffect(() => {
    if (!visiblePanelIds.includes(activePanelId)) {
      setActivePanelId(visiblePanelIds[0]);
    }
  }, [activePanelId, visiblePanelIds]);

  const filteredFiles = useMemo(() => {
    if (!searchText.trim()) {
      return files;
    }
    const query = searchText.trim().toLowerCase();
    return files.filter((file) => {
      const originalNameMatched = file.originalName.toLowerCase().includes(query);
      const relativePathMatched = file.relativePath?.toLowerCase().includes(query) ?? false;
      return originalNameMatched || relativePathMatched;
    });
  }, [files, searchText]);

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

  const uploadFiles = async (fileList: FileList, isFolderUpload: boolean) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) {
      return;
    }

    setUploading(true);
    setStatusMessage("");

    const formData = new FormData();
    for (const file of filesToUpload) {
      formData.append("files", file);
      if (isFolderUpload) {
        formData.append("relative_paths", file.webkitRelativePath || file.name);
      }
    }

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

      setStatusMessage(payload ? summarizeUploadResult(payload) : "Upload complete");
      await fetchFileList();
    } catch (error) {
      if (error instanceof Error) {
        setStatusMessage(`Upload failed: ${error.message}`);
      } else {
        setStatusMessage("Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      void uploadFiles(selectedFiles, false);
    }
    event.target.value = "";
  };

  const handleFolderInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      void uploadFiles(selectedFiles, true);
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
        return;
      }

      void requestRangePlot(panelId, panel.fileId, clampedStart, clampedEnd);
    },
    [panelPlots, panels, requestOverviewPlot, requestRangePlot, setPanelPlotState, updatePanelState]
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

      let nextStart = activeTargetPanel.rangeStart + direction * KEYBOARD_RANGE_SHIFT_STEP;
      let nextEnd = activeTargetPanel.rangeEnd + direction * KEYBOARD_RANGE_SHIFT_STEP;

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

  const assignFileToActivePanel = useCallback(
    (file: UploadedFileMetadata) => {
      const initialRangeEnd = getInitialRangeEnd(file.rowCount);
      updatePanelState(activePanelId, (panel) => ({
        ...panel,
        fileId: file.fileId,
        fileName: file.originalName,
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
        }
      })();
    },
    [activePanelId, clearPanelPlotState, requestOverviewPlot, requestRangePlot, updatePanelState]
  );

  const resetPanel = useCallback(
    (panelId: PanelId) => {
      setPanels((previous) =>
        previous.map((panel) => (panel.panelId === panelId ? createDefaultPanelState(panelId) : panel))
      );
      clearPanelPlotState(panelId);
      if (settingsPanelId === panelId) {
        setSettingsPanelId(null);
        setSettingsDraft(null);
      }
    },
    [clearPanelPlotState, settingsPanelId]
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
        yAxisAutoScale: panel.styleOptions.yAxisAutoScale
      });
    },
    [panels]
  );

  const closeSettingsModal = useCallback(() => {
    setSettingsPanelId(null);
    setSettingsDraft(null);
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
      setStatusMessage("Range start/end must be valid numbers.");
      return;
    }
    if (!Number.isFinite(parsedLineWidth) || !Number.isFinite(parsedOpacity)) {
      setStatusMessage("Style values must be valid numbers.");
      return;
    }

    updatePanelState(settingsPanel.panelId, (panel) => ({
      ...panel,
      styleOptions: {
        amplitudeLineWidth: clampNumber(parsedLineWidth, 0.5, 6),
        rsBarOpacity: clampNumber(parsedOpacity, 0.1, 1),
        yAxisAutoScale: settingsDraft.yAxisAutoScale
      }
    }));

    applyPanelRange(settingsPanel.panelId, parsedStart, parsedEnd, true);
    closeSettingsModal();
  }, [applyPanelRange, closeSettingsModal, settingsDraft, settingsPanel, updatePanelState]);

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
        setStatusMessage("Range start/end must be valid numbers.");
        return;
      }

      const maxIndex = Math.max(settingsPanel.totalRows - 1, 0);
      const width = Math.max(parsedEnd - parsedStart, 0);

      let nextStart = parsedStart + direction * QUICK_RANGE_SHIFT_STEP;
      let nextEnd = parsedEnd + direction * QUICK_RANGE_SHIFT_STEP;

      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = Math.min(maxIndex, width);
      } else if (nextEnd > maxIndex) {
        nextEnd = maxIndex;
        nextStart = Math.max(0, maxIndex - width);
      }

      updateSettingsRange(nextStart, nextEnd);
    },
    [settingsDraft, settingsPanel, updateSettingsRange]
  );

  const toggleDeleteSelection = (fileId: string) => {
    setSelectedDeleteIds((previous) =>
      previous.includes(fileId)
        ? previous.filter((id) => id !== fileId)
        : [...previous, fileId]
    );
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
      const affectedPanels = panels
        .filter((panel) => panel.fileId && deletedSet.has(panel.fileId))
        .map((panel) => panel.panelId);

      if (affectedPanels.length > 0) {
        setPanels((previous) =>
          previous.map((panel) =>
            panel.fileId && deletedSet.has(panel.fileId)
              ? createDefaultPanelState(panel.panelId)
              : panel
          )
        );
        affectedPanels.forEach((panelId) => {
          clearPanelPlotState(panelId);
          if (settingsPanelId === panelId) {
            setSettingsPanelId(null);
            setSettingsDraft(null);
          }
        });
      }

      setStatusMessage(`Deleted ${deletedIds.length} file(s).`);
      setIsDeleteModalOpen(false);
      setSelectedDeleteIds([]);
      await fetchFileList();
    } catch (error) {
      if (error instanceof Error) {
        setStatusMessage(`Delete failed: ${error.message}`);
      } else {
        setStatusMessage("Delete failed");
      }
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
            <div className="sidebar-title">HeartSound Analysis Tool</div>
            <button
              type="button"
              className="placeholder-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Upload File
            </button>
            <button
              type="button"
              className="placeholder-button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
            >
              Upload Folder
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
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
              onChange={(event) => setSearchText(event.target.value)}
            />

            <div className="file-list-placeholder">
              <div className="file-list-title">File List</div>
              <div className="file-list-subtitle">Click file to assign to Panel {activePanelId}</div>
              <div className="file-list-scroller">
                {filesLoading ? (
                  <div className="file-list-empty">Loading...</div>
                ) : filteredFiles.length === 0 ? (
                  <div className="file-list-empty">No uploaded files</div>
                ) : (
                  filteredFiles.map((file) => (
                    <button
                      key={file.fileId}
                      type="button"
                      className={
                        file.fileId === activePanel.fileId ? "file-item active-target" : "file-item"
                      }
                      onClick={() => assignFileToActivePanel(file)}
                    >
                      <div className="file-item-name">{file.originalName}</div>
                      {file.relativePath ? <div className="file-item-path">{file.relativePath}</div> : null}
                      <div className="file-item-meta">
                        <span>{formatTimestamp(file.uploadedAt)}</span>
                        <span>rows {file.rowCount}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              className="danger-button"
              disabled={files.length === 0}
              onClick={() => {
                setSelectedDeleteIds([]);
                setIsDeleteModalOpen(true);
              }}
            >
              Delete Files
            </button>
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
                    onClick={() => setSplitMode(mode)}
                  >
                    {mode === 1 ? "1 Panel" : mode === 2 ? "2 Panels" : "4 Panels"}
                  </button>
                ))}
              </div>
              <div className="toolbar-status">
                <span className={`health-badge ${healthStatus}`}>API: {healthStatus}</span>
                <span className="health-badge">
                  {authState.accessMode === "code" ? "Access: code" : "Access: open"}
                </span>
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
                    panel={panel}
                    plotState={panelPlots[panelId]}
                    isActive={panelId === activePanelId}
                    onActivate={setActivePanelId}
                    onToggleSeries={togglePanelSeries}
                    onOpenSettings={openSettingsForPanel}
                    onResetPanel={resetPanel}
                    onSliderRangeCommit={applyPanelRange}
                  />
                );
              })}
            </section>
          </main>
        </div>
      )}

      {!isAccessLocked && settingsPanel && settingsDraft ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Panel settings modal">
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
                      <span>30k</span>
                    </button>
                    <button
                      type="button"
                      className="range-shift-button"
                      onClick={() => shiftSettingsRange(1)}
                    >
                      <span>30k</span>
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
              <button type="button" className="split-button" onClick={applySettings}>
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
              {files.length === 0 ? (
                <div className="file-list-empty">No files to delete.</div>
              ) : (
                files.map((file) => (
                  <label key={file.fileId} className="delete-item">
                    <input
                      type="checkbox"
                      checked={selectedDeleteIds.includes(file.fileId)}
                      onChange={() => toggleDeleteSelection(file.fileId)}
                    />
                    <span>{file.originalName}</span>
                    {file.relativePath ? <span className="delete-path">{file.relativePath}</span> : null}
                  </label>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="split-button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedDeleteIds([]);
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
