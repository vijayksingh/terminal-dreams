"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  computeCls,
  computeLabField,
  groupClsWindows,
  pickLcpCandidate,
  rateLcp,
  rateInp,
  rateCls,
  sumInp,
  type ClsWindow,
  type InpBreakdown,
  type LayoutShift,
  type LcpElement,
  type Rating,
  type LabFieldMetrics,
} from "./engine/cwv-simulator";

// ── Scenario data (kept as constants — pure presentation) ──────────

export const LCP_PAGE_ELEMENTS: readonly LcpElement[] = [
  {
    id: "hero-img",
    label: "Hero image",
    area: 0.38,
    type: "img",
    reason: "Largest rendered <img> in the viewport. Browser fires a largest-contentful-paint entry the moment it paints.",
  },
  {
    id: "heading",
    label: "<h1> headline",
    area: 0.09,
    type: "text-block",
    reason: "Text blocks ARE candidates, but the heading covers far less area than the hero image.",
  },
  {
    id: "nav",
    label: "Navigation bar",
    area: 0.04,
    type: "text-block",
    reason: "Rendered above the fold, but its area is tiny — the hero image is ~10× larger.",
  },
  {
    id: "card-img",
    label: "Card thumbnail",
    area: 0.07,
    type: "img",
    reason: "An <img> below the headline, but covers less viewport area than the hero.",
  },
  {
    id: "svg-shape",
    label: "Decorative <svg>",
    area: 0.22,
    type: "non-candidate",
    reason: "<svg> shapes (and <canvas>) are NOT LCP candidates — only <img>, <video> posters, background images, and block text count.",
  },
  {
    id: "spinner",
    label: "Loading spinner (canvas)",
    area: 0.05,
    type: "non-candidate",
    reason: "<canvas> is excluded by spec — even if it covered the whole viewport it would not be the LCP element.",
  },
];

// ── Step 4 (INP) — felt-delay scenario ─────────────────────────────

export const INP_BLOCKING_TASK_MS = 200; // brief calls this the "felt 200ms"

export const INP_BAD_BREAKDOWN: InpBreakdown = {
  "input-delay": 150,
  processing: 60,
  presentation: 30,
};

export const INP_GOOD_BREAKDOWN: InpBreakdown = {
  "input-delay": 18,
  processing: 22,
  presentation: 14,
};

// ── Step 5 (INP optimisation) ──────────────────────────────────────

export type InpOptimization = "yield" | "raf" | "loaf-isolated";

export const INP_OPTIMIZATIONS: { id: InpOptimization; label: string; description: string; before: InpBreakdown; after: InpBreakdown }[] = [
  {
    id: "yield",
    label: "scheduler.yield()",
    description: "Break the 200ms task into <50ms chunks. Browser processes pending input between yields.",
    before: { "input-delay": 150, processing: 60, presentation: 30 },
    after: { "input-delay": 40, processing: 48, presentation: 20 },
  },
  {
    id: "raf",
    label: "requestAnimationFrame",
    description: "Defer DOM writes to the next paint frame. The handler returns immediately.",
    before: { "input-delay": 90, processing: 110, presentation: 50 },
    after: { "input-delay": 36, processing: 32, presentation: 16 },
  },
  {
    id: "loaf-isolated",
    label: "LoAF + content-visibility",
    description: "LoAF API pinpoints the slow event; content-visibility: auto skips off-screen layout.",
    before: { "input-delay": 180, processing: 120, presentation: 60 },
    after: { "input-delay": 50, processing: 40, presentation: 18 },
  },
];

// ── Step 6 (CLS) — session window scenario ─────────────────────────
// A purposeful pattern: one big burst (image w/o dims + ad inject + late
// widget) clusters into a session window; the font swap arrives much later
// and starts a NEW window. Total sum would be 0.213, but CLS reports the
// largest session window (0.193) — see fix-the-bug requirement in brief.

export const CLS_SHIFTS: readonly LayoutShift[] = [
  { id: "hero-no-dims", atMs: 1200, score: 0.105, source: "Hero image (no width/height)" },
  { id: "ad-inject", atMs: 1600, score: 0.062, source: "Sticky ad pushed content down" },
  { id: "late-widget", atMs: 1950, score: 0.026, source: "Recommendation widget mounted" },
  { id: "font-swap", atMs: 4200, score: 0.02, source: "Font swap (FOUT)" },
];

// ── Context value ─────────────────────────────────────────────────

type CwvContextValue = {
  // Step 2 — LCP discovery
  hoveredLcp: string | null;
  setHoveredLcp: (id: string | null) => void;
  lcpCandidate: LcpElement | null;
  // Step 3 — LCP sub-parts (live values)
  lcpOptimizations: Set<LcpSubpartFix>;
  toggleLcpOptimization: (id: LcpSubpartFix) => void;
  lcpSubparts: LcpSubpartValue[];
  lcpTotalSeconds: number;
  lcpRating: Rating;
  // Step 4 — INP felt delay
  inpClickTimestamps: number[];
  registerInpClick: (latency: number) => void;
  inpFixed: boolean;
  setInpFixed: (v: boolean) => void;
  inpBreakdown: InpBreakdown;
  inpTotalMs: number;
  inpRating: Rating;
  // Step 5 — INP optimisation
  activeInpOptimization: InpOptimization;
  setActiveInpOptimization: (id: InpOptimization) => void;
  // Step 6 — CLS session windows
  clsShifts: readonly LayoutShift[];
  clsWindows: ClsWindow[];
  clsValue: number;
  clsRating: Rating;
  replayCls: () => void;
  clsReplayKey: number;
  // Step 7 — Field vs lab
  deviceQuality: number;
  setDeviceQuality: (v: number) => void;
  labField: LabFieldMetrics;
};

