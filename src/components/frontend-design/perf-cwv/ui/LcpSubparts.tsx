"use client";

import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useCwvContext } from "../cwv-context";
import { formatLcp, rateLcp } from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

export function LcpSubparts() {
  const { lcpSubparts, lcpOptimizations, toggleLcpOptimization, lcpTotalSeconds, lcpRating } = useCwvContext();
  const noMotion = usePrefersReducedMotion();
  const totalBase = lcpSubparts.reduce((acc, sp) => acc + sp.base, 0);

  return (
    <div className={styles.subpartsRoot}>
      <div className={styles.subpartsTotal} data-rating={lcpRating}>
        <span className={styles.subpartsTotalLabel}>Total LCP</span>
        <span className={styles.subpartsTotalValue} data-rating={lcpRating}>{formatLcp(lcpTotalSeconds)}</span>
        <span className={styles.subpartsTotalThreshold}>target ≤ 2.5s</span>
      </div>

      <div className={styles.subpartsList}>
        {lcpSubparts.map((sp) => {
          const widthPct = (sp.valueMs / totalBase) * 100;
          return (
            <div key={sp.id} className={styles.subpartRow} data-sub={sp.id}>
              <span className={styles.subpartRowLabel}>{sp.label}</span>
              <div className={styles.subpartRowTrack}>
                <motion.div
                  className={styles.subpartRowFill}
                  data-sub={sp.id}
                  initial={false}
                  animate={{ width: `${widthPct}%` }}
                  transition={noMotion ? { duration: 0 } : TRANSITION.progress}
                />
              </div>
              <span className={styles.subpartRowValue} data-rating={rateLcp(sp.valueMs / 1000)}>{sp.valueMs}ms</span>
            </div>
          );
        })}
      </div>

      <div className={styles.subpartFixGrid}>
        {lcpSubparts.map((sp) => {
          const on = lcpOptimizations.has(sp.fix);
          return (
            <button
              key={sp.fix}
              type="button"
              className={styles.subpartFixBtn}
              data-active={on ? "true" : undefined}
              onClick={() => toggleLcpOptimization(sp.fix)}
              aria-pressed={on}
            >
              <span className={styles.subpartFixToggle} data-on={on ? "true" : undefined} aria-hidden="true">
                <span className={styles.subpartFixKnob} />
              </span>
              <span className={styles.subpartFixContent}>
                <span className={styles.subpartFixLabel}>{sp.fixLabel}</span>
                <span className={styles.subpartFixHint}>fixes {sp.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
