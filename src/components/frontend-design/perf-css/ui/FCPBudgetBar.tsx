"use client";

import { motion } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "../CSSPerfLab.module.css";

const BUDGET_MS = 650;
const TIMELINE_END_MS = 2000;

export function FCPBudgetBar({ fcpMs, wins }: { fcpMs: number; wins: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const budgetMet = fcpMs <= BUDGET_MS;
  const rating = budgetMet ? "good" : fcpMs <= 1200 ? "needs-improvement" : "poor";
  const widthPct = Math.min((fcpMs / TIMELINE_END_MS) * 100, 100);
  const budgetPct = (BUDGET_MS / TIMELINE_END_MS) * 100;

  return (
    <div className={styles.budgetBar} aria-live="polite">
      <div className={styles.budgetHeader}>
        <span className={styles.budgetLabel}>FCP</span>
        <div className={styles.budgetReadout}>
          <motion.span
            key={fcpMs}
            className={styles.budgetValue}
            data-rating={rating}
            initial={reducedMotion ? false : { scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          >
            {fcpMs >= 1000 ? `${(fcpMs / 1000).toFixed(2)}s` : `${fcpMs}ms`}
          </motion.span>
          <span className={styles.budgetTarget}>budget {BUDGET_MS}ms</span>
          {wins && <span className={styles.budgetWins}>WINS</span>}
        </div>
      </div>
      <div className={styles.budgetTrack}>
        <span className={styles.budgetMarker} style={{ left: `${budgetPct}%` }} aria-hidden="true" />
        <motion.span
          className={styles.budgetFill}
          data-rating={rating}
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={reducedMotion ? { duration: 0 } : TRANSITION.progress}
        />
      </div>
      <div className={styles.budgetAxis}>
        <span>0</span>
        <span>0.6s</span>
        <span>1.2s</span>
        <span>2s+</span>
      </div>
    </div>
  );
}
