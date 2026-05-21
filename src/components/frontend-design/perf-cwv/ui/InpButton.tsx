"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { INP_BLOCKING_TASK_MS, useCwvContext } from "../cwv-context";
import { formatInp, rateInp } from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

// The brief's most powerful teaching moment:
// "Make the user say 'oh — *that's* what 200ms feels like.'"
//
// When the lab is in the broken state, clicking the button busies the main
// thread for INP_BLOCKING_TASK_MS (a tight `Date.now()` loop, not a
// `setTimeout`, so we actually block layout and paint). The visual feedback
// (depress, label change) is queued behind the blocking work — exactly what
// users feel when an event handler runs slow JS.

function blockMainThread(ms: number): void {
  const start = performance.now();
  // eslint-disable-next-line no-empty
  while (performance.now() - start < ms) {}
}

export function InpButton() {
  const { inpFixed, setInpFixed, registerInpClick, inpClickTimestamps, inpTotalMs } = useCwvContext();
  const noMotion = usePrefersReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [latestLatency, setLatestLatency] = useState<number | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    const start = performance.now();
    setPressed(true);
    setBusy(true);

    if (inpFixed) {
      // Optimised path: yield immediately, measure the actual rAF latency.
      // No setTimeout fakery — `requestAnimationFrame` reports a real
      // browser-paint latency, which is what INP measures.
      requestAnimationFrame(() => {
        const latency = Math.max(1, Math.round(performance.now() - start));
        setLatestLatency(latency);
        registerInpClick(latency);
        setBusy(false);
      });
      releaseTimer.current = setTimeout(() => setPressed(false), 120);
    } else {
      // Broken path: actually block the main thread.
      blockMainThread(INP_BLOCKING_TASK_MS);
      const latency = Math.round(performance.now() - start);
      setLatestLatency(latency);
      registerInpClick(latency);
      setBusy(false);
      releaseTimer.current = setTimeout(() => setPressed(false), 180);
    }

    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    };
  }, [inpFixed, registerInpClick]);

  const totalRating = rateInp(latestLatency ?? inpTotalMs);

  return (
    <div className={styles.inpButtonRoot}>
      <div className={styles.inpButtonStage}>
        <motion.button
          type="button"
          className={styles.inpFakeCta}
          data-pressed={pressed ? "true" : undefined}
          data-fixed={inpFixed ? "true" : undefined}
          aria-busy={busy ? "true" : undefined}
          aria-label="Add to cart — interaction demo"
          onClick={handleClick}
          animate={pressed ? { scale: 0.97 } : { scale: 1 }}
          transition={SPRING.quick}
        >
          <span className={styles.inpFakeCtaLabel}>{busy && !inpFixed ? "Working…" : "Add to cart"}</span>
          <span className={styles.inpFakeCtaSub}>Tap me and watch the gauge</span>
        </motion.button>

        <div className={styles.inpToggleRow}>
          <span className={styles.inpToggleHint}>Handler:</span>
          <div className={styles.inpToggle} role="radiogroup" aria-label="INP handler strategy">
            <button
              type="button"
              className={styles.inpToggleBtn}
              data-active={!inpFixed ? "true" : undefined}
              role="radio"
              aria-checked={!inpFixed}
              onClick={() => setInpFixed(false)}
            >
              200ms sync
            </button>
            <button
              type="button"
              className={styles.inpToggleBtn}
              data-active={inpFixed ? "true" : undefined}
              role="radio"
              aria-checked={inpFixed}
              onClick={() => setInpFixed(true)}
            >
              yield + 16ms
            </button>
          </div>
        </div>
      </div>

      <div className={styles.inpReadoutPanel}>
        <div className={styles.inpReadoutHeader}>
          <span className={styles.inpReadoutLabel}>Latest interaction</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${latestLatency ?? 0}-${inpFixed}`}
              className={styles.inpReadoutValue}
              data-rating={totalRating}
              initial={noMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={noMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={TRANSITION.crossfade}
            >
              {latestLatency != null ? formatInp(latestLatency) : "—"}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className={styles.inpReadoutHint}>
          {latestLatency == null
            ? "Click the CTA. The first click will sit behind a real 200ms main-thread block. Feel that, then flip the handler."
            : inpFixed
              ? `Yielded handler returned in ~${latestLatency}ms — the gauge is back in the green band.`
              : `Synchronous handler blocked the main thread for ~${latestLatency}ms. INP reports the worst interaction.`}
        </p>
        {inpClickTimestamps.length > 1 && (
          <div className={styles.inpHistory} aria-label="Recent interaction latencies">
            {inpClickTimestamps.map((latency, i) => (
              <span key={`${i}-${latency}`} className={styles.inpHistoryBar} data-rating={rateInp(latency)} style={{ height: `${Math.min(48, 6 + latency / 8)}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
