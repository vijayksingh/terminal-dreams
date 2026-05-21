"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const TOTAL_JS = 385;

export function CodeSplittingWidget() {
  const { enabledOptimizations, optParams, updateOptParam } = usePerfContext();
  const on = enabledOptimizations.has("codeSplitting");
  const corePct = optParams.codeSplitPct;
  const setCorePct = (v: number) => updateOptParam("codeSplitPct", v);

  const coreKB = Math.round(TOTAL_JS * (corePct / 100));
  const lazyKB = TOTAL_JS - coreKB;

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
                <span>main.js — {TOTAL_JS} KB (render-blocking)</span>
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
                  animate={{ width: `${corePct}%` }}
                  transition={SPRING.snappy}
                />
                <span>core.js — {coreKB} KB (blocking)</span>
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
                  animate={{ width: `${100 - corePct}%` }}
                  transition={SPRING.snappy}
                />
                <span>routes.js — {lazyKB} KB (lazy, deferred)</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {on && (
        <div className={styles.criticalSliderWrap}>
          <label className={styles.criticalSliderLabel}>
            Core bundle: <strong>{coreKB} KB</strong> / {TOTAL_JS} KB ({corePct}%)
            {corePct > 60 && <span className={styles.criticalBloat}> large core — diminishing returns</span>}
            {corePct < 15 && <span className={styles.criticalFouc}> too small — frequent lazy loads</span>}
          </label>
          <input
            type="range"
            min={10}
            max={80}
            step={5}
            value={corePct}
            onChange={(e) => setCorePct(Number(e.target.value))}
            className={styles.criticalSlider}
            aria-label={`Core bundle size: ${corePct}%`}
          />
          <div className={styles.criticalSliderTicks}>
            <span>10%</span>
            <span className={styles.criticalSliderSweet}>~30% sweet spot</span>
            <span>80%</span>
          </div>
        </div>
      )}

      <p className={styles.widgetNote}>
        {on
          ? corePct <= 35
            ? `Initial blocking JS drops from ${TOTAL_JS} KB to ${coreKB} KB — render-blocking time shrinks proportionally and everything downstream starts earlier.`
            : `Core at ${coreKB} KB is still large. The goal is the smallest bundle that renders the above-fold UI without a lazy-load waterfall.`
          : `The monolithic ${TOTAL_JS} KB main.js blocks every dependent resource. Enable Code Splitting above to experiment with the split threshold.`}
      </p>
    </div>
  );
}
