"use client";

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePerfContext } from "../perf-context";
import { computePerformance, getCWVRating } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

// ── CLS source data ────────────────────────────────────────────────

const SHIFT_SOURCES = [
  { source: "Hero image", shift: 0.12 },
  { source: "Font swap", shift: 0.11 },
  { source: "Ad injection", shift: 0.08 },
  { source: "Late widget", shift: 0.02 },
];

const SHUFFLED_SOURCES = [
  SHIFT_SOURCES[2],
  SHIFT_SOURCES[0],
  SHIFT_SOURCES[3],
  SHIFT_SOURCES[1],
];

// ── Layout stability widget (Step 11) ──────────────────────────────

export function LayoutStabilityWidget() {
  const { enabledOptimizations, metrics } = usePerfContext();
  const on = enabledOptimizations.has("layoutStability");
  const [order, setOrder] = useState(() => SHUFFLED_SOURCES.map((s) => s.source));
  const [dragging, setDragging] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const correctOrder = SHIFT_SOURCES.map((s) => s.source);
  const rankCorrect = revealed && correctOrder.every((src, i) => order[i] === src);

  const handleDragStart = (source: string, e: React.PointerEvent) => {
    if (revealed) return;
    setDragging(source);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragging || !listRef.current) return;
    const rect = listRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowHeight = rect.height / order.length;
    const targetIndex = Math.max(0, Math.min(order.length - 1, Math.floor(y / rowHeight)));
    const currentIndex = order.indexOf(dragging);
    if (targetIndex !== currentIndex) {
      setOrder((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, dragging);
        return next;
      });
    }
  };

  const handleDragEnd = () => setDragging(null);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Layout Shift Sources</div>

      {!revealed ? (
        <>
          <p className={styles.widgetNote}>
            Drag to reorder — highest CLS impact at the top, lowest at the bottom:
          </p>
          <div
            className={styles.shiftRankGrid}
            ref={listRef}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            {order.map((source, i) => (
              <motion.div
                key={source}
                layout
                transition={SPRING.snappy}
                className={styles.shiftRankRow}
                data-dragging={dragging === source ? "true" : undefined}
                onPointerDown={(e) => handleDragStart(source, e)}
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
              >
                <span className={styles.shiftRankPosition}>{i + 1}</span>
                <span className={styles.shiftRankName}>{source}</span>
                <span className={styles.shiftRankHandle}>⠿</span>
              </motion.div>
            ))}
          </div>
          <button type="button" className={styles.cacheSubmitButton} onClick={() => setRevealed(true)}>
            Check ranking
          </button>
        </>
      ) : (
        <>
          <div className={styles.predictionResult} data-correct={rankCorrect ? "true" : undefined}>
            <span className={styles.predictionResultIcon}>{rankCorrect ? "✓" : "✗"}</span>
            <span>
              {rankCorrect
                ? "Perfect ranking — hero image (0.12) > font swap (0.11) > ad injection (0.08) > late widget (0.02)."
                : "The correct order: Hero image (0.12) > Font swap (0.11) > Ad injection (0.08) > Late widget (0.02). The hero is the largest element and displaces the most viewport area."}
            </span>
          </div>
          <div className={styles.shiftGrid}>
            {metrics.clsSources.map((cs) => (
              <div key={cs.source} className={styles.shiftRow} data-fixed-earlier={cs.fixed ? "true" : undefined}>
                <span className={styles.shiftSource}>{cs.source}</span>
                <div className={styles.shiftBarWrap}>
                  <div
                    className={styles.shiftBar}
                    data-state={cs.fixed ? "fixed" : "shifting"}
                    style={{ width: cs.fixed ? "2%" : `${(cs.shift / 0.15) * 100}%` }}
                  />
                </div>
                <span className={styles.shiftValue} data-state={cs.fixed ? "fixed" : "shifting"}>
                  {cs.fixed ? "0" : cs.shift.toFixed(2)}
                </span>
                <span className={styles.shiftFormula}>
                  {cs.fixed
                    ? "fixed"
                    : `${cs.viewportFrac.toFixed(2)} × ${cs.distFrac.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.clsTotal}>
            Total CLS: <strong data-status={metrics.cls <= 0.1 ? "good" : "bad"}>
              {metrics.cls.toFixed(2)}
            </strong>
            <span className={styles.clsTarget}>(target: &le; 0.10)</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Milestone checkpoint ───────────────────────────────────────────

export function MilestoneCheckpoint() {
  const { metrics, activeProfile: nw } = usePerfContext();

  const baseline = useMemo(
    () => computePerformance(new Set(), nw),
    [nw],
  );

  const items = [
    { label: "LCP", before: baseline.metrics.lcp, after: metrics.lcp, unit: "ms", threshold: 2500 },
    { label: "INP", before: baseline.metrics.inp, after: metrics.inp, unit: "ms", threshold: 200 },
    { label: "CLS", before: baseline.metrics.cls, after: metrics.cls, unit: "", threshold: 0.1 },
  ];

  const allPassing = items.every((i) => i.after <= i.threshold);

  return (
    <div className={styles.milestoneSummary} data-passing={allPassing ? "true" : undefined}>
      <div className={styles.milestoneTitle}>
        {allPassing ? "All Core Web Vitals passing" : "Checkpoint: targeted optimizations done"}
      </div>
      <div className={styles.milestoneGrid}>
        {items.map((item) => {
          const pctDrop = item.before > 0 ? Math.round(((item.before - item.after) / item.before) * 100) : 0;
          const rating = getCWVRating(item.label.toLowerCase(), item.after);
          return (
            <div key={item.label} className={styles.milestoneMetric}>
              <span className={styles.milestoneMetricLabel}>{item.label}</span>
              <span className={styles.milestoneMetricBefore}>
                {item.unit === "ms" ? `${item.before}${item.unit}` : item.before.toFixed(2)}
              </span>
              <span className={styles.milestoneMetricAfter} data-rating={rating}>
                {item.unit === "ms" ? `${item.after}${item.unit}` : item.after.toFixed(2)}
              </span>
              {pctDrop > 0 && <span className={styles.milestonePercent}>-{pctDrop}%</span>}
            </div>
          );
        })}
      </div>
      <p className={styles.widgetNote}>
        {allPassing
          ? "The patient is recovering — but can it survive the real world? Steps 12-15 stress-test with caching, prefetching, budgets, and field data."
          : "Toggle more optimizations above to bring all three metrics into the green. Steps 12-15 add the infrastructure to keep them there."}
      </p>
    </div>
  );
}
