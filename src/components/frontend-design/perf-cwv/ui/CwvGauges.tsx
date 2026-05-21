"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  CWV_THRESHOLDS,
  formatCls,
  formatInp,
  formatLcp,
  formatRating,
  rateCls,
  rateInp,
  rateLcp,
  type Rating,
} from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

type CwvGaugesProps = {
  lcpSeconds: number;
  inpMs: number;
  cls: number;
  /** When true, the value highlights — used after a "click" or "shift" event lands. */
  pulseKey?: string | null;
};

export function CwvGauges({ lcpSeconds, inpMs, cls, pulseKey }: CwvGaugesProps) {
  const noMotion = usePrefersReducedMotion();
  const gauges: { key: "lcp" | "inp" | "cls"; label: string; description: string; valueLabel: string; rating: Rating; thresholdLabel: string }[] = [
    {
      key: "lcp",
      label: "LCP",
      description: "Largest Contentful Paint",
      valueLabel: formatLcp(lcpSeconds),
      rating: rateLcp(lcpSeconds),
      thresholdLabel: `Good ≤ ${CWV_THRESHOLDS.lcp.good}s`,
    },
    {
      key: "inp",
      label: "INP",
      description: "Interaction to Next Paint",
      valueLabel: formatInp(inpMs),
      rating: rateInp(inpMs),
      thresholdLabel: `Good ≤ ${CWV_THRESHOLDS.inp.good}ms`,
    },
    {
      key: "cls",
      label: "CLS",
      description: "Cumulative Layout Shift",
      valueLabel: formatCls(cls),
      rating: rateCls(cls),
      thresholdLabel: `Good ≤ ${CWV_THRESHOLDS.cls.good}`,
    },
  ];

  return (
    <div className={styles.cwvGauges} role="group" aria-label="Core Web Vitals gauges">
      {gauges.map((g) => {
        const pulse = pulseKey === g.key && !noMotion;
        return (
          <motion.div
            key={g.key}
            className={styles.cwvGauge}
            data-rating={g.rating}
            role="meter"
            aria-label={`${g.label} ${g.valueLabel} (${formatRating(g.rating)})`}
            initial={false}
            animate={pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={pulse ? SPRING.snappy : { duration: 0 }}
          >
            <span className={styles.cwvGaugeLabel}>{g.label}</span>
            <span className={styles.cwvGaugeValue} data-rating={g.rating}>{g.valueLabel}</span>
            <span className={styles.cwvGaugeRating} data-rating={g.rating}>{formatRating(g.rating)}</span>
            <span className={styles.cwvGaugeThreshold}>{g.thresholdLabel}</span>
            <span className={styles.cwvGaugeDesc}>{g.description}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
