"use client";

import { useMemo } from "react";
import { usePerfContext } from "../perf-context";
import {
  computePerformance,
  getCWVRating,
  RESOURCE_COLORS,
  type WaterfallResource,
} from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

export function RUMWidget() {
  const { metrics, enabledOptimizations, activeProfile: nw, resources } = usePerfContext();

  const baseline = useMemo(
    () => computePerformance(new Set(), nw),
    [nw],
  );
  const baselineMetrics = baseline.metrics;

  const p75Lcp = metrics.lcp;
  const p75Inp = metrics.inp;
  const p75Cls = metrics.cls;

  const journey = [
    {
      label: "LCP",
      before: `${baselineMetrics.lcp}ms`,
      after: `${metrics.lcp}ms`,
      improved: metrics.lcp < baselineMetrics.lcp,
      passing: metrics.lcp <= 2500,
    },
    {
      label: "INP",
      before: `${baselineMetrics.inp}ms`,
      after: `${metrics.inp}ms`,
      improved: metrics.inp < baselineMetrics.inp,
      passing: metrics.inp <= 200,
    },
    {
      label: "CLS",
      before: baselineMetrics.cls.toFixed(2),
      after: metrics.cls.toFixed(2),
      improved: metrics.cls < baselineMetrics.cls,
      passing: metrics.cls <= 0.1,
    },
    {
      label: "Size",
      before: `${baselineMetrics.totalSizeKB} KB`,
      after: `${metrics.totalSizeKB} KB`,
      improved: metrics.totalSizeKB < baselineMetrics.totalSizeKB,
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

  const baselineMaxMs = Math.max(baseline.timelineEndMs, 500);
  const currentMaxMs = Math.max(...resources.map((r) => r.endMs), 500);
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
            {resources.slice(0, 6).map((r) => (
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
            <span className={styles.alertIcon} role="img" aria-label="Alert">!</span>
            <span className={styles.alertText}>
              {a.metric} p75 = {a.p75} (threshold: {a.threshold})
            </span>
          </div>
        ))}
        {allGreen && (
          <div className={styles.alertRow} data-status="resolved">
            <span className={styles.alertIcon} role="img" aria-label="Resolved">✓</span>
            <span className={styles.alertText}>
              All CWV within threshold — {optCount} optimization{optCount !== 1 ? "s" : ""} active
            </span>
          </div>
        )}
      </div>

      <p className={styles.widgetNote}>
        {allGreen
          ? "All p75 metrics pass CWV thresholds. The p95 tail may still be yellow — that's normal for users on the worst devices and networks."
          : "Toggle optimizations above to see alerts resolve. Each alert fires when the 7-day rolling p75 crosses a CWV threshold."}
      </p>
    </div>
  );
}
