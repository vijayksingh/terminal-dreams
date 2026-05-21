"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useAssetsPerf } from "../assets-perf-context";
import {
  FONT_DISPLAY_NOTES,
  FONT_STRATEGY_LABEL,
  SIZE_ADJUST_SNIPPET,
  type FontStrategy,
} from "../engine/font-cls-engine";
import styles from "../OtherAssetsPerfLab.module.css";

const STRATEGIES: FontStrategy[] = [
  "default",
  "swap",
  "fallback",
  "optional",
  "size-adjusted",
];

const FONT_PARAGRAPH =
  "Performance Matters. A 200 KB font that arrives 600 ms late will push every paragraph down two pixels — small enough to ignore, large enough to fail CLS.";

export function FontPagePreview() {
  const reducedMotion = usePrefersReducedMotion();
  const { fontStrategy, setFontStrategy, fontFrame } = useAssetsPerf();

  const clsColor =
    fontFrame.cls === 0
      ? "var(--color-success)"
      : fontFrame.cls < 0.1
        ? "var(--color-warning)"
        : "var(--color-error)";

  const shiftPx =
    fontFrame.fontSwapped && fontStrategy !== "size-adjusted" ? 4 : 0;
  const headingShiftPx =
    fontFrame.fontSwapped && fontStrategy !== "size-adjusted" ? -2 : 0;

  return (
    <div className={styles.zonePane}>
      <header className={styles.paneHeader}>
        <span className={styles.paneLabel}>Live preview</span>
        <span className={styles.paneSub}>
          Same paragraph, replayed under each <code>font-display</code> value.
        </span>
      </header>

      <div className={styles.strategyChips} role="radiogroup" aria-label="font-display strategy">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.strategyChip}
            data-active={fontStrategy === s ? "true" : undefined}
            onClick={() => setFontStrategy(s)}
            role="radio"
            aria-checked={fontStrategy === s}
          >
            {FONT_STRATEGY_LABEL[s]}
          </button>
        ))}
      </div>

      <div className={styles.mockPageFrame}>
        <div className={styles.mockNav}>
          <span className={styles.mockNavDot} />
          <span className={styles.mockNavDot} />
          <span className={styles.mockNavDot} />
          <span className={styles.mockNavLabel}>
            font-display: {FONT_STRATEGY_LABEL[fontStrategy]}
          </span>
        </div>
        <div className={styles.mockBody}>
          <motion.h3
            className={styles.mockHeading}
            data-font={fontFrame.font}
            animate={reducedMotion ? undefined : { y: headingShiftPx }}
            transition={SPRING.snappy}
          >
            {fontFrame.textVisible ? "Performance Matters" : ""}
          </motion.h3>
          <motion.p
            className={styles.mockParagraph}
            data-font={fontFrame.font}
            animate={reducedMotion ? undefined : { y: shiftPx }}
            transition={SPRING.snappy}
          >
            {fontFrame.textVisible ? FONT_PARAGRAPH : ""}
          </motion.p>
          {!fontFrame.textVisible && fontStrategy === "default" && (
            <span className={styles.mockSpinner} aria-hidden>
              <span className={styles.mockSpinnerArc} />
            </span>
          )}
        </div>
        <div className={styles.mockFooter}>
          <span className={styles.mockMeter}>
            <span className={styles.mockMeterLabel}>CLS</span>
            <motion.span
              className={styles.mockMeterValue}
              style={{ color: clsColor, borderColor: clsColor }}
              key={fontFrame.cls}
              initial={reducedMotion ? false : { scale: 0.94 }}
              animate={{ scale: 1 }}
              transition={SPRING.gentle}
            >
              {fontFrame.cls.toFixed(2)}
            </motion.span>
          </span>
          <span className={styles.mockMeter}>
            <span className={styles.mockMeterLabel}>Phase</span>
            <span className={styles.mockMeterPhase}>
              {!fontFrame.textVisible
                ? "blank — text invisible"
                : fontFrame.fontSwapped
                  ? fontStrategy === "size-adjusted"
                    ? "swapped — no shift"
                    : "swapped — shift recorded"
                  : "fallback rendering"}
            </span>
          </span>
        </div>
      </div>

      <div className={styles.strategyNote}>
        <span className={styles.strategyNoteTitle}>
          {FONT_STRATEGY_LABEL[fontStrategy]}
        </span>
        <span className={styles.strategyNoteBody}>
          {FONT_DISPLAY_NOTES[fontStrategy]}
        </span>
      </div>

      {fontStrategy === "size-adjusted" && (
        <motion.div
          className={styles.codeReveal}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.gentle}
        >
          <span className={styles.codeRevealLabel}>The override that pays</span>
          <pre className={styles.codeBlock}>
            <code>{SIZE_ADJUST_SNIPPET}</code>
          </pre>
        </motion.div>
      )}
    </div>
  );
}
