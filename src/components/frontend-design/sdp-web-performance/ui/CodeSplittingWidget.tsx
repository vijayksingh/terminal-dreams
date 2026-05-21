"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

export function CodeSplittingWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("codeSplitting");
  const [splitPrediction, setSplitPrediction] = useState<number | null>(null);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Bundle Analysis</div>

      {!on && splitPrediction === null && (
        <div style={{ marginBottom: "var(--space-2)" }}>
          <p className={styles.widgetNote}>Before toggling: how much will blocking JS drop?</p>
          <div className={styles.prefetchLinkGrid}>
            {[
              { label: "385→280 KB", desc: "~27% reduction", idx: 0 },
              { label: "385→115 KB", desc: "~70% reduction", idx: 1 },
              { label: "385→40 KB", desc: "~90% reduction", idx: 2 },
            ].map((opt) => (
              <button key={opt.idx} type="button" className={styles.prefetchLinkBtn} onClick={() => setSplitPrediction(opt.idx)}>
                <span className={styles.prefetchLinkPath}>{opt.label}</span>
                <span className={styles.prefetchLinkClicks}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {splitPrediction !== null && !on && (
        <div className={styles.predictionResult} data-correct={splitPrediction === 1 ? "true" : undefined} style={{ marginBottom: "var(--space-2)" }}>
          <span className={styles.predictionResultIcon}>{splitPrediction === 1 ? "✓" : "✗"}</span>
          <span>
            {splitPrediction === 1
              ? "Correct — route-based splitting extracts a 115 KB core and 75 KB lazy chunk. Only the 115 KB core blocks rendering. Toggle it on to see the waterfall shift."
              : splitPrediction === 0
              ? "Higher reduction than that. Code splitting doesn't just trim — it extracts only what's needed for the first render. The route chunk loads lazily after."
              : "Not quite that aggressive — you still need framework code, shared utilities, and the initial route. 115 KB core + 75 KB lazy chunk is the realistic split."}
          </span>
        </div>
      )}

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
                data-state="active"
                layout
                transition={SPRING.snappy}
                style={{ opacity: 0.65, borderStyle: "dashed" }}
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
