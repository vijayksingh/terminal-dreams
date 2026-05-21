"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getCWVRating, type PerfMetrics } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

type MetricsPanelProps = {
  metrics: PerfMetrics;
  showAll?: boolean;
};

type GaugeConfig = {
  key: keyof PerfMetrics;
  label: string;
  unit: string;
  format: (v: number) => string;
};

const CWV_GAUGES: GaugeConfig[] = [
  { key: "lcp", label: "LCP", unit: "ms", format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms` },
  { key: "inp", label: "INP", unit: "ms", format: (v) => `${v}ms` },
  { key: "cls", label: "CLS", unit: "", format: (v) => v.toFixed(2) },
];

const EXTRA_GAUGES: GaugeConfig[] = [
  { key: "fcp", label: "FCP", unit: "ms", format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms` },
  { key: "tbt", label: "TBT", unit: "ms", format: (v) => `${v}ms` },
  { key: "totalSizeKB", label: "Size", unit: "KB", format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)} MB` : `${v} KB` },
];

export function MetricsPanel({ metrics, showAll = false }: MetricsPanelProps) {
  const rm = usePrefersReducedMotion();
  const gauges = showAll ? [...CWV_GAUGES, ...EXTRA_GAUGES] : CWV_GAUGES;

  return (
    <div className={styles.metricsGrid} data-count={gauges.length} aria-live="polite" aria-atomic="false">
      {gauges.map((g) => {
        const value = metrics[g.key] as number;
        const rating = getCWVRating(g.key, value);

        return (
          <motion.div
            key={g.key}
            className={styles.metricGauge}
            initial={rm ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING.gentle}
          >
            <span className={styles.metricGaugeLabel}>{g.label}</span>
            <motion.span
              className={styles.metricGaugeValue}
              data-rating={rating}
              key={`${g.key}-${value}`}
              initial={rm ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING.snappy}
            >
              {g.format(value)}
            </motion.span>
            <span className={styles.metricGaugeRating} data-rating={rating}>
              {rating === "good" ? "Good" : rating === "needs-improvement" ? "Needs work" : "Poor"}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
