"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import { PerfProvider, usePerfContext } from "./perf-context";
import { OPTIMIZATIONS, NETWORK_PROFILES, type NetworkCondition } from "./engine/perf-simulator";
import { WaterfallChart } from "./ui/WaterfallChart";
import { AppProfileView, VitalsOverview, OptMapView } from "./ui/PlanningViews";
import { BaselineWidget } from "./ui/BaselineWidget";
import { CodeSplittingWidget } from "./ui/CodeSplittingWidget";
import { CriticalCSSWidget } from "./ui/CriticalCSSWidget";
import { ImageOptWidget } from "./ui/ImageOptWidget";
import { FontWidget } from "./ui/FontWidget";
import { ThirdPartyWidget } from "./ui/ThirdPartyWidget";
import { LongTaskWidget } from "./ui/LongTaskWidget";
import { LayoutStabilityWidget, MilestoneCheckpoint } from "./ui/LayoutStabilityWidget";
import { CachingWidget } from "./ui/CachingWidget";
import { PrefetchWidget } from "./ui/PrefetchWidget";
import { BudgetWidget } from "./ui/BudgetWidget";
import { RUMWidget } from "./ui/RUMWidget";
import styles from "./WebPerformanceLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

const STEP_LABELS = [
  "Pg", "Vt", "Mp",
  "Au", "Sp", "Cr",
  "Im", "Fn", "3P",
  "Tk", "CL", "Ca",
  "Pf", "Bu", "Rm",
];

export function WebPerformanceLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <PerfProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={STEP_LABELS} />
        {isPlanning ? (
          <div className={styles.scrollArea}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`planning-${activeStep}`}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={TRANSITION.enterCard}
              >
                <PlanningView activeStep={activeStep} />
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <PerfDashboard />
        )}
      </div>
    </PerfProvider>
  );
}

// ── Planning views (steps 1-3) ─────────────────────────────────────

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <AppProfileView />;
  if (activeStep === 2) return <VitalsOverview />;
  return <OptMapView />;
}

// ── Dashboard (steps 4-15) ─────────────────────────────────────────

