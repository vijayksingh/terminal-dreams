"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import { PerfProvider, usePerfContext } from "./perf-context";
import { OPTIMIZATIONS, NETWORK_PROFILES, getCWVRating, type NetworkCondition } from "./engine/perf-simulator";
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
        <div className={styles.scrollArea}>
          {isPlanning ? (
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
          ) : (
            <PerfDashboard />
          )}
        </div>
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
      <div className={styles.instrumentBar}>
        <MetricsSummaryBar />
        <OptimizationChips />
      </div>

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

      <WaterfallDrawer />
    </div>
  );
}

// ── Metrics summary bar ─────────────────────────────────────────────

function MetricsSummaryBar() {
  const { metrics, simulatedInp } = usePerfContext();
  const prevMetricsRef = useRef(metrics);
  const prevMetrics = prevMetricsRef.current;

  const displayInp = simulatedInp != null ? simulatedInp : metrics.inp;
  const items: { label: string; value: string; key: string; delta: number; flash?: boolean }[] = [
    { label: "LCP", value: metrics.lcp >= 1000 ? `${(metrics.lcp / 1000).toFixed(1)}s` : `${metrics.lcp}ms`, key: "lcp", delta: metrics.lcp - prevMetrics.lcp },
    { label: simulatedInp != null ? "INP" : "INP", value: `${displayInp}ms`, key: "inp", delta: metrics.inp - prevMetrics.inp, flash: simulatedInp != null },
    { label: "CLS", value: metrics.cls.toFixed(2), key: "cls", delta: Math.round((metrics.cls - prevMetrics.cls) * 100) / 100 },
    { label: "Size", value: `${metrics.totalSizeKB} KB`, key: "totalSizeKB", delta: metrics.totalSizeKB - prevMetrics.totalSizeKB },
  ];

  if (prevMetrics !== metrics) {
    prevMetricsRef.current = metrics;
  }

  return (
    <div className={styles.metricsSummaryBar} aria-live="polite" aria-label="Performance metrics">
      {items.map(({ label, value, key, delta, flash }) => {
        const ratingValue = key === "inp" ? displayInp : (metrics[key as keyof typeof metrics] as number);
        const rating = getCWVRating(key, ratingValue);
        return (
          <div key={key} className={styles.metricsSummaryItem}>
            <span className={styles.metricsSummaryLabel}>{label}</span>
            <span className={styles.metricsSummaryValue} data-rating={rating} data-flash={flash ? "true" : undefined}>{value}</span>
            {delta !== 0 && (
              <span className={styles.metricsDelta} data-direction={delta < 0 ? "improved" : "regressed"}>
                {delta > 0 ? "+" : ""}{key === "cls" ? delta.toFixed(2) : delta}{key === "totalSizeKB" ? " KB" : key === "cls" ? "" : "ms"}
              </span>
            )}
          </div>
        );
      })}
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

// ── Waterfall drawer ────────────────────────────────────────────────

const NETWORK_OPTIONS: NetworkCondition[] = ["slow-3g", "3g", "4g", "wifi"];

function WaterfallDrawer() {
  const {
    resources, timelineEndMs, metrics, activeStep,
    visitType, setVisitType, enabledOptimizations,
    networkCondition, setNetworkCondition,
    bandwidthSlider, setBandwidthSlider, activeProfile,
    stateEntries,
  } = usePerfContext();
  const [open, setOpen] = useState(false);
  const rm = usePrefersReducedMotion();
  const showVisitToggle = activeStep >= 12 && enabledOptimizations.has("caching");

  const expandMotion = rm
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: SPRING.gentle };

  return (
    <div className={styles.waterfallDrawer}>
      <button
        className={styles.drawerToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle resource waterfall"
      >
        <span className={styles.drawerToggleLabel}>Waterfall</span>
        <span className={styles.drawerToggleStats} aria-live="polite">
          {metrics.requestCount} req · {metrics.totalSizeKB} KB
        </span>
        <svg className={styles.drawerChevron} data-open={open ? "true" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div className={styles.drawerContent} {...expandMotion}>
            <div className={styles.drawerInner}>
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
                  <div className={styles.visitToggle}>
                    <button type="button" className={styles.visitToggleButton} data-active={visitType === "first" ? "true" : undefined} onClick={() => setVisitType("first")}>First</button>
                    <button type="button" className={styles.visitToggleButton} data-active={visitType === "repeat" ? "true" : undefined} onClick={() => setVisitType("repeat")}>Repeat</button>
                  </div>
                )}
              </div>
              <div className={styles.waterfallControls}>
                <div className={styles.networkSliderWrap}>
                  <span className={styles.networkSliderLabel}>{activeProfile.label}</span>
                  <input type="range" min={0} max={100} step={1} value={bandwidthSlider} onChange={(e) => setBandwidthSlider(Number(e.target.value))} className={styles.networkSlider} aria-label="Network bandwidth" />
                  <span className={styles.networkSliderSpeed}>×{activeProfile.multiplier} · {activeProfile.rtt}ms RTT</span>
                </div>
              </div>
              <WaterfallChart resources={resources} timelineEndMs={timelineEndMs} />
              <StateInspector entries={stateEntries} title="Perf State" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
