"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

export function CodeSplittingWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("codeSplitting");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Bundle Analysis</div>

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
                data-state="lazy"
                layout
                transition={SPRING.snappy}
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
