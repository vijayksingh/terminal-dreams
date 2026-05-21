"use client";

import { useState, useMemo } from "react";
import { usePerfContext } from "../perf-context";
import {
  OPTIMIZATIONS,
  computePerformance,
  getCWVRating,
  RESOURCE_COLORS,
  type OptimizationId,
} from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

// ── Constants ──────────────────────────────────────────────────────

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

// ── Transfer challenge ─────────────────────────────────────────────

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
    <div className={styles.widgetExercise}>
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

// ── RUM widget (Step 15) ───────────────────────────────────────────

export function RUMWidget() {
  const { metrics, enabledOptimizations, activeProfile: nw, resources } = usePerfContext();

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
