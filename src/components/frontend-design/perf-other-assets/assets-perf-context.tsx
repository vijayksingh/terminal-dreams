"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FONT_SIMULATIONS,
  computeFontFrame,
  type FontFrame,
  type FontStrategy,
} from "./engine/font-cls-engine";
import {
  bestVideoStrategy,
  gradeVideoChoice,
  type FoldPosition,
  type VideoStrategy,
  type VideoVerdict,
} from "./engine/video-strategy-engine";
import {
  DEFAULT_ASSIGNMENT,
  OPTIMAL_ASSIGNMENT,
  THIRD_PARTY_SCRIPTS,
  computeTotals,
  gradeAssignment,
  type AuditTotals,
  type PriorityVerdict,
  type ScriptAssignment,
  type ScriptMode,
} from "./engine/third-party-engine";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 3;

// Two-letter step codes (canonical convention) — Font, Video, 3-Party
export const STEP_CODES = ["Fn", "Vd", "3P"] as const;
export const STEP_LABELS = ["Font CLS", "Video", "Third-party"] as const;

// ── Context value ───────────────────────────────────────────────────

type AssetsPerfContextValue = {
  activeStep: number;

  // Zone 1 — font CLS
  fontStrategy: FontStrategy;
  setFontStrategy: (s: FontStrategy) => void;
  fontFrame: FontFrame;
  fontPlaybackMs: number;

  // Zone 2 — video
  fold: FoldPosition;
  setFold: (f: FoldPosition) => void;
  bestVideo: VideoStrategy;
  videoVerdict: (pick: VideoStrategy) => VideoVerdict;

  // Zone 3 — third-party
  scriptAssignment: ScriptAssignment;
  setScriptMode: (id: string, mode: ScriptMode) => void;
  resetAudit: () => void;
  applyOptimalAudit: () => void;
  auditTotals: AuditTotals;
  auditBaseline: AuditTotals;
  auditVerdict: PriorityVerdict;

  // Diagnostics
  stateEntries: StateEntry[];
};

const AssetsPerfContext = createContext<AssetsPerfContextValue | null>(null);

export function useAssetsPerf(): AssetsPerfContextValue {
  const ctx = useContext(AssetsPerfContext);
  if (!ctx) throw new Error("useAssetsPerf must be used within AssetsPerfProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function AssetsPerfProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();

  // Zone 1 ----------------------------------------------------------------
  const [fontStrategy, setFontStrategyState] = useState<FontStrategy>("swap");
  const [fontPlaybackMs, setFontPlaybackMs] = useState(0);
  const tickRef = useRef<number | null>(null);

  const replayFont = useCallback(
    (next: FontStrategy) => {
      setFontStrategyState(next);
      const total = FONT_SIMULATIONS[next].totalDurationMs;
      if (tickRef.current !== null) {
        window.cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
      if (reducedMotion) {
        setFontPlaybackMs(total);
        return;
      }
      setFontPlaybackMs(0);
      const start = performance.now();
      const step = () => {
        const elapsed = performance.now() - start;
        if (elapsed >= total) {
          setFontPlaybackMs(total);
          tickRef.current = null;
        } else {
          setFontPlaybackMs(elapsed);
          tickRef.current = window.requestAnimationFrame(step);
        }
      };
      tickRef.current = window.requestAnimationFrame(step);
    },
    [reducedMotion],
  );

  // Replay on first render of zone-1
  useEffect(() => {
    if (activeStep !== 1) return;
    replayFont(fontStrategy);
    return () => {
      if (tickRef.current !== null) {
        window.cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
    };
    // We deliberately only re-run when the active step becomes 1 — replays
    // are user-initiated via setFontStrategy after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  const setFontStrategy = useCallback(
    (next: FontStrategy) => {
      replayFont(next);
    },
    [replayFont],
  );

  const fontFrame = useMemo(
    () => computeFontFrame(fontStrategy, fontPlaybackMs),
    [fontStrategy, fontPlaybackMs],
  );

  // Zone 2 ----------------------------------------------------------------
  const [fold, setFold] = useState<FoldPosition>("above");
  const bestVideo = useMemo(() => bestVideoStrategy(fold), [fold]);
  const videoVerdict = useCallback(
    (pick: VideoStrategy) => gradeVideoChoice(pick, fold),
    [fold],
  );

  // Zone 3 ----------------------------------------------------------------
  const [scriptAssignment, setScriptAssignment] =
    useState<ScriptAssignment>(DEFAULT_ASSIGNMENT);

  const setScriptMode = useCallback((id: string, mode: ScriptMode) => {
    setScriptAssignment((prev) => ({ ...prev, [id]: mode }));
  }, []);

  const resetAudit = useCallback(() => {
    setScriptAssignment(DEFAULT_ASSIGNMENT);
  }, []);

  const applyOptimalAudit = useCallback(() => {
    setScriptAssignment(OPTIMAL_ASSIGNMENT);
  }, []);

  const auditTotals = useMemo(() => computeTotals(scriptAssignment), [scriptAssignment]);
  const auditBaseline = useMemo(() => computeTotals(DEFAULT_ASSIGNMENT), []);
  const auditVerdict = useMemo(
    () => gradeAssignment(scriptAssignment),
    [scriptAssignment],
  );

  // Diagnostics --------------------------------------------------------
  const stateEntries = useMemo<StateEntry[]>(() => {
    if (activeStep === 1) {
      return [
        { label: "Strategy", value: fontStrategy },
        { label: "CLS", value: fontFrame.cls.toFixed(2), highlight: fontFrame.cls >= 0.1 },
        { label: "Font", value: fontFrame.font },
        { label: "Swapped", value: fontFrame.fontSwapped },
      ];
    }
    if (activeStep === 2) {
      return [
        { label: "Fold", value: fold },
        { label: "Best", value: bestVideo },
      ];
    }
    const partytownCount = Object.values(scriptAssignment).filter(
      (m) => m === "partytown",
    ).length;
    return [
      { label: "Scripts", value: THIRD_PARTY_SCRIPTS.length },
      { label: "Partytown", value: partytownCount },
      { label: "Blocking", value: `${auditTotals.blockingMs}ms`, highlight: auditTotals.blockingMs >= 200 },
      { label: "INP risk", value: `${auditTotals.inpPenaltyMs}ms`, highlight: auditTotals.inpPenaltyMs > 0 },
    ];
  }, [
    activeStep,
    fontStrategy,
    fontFrame,
    fold,
    bestVideo,
    scriptAssignment,
    auditTotals,
  ]);

  const value = useMemo<AssetsPerfContextValue>(
    () => ({
      activeStep,
      fontStrategy,
      setFontStrategy,
      fontFrame,
      fontPlaybackMs,
      fold,
      setFold,
      bestVideo,
      videoVerdict,
      scriptAssignment,
      setScriptMode,
      resetAudit,
      applyOptimalAudit,
      auditTotals,
      auditBaseline,
      auditVerdict,
      stateEntries,
    }),
    [
      activeStep,
      fontStrategy,
      setFontStrategy,
      fontFrame,
      fontPlaybackMs,
      fold,
      bestVideo,
      videoVerdict,
      scriptAssignment,
      setScriptMode,
      resetAudit,
      applyOptimalAudit,
      auditTotals,
      auditBaseline,
      auditVerdict,
      stateEntries,
    ],
  );

  return (
    <AssetsPerfContext.Provider value={value}>{children}</AssetsPerfContext.Provider>
  );
}
