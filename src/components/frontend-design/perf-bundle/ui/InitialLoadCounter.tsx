"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate as animateMV } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./InitialLoadCounter.module.css";

interface InitialLoadCounterProps {
  cold: number;
  warm: number;
  total: number;
  /** Number of distinct files served. */
  chunkCount: number;
  /** The "performance budget" we're judging against. */
  budget?: number;
}

const DEFAULT_BUDGET = 250;
const MAX_BAR_KB = 1200;

export function InitialLoadCounter({ cold, warm, total, chunkCount, budget = DEFAULT_BUDGET }: InitialLoadCounterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const status = ratingFor(cold, budget);
  const prevRef = useRef(cold);
  const [display, setDisplay] = useState(cold);
  const mv = useMotionValue(cold);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(cold);
      prevRef.current = cold;
      return;
    }
    prevRef.current = cold;
    const controls = animateMV(mv, cold, {
      type: "tween",
      ease: "easeOut",
      duration: 0.55,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [cold, mv, reducedMotion]);

  const withinPct = Math.min(100, (Math.min(display, budget) / MAX_BAR_KB) * 100);
  const overPct = display > budget ? Math.min(100 - withinPct, ((display - budget) / MAX_BAR_KB) * 100) : 0;
  const budgetMark = Math.min(100, (budget / MAX_BAR_KB) * 100);

  return (
    <div className={styles.counter} data-status={status} role="status" aria-live="polite">
      <div className={styles.primary}>
        <span className={styles.label}>Initial load on /home (cold)</span>
        <motion.span className={styles.value}>{display.toLocaleString()} KB</motion.span>
      </div>
      <div className={styles.bar} aria-hidden>
        <div className={styles.barWithin} style={{ width: `${withinPct}%` }} />
        {overPct > 0 && (
          <div
            className={styles.barOver}
            style={{ left: `${withinPct}%`, width: `${overPct}%` }}
          />
        )}
        <div className={styles.barBudget} style={{ left: `${budgetMark}%` }} aria-hidden />
        <span className={styles.barBudgetLabel} style={{ left: `calc(${budgetMark}% + 4px)` }}>
          budget {budget} KB
        </span>
      </div>
      <div className={styles.secondary}>
        <div className={styles.metric}>
          <span className={styles.smallLabel}>Warm cache</span>
          <span className={styles.smallValue}>{warm.toLocaleString()} KB</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.smallLabel}>Total payload</span>
          <span className={styles.smallValue}>{total.toLocaleString()} KB</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.smallLabel}>Chunks</span>
          <span className={styles.smallValue}>{chunkCount}</span>
        </div>
      </div>
    </div>
  );
}

function ratingFor(value: number, budget: number): "pass" | "warning" | "critical" {
  if (value <= budget) return "pass";
  if (value <= budget * 2) return "warning";
  return "critical";
}
