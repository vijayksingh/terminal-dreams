"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import type { ArchStep } from "./types";
import styles from "./styles.module.css";

type BandwidthMeterProps = {
  /** Steps for the active scenario + mode. */
  steps: ArchStep[];
  /** Current step index — meter sums payloads from steps[0..stepIdx]. */
  stepIdx: number;
  /** True when split is enabled; controls accent + assumption block. */
  splitEnabled: boolean;
  reducedMotion: boolean;
};

// Honest assumption: 50 MB is "the wall." When the meter approaches it
// it fills the bar; beyond it the bar saturates and we tint it red.
const METER_MAX_KB = 50_000;

function formatBytes(kb: number): string {
  if (kb < 1) return "0 KB";
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function severityFromKB(kb: number): "ok" | "warn" | "alarm" {
  if (kb < 5_000) return "ok"; // < 5 MB
  if (kb < 20_000) return "warn"; // < 20 MB
  return "alarm";
}

export function BandwidthMeter({
  steps,
  stepIdx,
  splitEnabled,
  reducedMotion,
}: BandwidthMeterProps) {
  const totalKB = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= stepIdx && i < steps.length; i++) {
      sum += steps[i].payload?.weightKB ?? 0;
    }
    return sum;
  }, [steps, stepIdx]);

  const severity = severityFromKB(totalKB);
  const fillPct = Math.min(100, (totalKB / METER_MAX_KB) * 100);
  const [hoverHint, setHoverHint] = useState(false);

  return (
    <div className={styles.meter} data-severity={severity}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>bandwidth</span>
        <button
          type="button"
          aria-label="Show weight assumptions"
          className={styles.meterHintBtn}
          onMouseEnter={() => setHoverHint(true)}
          onMouseLeave={() => setHoverHint(false)}
          onFocus={() => setHoverHint(true)}
          onBlur={() => setHoverHint(false)}
          onClick={() => setHoverHint((v) => !v)}
        >
          ?
        </button>
      </div>

      <motion.div
        key={`${splitEnabled}-value`}
        className={styles.meterValue}
        animate={{
          color:
            severity === "alarm"
              ? "var(--color-error, #e5534b)"
              : severity === "warn"
                ? "var(--color-accent)"
                : "var(--color-text)",
        }}
        transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
      >
        {formatBytes(totalKB)}
      </motion.div>

      <div className={styles.meterTrack}>
        <motion.div
          className={styles.meterFill}
          data-severity={severity}
          animate={{ width: `${fillPct}%` }}
          transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
        />
      </div>

      <AnimatePresence>
        {hoverHint && (
          <motion.div
            role="tooltip"
            className={styles.meterHint}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
          >
            <p className={styles.meterHintLine}>
              <span>ImageSummary</span>
              <span>~8 KB</span>
            </p>
            <p className={styles.meterHintLine}>
              <span>ImageDetail</span>
              <span>~800 KB</span>
            </p>
            <p className={styles.meterHintNote}>
              Sums only network transfers. Prop passing and callbacks weigh nothing.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
