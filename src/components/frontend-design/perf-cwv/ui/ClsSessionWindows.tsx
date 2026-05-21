"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useCwvContext, CLS_SHIFTS } from "../cwv-context";
import { computeCls, formatCls, rateCls } from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

const TIMELINE_END_MS = 6000;
// Step animation: replay each shift in real time so the session-window
// behaviour (1s gap, max 5s window) is visible — not just summed at the end.

export function ClsSessionWindows() {
  const { clsWindows, clsValue, clsRating, replayCls, clsReplayKey } = useCwvContext();
  const noMotion = usePrefersReducedMotion();
  const [visibleCount, setVisibleCount] = useState(noMotion ? CLS_SHIFTS.length : 0);

  useEffect(() => {
    if (noMotion) {
      setVisibleCount(CLS_SHIFTS.length);
      return;
    }
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    CLS_SHIFTS.forEach((shift, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 500 + i * 700));
    });
    return () => timers.forEach(clearTimeout);
  }, [clsReplayKey, noMotion]);

  const visibleShifts = CLS_SHIFTS.slice(0, visibleCount);
  const sumOfAllShifts = CLS_SHIFTS.reduce((acc, s) => acc + s.score, 0);
  // Mid-animation CLS = the largest session window across the shifts already
  // visible on the timeline. This is what the spec computes incrementally,
  // and it lets learners watch the worst window grow shift-by-shift.
  const partialCls = computeCls(visibleShifts);

  return (
    <div className={styles.clsRoot}>
      <div className={styles.clsHeader}>
        <div className={styles.clsTotal} data-rating={clsRating}>
          <span className={styles.clsTotalLabel}>CLS (largest session window)</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${visibleCount}-${clsValue}`}
              className={styles.clsTotalValue}
              data-rating={clsRating}
              initial={noMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={noMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={SPRING.snappy}
            >
              {formatCls(visibleCount >= CLS_SHIFTS.length ? clsValue : partialCls)}
            </motion.span>
          </AnimatePresence>
          <span className={styles.clsTotalThreshold}>target ≤ 0.10</span>
        </div>
        <button
          type="button"
          className={styles.clsReplayBtn}
          onClick={replayCls}
          aria-label="Replay layout-shift sequence"
        >
          Replay shifts
        </button>
      </div>

      <div className={styles.clsBugCallout}>
        Sum of every shift would be <strong>{formatCls(sumOfAllShifts)}</strong>, but CLS reports only the largest <strong>session window</strong>: 1s gap, max 5s.
      </div>

      <div className={styles.clsTimeline}>
        <div className={styles.clsTimelineAxis} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((s) => (
            <span key={s} className={styles.clsTimelineTick} style={{ left: `${(s / (TIMELINE_END_MS / 1000)) * 100}%` }}>
              {s}s
            </span>
          ))}
        </div>

        {clsWindows.map((window, i) => {
          const allLanded = window.shifts.every((s) => visibleShifts.some((vs) => vs.id === s.id));
          const left = (window.startMs / TIMELINE_END_MS) * 100;
          const width = (Math.max(window.endMs - window.startMs, 200) / TIMELINE_END_MS) * 100;
          return (
            <motion.div
              key={i}
              className={styles.clsWindowBand}
              style={{ left: `${left}%`, width: `${width}%` }}
              initial={noMotion ? false : { opacity: 0 }}
              animate={{ opacity: allLanded ? 1 : 0.35 }}
              transition={TRANSITION.crossfade}
              aria-label={`Session window ${i + 1}: ${formatCls(window.total)}`}
            >
              <span className={styles.clsWindowLabel}>window {i + 1}</span>
              <span className={styles.clsWindowScore} data-rating={rateCls(window.total)}>
                {formatCls(window.total)}
              </span>
            </motion.div>
          );
        })}

        {visibleShifts.map((shift) => (
          <motion.div
            key={`${clsReplayKey}-${shift.id}`}
            className={styles.clsShiftMarker}
            style={{ left: `${(shift.atMs / TIMELINE_END_MS) * 100}%` }}
            initial={noMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING.snappy}
            data-rating={rateCls(shift.score)}
            title={`${shift.source} — ${formatCls(shift.score)}`}
          >
            <span className={styles.clsShiftDot} data-rating={rateCls(shift.score)} />
            <span className={styles.clsShiftLabel}>{shift.source}</span>
            <span className={styles.clsShiftScore}>{formatCls(shift.score)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