const CwvContext = createContext<CwvContextValue | null>(null);

export function useCwvContext(): CwvContextValue {
  const ctx = useContext(CwvContext);
  if (!ctx) throw new Error("useCwvContext must be used within CwvProvider");
  return ctx;
}

// ── LCP sub-parts (step 3) ─────────────────────────────────────────

export type LcpSubpartFix = "cdn" | "preload" | "compress" | "critical-css";

const LCP_SUBPART_BASE = [
  { id: "ttfb", label: "TTFB", base: 1200, fix: "cdn" as const, fixLabel: "CDN + edge caching" },
  { id: "resource-delay", label: "Resource load delay", base: 400, fix: "preload" as const, fixLabel: "fetchpriority + preload" },
  { id: "resource-load", label: "Resource load duration", base: 600, fix: "compress" as const, fixLabel: "AVIF/WebP responsive srcset" },
  { id: "render-delay", label: "Element render delay", base: 500, fix: "critical-css" as const, fixLabel: "Inline critical CSS" },
];

const LCP_FIX_REDUCTION: Record<LcpSubpartFix, number> = {
  cdn: 0.5,
  preload: 0.7,
  compress: 0.55,
  "critical-css": 0.6,
};

export type LcpSubpartValue = (typeof LCP_SUBPART_BASE)[number] & { valueMs: number };

// ── Provider ──────────────────────────────────────────────────────

export function CwvProvider({ children }: { children: ReactNode }) {
  // Step 2 — LCP discovery
  const [hoveredLcp, setHoveredLcp] = useState<string | null>(null);
  const lcpCandidate = useMemo(() => pickLcpCandidate(LCP_PAGE_ELEMENTS), []);

  // Step 3 — LCP sub-parts
  const [lcpOptimizations, setLcpOptimizations] = useState<Set<LcpSubpartFix>>(new Set());
  const toggleLcpOptimization = useCallback((id: LcpSubpartFix) => {
    setLcpOptimizations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const lcpSubparts = useMemo<LcpSubpartValue[]>(
    () =>
      LCP_SUBPART_BASE.map((sp) => {
        const reduction = lcpOptimizations.has(sp.fix) ? LCP_FIX_REDUCTION[sp.fix] : 0;
        return { ...sp, valueMs: Math.round(sp.base * (1 - reduction)) };
      }),
    [lcpOptimizations],
  );
  const lcpTotalSeconds = useMemo(() => {
    const totalMs = lcpSubparts.reduce((acc, sp) => acc + sp.valueMs, 0);
    return Math.round((totalMs / 1000) * 100) / 100;
  }, [lcpSubparts]);
  const lcpRating = useMemo(() => rateLcp(lcpTotalSeconds), [lcpTotalSeconds]);

  // Step 4 — INP felt delay
  const [inpClickTimestamps, setInpClickTimestamps] = useState<number[]>([]);
  const [inpFixed, setInpFixed] = useState(false);
  const registerInpClick = useCallback((latency: number) => {
    setInpClickTimestamps((prev) => [...prev.slice(-9), latency]);
  }, []);
  const inpBreakdown: InpBreakdown = useMemo(() => (inpFixed ? INP_GOOD_BREAKDOWN : INP_BAD_BREAKDOWN), [inpFixed]);
  const inpTotalMs = useMemo(() => sumInp(inpBreakdown), [inpBreakdown]);
  const inpRating = useMemo(() => rateInp(inpTotalMs), [inpTotalMs]);

  // Step 5 — INP optimisation tab
  const [activeInpOptimization, setActiveInpOptimization] = useState<InpOptimization>("yield");

  // Step 6 — CLS session windows
  const clsShifts = CLS_SHIFTS;
  const clsWindows = useMemo(() => groupClsWindows(clsShifts), [clsShifts]);
  const clsValue = useMemo(() => computeCls(clsShifts), [clsShifts]);
  const clsRating = useMemo(() => rateCls(clsValue), [clsValue]);
  const [clsReplayKey, setClsReplayKey] = useState(0);
  const replayCls = useCallback(() => setClsReplayKey((k) => k + 1), []);

  // Step 7 — Field vs lab
  const [deviceQuality, setDeviceQuality] = useState(40);
  const labField = useMemo(() => computeLabField(1200, 85, 0.04, deviceQuality), [deviceQuality]);

  const value = useMemo<CwvContextValue>(
    () => ({
      hoveredLcp,
      setHoveredLcp,
      lcpCandidate,
      lcpOptimizations,
      toggleLcpOptimization,
      lcpSubparts,
      lcpTotalSeconds,
      lcpRating,
      inpClickTimestamps,
      registerInpClick,
      inpFixed,
      setInpFixed,
      inpBreakdown,
      inpTotalMs,
      inpRating,
      activeInpOptimization,
      setActiveInpOptimization,
      clsShifts,
      clsWindows,
      clsValue,
      clsRating,
      replayCls,
      clsReplayKey,
      deviceQuality,
      setDeviceQuality,
      labField,
    }),
    [
      hoveredLcp,
      lcpCandidate,
      lcpOptimizations,
      toggleLcpOptimization,
      lcpSubparts,
      lcpTotalSeconds,
      lcpRating,
      inpClickTimestamps,
      registerInpClick,
      inpFixed,
      inpBreakdown,
      inpTotalMs,
      inpRating,
      activeInpOptimization,
      clsShifts,
      clsWindows,
      clsValue,
      clsRating,
      replayCls,
      clsReplayKey,
      deviceQuality,
      labField,
    ],
  );

  return <CwvContext.Provider value={value}>{children}</CwvContext.Provider>;
}
