"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  computePerformance,
  interpolateNetwork,
  OPTIMIZATIONS,
  NETWORK_PROFILES,
  getCWVRating,
  DEFAULT_OPT_PARAMS,
  type OptimizationId,
  type OptimizationParams,
  type NetworkCondition,
  type NetworkProfile,
  type WaterfallResource,
  type PerfMetrics,
} from "./engine/perf-simulator";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeField = { name: string; type: string; note?: string };
export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  fields: TypeField[];
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "spa", label: "Single-page app (SPA)?", description: "Client-side routing, JS-rendered pages — bundle size and TBT matter most" },
  { id: "images", label: "Image-heavy content?", description: "Hero images, galleries, thumbnails — LCP is dominated by image loading" },
  { id: "third-party", label: "Third-party scripts?", description: "Analytics, ads, chat widgets — each competes for main thread and bandwidth" },
  { id: "mobile", label: "Mobile-first target?", description: "Slower CPUs, constrained bandwidth — every KB and long task costs more" },
  { id: "cwv", label: "Core Web Vitals budget?", description: "LCP < 2.5s, INP < 200ms, CLS < 0.1 — Google's ranking signal thresholds" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/performance/metrics",
    description: "Collect current page performance metrics",
    usedBy: "MetricCollector → Dashboard",
    params: [
      { name: "url", type: "string", note: "page URL to measure" },
      { name: "device", type: "string?", note: "mobile | desktop" },
    ],
    responseType: "PerformanceReport",
  },
  {
    method: "GET",
    path: "/api/performance/budget",
    description: "Fetch performance budget configuration",
    usedBy: "BudgetManager → CI",
    params: [
      { name: "project", type: "string", note: "project identifier" },
    ],
    responseType: "BudgetConfig",
  },
  {
    method: "POST",
    path: "/api/performance/report",
    description: "Submit RUM beacon with field metrics",
    usedBy: "PerformanceObserver → Analytics",
    params: [
      { name: "metrics", type: "FieldMetrics", note: "LCP, INP, CLS values" },
      { name: "context", type: "PageContext", note: "URL, device, connection" },
    ],
    responseType: "{ received: boolean }",
  },
  {
    method: "GET",
    path: "/api/performance/waterfall",
    description: "Resource timing waterfall for a page load",
    usedBy: "WaterfallChart → Debug",
    params: [
      { name: "traceId", type: "string", note: "navigation trace ID" },
    ],
    responseType: "ResourceTiming[]",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "PerformanceReport",
    category: "api",
    fields: [
      { name: "url", type: "string" },
      { name: "lcp", type: "number", note: "Largest Contentful Paint (ms)" },
      { name: "inp", type: "number", note: "Interaction to Next Paint (ms)" },
      { name: "cls", type: "number", note: "Cumulative Layout Shift" },
      { name: "fcp", type: "number", note: "First Contentful Paint (ms)" },
      { name: "tbt", type: "number", note: "Total Blocking Time (ms)" },
      { name: "resources", type: "ResourceTiming[]" },
    ],
  },
  {
    name: "BudgetConfig",
    category: "state",
    fields: [
      { name: "lcp", type: "number", note: "max allowed LCP in ms" },
      { name: "inp", type: "number", note: "max allowed INP in ms" },
      { name: "cls", type: "number", note: "max allowed CLS" },
      { name: "jsBytes", type: "number", note: "max initial JS in KB" },
      { name: "imageBytes", type: "number", note: "max initial images in KB" },
    ],
  },
  {
    name: "ResourceTiming",
    category: "api",
    fields: [
      { name: "name", type: "string", note: "resource URL" },
      { name: "type", type: "ResourceType" },
      { name: "startTime", type: "number", note: "relative to navigationStart" },
      { name: "duration", type: "number" },
      { name: "transferSize", type: "number", note: "bytes over the wire" },
      { name: "renderBlocking", type: "boolean" },
    ],
  },
];

// ── Context ─────────────────────────────────────────────────────────

type PerfContextValue = {
  activeStep: number;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  enabledOptimizations: Set<OptimizationId>;
  toggleOptimization: (id: OptimizationId) => void;
  optParams: OptimizationParams;
  updateOptParam: <K extends keyof OptimizationParams>(key: K, value: OptimizationParams[K]) => void;
  resources: WaterfallResource[];
  metrics: PerfMetrics;
  timelineEndMs: number;
  visitType: "first" | "repeat";
  setVisitType: (v: "first" | "repeat") => void;
  networkCondition: NetworkCondition;
  setNetworkCondition: (n: NetworkCondition) => void;
  bandwidthSlider: number;
  setBandwidthSlider: (v: number) => void;
  activeProfile: NetworkProfile;
  stateEntries: StateEntry[];
  simulatedInp: number | null;
  setSimulatedInp: (v: number | null) => void;
};

const PerfContext = createContext<PerfContextValue | null>(null);

