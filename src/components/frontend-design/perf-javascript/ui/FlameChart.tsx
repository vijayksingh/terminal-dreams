"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  SCRIPT_BY_ID,
  chartSpanMs,
  type FlameBlock,
  type InputEvent,
  type ScriptId,
} from "../engine/js-perf-simulator";
import styles from "../JavaScriptPerfLab.module.css";

interface FlameChartProps {
  blocks: FlameBlock[];
  firstPaintMs?: number;
  highlightId?: ScriptId;
  ttiMs: number;
  ttiRating: "good" | "needs-improvement" | "poor";
  longTaskCount: number;
  clickEvent?: InputEvent;
}

export function FlameChart({
  blocks,
  firstPaintMs,
  highlightId,
  ttiMs,
  ttiRating,
  longTaskCount,
  clickEvent,
}: FlameChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const span = useMemo(() => chartSpanMs(blocks), [blocks]);
  const hasWorker = blocks.some((b) => b.lane === "worker");

  const ticks = useMemo(() => {
    const result: number[] = [];
    const step = span > 3000 ? 1000 : 500;
    for (let t = 0; t <= span; t += step) result.push(t);
    return result;
  }, [span]);

  return (
    <div className={styles.flameChart}>
      <div className={styles.flameChartHeader}>
        <div className={styles.ttiPill} data-rating={ttiRating}>
          <span className={styles.ttiPillLabel}>TTI</span>
          <motion.span
            key={ttiMs}
            className={styles.ttiPillValue}
            initial={reducedMotion ? false : { scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING.snappy}
          >
            {(ttiMs / 1000).toFixed(2)}s
          </motion.span>
        </div>
        <div className={styles.longTaskPill} data-count={longTaskCount}>
          {longTaskCount > 0
            ? `${longTaskCount} long task${longTaskCount === 1 ? "" : "s"}`
            : "no long tasks"}
        </div>
      </div>

      <div className={styles.flameRuler}>
        {ticks.map((t) => (
          <span
            key={t}
            className={styles.flameRulerTick}
            style={{ left: `${(t / span) * 100}%` }}
          >
            <span className={styles.flameRulerLabel}>
              {t === 0 ? "0s" : `${(t / 1000).toFixed(1)}s`}
            </span>
          </span>
        ))}
      </div>

      <div className={styles.flameLane}>
        <span className={styles.flameLaneLabel}>Main</span>
        <div className={styles.flameLaneTrack}>
          {blocks
            .filter((b) => b.lane === "main")
            .map((b, i) => (
              <FlameBlockEl
                key={`m-${b.scriptId}-${i}-${b.startMs}`}
                block={b}
                span={span}
                highlightId={highlightId}
                reducedMotion={reducedMotion}
                isDeferred={firstPaintMs !== undefined && b.startMs >= firstPaintMs - 20}
              />
            ))}
          {firstPaintMs !== undefined && (
            <div
              className={styles.firstPaintLine}
              style={{ left: `${(firstPaintMs / span) * 100}%` }}
            >
              <span className={styles.firstPaintLabel}>First Paint</span>
            </div>
          )}
          {clickEvent && (
            <div
              className={styles.clickEvent}
              style={{ left: `${(clickEvent.clickMs / span) * 100}%` }}
              aria-label={`User click at ${clickEvent.clickMs}ms, handled at ${clickEvent.handledMs}ms`}
            >
              <span className={styles.clickEventIcon} aria-hidden>
                {/* triangular pointer-down indicator */}
                <svg viewBox="0 0 12 12" width="12" height="12">
                  <polygon
                    points="6,0 12,10 0,10"
                    fill="var(--color-text)"
                    transform="rotate(180 6 6)"
                  />
                </svg>
              </span>
              <span className={styles.clickEventLabel}>click</span>
              <span
                className={styles.clickEventWait}
                style={{
                  width: `${((clickEvent.handledMs - clickEvent.clickMs) / span) * 100}%`,
                }}
                title={`Input delay ≈ ${clickEvent.delayMs} ms`}
              >
                <span className={styles.clickEventWaitLabel}>
                  ~{clickEvent.delayMs}ms wait
                </span>
              </span>
            </div>
          )}
          <div
            className={styles.ttiMarker}
            style={{ left: `${(ttiMs / span) * 100}%` }}
            data-rating={ttiRating}
          >
            <span className={styles.ttiMarkerLabel}>TTI</span>
          </div>
        </div>
      </div>

      <div
        className={styles.flameLane}
        data-active={hasWorker ? "true" : undefined}
        data-lane="worker"
      >
        <span className={styles.flameLaneLabel}>Worker</span>
        <div className={styles.flameLaneTrack}>
          {hasWorker ? (
            blocks
              .filter((b) => b.lane === "worker")
              .map((b, i) => (
                <FlameBlockEl
                  key={`w-${b.scriptId}-${i}`}
                  block={b}
                  span={span}
                  highlightId={highlightId}
                  reducedMotion={reducedMotion}
                />
              ))
          ) : (
            <span className={styles.flameLaneEmpty}>spawn a worker to use this lane</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FlameBlockEl({
  block,
  span,
  highlightId,
  reducedMotion,
  isDeferred,
}: {
  block: FlameBlock;
  span: number;
  highlightId?: ScriptId;
  reducedMotion: boolean;
  isDeferred?: boolean;
}) {
  const s = SCRIPT_BY_ID[block.scriptId];
  const left = (block.startMs / span) * 100;
  const width = (block.durationMs / span) * 100;
  const widthPct = (block.durationMs / span) * 100;
  const highlighted = highlightId === block.scriptId;
  // Hide the warning triangle on narrow blocks where it would overflow the label.
  const showWarning = block.isLongTask && widthPct > 4;

  return (
    <motion.div
      className={styles.flameBlock}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: s.color,
      }}
      data-long={block.isLongTask ? "true" : undefined}
      data-highlight={highlighted ? "true" : undefined}
      data-deferred={isDeferred ? "true" : undefined}
      initial={reducedMotion ? false : { opacity: 0, scaleX: 0.7 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={SPRING.snappy}
      title={`${s.label} — ${block.durationMs} ms${block.isLongTask ? " (long task)" : ""}${isDeferred ? " (deferred — past first paint)" : ""}`}
    >
      {width > 6 && (
        <span className={styles.flameBlockLabel}>
          {s.label.replace(".js", "")} · {block.durationMs}ms
        </span>
      )}
      {showWarning && (
        <span className={styles.flameWarning} aria-hidden>
          {/* triangle long-task indicator */}
          <svg viewBox="0 0 12 12" width="10" height="10">
            <polygon points="6,1 11,11 1,11" fill="var(--color-error)" stroke="var(--color-bg)" strokeWidth="0.6" />
            <text x="6" y="10" textAnchor="middle" fontSize="6" fontWeight="800" fill="var(--color-bg)">
              !
            </text>
          </svg>
        </span>
      )}
    </motion.div>
  );
}
