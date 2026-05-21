"use client";

import { motion } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { RenderBlockingMode, RenderBlockingTimeline } from "../engine/css-perf-simulator";
import styles from "../CSSPerfLab.module.css";

const MODES: { id: RenderBlockingMode; label: string; cap: string }[] = [
  { id: "blocking", label: "Default", cap: "<link rel=stylesheet>" },
  { id: "deferred", label: "Deferred", cap: "media='print' onload" },
  { id: "inline", label: "Inline critical", cap: "<style> + deferred" },
];

export function RenderBlockingView({
  mode,
  setMode,
  timeline,
}: {
  mode: RenderBlockingMode;
  setMode: (m: RenderBlockingMode) => void;
  timeline: RenderBlockingTimeline;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const paintPct = Math.min((timeline.paintAt / 2000) * 100, 100);
  const parserPct = (timeline.parserReadyMs / 2000) * 100;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Render-Blocking Modes</div>
      <p className={styles.widgetNote}>
        Same 180 KB stylesheet; three loading strategies. Watch the paint marker move on the timeline below.
      </p>

      <div className={styles.modeChips} role="radiogroup" aria-label="Stylesheet loading mode">
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              className={styles.modeChip}
              data-active={on ? "true" : undefined}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m.id)}
            >
              <span className={styles.modeChipLabel}>{m.label}</span>
              <span className={styles.modeChipCaption}>{m.cap}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.timelineRow}>
        <span className={styles.timelineLabel}>Parser</span>
        <div className={styles.timelineTrack}>
          <motion.span
            className={styles.timelineMarker}
            data-type="parser"
            initial={reducedMotion ? false : { left: 0, opacity: 0 }}
            animate={{ left: `${parserPct}%`, opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          >
            DOM ready · {timeline.parserReadyMs}ms
          </motion.span>
        </div>
      </div>
      <div className={styles.timelineRow}>
        <span className={styles.timelineLabel}>Paint</span>
        <div className={styles.timelineTrack}>
          <motion.span
            className={styles.timelineMarker}
            data-type="paint"
            data-styled={timeline.paintedStyled ? "true" : "false"}
            initial={reducedMotion ? false : { left: 0 }}
            animate={{ left: `${paintPct}%` }}
            transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            {timeline.fcpLabel} {timeline.paintedStyled ? "(styled)" : "(unstyled flash)"}
          </motion.span>
        </div>
      </div>

      <motion.p
        key={timeline.mode}
        className={styles.captionBlock}
        initial={reducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
      >
        {timeline.caption}
      </motion.p>
    </div>
  );
}