function PerfDashboard() {
  const { activeStep } = usePerfContext();

  return (
    <div className={styles.dashboardLayout}>
      <div className={styles.dashboardTop}>
        <OptimizationChips />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`widget-${activeStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.crossfade}
          >
            <StepWidget />
          </motion.div>
        </AnimatePresence>
      </div>
      <WaterfallPanel />
    </div>
  );
}

// ── Optimization chips ──────────────────────────────────────────────

function OptimizationChips() {
  const { activeStep, enabledOptimizations, toggleOptimization } = usePerfContext();
  const available = OPTIMIZATIONS.filter((o) => o.step <= activeStep);

  if (available.length === 0) return null;

  return (
    <div className={styles.toggleChips}>
      {available.map((opt) => {
        const on = enabledOptimizations.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={styles.toggleChip}
            onClick={() => toggleOptimization(opt.id)}
            aria-pressed={on}
            title={opt.description}
          >
            <span className={styles.chipDot} data-on={on ? "true" : undefined} aria-hidden="true" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Waterfall panel (always visible, stuck to bottom) ──────────────

const NETWORK_OPTIONS: NetworkCondition[] = ["slow-3g", "3g", "4g", "wifi"];
const MIN_INSPECTOR_W = 100;
const MAX_INSPECTOR_W = 300;
const DEFAULT_INSPECTOR_W = 160;
const MIN_PANEL_H = 120;
const MAX_PANEL_H = 700;
const DEFAULT_PANEL_H = 340;

function WaterfallPanel() {
  const {
    resources, timelineEndMs, metrics, activeStep,
    visitType, setVisitType, enabledOptimizations,
    networkCondition, setNetworkCondition,
    bandwidthSlider, setBandwidthSlider, activeProfile,
    stateEntries,
  } = usePerfContext();
  const showVisitToggle = activeStep >= 12 && enabledOptimizations.has("caching");

  const [inspectorW, setInspectorW] = useState(DEFAULT_INSPECTOR_W);
  const [panelH, setPanelH] = useState(DEFAULT_PANEL_H);
  const dragging = useRef<"col" | "row" | false>(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onColResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = "col";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onRowResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = "row";
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current === "col" && bodyRef.current) {
        const rect = bodyRef.current.getBoundingClientRect();
        const newW = Math.round(rect.right - e.clientX);
        setInspectorW(Math.max(MIN_INSPECTOR_W, Math.min(MAX_INSPECTOR_W, newW)));
      } else if (dragging.current === "row" && panelRef.current?.parentElement) {
        const parentRect = panelRef.current.parentElement.getBoundingClientRect();
        const newH = Math.round(parentRect.bottom - e.clientY);
        setPanelH(Math.max(MIN_PANEL_H, Math.min(MAX_PANEL_H, newH)));
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <div className={styles.waterfallPanel} ref={panelRef} style={{ height: panelH }}>
      <div className={styles.vResizeHandle} onPointerDown={onRowResizeDown} aria-hidden="true" />
      <div className={styles.waterfallHeader}>
        <span className={styles.waterfallHeaderLabel}>Waterfall</span>
        <span className={styles.waterfallHeaderStats} aria-live="polite">
          {metrics.requestCount} req · {metrics.totalSizeKB} KB
        </span>
      </div>
      <div className={styles.waterfallControls}>
        <div className={styles.networkSelector} role="radiogroup" aria-label="Network preset">
          {NETWORK_OPTIONS.map((nc) => (
            <button
              key={nc}
              type="button"
              className={styles.networkButton}
              data-active={networkCondition === nc ? "true" : undefined}
              onClick={() => setNetworkCondition(nc)}
              role="radio"
              aria-checked={networkCondition === nc}
              aria-label={NETWORK_PROFILES[nc].label}
            >
              {NETWORK_PROFILES[nc].label}
            </button>
          ))}
        </div>
        {showVisitToggle && (
          <div className={styles.visitToggle} role="radiogroup" aria-label="Visit type">
            <button type="button" className={styles.visitToggleButton} data-active={visitType === "first" ? "true" : undefined} onClick={() => setVisitType("first")} role="radio" aria-checked={visitType === "first"}>First</button>
            <button type="button" className={styles.visitToggleButton} data-active={visitType === "repeat" ? "true" : undefined} onClick={() => setVisitType("repeat")} role="radio" aria-checked={visitType === "repeat"}>Repeat</button>
          </div>
        )}
        <div className={styles.networkSliderWrap}>
          <span className={styles.networkSliderLabel}>{activeProfile.label}</span>
          <input type="range" min={0} max={100} step={1} value={bandwidthSlider} onChange={(e) => setBandwidthSlider(Number(e.target.value))} className={styles.networkSlider} aria-label="Network bandwidth" />
          <span className={styles.networkSliderSpeed}>×{activeProfile.multiplier} · {activeProfile.rtt}ms RTT</span>
        </div>
      </div>
      <div className={styles.waterfallBody} ref={bodyRef} style={{ gridTemplateColumns: `1fr ${inspectorW}px` }}>
        <div className={styles.waterfallChartArea}>
          <WaterfallChart resources={resources} timelineEndMs={timelineEndMs} />
        </div>
        <div className={styles.inspectorArea}>
          <div className={styles.resizeHandle} onPointerDown={onColResizeDown} aria-hidden="true" />
          <StateInspector entries={stateEntries} title="Perf State" />
        </div>
      </div>
    </div>
  );
}

// ── Step widget router ──────────────────────────────────────────────

function StepWidget() {
  const { activeStep } = usePerfContext();

  switch (activeStep) {
    case 4: return <BaselineWidget />;
    case 5: return <CodeSplittingWidget />;
    case 6: return <CriticalCSSWidget />;
    case 7: return <ImageOptWidget />;
    case 8: return <FontWidget />;
    case 9: return <ThirdPartyWidget />;
    case 10: return <LongTaskWidget />;
    case 11: return <><LayoutStabilityWidget /><MilestoneCheckpoint /></>;
    case 12: return <CachingWidget />;
    case 13: return <PrefetchWidget />;
    case 14: return <BudgetWidget />;
    case 15: return <RUMWidget />;
    default: return null;
  }
}
