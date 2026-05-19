"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useRef, useCallback, useMemo } from "react";
import styles from "./ScrollPipelineExplorer.module.css";

const TOTAL_ITEMS = 500;
const ITEM_HEIGHT = 36;
const VIEWPORT_HEIGHT = 360;

type Phase = 1 | 2 | 3 | 4;

const PHASE_META: Record<
  Phase,
  { label: string; desc: string; explainClass: string }
> = {
  1: {
    label: "Render All",
    desc: "Every item is a DOM node. No windowing.",
    explainClass: styles.phaseExplain1,
  },
  2: {
    label: "Spacer + Window",
    desc: "A tall spacer fakes the scroll height. Only visible items are mounted.",
    explainClass: styles.phaseExplain2,
  },
  3: {
    label: "Transform Position",
    desc: "Items use translateY() — compositor-only, no layout recalc.",
    explainClass: styles.phaseExplain3,
  },
  4: {
    label: "Overscan Buffer",
    desc: "Extra items above/below prevent blank flashes during fast scroll.",
    explainClass: styles.phaseExplain4,
  },
};

const OVERSCAN = 3;

export function ScrollPipelineExplorer() {
  const [phase, setPhase] = useState<Phase>(1);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  const totalHeight = TOTAL_ITEMS * ITEM_HEIGHT;

  // ── Windowed range (phases 2-4) ──
  const viewStart = Math.floor(scrollTop / ITEM_HEIGHT);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT);
  const viewEnd = Math.min(TOTAL_ITEMS - 1, viewStart + visibleCount - 1);

  const renderStart =
    phase >= 4 ? Math.max(0, viewStart - OVERSCAN) : viewStart;
  const renderEnd =
    phase >= 4
      ? Math.min(TOTAL_ITEMS - 1, viewEnd + OVERSCAN)
      : viewEnd;

  const windowedCount = renderEnd - renderStart + 1;

  // ── Build item list per phase ──
  const items = useMemo(() => {
    if (phase === 1) {
      return Array.from({ length: TOTAL_ITEMS }, (_, i) => ({
        index: i,
        y: 0,
        positioned: false,
        inViewport: false,
        isOverscan: false,
      }));
    }

    const arr = [];
    for (let i = renderStart; i <= renderEnd; i++) {
      arr.push({
        index: i,
        y: i * ITEM_HEIGHT,
        positioned: phase >= 3,
        inViewport: i >= viewStart && i <= viewEnd,
        isOverscan: phase >= 4 && (i < viewStart || i > viewEnd),
      });
    }
    return arr;
  }, [phase, renderStart, renderEnd, viewStart, viewEnd]);

  const domCount = items.length;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(Math.round(e.currentTarget.scrollTop));
    },
    [],
  );

  const handlePhaseChange = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  // ── Per-phase DOM counts for comparison bars ──
  const phaseCounts: Record<Phase, number> = {
    1: TOTAL_ITEMS,
    2: visibleCount,
    3: visibleCount,
    4: visibleCount + OVERSCAN * 2,
  };
  const maxCount = TOTAL_ITEMS;

  const meta = PHASE_META[phase];

  return (
    <div className={styles.root}>
      <DemoSandbox title="Scroll Pipeline">
        {/* ── Phase selector ── */}
        <div className={styles.phases} role="tablist" aria-label="Optimization phases">
          {([1, 2, 3, 4] as Phase[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={p === phase}
              className={
                p === phase ? styles.phaseBtnActive : styles.phaseBtn
              }
              onClick={() => handlePhaseChange(p)}
              style={
                p === phase
                  ? ({
                      "--pipe-active": `var(--pipe-phase${p})`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <span className={styles.phaseNum}>Phase {p}</span>
              <span className={styles.phaseName}>
                {PHASE_META[p].label}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.layout}>
          {/* ── Scroll area ── */}
          <div className={styles.scrollArea}>
            <div
              ref={scrollerRef}
              className={styles.scroller}
              onScroll={handleScroll}
              style={{ height: VIEWPORT_HEIGHT }}
              role="list"
              aria-label={`Virtual list — Phase ${phase}: ${meta.label}`}
            >
              {phase === 1 ? (
                /* Phase 1: naive — normal flow, no spacer */
                <div ref={spacerRef}>
                  {items.map((item) => (
                    <div
                      key={item.index}
                      role="listitem"
                      className={styles.rowNaive}
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <span className={styles.rowIdx}>#{item.index}</span>
                      <span className={styles.rowDetail}>
                        DOM node #{item.index + 1} of {TOTAL_ITEMS}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Phases 2-4: spacer + positioned items */
                <div
                  ref={spacerRef}
                  className={
                    phase === 2 ? styles.spacerWithGuide : styles.spacer
                  }
                  style={{ height: totalHeight }}
                >
                  {items.map((item) => {
                    const cls = item.isOverscan
                      ? styles.rowOverscan
                      : item.positioned
                        ? styles.rowTransform
                        : styles.rowVisible;

                    const positionStyle: React.CSSProperties =
                      item.positioned
                        ? {
                            transform: `translateY(${item.y}px)`,
                            height: ITEM_HEIGHT,
                          }
                        : {
                            top: item.y,
                            height: ITEM_HEIGHT,
                          };

                    return (
                      <div
                        key={item.index}
                        role="listitem"
                        className={cls}
                        style={positionStyle}
                      >
                        <span className={styles.rowIdx}>#{item.index}</span>
                        <span className={styles.rowDetail}>
                          {item.positioned
                            ? `translateY(${item.y}px)`
                            : `top: ${item.y}px`}
                          {item.isOverscan ? " (overscan)" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Phase explanation */}
            <div className={meta.explainClass}>
              {meta.desc}
            </div>
          </div>

          {/* ── Metrics panel ── */}
          <div>
            <div
              className={styles.metrics}
              role="region"
              aria-label="Phase metrics"
              aria-live="polite"
            >
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>DOM nodes</span>
                <span
                  className={
                    phase === 1 ? styles.metricBad : styles.metricGood
                  }
                >
                  {domCount}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Total items</span>
                <span className={styles.metricValue}>{TOTAL_ITEMS}</span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Savings</span>
                <span
                  className={
                    phase === 1 ? styles.metricBad : styles.metricGood
                  }
                >
                  {phase === 1
                    ? "0%"
                    : `${Math.round((1 - windowedCount / TOTAL_ITEMS) * 100)}%`}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Positioning</span>
                <span className={styles.metricValue}>
                  {phase <= 2 ? "top/left" : "transform"}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Overscan</span>
                <span className={styles.metricValue}>
                  {phase >= 4 ? `±${OVERSCAN}` : "none"}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Layout cost</span>
                <span
                  className={
                    phase >= 3 ? styles.metricGood : styles.metricBad
                  }
                >
                  {phase === 1
                    ? "~8ms"
                    : phase === 2
                      ? "~5ms"
                      : "<0.1ms"}
                </span>
              </div>
              <div className={styles.frameBudget}>
                <span className={styles.metricLabel}>Frame budget</span>
                <div className={styles.frameBudgetTrack}>
                  <div
                    className={
                      phase >= 3
                        ? styles.frameBudgetFillGood
                        : styles.frameBudgetFillBad
                    }
                    style={{
                      width:
                        phase === 1
                          ? "50%"
                          : phase === 2
                            ? "31%"
                            : "2%",
                    }}
                  />
                  <span className={styles.frameBudgetLabel}>
                    {phase >= 3 ? "15.9ms free" : phase === 2 ? "11ms free" : "8ms free"} / 16ms
                  </span>
                </div>
              </div>
            </div>

            {/* DOM count comparison bars */}
            <div className={styles.domBars}>
              <div className={styles.domBarLabel}>
                DOM nodes per phase
              </div>
              {([1, 2, 3, 4] as Phase[]).map((p) => {
                const count = phaseCounts[p];
                const pct = (count / maxCount) * 100;
                const isActive = p === phase;
                const color = `var(--pipe-phase${p})`;

                return (
                  <div key={p} className={styles.domBarRow}>
                    <span className={styles.domBarPhase}>{p}</span>
                    <div className={styles.domBarTrack}>
                      <div
                        className={
                          isActive
                            ? styles.domBarFillActive
                            : styles.domBarFillInactive
                        }
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span
                      className={styles.domBarCount}
                      style={{ color: isActive ? color : undefined }}
                    >
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DemoSandbox.Caption>
          Click each phase to see the optimization stack. Phase 1 renders
          everything. Phase 4 renders only what you need.
        </DemoSandbox.Caption>
      </DemoSandbox>
    </div>
  );
}
