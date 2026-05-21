import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "browser",
    label: "Browser APIs",
    sublabel: "PerformanceObserver · Resource Timing",
    x: 140,
    y: 6,
    w: 200,
    h: 22,
  },
  {
    id: "perf-monitor",
    label: "Performance Monitor — orchestrator",
    sublabel: "metrics · budget · resources · optimizations",
    x: 40,
    y: 46,
    w: 400,
    h: 28,
  },
  {
    id: "metric-collector",
    label: "MetricCollector",
    sublabel: "LCP · INP · CLS · FCP",
    x: 36,
    y: 96,
    w: 130,
    h: 24,
  },
  {
    id: "resource-analyzer",
    label: "ResourceAnalyzer",
    sublabel: "waterfall · sizes · blocking",
    x: 180,
    y: 96,
    w: 130,
    h: 24,
  },
  {
    id: "budget-manager",
    label: "BudgetManager",
    sublabel: "thresholds · pass/fail",
    x: 324,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "optimization-engine",
    label: "OptimizationEngine",
    sublabel: "transforms · impact",
    x: 180,
    y: 140,
    w: 130,
    h: 22,
  },
];

const EDGES: FlowEdge[] = [
  { from: "browser", to: "perf-monitor", verb: "emits performance entries" },
  { from: "perf-monitor", to: "metric-collector", verb: "distributes CWV events" },
  { from: "perf-monitor", to: "resource-analyzer", verb: "passes resource timing" },
  { from: "perf-monitor", to: "budget-manager", verb: "sends metric snapshots" },
  { from: "resource-analyzer", to: "optimization-engine", verb: "identifies bottlenecks" },
  {
    from: "metric-collector",
    to: "perf-monitor",
    dashed: true,
    verb: "reports CWV scores",
    pathOverride: "M 36,108 C 10,108 10,60 40,60",
    midpointOverride: { x: 10, y: 84 },
  },
  {
    from: "budget-manager",
    to: "perf-monitor",
    dashed: true,
    verb: "fires budget violation",
    pathOverride: "M 444,108 C 474,108 474,60 440,60",
    midpointOverride: { x: 474, y: 84 },
  },
  {
    from: "optimization-engine",
    to: "perf-monitor",
    dashed: true,
    verb: "reports impact delta",
    pathOverride: "M 180,151 C 6,151 6,60 40,60",
    midpointOverride: { x: 6, y: 106 },
  },
];

// ── Type definitions ────────────────────────────────────────────────

const T_PerformanceEntry: ArchTypeDef = {
  name: "PerformanceEntry",
  kind: "browser API",
  fields: [
    { name: "name", type: "string" },
    { name: "entryType", type: "string", note: "largest-contentful-paint | event | layout-shift" },
    { name: "startTime", type: "number" },
    { name: "duration", type: "number" },
  ],
};

const T_CWVReport: ArchTypeDef = {
  name: "CWVReport",
  kind: "state",
  fields: [
    { name: "lcp", type: "number", note: "ms" },
    { name: "inp", type: "number", note: "ms" },
    { name: "cls", type: "number", note: "unitless" },
    { name: "rating", type: "good | needs-improvement | poor" },
  ],
};

const T_ResourceTiming: ArchTypeDef = {
  name: "ResourceTiming",
  kind: "browser API",
  fields: [
    { name: "name", type: "string", note: "resource URL" },
    { name: "transferSize", type: "number", note: "bytes" },
    { name: "duration", type: "number" },
    { name: "renderBlockingStatus", type: "string" },
  ],
};

const T_BudgetResult: ArchTypeDef = {
  name: "BudgetResult",
  kind: "state",
  fields: [
    { name: "metric", type: "string" },
    { name: "actual", type: "number" },
    { name: "budget", type: "number" },
    { name: "passed", type: "boolean" },
  ],
};

const T_OptimizationDelta: ArchTypeDef = {
  name: "OptimizationDelta",
  kind: "state",
  fields: [
    { name: "optimization", type: "string" },
    { name: "lcpDelta", type: "number", note: "ms saved" },
    { name: "sizeDelta", type: "number", note: "KB saved" },
  ],
};

// ── Scenario 1: Page load audit ─────────────────────────────────────

const SCENARIO_PAGE_LOAD: ArchStep[] = [
  {
    nodeId: "browser",
    caption: "Browser fires PerformanceObserver entries as page loads.",
    payload: { type: T_PerformanceEntry },
    stateAfter: [
      { key: "entries", value: "PerformanceEntry[]" },
      { key: "navigation", value: "loading" },
    ],
  },
  {
    nodeId: "perf-monitor",
    caption: "Monitor receives entries and distributes to collectors.",
    stateAfter: [
      { key: "rawEntries", value: "42 entries" },
      { key: "status", value: "collecting" },
    ],
  },
  {
    nodeId: "metric-collector",
    caption: "Collector computes CWV scores from raw entries.",
    payload: { type: T_CWVReport },
    stateAfter: [
      { key: "lcp", value: "2900ms" },
      { key: "inp", value: "340ms" },
      { key: "cls", value: "0.34" },
    ],
  },
  {
    nodeId: "resource-analyzer",
    caption: "Analyzer builds waterfall from Resource Timing API.",
    payload: { type: T_ResourceTiming },
    stateAfter: [
      { key: "resources", value: "11 entries" },
      { key: "totalKB", value: "1,280 KB" },
      { key: "blocking", value: "2 resources" },
    ],
  },
  {
    nodeId: "budget-manager",
    caption: "Manager checks metrics against configured budgets.",
    payload: { type: T_BudgetResult },
    stateAfter: [
      { key: "lcp", value: "FAIL (2900 > 2500)" },
      { key: "inp", value: "FAIL (340 > 200)" },
      { key: "cls", value: "FAIL (0.34 > 0.1)" },
    ],
  },
];

