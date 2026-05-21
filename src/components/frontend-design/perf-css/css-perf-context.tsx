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
  CRITICAL_RULES,
  CRITICAL_ABOVE_BYTES,
  CRITICAL_TOTAL_BYTES,
  UNUSED_RULES,
  buildVisibilityCards,
  compareSpecificity,
  computeSpecificity,
  detectUnused,
  formatTuple,
  isValidSelector,
  resolveLayerWinner,
  safeBytes,
  simulateFCP,
  simulateRenderBlocking,
  tokenizeSelector,
  totalRenderMs,
  trapBytes,
  type AuditJudgment,
  type CSSRuleMock,
  type LayerRule,
  type RenderBlockingMode,
  type SelectorToken,
  type SpecificityTuple,
  type VisibilityCard,
  LAYER_DEMO_RULES,
} from "./engine/css-perf-simulator";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Context value shape ─────────────────────────────────────────────

type Winner = "a" | "b" | "tie" | null;

type CSSPerfContextValue = {
  activeStep: number;

  // Step 1 — render-blocking
  renderMode: RenderBlockingMode;
  setRenderMode: (m: RenderBlockingMode) => void;
  blockingTimeline: ReturnType<typeof simulateRenderBlocking>;

  // Step 2 — specificity
  selectorA: string;
  selectorB: string;
  setSelectorA: (s: string) => void;
  setSelectorB: (s: string) => void;
  tokensA: SelectorToken[];
  tokensB: SelectorToken[];
  specA: SpecificityTuple;
  specB: SpecificityTuple;
  validA: boolean;
  validB: boolean;
  winner: Winner;

  // Step 3 — critical CSS
  rules: CSSRuleMock[];
  extracted: boolean;
  setExtracted: (b: boolean) => void;
  fcpMs: number;

  // Step 4 — unused audit
  unusedRules: CSSRuleMock[];
  judgments: Record<string, AuditJudgment>;
  judgeRule: (id: string, j: AuditJudgment) => void;
  resetAudit: () => void;
  auditResult: ReturnType<typeof detectUnused>;
  auditCommitted: boolean;
  commitAudit: () => void;

  // Step 5 — modern features
  layersEnabled: boolean;
  setLayersEnabled: (b: boolean) => void;
  layerRules: LayerRule[];
  layerOutcome: { winner: LayerRule; reason: string };

  cvEnabled: boolean;
  setCvEnabled: (b: boolean) => void;
  visibilityCards: VisibilityCard[];
  renderMs: number;

  cssInJsMode: "runtime" | "zero-runtime";
  setCssInJsMode: (m: "runtime" | "zero-runtime") => void;

  // Step 6 — WINS recap
  winsAchieved: boolean;

  // StateInspector
  stateEntries: StateEntry[];
};

const CSSPerfContext = createContext<CSSPerfContextValue | null>(null);

