"use client";

import { useMemo } from "react";
import { usePerfContext } from "../perf-context";
import { computePerformance, getCWVRating } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

export function LayoutStabilityWidget() {
  const { metrics } = usePerfContext();

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Layout Shift Sources</div>
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
      <div className={styles.clsTotal} aria-live="polite">
        Total CLS: <strong data-status={metrics.cls <= 0.1 ? "good" : "bad"}>
          {metrics.cls.toFixed(2)}
        </strong>
        <span className={styles.clsTarget}>(target: &le; 0.10)</span>
      </div>
    </div>
  );
}

// ── Milestone checkpoint ───────────────────────────────────────────

export function MilestoneCheckpoint() {
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