// ── Scenario 2: Optimization applied ────────────────────────────────

const SCENARIO_OPTIMIZATION: ArchStep[] = [
  {
    nodeId: "resource-analyzer",
    caption: "Analyzer identifies main.js (385 KB) as the critical bottleneck.",
    stateAfter: [
      { key: "bottleneck", value: "main.js — 385 KB" },
      { key: "blocking", value: "true" },
      { key: "impact", value: "delays all dependent resources" },
    ],
  },
  {
    nodeId: "optimization-engine",
    caption: "Engine applies code splitting: main.js → core.js (115 KB) + routes.js (75 KB).",
    payload: { type: T_OptimizationDelta },
    stateAfter: [
      { key: "optimization", value: "codeSplitting" },
      { key: "sizeDelta", value: "-270 KB initial" },
      { key: "lcpDelta", value: "-1130ms" },
    ],
  },
  {
    nodeId: "perf-monitor",
    caption: "Monitor recomputes waterfall with optimization applied.",
    stateAfter: [
      { key: "resources", value: "12 entries" },
      { key: "totalKB", value: "1,085 KB" },
      { key: "blocking", value: "core.js (115 KB)" },
    ],
  },
  {
    nodeId: "metric-collector",
    caption: "Collector re-measures CWV — LCP drops from 2900ms to 1780ms.",
    payload: { type: T_CWVReport },
    stateAfter: [
      { key: "lcp", value: "1780ms ↓" },
      { key: "inp", value: "260ms ↓" },
      { key: "cls", value: "0.34" },
    ],
  },
  {
    nodeId: "budget-manager",
    caption: "Budget re-evaluated — LCP now passes, INP and CLS still failing.",
    payload: { type: T_BudgetResult },
    stateAfter: [
      { key: "lcp", value: "PASS (1780 < 2500)" },
      { key: "inp", value: "FAIL (260 > 200)" },
      { key: "cls", value: "FAIL (0.34 > 0.1)" },
    ],
  },
];

// ── Scenario 3: Budget violation in CI ──────────────────────────────

const SCENARIO_BUDGET_VIOLATION: ArchStep[] = [
  {
    nodeId: "perf-monitor",
    caption: "CI pipeline triggers synthetic page load measurement.",
    stateAfter: [
      { key: "trigger", value: "CI pipeline" },
      { key: "url", value: "/products" },
      { key: "device", value: "mobile (4G)" },
    ],
  },
  {
    nodeId: "metric-collector",
    caption: "Collector measures CWV on the target page.",
    payload: { type: T_CWVReport },
    stateAfter: [
      { key: "lcp", value: "3200ms" },
      { key: "inp", value: "180ms" },
      { key: "cls", value: "0.08" },
    ],
  },
  {
    nodeId: "budget-manager",
    caption: "LCP exceeds the 2500ms budget — build marked as failing.",
    payload: { type: T_BudgetResult },
    stateAfter: [
      { key: "lcp", value: "FAIL (3200 > 2500)" },
      { key: "action", value: "block merge" },
      { key: "diff", value: "+700ms vs budget" },
    ],
  },
  {
    nodeId: "resource-analyzer",
    caption: "Analyzer identifies a new unoptimized image (420 KB) as the regression source.",
    stateAfter: [
      { key: "regression", value: "hero-v2.png — 420 KB" },
      { key: "recommendation", value: "Convert to WebP, add srcset" },
    ],
  },
];

// ── Export ───────────────────────────────────────────────────────────

export const WEB_PERF_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "PerformanceMonitor orchestrates collection, analysis, and budgeting. Each subsystem is specialized — MetricCollector computes CWV, ResourceAnalyzer builds the waterfall, BudgetManager gates merges.",
  viewBox: "0 0 480 168",
  nodes: NODES,
  edges: EDGES,
  scenarios: [
    {
      id: "page-load-audit",
      label: "Page Load Audit",
      blurb: "Browser collects performance entries, monitor distributes to collectors, budget manager evaluates.",
      steps: SCENARIO_PAGE_LOAD,
    },
    {
      id: "optimization-applied",
      label: "Optimization Applied",
      blurb: "Resource analyzer identifies bottleneck, engine applies code splitting, metrics re-measured.",
      steps: SCENARIO_OPTIMIZATION,
    },
    {
      id: "budget-violation",
      label: "Budget Violation (CI)",
      blurb: "CI pipeline detects LCP regression from an unoptimized image, blocks the merge.",
      steps: SCENARIO_BUDGET_VIOLATION,
    },
  ],
};