export function usePerfContext(): PerfContextValue {
  const ctx = useContext(PerfContext);
  if (!ctx) throw new Error("usePerfContext must be used within PerfProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function PerfProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const [enabledOptimizations, setEnabledOptimizations] = useState<Set<OptimizationId>>(new Set());
  const [visitType, setVisitType] = useState<"first" | "repeat">("first");
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition>("3g");
  const [bandwidthSlider, setBandwidthSliderRaw] = useState(33);
  const [simulatedInp, setSimulatedInp] = useState<number | null>(null);
  const [optParams, setOptParams] = useState<OptimizationParams>(DEFAULT_OPT_PARAMS);

  const updateOptParam = useCallback(<K extends keyof OptimizationParams>(key: K, value: OptimizationParams[K]) => {
    setOptParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const SLIDER_PRESETS: Record<NetworkCondition, number> = useMemo(() => ({
    "slow-3g": 0,
    "3g": 33,
    "4g": 66,
    wifi: 100,
  }), []);

  const setBandwidthSlider = useCallback((v: number) => {
    setBandwidthSliderRaw(v);
    const closest = (Object.entries(SLIDER_PRESETS) as [NetworkCondition, number][])
      .reduce((best, [nc, pos]) => Math.abs(v - pos) < Math.abs(v - best[1]) ? [nc, pos] : best);
    setNetworkCondition(closest[0] as NetworkCondition);
  }, [SLIDER_PRESETS]);

  const handleSetNetworkCondition = useCallback((n: NetworkCondition) => {
    setNetworkCondition(n);
    setBandwidthSliderRaw(SLIDER_PRESETS[n]);
  }, [SLIDER_PRESETS]);

  const activeProfile = useMemo(() => interpolateNetwork(bandwidthSlider), [bandwidthSlider]);
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleOptimization = useCallback((id: OptimizationId) => {
    setEnabledOptimizations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { resources, metrics, timelineEndMs } = useMemo(
    () => computePerformance(enabledOptimizations, activeProfile, visitType, optParams),
    [enabledOptimizations, activeProfile, visitType, optParams],
  );

  const prevMetricsRef = useRef<PerfMetrics>(metrics);
  const stateEntries = useMemo<StateEntry[]>(() => {
    const optList = [...enabledOptimizations].sort();
    const prev = prevMetricsRef.current;
    const displayInp = simulatedInp != null ? simulatedInp : metrics.inp;
    const lcpDelta = metrics.lcp - prev.lcp;
    const inpDelta = metrics.inp - prev.inp;
    const clsDelta = Math.round((metrics.cls - prev.cls) * 100) / 100;
    const sizeDelta = metrics.totalSizeKB - prev.totalSizeKB;
    const lcpDisplay = metrics.lcp >= 1000 ? `${(metrics.lcp / 1000).toFixed(1)}s` : `${metrics.lcp}ms`;
    return [
      { label: "Network", value: `${activeProfile.label} (×${activeProfile.multiplier}, ${activeProfile.rtt}ms RTT)` },
      { label: "Visit", value: visitType },
      { label: "Optimizations", value: optList.length > 0 ? optList.join(", ") : "none" },
      {
        label: "LCP",
        value: lcpDisplay,
        rating: getCWVRating("lcp", metrics.lcp),
        delta: lcpDelta !== 0 ? `${lcpDelta > 0 ? "+" : ""}${lcpDelta}ms` : undefined,
        deltaDirection: lcpDelta < 0 ? "improved" : lcpDelta > 0 ? "regressed" : undefined,
      },
      {
        label: "INP",
        value: `${displayInp}ms`,
        rating: getCWVRating("inp", displayInp),
        delta: inpDelta !== 0 ? `${inpDelta > 0 ? "+" : ""}${inpDelta}ms` : undefined,
        deltaDirection: inpDelta < 0 ? "improved" : inpDelta > 0 ? "regressed" : undefined,
      },
      {
        label: "CLS",
        value: metrics.cls.toFixed(2),
        rating: getCWVRating("cls", metrics.cls),
        delta: clsDelta !== 0 ? `${clsDelta > 0 ? "+" : ""}${clsDelta.toFixed(2)}` : undefined,
        deltaDirection: clsDelta < 0 ? "improved" : clsDelta > 0 ? "regressed" : undefined,
      },
      {
        label: "Size",
        value: `${metrics.totalSizeKB} KB`,
        delta: sizeDelta !== 0 ? `${sizeDelta > 0 ? "+" : ""}${sizeDelta} KB` : undefined,
        deltaDirection: sizeDelta < 0 ? "improved" : sizeDelta > 0 ? "regressed" : undefined,
      },
    ];
  }, [enabledOptimizations, activeProfile, visitType, metrics, simulatedInp]);

  const prevMetricsRefUpdate = metrics;
  const prevMetricsRefCurrent = prevMetricsRef.current;
  if (prevMetricsRefCurrent !== prevMetricsRefUpdate) {
    prevMetricsRef.current = prevMetricsRefUpdate;
  }

  const value = useMemo<PerfContextValue>(
    () => ({
      activeStep,
      scopeEnabled,
      toggleScope,
      enabledOptimizations,
      toggleOptimization,
      optParams,
      updateOptParam,
      resources,
      metrics,
      timelineEndMs,
      visitType,
      setVisitType,
      networkCondition,
      setNetworkCondition: handleSetNetworkCondition,
      bandwidthSlider,
      setBandwidthSlider,
      activeProfile,
      stateEntries,
      simulatedInp,
      setSimulatedInp,
    }),
    [
      activeStep,
      scopeEnabled,
      toggleScope,
      enabledOptimizations,
      toggleOptimization,
      optParams,
      updateOptParam,
      resources,
      metrics,
      timelineEndMs,
      visitType,
      setVisitType,
      networkCondition,
      handleSetNetworkCondition,
      bandwidthSlider,
      setBandwidthSlider,
      activeProfile,
      stateEntries,
      simulatedInp,
      setSimulatedInp,
    ],
  );

  return <PerfContext.Provider value={value}>{children}</PerfContext.Provider>;
}
