"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyOptimizations,
  bundleAtStage,
  layoutTreemap,
  TOTAL_STAGES,
  type BundleState,
  type OptimizationKey,
  type TreemapLayout,
} from "./engine/bundle-simulator";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Public types ────────────────────────────────────────────────────

export type BundleMode = "scrolly" | "capstone";

type BundleContextValue = {
  activeStep: number;
  mode: BundleMode;
  state: BundleState;
  /** Layout computed against the lab's main treemap canvas. */
  treemap: TreemapLayout;
  /** User-arranged optimization order for the capstone (stage 6). */
  capstoneSeq: OptimizationKey[];
  /** Pre-built sequences the capstone offers as starting templates. */
  setCapstoneSeq: (seq: OptimizationKey[]) => void;
  resetCapstone: () => void;
  /** Treemap canvas dimensions — the UI controls these via ResizeObserver. */
  treemapWidth: number;
  treemapHeight: number;
  setTreemapSize: (width: number, height: number) => void;
  /** Whatever's relevant to the StateInspector. */
  stateEntries: StateEntry[];
};

const BundleContext = createContext<BundleContextValue | null>(null);

export function useBundleContext(): BundleContextValue {
  const ctx = useContext(BundleContext);
  if (!ctx) throw new Error("useBundleContext must be used within BundleProvider");
  return ctx;
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_TREEMAP_WIDTH = 720;
const DEFAULT_TREEMAP_HEIGHT = 420;

// Capstone starts from the 1.1 MB monolith — the reader assembles the build
// pipeline from scratch. The MDX explicitly asks them to "drag the four
// optimization cards into any order"; pre-filling defeats the exercise.
const EMPTY_SEQUENCE: OptimizationKey[] = [];

// ── Provider ────────────────────────────────────────────────────────

export function BundleProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const clampedStep = Math.max(1, Math.min(TOTAL_STAGES, activeStep));
  const mode: BundleMode = clampedStep >= TOTAL_STAGES ? "capstone" : "scrolly";

  const [capstoneSeq, setCapstoneSeqRaw] = useState<OptimizationKey[]>(EMPTY_SEQUENCE);
  const [treemapWidth, setWidth] = useState<number>(DEFAULT_TREEMAP_WIDTH);
  const [treemapHeight, setHeight] = useState<number>(DEFAULT_TREEMAP_HEIGHT);

  const setTreemapSize = useCallback((w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  }, []);

  const setCapstoneSeq = useCallback((seq: OptimizationKey[]) => {
    // Defensive: drop duplicates while preserving order.
    const seen = new Set<OptimizationKey>();
    const next = seq.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
    setCapstoneSeqRaw(next);
  }, []);

  const resetCapstone = useCallback(() => setCapstoneSeqRaw(EMPTY_SEQUENCE), []);

  const state = useMemo<BundleState>(() => {
    if (mode === "capstone") {
      const base = applyOptimizations(capstoneSeq);
      return { ...base, stage: clampedStep };
    }
    return bundleAtStage(clampedStep);
  }, [clampedStep, mode, capstoneSeq]);

  const treemap = useMemo<TreemapLayout>(
    () => layoutTreemap(state, treemapWidth, treemapHeight),
    [state, treemapWidth, treemapHeight],
  );

  const stateEntries = useMemo<StateEntry[]>(() => {
    const entries: StateEntry[] = [
      { label: "Stage", value: `${clampedStep} / ${TOTAL_STAGES}` },
      { label: "Mode", value: mode },
      { label: "Chunks", value: state.chunks.length },
      { label: "Initial (cold)", value: `${state.initialLoadKB} KB`, highlight: state.initialLoadKB > 250 },
      { label: "Initial (warm cache)", value: `${state.warmLoadKB} KB`, highlight: state.warmLoadKB > 250 },
      { label: "Total payload", value: `${state.totalKB} KB` },
    ];
    if (mode === "capstone") {
      entries.push({ label: "Applied order", value: capstoneSeq.length > 0 ? capstoneSeq.join(" → ") : "none" });
    }
    return entries;
  }, [clampedStep, mode, state, capstoneSeq]);

  const value = useMemo<BundleContextValue>(
    () => ({
      activeStep: clampedStep,
      mode,
      state,
      treemap,
      capstoneSeq,
      setCapstoneSeq,
      resetCapstone,
      treemapWidth,
      treemapHeight,
      setTreemapSize,
      stateEntries,
    }),
    [clampedStep, mode, state, treemap, capstoneSeq, setCapstoneSeq, resetCapstone, treemapWidth, treemapHeight, setTreemapSize, stateEntries],
  );

  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}
