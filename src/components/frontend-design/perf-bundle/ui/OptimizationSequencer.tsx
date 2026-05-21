"use client";

import { useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { OPT_STEPS, type OptimizationKey } from "../engine/bundle-simulator";
import styles from "./OptimizationSequencer.module.css";

interface OptimizationSequencerProps {
  applied: OptimizationKey[];
  onApply: (next: OptimizationKey[]) => void;
  onReset: () => void;
}

export function OptimizationSequencer({ applied, onApply, onReset }: OptimizationSequencerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const remaining = OPT_STEPS.map((s) => s.key).filter((k) => !applied.includes(k));

  const handleReorder = useCallback((next: OptimizationKey[]) => onApply(next), [onApply]);

  const handleAppend = useCallback((key: OptimizationKey) => {
    onApply([...applied, key]);
  }, [applied, onApply]);

  const handleRemove = useCallback((key: OptimizationKey) => {
    onApply(applied.filter((k) => k !== key));
  }, [applied, onApply]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Apply order</span>
        <button type="button" className={styles.resetBtn} onClick={onReset}>reset</button>
      </div>

      {applied.length === 0 ? (
        <p className={styles.empty}>Pick an optimization below to start the build.</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={applied}
          onReorder={handleReorder}
          className={styles.appliedList}
          as="ol"
        >
          {applied.map((key, idx) => {
            const step = OPT_STEPS.find((s) => s.key === key);
            if (!step) return null;
            return (
              <Reorder.Item key={key} value={key} as="li" className={styles.appliedItem}>
                <motion.div
                  className={styles.appliedInner}
                  layout
                  transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
                >
                  <span className={styles.idx}>{idx + 1}</span>
                  <div className={styles.body}>
                    <span className={styles.stepTitle}>{step.title}</span>
                    <span className={styles.stepBlurb}>{step.blurb}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(key)}
                    aria-label={`Remove ${step.title}`}
                  >
                    remove
                  </button>
                </motion.div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}

      {remaining.length > 0 && (
        <div className={styles.pool}>
          <span className={styles.poolLabel}>Available</span>
          <div className={styles.poolList}>
            {remaining.map((key) => {
              const step = OPT_STEPS.find((s) => s.key === key);
              if (!step) return null;
              return (
                <button
                  key={key}
                  type="button"
                  className={styles.poolBtn}
                  onClick={() => handleAppend(key)}
                >
                  <span className={styles.poolTitle}>{step.title}</span>
                  <span className={styles.poolBlurb}>{step.blurb}</span>
                  <span className={styles.poolAdd} aria-hidden>+ apply</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
