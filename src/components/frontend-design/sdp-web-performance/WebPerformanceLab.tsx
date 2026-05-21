"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { ControlPanel } from "../_shared/ControlPanel";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  PerfProvider,
  usePerfContext,
} from "./perf-context";
import { OPTIMIZATIONS, NETWORK_PROFILES, getCWVRating, computePerformance, RESOURCE_COLORS, type OptimizationId, type NetworkCondition } from "./engine/perf-simulator";
import { WaterfallChart } from "./ui/WaterfallChart";
import { MetricsPanel } from "./ui/MetricsPanel";
import styles from "./WebPerformanceLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function WebPerformanceLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <PerfProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
            <AnimatePresence mode="wait">
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

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "Pg", "Vt", "Mp",
  "Au", "Sp", "Cr",
  "Im", "Fn", "3P",
  "Tk", "CL", "Ca",
  "Pf", "Bu", "Rm",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${label}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <AppProfileView />;
  if (activeStep === 2) return <VitalsOverview />;
  return <OptMapView />;
}

// ── Step 1: Page load filmstrip ────────────────────────────────────

function AppProfileView() {
  const [device, setDevice] = useState<"wifi" | "3g">("3g");
  const [visibleFrame, setVisibleFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timings = device === "wifi"
    ? { blank: 200, partial: 350, loaded: 500, interactive: 650 }
    : { blank: 1700, partial: 2400, loaded: 2900, interactive: 3500 };

  const frames = [
    { at: 0, label: "Navigation", state: "blank", desc: "User clicks link" },
    { at: timings.blank, label: `${timings.blank}ms`, state: "blank", desc: "Blank — waiting for JS" },
    { at: timings.partial, label: `${timings.partial}ms`, state: "partial", desc: "Shell renders (FCP)" },
    { at: timings.loaded, label: `${timings.loaded}ms`, state: "loaded", desc: "Hero image loads (LCP)" },
    { at: timings.interactive, label: `${timings.interactive}ms`, state: "interactive", desc: "Interactive (long tasks clear)" },
  ];

  React.useEffect(() => {
    setVisibleFrame(0);
    let current = 0;
    const advance = () => {
      if (current >= frames.length - 1) return;
      current++;
      const delay = device === "3g"
        ? (frames[current].at - frames[current - 1].at) * 0.4
        : (frames[current].at - frames[current - 1].at) * 0.8;
      timerRef.current = setTimeout(() => {
        setVisibleFrame(current);
        advance();
      }, Math.max(delay, 100));
    };
    advance();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Page Load Experience</h3>
      <div className={styles.deviceToggle}>
        <button type="button" className={styles.deviceBtn} data-active={device === "wifi" ? "true" : undefined} onClick={() => setDevice("wifi")}>
          Your MacBook (Wi-Fi)
        </button>
        <button type="button" className={styles.deviceBtn} data-active={device === "3g" ? "true" : undefined} onClick={() => setDevice("3g")}>
          User&apos;s phone (3G)
        </button>
      </div>
      <div className={styles.filmstrip}>
        {frames.map((f, i) => (
          <div key={i} className={styles.filmFrame} data-state={i <= visibleFrame ? f.state : "hidden"} data-visible={i <= visibleFrame ? "true" : undefined}>
            <div className={styles.filmFrameScreen}>
              {i > visibleFrame && <span className={styles.filmBlank} data-waiting="true" />}
              {i <= visibleFrame && f.state === "blank" && <span className={styles.filmBlank} />}
              {i <= visibleFrame && f.state === "partial" && (
                <>
                  <span className={styles.filmNavbar} />
                  <span className={styles.filmSkeleton} />
                  <span className={styles.filmSkeleton} data-short="true" />
                </>
              )}
              {i <= visibleFrame && (f.state === "loaded" || f.state === "interactive") && (
                <>
                  <span className={styles.filmNavbar} />
                  <span className={styles.filmHero} />
                  <span className={styles.filmText} />
                  <span className={styles.filmText} data-short="true" />
                </>
              )}
            </div>
            <span className={styles.filmFrameTime}>{i <= visibleFrame ? f.label : "..."}</span>
            <span className={styles.filmFrameDesc}>{i <= visibleFrame ? f.desc : "Loading..."}</span>
          </div>
        ))}
      </div>
      <div className={styles.profileSummary}>
        <span className={styles.profileSummaryLabel}>
          {device === "wifi" ? "Looks fast — but your users aren't on Wi-Fi" : "1,280 KB payload · 400ms blocking JS · 0.34 CLS"}
        </span>
        <span className={styles.profileSummaryValue}>
          {device === "wifi"
            ? "Switch to 3G to see what the 75th percentile user experiences"
            : `LCP: ${timings.loaded}ms (failing) · INP: ~340ms (failing) · CLS: 0.34 (failing)`}
        </span>
      </div>
    </div>
  );
}

// ── Step 2: Core Web Vitals overview ───────────────────────────────

const CWV_METRICS = [
  {
    name: "LCP",
    full: "Largest Contentful Paint",
    measures: "Loading",
    threshold: "2.5s",
    baseline: "~2.9s",
    status: "poor" as const,
    cause: "385 KB render-blocking JS + 245 KB hero image",
  },
  {
    name: "INP",
    full: "Interaction to Next Paint",
    measures: "Responsiveness",
    threshold: "200ms",
    baseline: "~340ms",
    status: "poor" as const,
    cause: "400ms of long tasks + third-party script execution",
  },
  {
    name: "CLS",
    full: "Cumulative Layout Shift",
    measures: "Visual stability",
    threshold: "0.1",
    baseline: "~0.34",
    status: "poor" as const,
    cause: "Images without dimensions + font swap + ad injection",
  },
];

function VitalsOverview() {
  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Baseline Core Web Vitals</h3>
      <div className={styles.vitalsGrid}>
        {CWV_METRICS.map((m) => (
          <div key={m.name} className={styles.vitalCard} data-status={m.status}>
            <div className={styles.vitalCardHeader}>
              <span className={styles.vitalName}>{m.name}</span>
              <span className={styles.vitalMeasures}>{m.measures}</span>
            </div>
            <span className={styles.vitalFull}>{m.full}</span>
            <div className={styles.vitalValues}>
              <div className={styles.vitalValueRow}>
                <span className={styles.vitalValueLabel}>Baseline</span>
                <span className={styles.vitalValue} data-rating="poor">{m.baseline}</span>
              </div>
              <div className={styles.vitalValueRow}>
                <span className={styles.vitalValueLabel}>Threshold</span>
                <span className={styles.vitalValue} data-rating="good">{m.threshold}</span>
              </div>
            </div>
            <span className={styles.vitalCause}>{m.cause}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Optimization map ───────────────────────────────────────

const OPT_MAP = [
  { name: "Bundle Splitting", step: 5, lcp: 3, inp: 1, cls: 0 },
  { name: "Critical CSS", step: 6, lcp: 2, inp: 0, cls: 1 },
  { name: "Image Optimization", step: 7, lcp: 3, inp: 0, cls: 1 },
  { name: "Font Strategy", step: 8, lcp: 0, inp: 0, cls: 3 },
  { name: "Third-Party Defer", step: 9, lcp: 1, inp: 3, cls: 0 },
  { name: "Long Task Chunking", step: 10, lcp: 0, inp: 3, cls: 0 },
  { name: "Layout Stability", step: 11, lcp: 0, inp: 0, cls: 3 },
  { name: "Caching", step: 12, lcp: 2, inp: 1, cls: 0 },
  { name: "Prefetching", step: 13, lcp: 2, inp: 0, cls: 0 },
  { name: "Perf Budgets", step: 14, lcp: 1, inp: 1, cls: 1 },
  { name: "RUM Monitoring", step: 15, lcp: 1, inp: 1, cls: 1 },
];

const IMPACT_DOTS = ["", "○", "●○", "●●●"];

function OptMapView() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [revealedRows, setRevealedRows] = useState<Set<number>>(new Set());

  const handleReveal = (i: number) => {
    setHoveredRow(i);
    setRevealedRows((prev) => new Set(prev).add(i));
  };

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Optimization → Metric Map</h3>
      <p className={styles.widgetNote}>Hover each technique to reveal which metrics it targets.</p>
      <div className={styles.optMatrix}>
        <div className={styles.optMatrixHeader}>
          <span>Technique</span>
          <span>LCP</span>
          <span>INP</span>
          <span>CLS</span>
        </div>
        {OPT_MAP.map((opt, i) => {
          const show = revealedRows.has(i);
          return (
            <div
              key={opt.name}
              className={styles.optMatrixRow}
              data-hovered={hoveredRow === i ? "true" : undefined}
              data-revealed={show ? "true" : undefined}
              onMouseEnter={() => handleReveal(i)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => handleReveal(i)}
            >
              <span className={styles.optMatrixName}>
                <span className={styles.optMatrixStep}>{opt.step}</span>
                {opt.name}
              </span>
              <span className={styles.optMatrixCell} data-impact={show ? opt.lcp : 0}>{show ? IMPACT_DOTS[opt.lcp] : "?"}</span>
              <span className={styles.optMatrixCell} data-impact={show ? opt.inp : 0}>{show ? IMPACT_DOTS[opt.inp] : "?"}</span>
              <span className={styles.optMatrixCell} data-impact={show ? opt.cls : 0}>{show ? IMPACT_DOTS[opt.cls] : "?"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Performance dashboard (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function PerfDashboard() {
  const { activeStep, stateEntries } = usePerfContext();

  return (
    <div className={styles.evolutionLayout}>
      <ControlPanel
        activeStep={activeStep}
        metrics={<MetricsSummaryBar />}
        controls={<OptimizationToggles />}
      >
        <PersistentWaterfall />
      </ControlPanel>

      <AnimatePresence mode="wait">
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

      <StateInspector entries={stateEntries} title="Perf State" />
    </div>
  );
}

// ── Persistent waterfall ────────────────────────────────────────────

const NETWORK_OPTIONS: NetworkCondition[] = ["slow-3g", "3g", "4g", "wifi"];

function PersistentWaterfall() {
  const { resources, timelineEndMs, metrics, activeStep, visitType, setVisitType, enabledOptimizations, networkCondition, setNetworkCondition, bandwidthSlider, setBandwidthSlider, activeProfile } = usePerfContext();
  const showVisitToggle = activeStep >= 12 && enabledOptimizations.has("caching");

  return (
    <div className={styles.waterfallContainer}>
      <div className={styles.waterfallHeader}>
        <span className={styles.waterfallTitle}>Resource Waterfall</span>
        <span className={styles.waterfallStats} aria-live="polite">
          {metrics.requestCount} requests · {metrics.totalSizeKB} KB
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
          <div className={styles.visitToggle}>
            <button
              type="button"
              className={styles.visitToggleButton}
              data-active={visitType === "first" ? "true" : undefined}
              onClick={() => setVisitType("first")}
            >
              First visit
            </button>
            <button
              type="button"
              className={styles.visitToggleButton}
              data-active={visitType === "repeat" ? "true" : undefined}
              onClick={() => setVisitType("repeat")}
            >
              Repeat visit
            </button>
          </div>
        )}
      </div>

      <div className={styles.waterfallControls}>
        <div className={styles.networkSliderWrap}>
          <span className={styles.networkSliderLabel}>{activeProfile.label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={bandwidthSlider}
            onChange={(e) => setBandwidthSlider(Number(e.target.value))}
            className={styles.networkSlider}
            aria-label="Network bandwidth"
          />
          <span className={styles.networkSliderSpeed}>
            ×{activeProfile.multiplier} · {activeProfile.rtt}ms RTT
          </span>
        </div>
      </div>

      <WaterfallChart resources={resources} timelineEndMs={timelineEndMs} />
    </div>
  );
}

// ── Metrics summary bar ─────────────────────────────────────────────

function MetricsSummaryBar() {
  const { metrics } = usePerfContext();
  const prevMetricsRef = useRef(metrics);
  const prevMetrics = prevMetricsRef.current;

  const items: { label: string; value: string; key: string; delta: number }[] = [
    { label: "LCP", value: metrics.lcp >= 1000 ? `${(metrics.lcp / 1000).toFixed(1)}s` : `${metrics.lcp}ms`, key: "lcp", delta: metrics.lcp - prevMetrics.lcp },
    { label: "INP", value: `${metrics.inp}ms`, key: "inp", delta: metrics.inp - prevMetrics.inp },
    { label: "CLS", value: metrics.cls.toFixed(2), key: "cls", delta: Math.round((metrics.cls - prevMetrics.cls) * 100) / 100 },
    { label: "Size", value: `${metrics.totalSizeKB} KB`, key: "totalSizeKB", delta: metrics.totalSizeKB - prevMetrics.totalSizeKB },
  ];

  // Update ref after computing deltas
  if (prevMetrics !== metrics) {
    prevMetricsRef.current = metrics;
  }

  return (
    <div className={styles.metricsSummaryBar} aria-live="polite" aria-label="Performance metrics">
      {items.map(({ label, value, key, delta }) => {
        const rating = getCWVRating(key, metrics[key as keyof typeof metrics] as number);
        return (
          <div key={key} className={styles.metricsSummaryItem}>
            <span className={styles.metricsSummaryLabel}>{label}</span>
            <span className={styles.metricsSummaryValue} data-rating={rating}>{value}</span>
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

// ── Optimization toggles ────────────────────────────────────────────

function OptimizationToggles() {
  const { activeStep, enabledOptimizations, toggleOptimization } = usePerfContext();

  const available = OPTIMIZATIONS.filter((o) => o.step <= activeStep);

  return (
    <div className={styles.optimizationToggles}>
      {available.map((opt) => {
        const on = enabledOptimizations.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={styles.optimizationRow}
            onClick={() => toggleOptimization(opt.id)}
            aria-pressed={on}
            aria-label={`${opt.label}: ${opt.description}`}
          >
            <div className={styles.optimizationInfo}>
              <span className={styles.optimizationLabel}>{opt.label}</span>
              <span className={styles.optimizationDesc}>{opt.description}</span>
            </div>
            <span
              className={styles.toggleButton}
              data-on={on ? "true" : undefined}
              aria-hidden="true"
            >
              <span className={styles.toggleKnob} />
            </span>
          </button>
        );
      })}
      {available.length === 0 && (
        <div className={styles.optimizationEmpty}>
          Optimizations unlock at step 5
        </div>
      )}
    </div>
  );
}

// ── Step widgets ────────────────────────────────────────────────────

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

// ── Step 4: Baseline audit ──────────────────────────────────────────

const BOTTLENECK_CHOICES = [
  { id: "css-bundle", label: "styles.css (48 KB)" },
  { id: "main-js", label: "main.js (385 KB)" },
  { id: "hero-img", label: "hero.jpg (245 KB)" },
  { id: "chatbot", label: "chatbot.js (125 KB)" },
];

function BaselineWidget() {
  const { metrics } = usePerfContext();
  const [bottleneckPick, setBottleneckPick] = useState<string | null>(null);
  const correct = bottleneckPick === "main-js";

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Baseline Audit</div>
      <MetricsPanel metrics={metrics} showAll />

      {bottleneckPick === null && (
        <div style={{ marginTop: "var(--space-2)" }}>
          <p className={styles.widgetNote}>Which resource is the biggest bottleneck? Click to identify it.</p>
          <div className={styles.prefetchLinkGrid}>
            {BOTTLENECK_CHOICES.map((c) => (
              <button key={c.id} type="button" className={styles.prefetchLinkBtn} onClick={() => setBottleneckPick(c.id)}>
                <span className={styles.prefetchLinkPath}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {bottleneckPick !== null && (
        <div className={styles.predictionResult} data-correct={correct ? "true" : undefined} style={{ marginTop: "var(--space-2)" }}>
          <span className={styles.predictionResultIcon}>{correct ? "✓" : "✗"}</span>
          <span>
            {correct
              ? "Correct — main.js (385 KB) is render-blocking AND the largest resource on the critical path. Everything downstream waits for it."
              : bottleneckPick === "hero-img"
              ? "hero.jpg is heavy but loads AFTER JS finishes. The bottleneck is main.js — it blocks the entire render."
              : bottleneckPick === "css-bundle"
              ? "CSS blocks rendering, but at 48 KB it's 8× smaller than main.js (385 KB). The JS bundle is the true bottleneck."
              : "chatbot.js is large but not render-blocking — it loads after the page renders. main.js blocks EVERYTHING."}
          </span>
        </div>
      )}

      <div className={styles.baselineVerdict}>
        <span className={styles.verdictIcon}>!</span>
        <div>
          <span className={styles.verdictLabel}>
            {getCWVRating("lcp", metrics.lcp) === "poor" ? "Failing Core Web Vitals" : "Needs improvement"}
          </span>
          <span className={styles.verdictDesc}>
            LCP {metrics.lcp >= 1000 ? `${(metrics.lcp / 1000).toFixed(1)}s` : `${metrics.lcp}ms`} — blocked by {metrics.totalSizeKB > 800 ? "large JS bundle" : "render-blocking resources"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Code splitting ──────────────────────────────────────────

function CodeSplittingWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("codeSplitting");
  const [splitPrediction, setSplitPrediction] = useState<number | null>(null);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Bundle Analysis</div>

      {!on && splitPrediction === null && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <p className={styles.widgetNote}>Before toggling: how much will blocking JS drop?</p>
          <div className={styles.prefetchLinkGrid}>
            {[
              { label: "385→280 KB", desc: "~27% reduction", idx: 0 },
              { label: "385→115 KB", desc: "~70% reduction", idx: 1 },
              { label: "385→40 KB", desc: "~90% reduction", idx: 2 },
            ].map((opt) => (
              <button key={opt.idx} type="button" className={styles.prefetchLinkBtn} onClick={() => setSplitPrediction(opt.idx)}>
                <span className={styles.prefetchLinkPath}>{opt.label}</span>
                <span className={styles.prefetchLinkClicks}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {splitPrediction !== null && !on && (
        <div className={styles.predictionResult} data-correct={splitPrediction === 1 ? "true" : undefined} style={{ marginBottom: "var(--space-2)" }}>
          <span className={styles.predictionResultIcon}>{splitPrediction === 1 ? "✓" : "✗"}</span>
          <span>
            {splitPrediction === 1
              ? "Correct — route-based splitting extracts a 115 KB core and 75 KB lazy chunk. Only the 115 KB core blocks rendering. Toggle it on to see the waterfall shift."
              : splitPrediction === 0
              ? "Higher reduction than that. Code splitting doesn't just trim — it extracts only what's needed for the first render. The route chunk loads lazily after."
              : "Not quite that aggressive — you still need framework code, shared utilities, and the initial route. 115 KB core + 75 KB lazy chunk is the realistic split."}
          </span>
        </div>
      )}

      <div className={styles.bundleCompare}>
        <AnimatePresence mode="wait">
          {!on ? (
            <motion.div
              key="before"
              className={styles.bundleCol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION.crossfade}
            >
              <div className={styles.bundleColLabel}>Monolithic bundle</div>
              <div className={styles.bundleBlock} data-state="active">
                <motion.div
                  className={styles.bundleBar}
                  style={{ background: "var(--diagram-layer-4)" }}
                  animate={{ width: "100%" }}
                  transition={SPRING.snappy}
                />
                <span>main.js — 385 KB (render-blocking)</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="after"
              className={styles.bundleCol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION.crossfade}
            >
              <div className={styles.bundleColLabel}>Route-split chunks</div>
              <motion.div
                className={styles.bundleBlock}
                data-state="active"
                layout
                transition={SPRING.snappy}
              >
                <motion.div
                  className={styles.bundleBar}
                  style={{ background: "var(--diagram-layer-4)" }}
                  animate={{ width: "30%" }}
                  transition={SPRING.snappy}
                />
                <span>core.js — 115 KB (blocking)</span>
              </motion.div>
              <motion.div
                className={styles.bundleBlock}
                data-state="active"
                layout
                transition={SPRING.snappy}
                style={{ opacity: 0.65, borderStyle: "dashed" }}
              >
                <motion.div
                  className={styles.bundleBar}
                  style={{ background: "var(--diagram-layer-2)" }}
                  animate={{ width: "19%" }}
                  transition={SPRING.snappy}
                />
                <span>routes.js — 75 KB (lazy, deferred)</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "Initial blocking JS drops from 385 KB to 115 KB — render-blocking time shrinks proportionally and everything downstream starts earlier."
          : "The monolithic 385 KB main.js blocks every dependent resource. Enable Code Splitting above to see the waterfall change."}
      </p>
    </div>
  );
}

// ── Step 6: Critical CSS ────────────────────────────────────────────

function CriticalCSSWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("criticalCSS");
  const rtt = nw.rtt;
  const multiplier = nw.multiplier;
  const [inlineKB, setInlineKB] = useState(4);

  const totalCSS = 48;
  const htmlParse = 15;
  const cssDownload = Math.round(totalCSS * multiplier + rtt);
  const cssParse = 8;
  const criticalInline = Math.round(inlineKB * 0.8);
  const asyncKB = totalCSS - inlineKB;
  const asyncCssDownload = Math.round(asyncKB * multiplier + rtt);
  const fcpBefore = htmlParse + cssDownload + cssParse;
  const fcpAfter = htmlParse + criticalInline;
  const fouc = inlineKB < 3;

  const beforeSteps = [
    { label: "HTML parse", ms: htmlParse, type: "html" },
    { label: `styles.css (${totalCSS} KB)`, ms: cssDownload, type: "blocking" },
    { label: "CSS parse", ms: cssParse, type: "blocking" },
    { label: "FCP", ms: 0, type: "marker" },
  ];

  const afterSteps = [
    { label: `HTML + ${inlineKB} KB inline`, ms: htmlParse + criticalInline, type: "html" },
    { label: "FCP", ms: 0, type: "marker" },
    { label: `async CSS (${asyncKB} KB)`, ms: asyncCssDownload, type: "async" },
  ];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Rendering Pipeline</div>

      <div className={styles.criticalSliderWrap}>
        <label className={styles.criticalSliderLabel}>
          Inline CSS: <strong>{inlineKB} KB</strong> / {totalCSS} KB
          {fouc && <span className={styles.criticalFouc}> FOUC risk</span>}
          {inlineKB > 14 && <span className={styles.criticalBloat}> HTML bloat</span>}
        </label>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={inlineKB}
          onChange={(e) => setInlineKB(Number(e.target.value))}
          className={styles.criticalSlider}
        />
        <div className={styles.criticalSliderTicks}>
          <span>0 KB</span>
          <span className={styles.criticalSliderSweet}>~4 KB sweet spot</span>
          <span>20 KB</span>
        </div>
      </div>

      <div className={styles.pipelineTimelines}>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>Before</span>
          <div className={styles.pipelineTrack}>
            {beforeSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-state={on ? "inactive" : "active"}>
                <span>FCP @ {fcpBefore}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type}
                data-state={on ? "inactive" : "active"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>After</span>
          <div className={styles.pipelineTrack}>
            {afterSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-type="early" data-state="active">
                <span>FCP @ {fcpAfter}ms{fouc ? " ⚠" : ""}</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type}
                data-state="active"
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.pipelineSaving} data-state="active">
        FCP: {fcpBefore}ms → {fcpAfter}ms (saved {fcpBefore - fcpAfter}ms)
      </div>
      <p className={styles.widgetNote}>
        {fouc
          ? `Only ${inlineKB} KB inline — above-fold content will render unstyled (FOUC). Increase to ~4 KB to cover the critical rendering path.`
          : inlineKB > 14
          ? `${inlineKB} KB of inline CSS bloats the HTML document. The savings diminish past ~4 KB because extra inline CSS rarely covers more critical-path rules.`
          : on
          ? `${inlineKB} KB critical CSS inlined — browser paints at ${fcpAfter}ms. Async CSS (${asyncKB} KB) loads without blocking.`
          : `The full ${totalCSS} KB stylesheet blocks rendering for ~${cssDownload}ms on ${nw.label}. Drag the slider to find the optimal inline threshold.`}
      </p>
    </div>
  );
}

// ── Step 7: Image optimization ──────────────────────────────────────

const IMAGE_ITEMS = [
  { name: "hero", before: 245, after: 65, correctLazy: false, hint: "Above-fold hero banner, LCP candidate" },
  { name: "card-1", before: 95, after: 33, correctLazy: true, hint: "Product card below the fold" },
  { name: "card-2", before: 110, after: 39, correctLazy: true, hint: "Product card below the fold" },
  { name: "banner", before: 88, after: 31, correctLazy: true, hint: "Promo banner near page bottom" },
];

const HERO_ATTR_BLANKS = [
  { attr: "fetchpriority", correct: "high", options: ["auto", "high", "low"] },
  { attr: "loading", correct: "eager", options: ["eager", "lazy", "auto"] },
  { attr: "width", correct: "1200", options: ["1200", "auto", "100%"] },
  { attr: "height", correct: "675", options: ["675", "auto", "100%"] },
];

function ImageOptWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("imageOptimization");
  const [lazyAssignments, setLazyAssignments] = useState<Record<string, boolean>>({});
  const [classified, setClassified] = useState(false);
  const [attrFills, setAttrFills] = useState<Record<string, string>>({});
  const [attrSubmitted, setAttrSubmitted] = useState(false);
  const attrAllFilled = HERO_ATTR_BLANKS.every((b) => attrFills[b.attr]);
  const attrCorrectCount = HERO_ATTR_BLANKS.filter((b) => attrFills[b.attr] === b.correct).length;
  const attrAllCorrect = attrCorrectCount === HERO_ATTR_BLANKS.length;

  const allAssigned = IMAGE_ITEMS.every((img) => lazyAssignments[img.name] !== undefined);
  const correctCount = IMAGE_ITEMS.filter((img) => lazyAssignments[img.name] === img.correctLazy).length;
  const allCorrect = correctCount === IMAGE_ITEMS.length;

  const totalBefore = IMAGE_ITEMS.reduce((s, i) => s + i.before, 0);
  const totalAfter = IMAGE_ITEMS.reduce((s, i) => s + (i.correctLazy ? 0 : i.after), 0);

  const showClassification = !on && !classified;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Image Pipeline</div>

      {showClassification ? (
        <>
          <p className={styles.widgetNote}>
            Classify each image as eager (loads immediately) or lazy (deferred until near viewport). Hint: the LCP element must NEVER be lazy-loaded.
          </p>
          <div className={styles.imageClassifyGrid}>
            {IMAGE_ITEMS.map((img) => (
              <div key={img.name} className={styles.imageClassifyRow}>
                <div className={styles.imageClassifyInfo}>
                  <span className={styles.imageName}>{img.name} ({img.before} KB)</span>
                  <span className={styles.imageClassifyHint}>{img.hint}</span>
                </div>
                <div className={styles.imageClassifyButtons}>
                  <button
                    type="button"
                    className={styles.imageClassifyBtn}
                    data-selected={lazyAssignments[img.name] === false ? "true" : undefined}
                    onClick={() => setLazyAssignments((prev) => ({ ...prev, [img.name]: false }))}
                  >
                    eager
                  </button>
                  <button
                    type="button"
                    className={styles.imageClassifyBtn}
                    data-selected={lazyAssignments[img.name] === true ? "true" : undefined}
                    onClick={() => setLazyAssignments((prev) => ({ ...prev, [img.name]: true }))}
                  >
                    lazy
                  </button>
                </div>
              </div>
            ))}
          </div>
          {allAssigned && (
            <button
              type="button"
              className={styles.cacheSubmitButton}
              onClick={() => setClassified(true)}
            >
              Check classification
            </button>
          )}
        </>
      ) : (
        <>
          {classified && !on && (
            <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
              <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
              <span>
                {allCorrect
                  ? "Perfect — hero stays eager (it's the LCP element), everything below the fold is lazy. Now fill in the hero <img> attributes below."
                  : `${correctCount}/${IMAGE_ITEMS.length} correct. The hero must be eager (LCP), below-fold images should be lazy. Now fill in the hero <img> attributes below.`}
              </span>
            </div>
          )}

          {classified && !on && (
            <div className={styles.widgetPanel} style={{ padding: "var(--space-2)", gap: "var(--space-1)" }}>
              <div className={styles.widgetTitle}>Fill the hero &lt;img&gt; attributes</div>
              <pre className={styles.codeFillPre}>
                {'<img\n  src="hero.webp"\n  alt="Hero banner"'}
                {HERO_ATTR_BLANKS.map((b) => {
                  const val = attrFills[b.attr];
                  const isCorrect = attrSubmitted && val === b.correct;
                  const isWrong = attrSubmitted && val && val !== b.correct;
                  return (
                    <span key={b.attr}>
                      {`\n  ${b.attr}="`}
                      <select
                        className={styles.codeFillSelect}
                        data-status={isCorrect ? "correct" : isWrong ? "wrong" : undefined}
                        value={val || ""}
                        onChange={(e) => setAttrFills((p) => ({ ...p, [b.attr]: e.target.value }))}
                        disabled={attrSubmitted}
                      >
                        <option value="">___</option>
                        {b.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {'"'}
                    </span>
                  );
                })}
                {'\n/>'}
              </pre>
              {!attrSubmitted && attrAllFilled && (
                <button type="button" className={styles.cacheSubmitButton} onClick={() => setAttrSubmitted(true)}>
                  Check attributes
                </button>
              )}
              {attrSubmitted && (
                <div className={styles.predictionResult} data-correct={attrAllCorrect ? "true" : undefined}>
                  <span className={styles.predictionResultIcon}>{attrAllCorrect ? "✓" : "✗"}</span>
                  <span>
                    {attrAllCorrect
                      ? "Every attribute is correct. fetchpriority=\"high\" tells the browser this image is the LCP element. Explicit width/height prevent layout shift."
                      : `${attrCorrectCount}/4 correct. The hero needs fetchpriority="high" (LCP hint), loading="eager" (never lazy-load LCP), and explicit width="1200" height="675" (CLS prevention).`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={styles.imageGrid}>
            {IMAGE_ITEMS.map((img) => (
              <div key={img.name} className={styles.imageRow}>
                <span className={styles.imageName}>{img.name}</span>
                <div className={styles.imageBarWrap}>
                  <div
                    className={styles.imageBar}
                    data-state={on ? "optimized" : "original"}
                    style={{
                      width: `${((on ? img.after : img.before) / 245) * 100}%`,
                    }}
                  />
                </div>
                <span className={styles.imageSize}>
                  {on ? `${img.after} KB` : `${img.before} KB`}
                  {on && img.correctLazy && <span className={styles.lazyBadge}>lazy</span>}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.imageSavings}>
            Initial image payload: <strong data-status={on ? "good" : "bad"}>
              {on ? `${totalAfter} KB` : `${totalBefore} KB`}
            </strong>
            {on && ` (saved ${totalBefore - totalAfter} KB — below-fold deferred)`}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 8: Font loading ────────────────────────────────────────────

const FONT_DESCRIPTORS = [
  { property: "size-adjust", correct: "107%", hint: "Scales the fallback to match web font's overall glyph size" },
  { property: "ascent-override", correct: "90%", hint: "Matches the height above the baseline" },
  { property: "descent-override", correct: "22%", hint: "Matches the depth below the baseline" },
];
const FONT_VALUES = ["107%", "90%", "22%"];

function FontMetricExercise() {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const allPicked = FONT_DESCRIPTORS.every((d) => picks[d.property]);
  const allCorrect = FONT_DESCRIPTORS.every((d) => picks[d.property] === d.correct);

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <p className={styles.widgetNote}>Match each @font-face descriptor to its value:</p>
      <div className={styles.codeFillPre}>
        <code>{"@font-face {\n"}</code>
        {FONT_DESCRIPTORS.map((d) => (
          <div key={d.property} style={{ paddingLeft: "1.5em" }}>
            <code>{d.property}: </code>
            {checked ? (
              <span
                className={styles.codeFillSelect}
                data-status={picks[d.property] === d.correct ? "correct" : "wrong"}
              >
                {picks[d.property] || "—"}{picks[d.property] !== d.correct ? ` → ${d.correct}` : ""}
              </span>
            ) : (
              <select
                className={styles.codeFillSelect}
                value={picks[d.property] || ""}
                onChange={(e) => setPicks((p) => ({ ...p, [d.property]: e.target.value }))}
              >
                <option value="">—</option>
                {FONT_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <code>;</code>
          </div>
        ))}
        <code>{"}"}</code>
      </div>
      {!checked && allPicked && (
        <button type="button" className={styles.cacheSubmitButton} onClick={() => setChecked(true)}>
          Check values
        </button>
      )}
      {checked && (
        <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
          <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
          <span>
            {allCorrect
              ? "All correct — these overrides make the fallback font occupy identical space as the web font, eliminating CLS during the swap."
              : "See corrections above. size-adjust scales the overall glyph box, ascent-override sets the height above baseline, descent-override sets depth below."}
          </span>
        </div>
      )}
    </div>
  );
}

function FontWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("fontLoading");
  const rtt = nw.rtt;
  const multiplier = nw.multiplier;

  const cssDownload = Math.round(48 * multiplier + rtt);
  const cssParse = 8;
  const fontDiscover = cssDownload + cssParse;
  const fontDownloadBefore = Math.round(82 * multiplier + rtt);
  const fontDownloadAfter = Math.round(28 * multiplier + rtt);
  const foitEnd = fontDiscover + fontDownloadBefore;

  const beforeSteps = [
    { label: "CSS download", ms: cssDownload, type: "wait" },
    { label: "CSS parse", ms: cssParse, type: "wait" },
    { label: "FOIT (invisible text)", ms: fontDownloadBefore, type: "foit" },
    { label: "Font swap (+0.11 CLS)", ms: 0, type: "marker" },
  ];

  const afterSteps = [
    { label: "Preload + CSS (parallel)", ms: Math.max(cssDownload, fontDownloadAfter), type: "parallel" },
    { label: "Text visible (no shift)", ms: 0, type: "good-marker" },
  ];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Font Loading Timeline</div>
      <div className={styles.pipelineTimelines}>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>Before</span>
          <div className={styles.pipelineTrack}>
            {beforeSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-state={on ? "inactive" : "active"}>
                <span>Swap @ {foitEnd}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type === "foit" ? "blocking" : "html"}
                data-state={on ? "inactive" : "active"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>After</span>
          <div className={styles.pipelineTrack}>
            {afterSteps.map((s, i) => s.type === "good-marker" ? (
              <div key={i} className={styles.pipelineMarker} data-type="early" data-state={on ? "active" : "inactive"}>
                <span>Ready @ {Math.max(cssDownload, fontDownloadAfter)}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type="async"
                data-state={on ? "active" : "inactive"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.fontMetrics}>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>Font size</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "28 KB (subset)" : "82 KB (full)"}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>Discovery</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "Preloaded in <head>" : `After CSS parse (${fontDiscover}ms)`}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>CLS impact</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "~0 (metric overrides)" : "+0.11 (font swap)"}
          </span>
        </div>
      </div>
      <FontMetricExercise />
    </div>
  );
}

// ── Step 9: Third-party lifecycle timeline ─────────────────────────

const LIFECYCLE_PHASES = ["parse", "DOMContentLoaded", "load", "idle"] as const;

const THIRD_PARTY_SCRIPTS = [
  {
    name: "analytics.js",
    size: 38,
    eagerPhases: [{ phase: "parse" as const, flex: 2 }, { phase: "execute" as const, flex: 3 }],
    deferPhases: [{ phase: "idle" as const, flex: 2 }],
    strategy: "requestIdleCallback",
  },
  {
    name: "ads.js",
    size: 52,
    eagerPhases: [{ phase: "parse" as const, flex: 3 }, { phase: "execute" as const, flex: 4 }],
    deferPhases: [{ phase: "idle" as const, flex: 3 }],
    strategy: "After load event",
  },
  {
    name: "chatbot.js",
    size: 125,
    eagerPhases: [{ phase: "parse" as const, flex: 5 }, { phase: "execute" as const, flex: 8 }],
    deferPhases: [{ phase: "idle" as const, flex: 4 }],
    strategy: "On user interaction",
  },
];

const DEFER_STRATEGIES = ["requestIdleCallback", "After load", "On interaction"] as const;
type DeferStrategy = typeof DEFER_STRATEGIES[number];

const SCRIPT_CORRECT_STRATEGY: Record<string, DeferStrategy> = {
  "analytics.js": "requestIdleCallback",
  "ads.js": "After load",
  "chatbot.js": "On interaction",
};

function ThirdPartyWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("thirdPartyDefer");

  const [strategyAssignments, setStrategyAssignments] = useState<Record<string, DeferStrategy>>({});
  const [strategySubmitted, setStrategySubmitted] = useState(false);

  const allAssigned = THIRD_PARTY_SCRIPTS.every((s) => strategyAssignments[s.name]);
  const correctCount = THIRD_PARTY_SCRIPTS.filter(
    (s) => strategyAssignments[s.name] === SCRIPT_CORRECT_STRATEGY[s.name],
  ).length;
  const allCorrect = correctCount === THIRD_PARTY_SCRIPTS.length;

  const handleAssign = (script: string, strategy: DeferStrategy) => {
    if (strategySubmitted) return;
    setStrategyAssignments((prev) => ({ ...prev, [script]: strategy }));
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Script Execution Timeline</div>

      {!strategySubmitted && !on ? (
        <>
          <p className={styles.widgetNote}>
            Match each script to its ideal deferral strategy. Consider: how critical is the data? How many users need it? When does it need to run?
          </p>
          <div className={styles.cacheMatchGrid}>
            <div className={styles.cacheMatchHeader}>
              <span>Script</span>
              {DEFER_STRATEGIES.map((s) => (
                <span key={s} className={styles.cacheMatchStrategyLabel}>{s}</span>
              ))}
            </div>
            {THIRD_PARTY_SCRIPTS.map((s) => (
              <div key={s.name} className={styles.cacheMatchRow}>
                <span className={styles.cacheResource}>
                  {s.name} <span style={{ opacity: 0.5 }}>({s.size} KB)</span>
                </span>
                {DEFER_STRATEGIES.map((strat) => (
                  <button
                    key={strat}
                    type="button"
                    className={styles.cacheMatchCell}
                    data-selected={strategyAssignments[s.name] === strat ? "true" : undefined}
                    onClick={() => handleAssign(s.name, strat)}
                    aria-pressed={strategyAssignments[s.name] === strat}
                  />
                ))}
              </div>
            ))}
          </div>
          {allAssigned && (
            <button type="button" className={styles.cacheSubmitButton} onClick={() => setStrategySubmitted(true)}>
              Check strategies
            </button>
          )}
        </>
      ) : (
        <>
          {strategySubmitted && !on && (
            <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
              <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
              <span>
                {allCorrect
                  ? "Perfect — analytics fires at idle (no rush), ads after load (skeleton holds the slot), chatbot on click (95% of users never open it)."
                  : `${correctCount}/3 correct. Analytics → idle (timestamp delay is invisible), ads → after load (skeleton placeholder), chatbot → on interaction (125 KB for 5% of users). Toggle Third-Party Defer to see the timeline shift.`}
              </span>
            </div>
          )}

          <p className={styles.widgetNote}>
            {on
              ? "Scripts deferred past the critical window — main thread stays free for user interactions."
              : "Third-party scripts compete with your app during the critical rendering window."}
          </p>

          <div className={styles.lifecycleTimeline}>
            <div className={styles.lifecycleRow}>
              <span className={styles.lifecycleLabel}>app.js</span>
              <div className={styles.lifecycleTrack}>
                <div className={styles.lifecycleBlock} data-phase="parse" style={{ flex: 4 }}><span>parse</span></div>
                <div className={styles.lifecycleBlock} data-phase="execute" style={{ flex: 6 }}><span>hydrate</span></div>
              </div>
            </div>

            {THIRD_PARTY_SCRIPTS.map((s) => (
              <div key={s.name} className={styles.lifecycleRow}>
                <span className={styles.lifecycleLabel}>
                  {s.name} <span className={styles.lifecycleSize}>({s.size} KB)</span>
                </span>
                <div className={styles.lifecycleTrack}>
                  {!on && s.eagerPhases.map((p, i) => (
                    <div key={i} className={styles.lifecycleBlock} data-phase={p.phase} data-state="active" style={{ flex: p.flex }}>
                      <span>{p.phase}</span>
                    </div>
                  ))}
                  {on && (
                    <>
                      <div style={{ flex: 10 }} />
                      {s.deferPhases.map((p, i) => (
                        <div key={i} className={styles.lifecycleBlock} data-phase={p.phase} data-state="active" style={{ flex: p.flex }}>
                          <span>{s.strategy}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className={styles.lifecycleAxisRow}>
              <span />
              <div className={styles.lifecycleAxis}>
                <span>parse</span>
                <span>DOMContentLoaded</span>
                <span>load</span>
                <span>idle</span>
              </div>
            </div>
          </div>

          <div className={styles.thirdPartySavings}>
            {on
              ? "215 KB deferred past load — TBT drops ~90ms, main thread freed for first interactions"
              : "215 KB of third-party JS executes during parse/hydrate, blocking your app from becoming interactive"}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 10: Long task breaking ─────────────────────────────────────

const YIELD_PRESETS = [10, 25, 50, 100, 200];
const TOTAL_WORK_MS = 400;

function LongTaskWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("longTaskBreaking");
  const [yieldMs, setYieldMs] = useState(50);
  const [clickState, setClickState] = useState<"idle" | "queued" | "processed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chunkCount = Math.ceil(TOTAL_WORK_MS / yieldMs);
  const chunks = Array.from({ length: chunkCount }, (_, i) => {
    const remaining = TOTAL_WORK_MS - i * yieldMs;
    return Math.min(yieldMs, remaining);
  });
  const longestChunk = Math.max(...chunks);
  const isLongTask = longestChunk > 50;
  const overheadPct = Math.round(((chunkCount - 1) * 0.5 / TOTAL_WORK_MS) * 100);

  const [lastDelay, setLastDelay] = useState(0);

  const handleSimClick = () => {
    if (clickState !== "idle") return;
    const taskDuration = on ? longestChunk : 280;
    const arrivalPct = Math.random();
    const arrivalMs = Math.round(arrivalPct * taskDuration);
    const waitMs = taskDuration - arrivalMs;
    setLastDelay(waitMs);
    setClickState("queued");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setClickState("processed");
      timerRef.current = setTimeout(() => setClickState("idle"), 1200);
    }, waitMs);
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Main Thread Timeline</div>
      <div className={styles.taskTimeline}>
        <div className={styles.taskTimelineRow}>
          <span className={styles.taskTimelineLabel}>Before</span>
          <div className={styles.taskTimelineTrack}>
            <div
              className={styles.taskBlock}
              data-long="true"
              data-state={on ? "inactive" : "active"}
              style={{ width: "60%" }}
            >
              <span>hydrate() — 280ms</span>
            </div>
            <div
              className={styles.taskBlock}
              data-long="true"
              data-state={on ? "inactive" : "active"}
              style={{ width: "25%" }}
            >
              <span>parse — 120ms</span>
            </div>
          </div>
        </div>
        <div className={styles.taskTimelineRow}>
          <span className={styles.taskTimelineLabel}>After</span>
          <div className={styles.taskTimelineTrack}>
            {chunks.map((ms, i) => (
              <div
                key={i}
                className={styles.taskBlock}
                data-long={ms > 50 ? "true" : undefined}
                data-state={on ? "active" : "inactive"}
                style={{ width: `${(ms / TOTAL_WORK_MS) * 100}%` }}
              >
                <span>{ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {on && (
        <div className={styles.yieldSliderWrap}>
          <label className={styles.criticalSliderLabel}>
            Yield every: <strong>{yieldMs}ms</strong>
            {isLongTask && <span className={styles.criticalFouc}> still a long task!</span>}
          </label>
          <div className={styles.yieldPresets}>
            {YIELD_PRESETS.map((ms) => (
              <button
                key={ms}
                type="button"
                className={styles.yieldPresetBtn}
                data-active={ms === yieldMs ? "true" : undefined}
                onClick={() => setYieldMs(ms)}
              >
                {ms}ms
              </button>
            ))}
          </div>
          <span className={styles.yieldInfo}>
            {chunkCount} chunks · worst-case delay {longestChunk}ms · +{overheadPct}% overhead
          </span>
        </div>
      )}

      <div className={styles.clickSimulation}>
        <button
          type="button"
          className={styles.clickSimButton}
          data-state={clickState}
          onClick={handleSimClick}
          disabled={clickState !== "idle"}
        >
          {clickState === "idle" && "Click during long task"}
          {clickState === "queued" && `Queued ~${lastDelay}ms...`}
          {clickState === "processed" && "Processed!"}
        </button>
        <span className={styles.clickSimLabel}>
          {clickState === "idle" && "Simulates a user click at a random point during the task (CPU-bound, not network-dependent)"}
          {clickState === "queued" && (on ? "Yielded — browser processes input between chunks" : "Main thread blocked — click sits in queue")}
          {clickState === "processed" && `Input delay: ${lastDelay}ms — ${lastDelay <= 200 ? "passes" : "fails"} INP threshold (try again — timing varies)`}
        </span>
      </div>

      <p className={styles.widgetNote}>
        {on
          ? isLongTask
            ? `Chunks of ${yieldMs}ms still exceed the 50ms Long Task threshold. Try a smaller yield interval.`
            : `${chunkCount} chunks of ≤${yieldMs}ms — no single task exceeds 50ms. Browser processes input between chunks, worst-case delay: ${longestChunk}ms.`
          : "Two long tasks (280ms + 120ms = 400ms blocking) hold the main thread. Any click during these tasks queues until the task completes — that's your INP."}
      </p>
    </div>
  );
}

// ── Step 11: Layout stability ───────────────────────────────────────

const SHIFT_SOURCES = [
  { source: "Hero image", shift: 0.12 },
  { source: "Font swap", shift: 0.11 },
  { source: "Ad injection", shift: 0.08 },
  { source: "Late widget", shift: 0.02 },
];

const SHUFFLED_SOURCES = [
  SHIFT_SOURCES[2],
  SHIFT_SOURCES[0],
  SHIFT_SOURCES[3],
  SHIFT_SOURCES[1],
];

function LayoutStabilityWidget() {
  const { enabledOptimizations, metrics } = usePerfContext();
  const on = enabledOptimizations.has("layoutStability");
  const [order, setOrder] = useState(() => SHUFFLED_SOURCES.map((s) => s.source));
  const [dragging, setDragging] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const correctOrder = SHIFT_SOURCES.map((s) => s.source);
  const rankCorrect = revealed && correctOrder.every((src, i) => order[i] === src);

  const handleDragStart = (source: string, e: React.PointerEvent) => {
    if (revealed) return;
    setDragging(source);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragging || !listRef.current) return;
    const rect = listRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowHeight = rect.height / order.length;
    const targetIndex = Math.max(0, Math.min(order.length - 1, Math.floor(y / rowHeight)));
    const currentIndex = order.indexOf(dragging);
    if (targetIndex !== currentIndex) {
      setOrder((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, dragging);
        return next;
      });
    }
  };

  const handleDragEnd = () => setDragging(null);

  const sourceMap = new Map(SHIFT_SOURCES.map((s) => [s.source, s]));

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Layout Shift Sources</div>

      {!revealed ? (
        <>
          <p className={styles.widgetNote}>
            Drag to reorder — highest CLS impact at the top, lowest at the bottom:
          </p>
          <div
            className={styles.shiftRankGrid}
            ref={listRef}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            {order.map((source, i) => (
              <motion.div
                key={source}
                layout
                transition={SPRING.snappy}
                className={styles.shiftRankRow}
                data-dragging={dragging === source ? "true" : undefined}
                onPointerDown={(e) => handleDragStart(source, e)}
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
              >
                <span className={styles.shiftRankPosition}>{i + 1}</span>
                <span className={styles.shiftRankName}>{source}</span>
                <span className={styles.shiftRankHandle}>⠿</span>
              </motion.div>
            ))}
          </div>
          <button type="button" className={styles.cacheSubmitButton} onClick={() => setRevealed(true)}>
            Check ranking
          </button>
        </>
      ) : (
        <>
          <div className={styles.predictionResult} data-correct={rankCorrect ? "true" : undefined}>
            <span className={styles.predictionResultIcon}>{rankCorrect ? "✓" : "✗"}</span>
            <span>
              {rankCorrect
                ? "Perfect ranking — hero image (0.12) > font swap (0.11) > ad injection (0.08) > late widget (0.02)."
                : "The correct order: Hero image (0.12) > Font swap (0.11) > Ad injection (0.08) > Late widget (0.02). The hero is the largest element and displaces the most viewport area."}
            </span>
          </div>
          <div className={styles.shiftGrid}>
            {metrics.clsSources.map((cs) => (
              <div key={cs.source} className={styles.shiftRow} data-fixed-earlier={cs.fixed ? "true" : undefined}>
                <span className={styles.shiftSource}>{cs.source}</span>
                <div className={styles.shiftBarWrap}>
                  <div
                    className={styles.shiftBar}
                    data-state={cs.fixed ? "fixed" : "shifting"}
                    style={{ width: cs.fixed ? "2%" : `${(cs.shift / 0.15) * 100}%` }}
                  />
                </div>
                <span className={styles.shiftValue} data-state={cs.fixed ? "fixed" : "shifting"}>
                  {cs.fixed ? "0" : cs.shift.toFixed(2)}
                </span>
                <span className={styles.shiftFormula}>
                  {cs.fixed
                    ? "fixed"
                    : `${cs.viewportFrac.toFixed(2)} × ${cs.distFrac.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.clsTotal}>
            Total CLS: <strong data-status={metrics.cls <= 0.1 ? "good" : "bad"}>
              {metrics.cls.toFixed(2)}
            </strong>
            <span className={styles.clsTarget}>(target: &le; 0.10)</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 11: Milestone checkpoint ──────────────────────────────────

function MilestoneCheckpoint() {
  const { metrics, activeProfile: nw } = usePerfContext();

  const baseline = useMemo(
    () => computePerformance(new Set(), nw),
    [nw],
  );

  const items = [
    { label: "LCP", before: baseline.metrics.lcp, after: metrics.lcp, unit: "ms", threshold: 2500 },
    { label: "INP", before: baseline.metrics.inp, after: metrics.inp, unit: "ms", threshold: 200 },
    { label: "CLS", before: baseline.metrics.cls, after: metrics.cls, unit: "", threshold: 0.1 },
  ];

  const allPassing = items.every((i) => i.after <= i.threshold);

  return (
    <div className={styles.milestoneSummary} data-passing={allPassing ? "true" : undefined}>
      <div className={styles.milestoneTitle}>
        {allPassing ? "All Core Web Vitals passing" : "Checkpoint: targeted optimizations done"}
      </div>
      <div className={styles.milestoneGrid}>
        {items.map((item) => {
          const pctDrop = item.before > 0 ? Math.round(((item.before - item.after) / item.before) * 100) : 0;
          const rating = getCWVRating(item.label.toLowerCase(), item.after);
          return (
            <div key={item.label} className={styles.milestoneMetric}>
              <span className={styles.milestoneMetricLabel}>{item.label}</span>
              <span className={styles.milestoneMetricBefore}>
                {item.unit === "ms" ? `${item.before}${item.unit}` : item.before.toFixed(2)}
              </span>
              <span className={styles.milestoneMetricAfter} data-rating={rating}>
                {item.unit === "ms" ? `${item.after}${item.unit}` : item.after.toFixed(2)}
              </span>
              {pctDrop > 0 && <span className={styles.milestonePercent}>-{pctDrop}%</span>}
            </div>
          );
        })}
      </div>
      <p className={styles.widgetNote}>
        {allPassing
          ? "The patient is recovering — but can it survive the real world? Steps 12-15 stress-test with caching, prefetching, budgets, and field data."
          : "Toggle more optimizations above to bring all three metrics into the green. Steps 12-15 add the infrastructure to keep them there."}
      </p>
    </div>
  );
}

// ── Step 12: Caching strategy ───────────────────────────────────────

const CACHE_STRATEGIES = ["no-cache", "immutable", "stale-while-revalidate"] as const;
type CacheStrategyChoice = typeof CACHE_STRATEGIES[number];

const CACHE_RESOURCES = [
  { resource: "HTML", correct: "no-cache" as CacheStrategyChoice, ttl: "0s", reason: "Must revalidate — content changes on deploy" },
  { resource: "JS/CSS", correct: "immutable" as CacheStrategyChoice, ttl: "1 year", reason: "Content-hashed filenames never change" },
  { resource: "Images", correct: "stale-while-revalidate" as CacheStrategyChoice, ttl: "30 days", reason: "Serve stale, refresh in background" },
  { resource: "Fonts", correct: "immutable" as CacheStrategyChoice, ttl: "1 year", reason: "Versioned in CSS, never changes" },
  { resource: "API data", correct: "stale-while-revalidate" as CacheStrategyChoice, ttl: "5 min", reason: "Fresh enough for reads, update async" },
];

function CachingWidget() {
  const { enabledOptimizations, visitType } = usePerfContext();
  const on = enabledOptimizations.has("caching");
  const [assignments, setAssignments] = useState<Record<string, CacheStrategyChoice>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAssigned = CACHE_RESOURCES.every((r) => assignments[r.resource]);
  const correctCount = CACHE_RESOURCES.filter((r) => assignments[r.resource] === r.correct).length;
  const allCorrect = correctCount === CACHE_RESOURCES.length;

  const handleAssign = (resource: string, strategy: CacheStrategyChoice) => {
    if (submitted) return;
    setAssignments((prev) => ({ ...prev, [resource]: strategy }));
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Cache Strategy Matrix</div>

      {!submitted ? (
        <>
          <div className={styles.cacheDecisionCards}>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>Q1</span>
              <span>Does the URL change between deploys?</span>
              <span className={styles.cacheDecisionAnswer}>Yes → <strong>no-cache</strong> (revalidate)</span>
            </div>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>Q2</span>
              <span>Is the URL content-hashed?</span>
              <span className={styles.cacheDecisionAnswer}>Yes → <strong>immutable</strong> (cache forever)</span>
            </div>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>else</span>
              <span>Neither?</span>
              <span className={styles.cacheDecisionAnswer}><strong>stale-while-revalidate</strong></span>
            </div>
          </div>
          <p className={styles.widgetNote} style={{ marginTop: "var(--space-1)" }}>
            Apply the decision tree above to assign each resource its cache strategy:
          </p>
          <div className={styles.cacheMatchGrid}>
            <div className={styles.cacheMatchHeader}>
              <span>Resource</span>
              {CACHE_STRATEGIES.map((s) => (
                <span key={s} className={styles.cacheMatchStrategyLabel}>{s}</span>
              ))}
            </div>
            {CACHE_RESOURCES.map((r) => (
              <div key={r.resource} className={styles.cacheMatchRow}>
                <span className={styles.cacheResource}>{r.resource}</span>
                {CACHE_STRATEGIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.cacheMatchCell}
                    data-selected={assignments[r.resource] === s ? "true" : undefined}
                    onClick={() => handleAssign(r.resource, s)}
                    aria-pressed={assignments[r.resource] === s}
                  />
                ))}
              </div>
            ))}
          </div>
          {allAssigned && (
            <button
              type="button"
              className={styles.cacheSubmitButton}
              onClick={() => setSubmitted(true)}
            >
              Check answers
            </button>
          )}
        </>
      ) : (
        <>
          <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
            <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
            <span>
              {allCorrect
                ? "Perfect — you matched every resource to its ideal cache strategy."
                : `${correctCount}/${CACHE_RESOURCES.length} correct. See corrections below.`}
            </span>
          </div>
          <div className={styles.cacheGrid}>
            <div className={styles.cacheHeaderRow}>
              <span>Resource</span>
              <span>Strategy</span>
              <span>TTL</span>
            </div>
            {CACHE_RESOURCES.map((r) => {
              const userPick = assignments[r.resource];
              const isCorrect = userPick === r.correct;
              return (
                <div key={r.resource} className={styles.cacheRow} data-state={on ? "active" : "inactive"}>
                  <span className={styles.cacheResource}>{r.resource}</span>
                  <span className={styles.cacheStrategy}>
                    {!isCorrect && <span className={styles.cacheWrong}>{userPick} → </span>}
                    {r.correct}
                  </span>
                  <span className={styles.cacheTTL}>{r.ttl}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.widgetNote}>
            {on && visitType === "repeat"
              ? "Repeat visit: most resources served from cache — near-instant load. Toggle 'First visit' above to compare."
              : on
              ? "Cache headers configured. Switch to 'Repeat visit' above to see the cached waterfall."
              : "Now toggle Caching Strategy above to apply these headers and watch the waterfall shrink."}
          </p>
        </>
      )}
    </div>
  );
}

// ── Step 13: Prefetching ────────────────────────────────────────────

const ROUTE_LINKS = [
  { path: "/products", clicks: 62, correct: true },
  { path: "/cart", clicks: 38, correct: true },
  { path: "/about", clicks: 4, correct: false },
  { path: "/blog/archive", clicks: 2, correct: false },
  { path: "/account/settings", clicks: 28, correct: true },
  { path: "/terms-of-service", clicks: 1, correct: false },
];

function PrefetchWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("prefetching");

  const multiplier = nw.multiplier;
  const rtt = nw.rtt;

  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [linkSubmitted, setLinkSubmitted] = useState(false);

  const toggleLink = (path: string) => {
    if (linkSubmitted) return;
    setSelectedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const correctPicks = ROUTE_LINKS.filter((l) => l.correct).map((l) => l.path);
  const userCorrect = linkSubmitted && correctPicks.every((p) => selectedLinks.has(p)) && selectedLinks.size === correctPicks.length;

  const coldSteps = [
    { label: "DNS", ms: Math.round(rtt * 0.8) },
    { label: "TCP", ms: Math.round(rtt * 0.6) },
    { label: "TLS", ms: Math.round(rtt * 1.2) },
    { label: "route.js (75 KB)", ms: Math.round(75 * multiplier + rtt) },
    { label: "data fetch", ms: Math.round(20 * multiplier + rtt * 2) },
    { label: "render", ms: 45 },
  ];
  const coldTotal = coldSteps.reduce((s, x) => s + x.ms, 0);

  const prefetchedSteps = [
    { label: "cache hit", ms: 5 },
    { label: "render", ms: 45 },
  ];
  const prefetchedTotal = prefetchedSteps.reduce((s, x) => s + x.ms, 0);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Navigation: /products</div>

      {!linkSubmitted ? (
        <>
          <p className={styles.widgetNote}>
            A product listing page has 6 outgoing links. Pick the 3 worth prefetching — balance click probability against bandwidth cost.
          </p>
          <div className={styles.prefetchLinkGrid}>
            {ROUTE_LINKS.map((l) => (
              <button
                key={l.path}
                type="button"
                className={styles.prefetchLinkBtn}
                data-selected={selectedLinks.has(l.path) ? "true" : undefined}
                onClick={() => toggleLink(l.path)}
              >
                <span className={styles.prefetchLinkPath}>{l.path}</span>
                <span className={styles.prefetchLinkClicks}>{l.clicks}% of clicks</span>
              </button>
            ))}
          </div>
          {selectedLinks.size === 3 && (
            <button type="button" className={styles.cacheSubmitButton} onClick={() => setLinkSubmitted(true)}>
              Check selection
            </button>
          )}
        </>
      ) : (
        <>
          <div className={styles.predictionResult} data-correct={userCorrect ? "true" : undefined}>
            <span className={styles.predictionResultIcon}>{userCorrect ? "✓" : "✗"}</span>
            <span>
              {userCorrect
                ? "Perfect — /products (62%), /cart (38%), and /account/settings (28%) cover 87% of navigations. Prefetching low-traffic pages wastes bandwidth."
                : `The top 3 by click probability: /products (62%), /cart (38%), /account/settings (28%). Low-traffic pages (<5%) aren't worth the bandwidth cost. Your selection covers ${ROUTE_LINKS.filter((l) => selectedLinks.has(l.path) && l.correct).length}/3 correct.`}
            </span>
          </div>

          <div className={styles.navComparison}>
        <div className={styles.navComparisonRow}>
          <span className={styles.navComparisonLabel}>Cold</span>
          <div className={styles.navComparisonTrack}>
            {coldSteps.map((s, i) => (
              <div
                key={i}
                className={styles.navComparisonBlock}
                data-state={on ? "inactive" : "active"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <span className={styles.navComparisonTime}>{coldTotal}ms</span>
        </div>
        <div className={styles.navComparisonRow}>
          <span className={styles.navComparisonLabel}>Prefetched</span>
          <div className={styles.navComparisonTrack}>
            {prefetchedSteps.map((s, i) => (
              <div
                key={i}
                className={styles.navComparisonBlock}
                data-type="prefetched"
                data-state={on ? "active" : "inactive"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
            <div className={styles.navComparisonSaved} data-state={on ? "active" : "inactive"}>
              saved {coldTotal - prefetchedTotal}ms
            </div>
          </div>
          <span className={styles.navComparisonTime} data-fast={on ? "true" : undefined}>{prefetchedTotal}ms</span>
        </div>
      </div>

          <div className={styles.prefetchPipeline}>
            {[
              { stage: "1", label: "Viewport links", desc: "IntersectionObserver detects visible <a> tags" },
              { stage: "2", label: "Route prediction", desc: "Hover/focus triggers prefetch of route chunk" },
              { stage: "3", label: "Speculation Rules", desc: "Browser speculatively prerenders top candidates (Chrome 121+)" },
            ].map((step) => (
              <div key={step.stage} className={styles.prefetchStep} data-state={on ? "active" : "inactive"}>
                <span className={styles.prefetchBadge}>{step.stage}</span>
                <div>
                  <span className={styles.prefetchStepTitle}>{step.label}</span>
                  <span className={styles.prefetchStepDesc}>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 14: Performance budgets ────────────────────────────────────

type BudgetStrictness = "relaxed" | "standard" | "aggressive";
const BUDGET_PRESETS: Record<BudgetStrictness, { lcp: number; inp: number; cls: number; js: number }> = {
  relaxed: { lcp: 4000, inp: 500, cls: 0.25, js: 400 },
  standard: { lcp: 2500, inp: 200, cls: 0.1, js: 250 },
  aggressive: { lcp: 1500, inp: 100, cls: 0.05, js: 150 },
};

function BudgetWidget() {
  const { metrics, enabledOptimizations, toggleOptimization } = usePerfContext();
  const [strictness, setStrictness] = useState<BudgetStrictness>("standard");
  const [regressionActive, setRegressionActive] = useState(false);
  const [regressionOpt, setRegressionOpt] = useState<OptimizationId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulateRegression = () => {
    if (regressionActive) return;
    const active = OPTIMIZATIONS.filter((o) => enabledOptimizations.has(o.id));
    if (active.length === 0) return;
    const target = active[Math.floor(Math.random() * active.length)];
    setRegressionOpt(target.id);
    toggleOptimization(target.id);
    setRegressionActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      toggleOptimization(target.id);
      setRegressionActive(false);
      setRegressionOpt(null);
    }, 3000);
  };

  const bp = BUDGET_PRESETS[strictness];
  const budgets = [
    { metric: "LCP", budget: bp.lcp, actual: metrics.lcp, unit: "ms", key: "lcp" },
    { metric: "INP", budget: bp.inp, actual: metrics.inp, unit: "ms", key: "inp" },
    { metric: "CLS", budget: bp.cls, actual: metrics.cls, unit: "", key: "cls" },
    { metric: "JS size", budget: bp.js, actual: metrics.jsSizeKB, unit: "KB", key: "js" },
  ];

  const failCount = budgets.filter((b) => b.actual > b.budget).length;
  const allPass = failCount === 0;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Performance Budget</div>
      <div className={styles.yieldPresets} style={{ marginBottom: "var(--space-1)" }}>
        {(["relaxed", "standard", "aggressive"] as BudgetStrictness[]).map((level) => (
          <button
            key={level}
            type="button"
            className={styles.yieldPresetBtn}
            data-active={level === strictness ? "true" : undefined}
            onClick={() => setStrictness(level)}
          >
            {level}
          </button>
        ))}
      </div>
      <div className={styles.budgetGrid}>
        {budgets.map((b) => {
          const passed = b.actual <= b.budget;
          return (
            <div key={b.metric} className={styles.budgetRow} data-passed={passed ? "true" : undefined}>
              <span className={styles.budgetMetric}>{b.metric}</span>
              <div className={styles.budgetBarWrap}>
                <div
                  className={styles.budgetBar}
                  data-passed={passed ? "true" : undefined}
                  style={{ width: `${Math.min((b.actual / b.budget) * 100, 150)}%` }}
                />
                <div className={styles.budgetThreshold} />
              </div>
              <span className={styles.budgetValues}>
                <span data-status={passed ? "good" : "bad"}>
                  {typeof b.actual === "number" && b.actual % 1 !== 0 ? b.actual.toFixed(2) : b.actual}
                </span>
                {" / "}
                {typeof b.budget === "number" && b.budget % 1 !== 0 ? b.budget.toFixed(2) : b.budget}
                {b.unit && ` ${b.unit}`}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className={styles.budgetVerdict}
        data-all-pass={allPass ? "true" : undefined}
      >
        {allPass
          ? <><span className={styles.verdictPass}>✓ PASS</span> All metrics within budget — safe to merge</>
          : <><span className={styles.verdictFail}>✗ FAIL</span> {failCount} metric(s) over budget — enable more optimizations above</>}
      </div>

      {enabledOptimizations.size > 0 && (
        <button
          type="button"
          className={styles.clickSimButton}
          data-state={regressionActive ? "queued" : "idle"}
          onClick={simulateRegression}
          disabled={regressionActive}
        >
          {regressionActive
            ? `Careless PR disabled ${regressionOpt ? OPTIMIZATIONS.find((o) => o.id === regressionOpt)?.label : ""}...`
            : "Simulate careless PR"}
        </button>
      )}
      {regressionActive && (
        <p className={styles.widgetNote}>
          A single reverted optimization — this is what performance entropy looks like. Budgets catch this in CI before it ships.
        </p>
      )}
    </div>
  );
}

// ── Step 15: RUM dashboard ──────────────────────────────────────────

const BASELINE_METRICS = { lcp: 2900, inp: 340, cls: 0.34, totalSizeKB: 1280 };

const REGRESSION_SCENARIOS: { revertedOpt: OptimizationId; alertMetric: string; clue: string }[] = [
  { revertedOpt: "codeSplitting", alertMetric: "LCP", clue: "LCP +800ms · TBT +60ms · JS size 115→385 KB · INP +40ms · CLS unchanged" },
  { revertedOpt: "thirdPartyDefer", alertMetric: "INP", clue: "INP +90ms · TBT +100ms · LCP unchanged · CLS unchanged · 3P scripts now block parse" },
  { revertedOpt: "imageOptimization", alertMetric: "LCP", clue: "LCP +600ms · hero image 65→245 KB · CLS +0.08 · INP unchanged · JS size unchanged" },
  { revertedOpt: "layoutStability", alertMetric: "CLS", clue: "CLS +0.11 · LCP unchanged · INP unchanged · ad container has no min-height · total size unchanged" },
];

const TRANSFER_PROFILE = {
  name: "Server-rendered blog",
  traits: "SSR HTML (no JS bundle), 8 unoptimized images, 2 web fonts, no third-party scripts",
};
const TRANSFER_OPTS: { id: OptimizationId; why: string; correct: boolean }[] = [
  { id: "codeSplitting", why: "No JS bundle to split — SSR renders HTML on the server", correct: false },
  { id: "criticalCSS", why: "Large stylesheet still blocks FCP on SSR pages", correct: true },
  { id: "imageOptimization", why: "8 unoptimized images — format + lazy loading is high-impact", correct: true },
  { id: "fontLoading", why: "2 web fonts cause FOIT/FOUT and CLS on any page", correct: true },
  { id: "thirdPartyDefer", why: "No third-party scripts to defer", correct: false },
  { id: "longTaskBreaking", why: "No long JS tasks — SSR means minimal client-side execution", correct: false },
  { id: "layoutStability", why: "Images without dimensions still cause CLS on SSR pages, but font + image optimization covers it", correct: false },
  { id: "caching", why: "Important for any site, but not the TOP 3 for this profile's initial load", correct: false },
  { id: "prefetching", why: "Helpful but not the highest-impact for THIS page profile", correct: false },
];

function TransferChallenge() {
  const [picks, setPicks] = useState<Set<OptimizationId>>(new Set());
  const [checked, setChecked] = useState(false);

  const togglePick = (id: OptimizationId) => {
    if (checked) return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const correctSet = new Set(TRANSFER_OPTS.filter((o) => o.correct).map((o) => o.id));
  const score = [...picks].filter((id) => correctSet.has(id)).length;

  return (
    <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-2)" }}>
      <div className={styles.widgetTitle}>Transfer Challenge</div>
      <p className={styles.widgetNote}>
        New page profile: <strong>{TRANSFER_PROFILE.name}</strong> — {TRANSFER_PROFILE.traits}. Pick the 3 most impactful optimizations:
      </p>
      <div className={styles.prefetchLinkGrid}>
        {TRANSFER_OPTS.map((opt) => {
          const meta = OPTIMIZATIONS.find((o) => o.id === opt.id);
          const selected = picks.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={styles.prefetchLinkBtn}
              data-selected={selected ? "true" : undefined}
              data-correct={checked ? (opt.correct ? "true" : selected ? "wrong" : undefined) : undefined}
              onClick={() => togglePick(opt.id)}
              disabled={checked}
            >
              <span className={styles.prefetchLinkPath}>{meta?.label}</span>
              {checked && <span className={styles.prefetchLinkClicks}>{opt.why}</span>}
            </button>
          );
        })}
      </div>
      {!checked && picks.size === 3 && (
        <button type="button" className={styles.cacheSubmitButton} onClick={() => setChecked(true)}>
          Check selection
        </button>
      )}
      {checked && (
        <div className={styles.predictionResult} data-correct={score === 3 ? "true" : undefined}>
          <span className={styles.predictionResultIcon}>{score === 3 ? "✓" : "✗"}</span>
          <span>
            {score === 3
              ? "Perfect — Critical CSS, Image Optimization, and Font Loading are the highest-impact for a server-rendered blog with no JS. You learned the diagnostic reasoning, not just the SPA sequence."
              : `${score}/3 correct. For an SSR blog: no JS to split, no third-party to defer, no long tasks to break. The bottlenecks are CSS blocking, unoptimized images, and font loading chains.`}
          </span>
        </div>
      )}
    </div>
  );
}

function RUMWidget() {
  const { metrics, enabledOptimizations, networkCondition, activeProfile: nw, resources } = usePerfContext();

  const [diagScenario] = useState(() => REGRESSION_SCENARIOS[Math.floor(Math.random() * REGRESSION_SCENARIOS.length)]);
  const [diagGuess, setDiagGuess] = useState<string | null>(null);
  const diagCorrect = diagGuess === diagScenario.revertedOpt;

  const p75Lcp = metrics.lcp;
  const p75Inp = metrics.inp;
  const p75Cls = metrics.cls;

  const journey = [
    {
      label: "LCP",
      before: `${BASELINE_METRICS.lcp}ms`,
      after: `${metrics.lcp}ms`,
      improved: metrics.lcp < BASELINE_METRICS.lcp,
      passing: metrics.lcp <= 2500,
    },
    {
      label: "INP",
      before: `${BASELINE_METRICS.inp}ms`,
      after: `${metrics.inp}ms`,
      improved: metrics.inp < BASELINE_METRICS.inp,
      passing: metrics.inp <= 200,
    },
    {
      label: "CLS",
      before: BASELINE_METRICS.cls.toFixed(2),
      after: metrics.cls.toFixed(2),
      improved: metrics.cls < BASELINE_METRICS.cls,
      passing: metrics.cls <= 0.1,
    },
    {
      label: "Size",
      before: `${BASELINE_METRICS.totalSizeKB} KB`,
      after: `${metrics.totalSizeKB} KB`,
      improved: metrics.totalSizeKB < BASELINE_METRICS.totalSizeKB,
      passing: true,
    },
  ];

  const rumData = [
    { label: "p50 LCP", value: `${(p75Lcp * 0.85).toFixed(0)}ms`, rating: getCWVRating("lcp", p75Lcp * 0.85) },
    { label: "p75 LCP", value: `${p75Lcp}ms`, rating: getCWVRating("lcp", p75Lcp) },
    { label: "p95 LCP", value: `${(p75Lcp * 1.4).toFixed(0)}ms`, rating: getCWVRating("lcp", p75Lcp * 1.4) },
    { label: "p50 INP", value: `${(p75Inp * 0.7).toFixed(0)}ms`, rating: getCWVRating("inp", p75Inp * 0.7) },
    { label: "p75 INP", value: `${p75Inp}ms`, rating: getCWVRating("inp", p75Inp) },
    { label: "p95 INP", value: `${(p75Inp * 1.6).toFixed(0)}ms`, rating: getCWVRating("inp", p75Inp * 1.6) },
    { label: "p50 CLS", value: (p75Cls * 0.6).toFixed(2), rating: getCWVRating("cls", p75Cls * 0.6) },
    { label: "p75 CLS", value: p75Cls.toFixed(2), rating: getCWVRating("cls", p75Cls) },
    { label: "p95 CLS", value: (p75Cls * 2.1).toFixed(2), rating: getCWVRating("cls", p75Cls * 2.1) },
  ];

  const alerts: { metric: string; p75: string; threshold: string; status: "firing" | "resolved" }[] = [];
  if (p75Lcp > 2500) alerts.push({ metric: "LCP", p75: `${p75Lcp}ms`, threshold: "2500ms", status: "firing" });
  if (p75Inp > 200) alerts.push({ metric: "INP", p75: `${p75Inp}ms`, threshold: "200ms", status: "firing" });
  if (p75Cls > 0.1) alerts.push({ metric: "CLS", p75: p75Cls.toFixed(2), threshold: "0.10", status: "firing" });

  const allGreen = alerts.length === 0;
  const optCount = enabledOptimizations.size;

  const baseline = useMemo(
    () => computePerformance(new Set(), nw),
    [nw],
  );
  const baselineMaxMs = Math.max(baseline.timelineEndMs, 500);
  const currentMaxMs = Math.max(...resources.map((r: { endMs: number }) => r.endMs), 500);
  const overlayMax = Math.max(baselineMaxMs, currentMaxMs);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>The Journey</div>
      <div className={styles.journeySummary}>
        {journey.map((j) => (
          <div key={j.label} className={styles.journeyItem}>
            <span className={styles.journeyLabel}>{j.label}</span>
            <span className={styles.journeyBefore}>{j.before}</span>
            <span className={styles.journeyArrow}>{j.improved ? "→" : "="}</span>
            <span className={styles.journeyAfter} data-passing={j.passing ? "true" : undefined} data-improved={j.improved ? "true" : undefined}>
              {j.after}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.waterfallOverlay}>
        <div className={styles.waterfallOverlayRow}>
          <span className={styles.waterfallOverlayLabel}>Baseline</span>
          <div className={styles.waterfallOverlayTrack}>
            {baseline.resources.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className={styles.waterfallOverlayBar}
                data-ghost="true"
                style={{
                  left: `${(r.startMs / overlayMax) * 100}%`,
                  width: `${Math.max(((r.endMs - r.startMs) / overlayMax) * 100, 1)}%`,
                  background: RESOURCE_COLORS[r.type],
                }}
              />
            ))}
          </div>
        </div>
        <div className={styles.waterfallOverlayRow}>
          <span className={styles.waterfallOverlayLabel}>Current</span>
          <div className={styles.waterfallOverlayTrack}>
            {resources.slice(0, 6).map((r: { id: string; startMs: number; endMs: number; type: keyof typeof RESOURCE_COLORS }) => (
              <div
                key={r.id}
                className={styles.waterfallOverlayBar}
                style={{
                  left: `${(r.startMs / overlayMax) * 100}%`,
                  width: `${Math.max(((r.endMs - r.startMs) / overlayMax) * 100, 1)}%`,
                  background: RESOURCE_COLORS[r.type],
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.widgetTitle}>RUM Distribution ({nw.label})</div>
      <div className={styles.rumGrid}>
        {rumData.map((d) => (
          <div key={d.label} className={styles.rumCell}>
            <span className={styles.rumCellLabel}>{d.label}</span>
            <span className={styles.rumCellValue} data-rating={d.rating}>{d.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.alertPanel}>
        <div className={styles.alertHeader}>
          <span className={styles.alertHeaderLabel}>Alerts</span>
          <span className={styles.alertHeaderStatus} data-status={allGreen ? "clear" : "firing"}>
            {allGreen ? "All clear" : `${alerts.length} firing`}
          </span>
        </div>
        {alerts.map((a) => (
          <div key={a.metric} className={styles.alertRow} data-status="firing">
            <span className={styles.alertIcon}>!</span>
            <span className={styles.alertText}>
              {a.metric} p75 = {a.p75} (threshold: {a.threshold})
            </span>
          </div>
        ))}
        {allGreen && (
          <div className={styles.alertRow} data-status="resolved">
            <span className={styles.alertIcon}>✓</span>
            <span className={styles.alertText}>
              All CWV within threshold — {optCount} optimization{optCount !== 1 ? "s" : ""} active
            </span>
          </div>
        )}
      </div>

      <div className={styles.widgetTitle}>Incident Diagnosis</div>
      <div className={styles.alertPanel}>
        <div className={styles.alertHeader}>
          <span className={styles.alertHeaderLabel}>RUM Alert</span>
          <span className={styles.alertHeaderStatus} data-status="firing">{diagScenario.alertMetric} regression</span>
        </div>
        <div className={styles.alertRow} data-status="firing">
          <span className={styles.alertIcon}>!</span>
          <span className={styles.alertText}>{diagScenario.clue}</span>
        </div>
      </div>
      {!diagGuess ? (
        <>
          <p className={styles.widgetNote}>Which optimization was reverted?</p>
          <div className={styles.prefetchLinkGrid}>
            {OPTIMIZATIONS.filter((o) => o.step >= 5 && o.step <= 11).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.prefetchLinkBtn}
                onClick={() => setDiagGuess(opt.id)}
              >
                <span className={styles.prefetchLinkPath}>{opt.label}</span>
                <span className={styles.prefetchLinkClicks}>Step {opt.step}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.predictionResult} data-correct={diagCorrect ? "true" : undefined}>
          <span className={styles.predictionResultIcon}>{diagCorrect ? "✓" : "✗"}</span>
          <span>
            {diagCorrect
              ? `Correct — the ${OPTIMIZATIONS.find((o) => o.id === diagScenario.revertedOpt)?.label} optimization was reverted. This is the pattern RUM alerts catch: a single reverted optimization that causes a metric regression.`
              : `The reverted optimization was ${OPTIMIZATIONS.find((o) => o.id === diagScenario.revertedOpt)?.label}. The clue was the ${diagScenario.alertMetric} regression pattern — different optimizations regress different metrics.`}
          </span>
        </div>
      )}

      <p className={styles.widgetNote}>
        {allGreen
          ? "All p75 metrics pass CWV thresholds. The p95 tail may still be yellow — that's normal for users on the worst devices and networks."
          : "Toggle optimizations above to see alerts resolve. Each alert fires when the 7-day rolling p75 crosses a CWV threshold."}
      </p>

      <TransferChallenge />
    </div>
  );
}