export function useCSSPerfContext(): CSSPerfContextValue {
  const ctx = useContext(CSSPerfContext);
  if (!ctx) throw new Error("useCSSPerfContext must be used within CSSPerfProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function CSSPerfProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const [renderMode, setRenderMode] = useState<RenderBlockingMode>("blocking");

  const [selectorA, setSelectorA] = useState<string>(".card");
  const [selectorB, setSelectorB] = useState<string>("#hero .card");

  const [extracted, setExtracted] = useState(false);

  const [judgments, setJudgments] = useState<Record<string, AuditJudgment>>({});
  const [auditCommitted, setAuditCommitted] = useState(false);

  const [layersEnabled, setLayersEnabled] = useState(false);
  const [cvEnabled, setCvEnabled] = useState(false);
  const [cssInJsMode, setCssInJsMode] = useState<"runtime" | "zero-runtime">("runtime");

  const judgeRule = useCallback((id: string, j: AuditJudgment) => {
    setJudgments((prev) => ({ ...prev, [id]: j }));
  }, []);

  const resetAudit = useCallback(() => {
    setJudgments({});
    setAuditCommitted(false);
  }, []);

  const commitAudit = useCallback(() => {
    setAuditCommitted(true);
  }, []);

  const blockingTimeline = useMemo(() => simulateRenderBlocking(renderMode), [renderMode]);

  const tokensA = useMemo<SelectorToken[]>(
    () => (isValidSelector(selectorA) ? tokenizeSelector(selectorA) : []),
    [selectorA],
  );
  const tokensB = useMemo<SelectorToken[]>(
    () => (isValidSelector(selectorB) ? tokenizeSelector(selectorB) : []),
    [selectorB],
  );
  const specA = useMemo(() => computeSpecificity(selectorA), [selectorA]);
  const specB = useMemo(() => computeSpecificity(selectorB), [selectorB]);
  const validA = isValidSelector(selectorA);
  const validB = isValidSelector(selectorB);

  const winner = useMemo<Winner>(() => {
    if (!validA || !validB) return null;
    const cmp = compareSpecificity(specA, specB);
    if (cmp > 0) return "a";
    if (cmp < 0) return "b";
    return "tie";
  }, [validA, validB, specA, specB]);

  const fcpMs = useMemo(() => {
    if (extracted) {
      return simulateFCP(CRITICAL_ABOVE_BYTES, CRITICAL_TOTAL_BYTES - CRITICAL_ABOVE_BYTES, { renderBlocking: false });
    }
    return blockingTimeline.paintAt;
  }, [extracted, blockingTimeline]);

  const auditResult = useMemo(() => detectUnused(UNUSED_RULES, judgments), [judgments]);

  const layerOutcome = useMemo(
    () => resolveLayerWinner(LAYER_DEMO_RULES, layersEnabled),
    [layersEnabled],
  );

  const visibilityCards = useMemo(() => buildVisibilityCards(), []);
  const renderMs = useMemo(
    () => totalRenderMs(visibilityCards, cvEnabled),
    [visibilityCards, cvEnabled],
  );

  // WINS = critical extracted + audit committed with zero JS-toggled rules deleted
  //        + modern features adopted.
  const winsAchieved =
    extracted &&
    auditCommitted &&
    auditResult.brokenJsRules.length === 0 &&
    auditResult.bytesSavedSafely > 0 &&
    layersEnabled &&
    cvEnabled;

  const stateEntries = useMemo<StateEntry[]>(() => {
    return [
      { label: "Step", value: activeStep },
      { label: "Render mode", value: renderMode },
      { label: "FCP", value: `${fcpMs}ms`, highlight: fcpMs > 600 },
      { label: "Selector A", value: formatTuple(specA) },
      { label: "Selector B", value: formatTuple(specB) },
      { label: "Winner", value: winner ?? "—" },
      { label: "Critical extracted", value: extracted },
      { label: "Audit committed", value: auditCommitted },
      { label: "Bytes saved", value: `${Math.round(auditResult.bytesSavedSafely / 1024 * 10) / 10}KB`, highlight: auditResult.bytesSavedSafely > 0 },
      { label: "JS rules deleted", value: auditResult.brokenJsRules.length, highlight: auditResult.brokenJsRules.length > 0 },
      { label: "@layer on", value: layersEnabled },
      { label: "content-visibility", value: cvEnabled },
      { label: "WINS", value: winsAchieved },
    ];
  }, [
    activeStep,
    renderMode,
    fcpMs,
    specA,
    specB,
    winner,
    extracted,
    auditCommitted,
    auditResult,
    layersEnabled,
    cvEnabled,
    winsAchieved,
  ]);

  const value = useMemo<CSSPerfContextValue>(
    () => ({
      activeStep,
      renderMode,
      setRenderMode,
      blockingTimeline,
      selectorA,
      selectorB,
      setSelectorA,
      setSelectorB,
      tokensA,
      tokensB,
      specA,
      specB,
      validA,
      validB,
      winner,
      rules: CRITICAL_RULES,
      extracted,
      setExtracted,
      fcpMs,
      unusedRules: UNUSED_RULES,
      judgments,
      judgeRule,
      resetAudit,
      auditResult,
      auditCommitted,
      commitAudit,
      layersEnabled,
      setLayersEnabled,
      layerRules: LAYER_DEMO_RULES,
      layerOutcome,
      cvEnabled,
      setCvEnabled,
      visibilityCards,
      renderMs,
      cssInJsMode,
      setCssInJsMode,
      winsAchieved,
      stateEntries,
    }),
    [
      activeStep,
      renderMode,
      blockingTimeline,
      selectorA,
      selectorB,
      tokensA,
      tokensB,
      specA,
      specB,
      validA,
      validB,
      winner,
      extracted,
      fcpMs,
      judgments,
      judgeRule,
      resetAudit,
      auditResult,
      auditCommitted,
      commitAudit,
      layersEnabled,
      layerOutcome,
      cvEnabled,
      visibilityCards,
      renderMs,
      cssInJsMode,
      winsAchieved,
      stateEntries,
    ],
  );

  // exports needed for the constants used in fcpMs derivation above
  void CRITICAL_TOTAL_BYTES;
  void safeBytes;
  void trapBytes;

  return <CSSPerfContext.Provider value={value}>{children}</CSSPerfContext.Provider>;
}
