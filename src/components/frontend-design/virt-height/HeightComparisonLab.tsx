"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import {
  HeightProvider,
  useHeightContext,
  STEP_LABELS,
  STEP_TITLES,
  FIXED_HEIGHT,
  ITEM_COUNT,
  MAX_VAR_HEIGHT,
  binarySearchOffset,
  buildOffsets,
} from "./height-context";
import styles from "./HeightComparisonLab.module.css";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

export function HeightComparisonLab({ activeStep }: { activeStep: number }) {
  return (
    <HeightProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={[...STEP_LABELS]} />
        <div className={styles.scrollArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${activeStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION.enterCard}
            >
              <StepWidget />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </HeightProvider>
  );
}

function StepWidget() {
  const { activeStep } = useHeightContext();
  switch (activeStep) {
    case 1: return <ProblemOverview />;
    case 2: return <FixedHeightView />;
    case 3: return <PrefixSumView />;
    case 4: return <BinarySearchView />;
    case 5: return <EstimationView />;
    case 6: return <ResizeObserverView />;
    default: return null;
  }
}

// ── Step 1: The Position Problem ───────────────────────────────────

function ProblemOverview() {
  const { varHeights } = useHeightContext();
  const visibleCount = 12;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>The Position Problem</div>
        <p className={styles.widgetNote}>
          A virtual scroller only renders visible items. To know <em>which</em> items are visible at a given scroll position, you need to map <code>scrollTop → item index</code>. The cost of that lookup depends on whether items have the same height.
        </p>
      </div>

      <div className={styles.comparison}>
        <div className={styles.compCard}>
          <div className={styles.compTitle}>
            Fixed Height <span className={styles.compBigO}>O(1)</span>
          </div>
          <div className={styles.itemList}>
            {Array.from({ length: visibleCount }, (_, i) => (
              <div key={i} className={styles.itemRow} style={{ height: FIXED_HEIGHT }}>
                <span className={styles.itemIdx}>{i}</span>
                <div className={styles.itemBar}>
                  <div className={styles.itemBarFill} style={{ width: "60%" }} />
                </div>
                <span className={styles.itemHeight}>{FIXED_HEIGHT}px</span>
              </div>
            ))}
          </div>
          <div className={styles.compNote}>
            All items identical — one division finds any item
          </div>
        </div>

        <div className={styles.compCard}>
          <div className={styles.compTitle}>
            Variable Height <span className={styles.compBigO}>O(log n)</span>
          </div>
          <div className={styles.itemList}>
            {varHeights.slice(0, visibleCount).map((h, i) => (
              <div key={i} className={styles.itemRow} style={{ height: Math.max(24, h * 0.5) }}>
                <span className={styles.itemIdx}>{i}</span>
                <div className={styles.itemBar}>
                  <div className={styles.itemBarFill} style={{ width: `${(h / MAX_VAR_HEIGHT) * 100}%` }} />
                </div>
                <span className={styles.itemHeight}>{h}px</span>
              </div>
            ))}
          </div>
          <div className={styles.compNote}>
            Heights vary — binary search on prefix sums
          </div>
        </div>
      </div>
    </>
  );
}

// ── Step 2: Fixed Height O(1) ──────────────────────────────────────

function FixedHeightView() {
  const [scrollTop, setScrollTop] = useState(3200);

  const idx = Math.floor(scrollTop / FIXED_HEIGHT);
  const position = idx * FIXED_HEIGHT;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Fixed Height: Direct Math</div>
        <p className={styles.widgetNote}>
          When every item is <code>{FIXED_HEIGHT}px</code> tall, position is pure multiplication. Drag the scroll position to watch the formula compute instantly.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <label className={styles.widgetNote}>
          <strong>scrollTop:</strong> {scrollTop}px
          <input
            type="range"
            min={0}
            max={(ITEM_COUNT - 1) * FIXED_HEIGHT}
            value={scrollTop}
            onChange={(e) => setScrollTop(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
          />
        </label>
      </div>

      <div className={styles.formula}>
        <div>
          floor(<span className={styles.formulaVal}>{scrollTop}</span> / <span className={styles.formulaVal}>{FIXED_HEIGHT}</span>) = <span className={styles.formulaResult}>#{idx}</span>
          <span className={styles.formulaBadge}>O(1)</span>
        </div>
        <div style={{ fontSize: "0.58rem", color: "var(--color-muted)", fontWeight: 400, marginTop: "var(--space-1)" }}>
          position of item #{idx} = {idx} × {FIXED_HEIGHT} = {position}px
        </div>
      </div>

      <div className={styles.itemList} style={{ maxHeight: 200, overflow: "hidden" }}>
        {Array.from({ length: Math.min(10, ITEM_COUNT) }, (_, i) => {
          const itemIdx = Math.max(0, idx - 3) + i;
          if (itemIdx >= ITEM_COUNT) return null;
          return (
            <div key={itemIdx} className={styles.itemRow} data-highlight={itemIdx === idx ? "true" : undefined} style={{ height: FIXED_HEIGHT }}>
              <span className={styles.itemIdx}>{itemIdx}</span>
              <div className={styles.itemBar}>
                <div className={styles.itemBarFill} style={{ width: "60%" }} />
              </div>
              <span className={styles.itemHeight}>{FIXED_HEIGHT}px</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Step 3: Prefix Sums ────────────────────────────────────────────

function PrefixSumView() {
  const { varHeights, varOffsets } = useHeightContext();
  const [highlightIdx, setHighlightIdx] = useState(5);
  const showCount = 15;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Prefix Sum Array</div>
        <p className={styles.widgetNote}>
          With variable heights, build a cumulative offset table: <code>offsets[i] = sum of heights 0..i-1</code>. Built once in O(n), queried many times.
        </p>
      </div>

      <div className={styles.heightBars}>
        {varHeights.slice(0, showCount).map((h, i) => (
          <div
            key={i}
            className={styles.heightBarItem}
            data-measured="true"
            style={{ height: `${(h / MAX_VAR_HEIGHT) * 100}%` }}
            onMouseEnter={() => setHighlightIdx(i)}
          />
        ))}
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>offsets[]</div>
        <div className={styles.offsetArray}>
          {varOffsets.slice(0, showCount + 1).map((offset, i) => (
            <div key={i} className={styles.offsetCell} data-active={i === highlightIdx ? "true" : undefined}>
              <span className={styles.offsetIdx}>[{i}]</span>
              <span className={styles.offsetVal}>{offset}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formula}>
        <div style={{ fontSize: "0.62rem" }}>
          offsets[<span className={styles.formulaVal}>{highlightIdx}</span>] = <span className={styles.formulaResult}>{varOffsets[highlightIdx]}px</span>
          {highlightIdx > 0 && (
            <span style={{ color: "var(--color-muted)", fontSize: "0.56rem", display: "block", marginTop: 4 }}>
              = offsets[{highlightIdx - 1}] + heights[{highlightIdx - 1}] = {varOffsets[highlightIdx - 1]} + {varHeights[highlightIdx - 1]}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ── Step 4: Binary Search ──────────────────────────────────────────

function BinarySearchView() {
  const { varOffsets } = useHeightContext();
  const [scrollTop, setScrollTop] = useState(1800);
  const [revealedSteps, setRevealedSteps] = useState(Infinity);
  const [stepping, setStepping] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = useMemo(() => binarySearchOffset(varOffsets, scrollTop), [varOffsets, scrollTop]);
  const visibleSteps = stepping ? result.steps.slice(0, revealedSteps) : result.steps;

  useEffect(() => {
    if (!stepping || revealedSteps >= result.steps.length) return;
    autoTimer.current = setTimeout(() => setRevealedSteps((p) => p + 1), 250);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [stepping, revealedSteps, result.steps.length]);

  const startStepping = useCallback(() => {
    setStepping(true);
    setRevealedSteps(1);
  }, []);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Binary Search on Prefix Sums</div>
        <p className={styles.widgetNote}>
          Find which offset range contains <code>scrollTop</code>. Binary search narrows the range by half each step — O(log n).
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <label className={styles.widgetNote}>
          <strong>scrollTop:</strong> {scrollTop}px
          <input
            type="range"
            min={0}
            max={varOffsets[varOffsets.length - 1] - 340}
            value={scrollTop}
            onChange={(e) => {
              setScrollTop(Number(e.target.value));
              if (stepping) { setStepping(true); setRevealedSteps(1); }
            }}
            style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
          />
        </label>
      </div>

      <div className={styles.searchSteps}>
        {visibleSteps.map((step, si) => (
          <div key={si} className={styles.searchStep} data-final={step.final ? "true" : undefined}>
            <span className={styles.stepNum}>{si + 1}</span>
            <span className={styles.stepRange}>[{step.lo}..{step.hi}]</span>
            <span className={styles.stepMid}>mid={step.mid}</span>
            <span className={styles.stepOffset}>@{varOffsets[step.mid]}px</span>
          </div>
        ))}
      </div>

      <div className={styles.formula}>
        <span className={styles.formulaResult}>item #{result.index}</span>
        {" "}found in {result.steps.length} step{result.steps.length !== 1 ? "s" : ""}
        <span className={styles.formulaBadge}>O(log {ITEM_COUNT})</span>
      </div>

      <div style={{ display: "flex", gap: "var(--space-1)" }}>
        {!stepping ? (
          <button onClick={startStepping} type="button" style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
            padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-1)",
            border: "1px solid var(--diagram-layer-3)", background: "var(--color-bg)",
            color: "var(--diagram-layer-3)", cursor: "pointer",
          }}>
            Step through search
          </button>
        ) : (
          <button onClick={() => { setStepping(false); setRevealedSteps(Infinity); }} type="button" style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700,
            padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-1)",
            border: "1px solid var(--color-border)", background: "var(--color-bg)",
            color: "var(--color-text)", cursor: "pointer",
          }}>
            Show all
          </button>
        )}
      </div>
    </>
  );
}

// ── Step 5: Estimation ─────────────────────────────────────────────

function EstimationView() {
  const { varHeights } = useHeightContext();
  const estimatedHeight = 50;
  const showCount = 20;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>The Estimation Problem</div>
        <p className={styles.widgetNote}>
          You often don&apos;t know item heights until they render. Text wraps differently, images load asynchronously. Libraries use a <strong>two-phase approach</strong>: estimate first, measure after.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Estimated vs Actual Heights</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
          <div>
            <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "var(--color-warning)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Estimated (default {estimatedHeight}px)
            </div>
            <div className={styles.heightBars}>
              {Array.from({ length: showCount }, (_, i) => (
                <div key={i} className={styles.heightBarItem} data-estimated="true" style={{ height: `${(estimatedHeight / MAX_VAR_HEIGHT) * 100}%` }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "var(--diagram-layer-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Actual (measured)
            </div>
            <div className={styles.heightBars}>
              {varHeights.slice(0, showCount).map((h, i) => (
                <div key={i} className={styles.heightBarItem} data-measured="true" style={{ height: `${(h / MAX_VAR_HEIGHT) * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formula}>
        <div>
          Estimated total: <span className={styles.formulaVal}>{showCount * estimatedHeight}px</span>
          <br />
          Actual total: <span className={styles.formulaResult}>{varHeights.slice(0, showCount).reduce((a, b) => a + b, 0)}px</span>
          <br />
          <span style={{ fontSize: "0.58rem", color: "var(--color-warning)" }}>
            Δ = {Math.abs(showCount * estimatedHeight - varHeights.slice(0, showCount).reduce((a, b) => a + b, 0))}px scroll correction needed
          </span>
        </div>
      </div>
    </>
  );
}

// ── Step 6: ResizeObserver Correction ──────────────────────────────

function ResizeObserverView() {
  const [phase, setPhase] = useState(1);

  const phases = [
    { title: "Estimate", desc: "Use default height (50px) for all items. Build initial offset array. Render scrollbar." },
    { title: "Render", desc: "Mount visible items into the DOM. Each item renders at its natural height." },
    { title: "Measure", desc: "ResizeObserver fires for each rendered item. Capture actual height." },
    { title: "Correct", desc: "Replace estimated heights with measured ones. Recompute prefix sums. Adjust scroll position." },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Measure-and-Correct Cycle</div>
        <p className={styles.widgetNote}>
          Libraries like <code>@tanstack/virtual</code> run this cycle continuously as the user scrolls. The scrollbar adjusts as estimates are replaced with measurements.
        </p>
      </div>

      <div className={styles.timeline}>
        {phases.map((p, i) => (
          <div key={i} className={styles.timelinePhase} data-active={i + 1 === phase ? "true" : undefined} onClick={() => setPhase(i + 1)} style={{ cursor: "pointer" }}>
            <div className={styles.phaseNum}>{i + 1}</div>
            <div className={styles.phaseContent}>
              <div className={styles.phaseTitle}>{p.title}</div>
              <div className={styles.phaseDesc}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>ResizeObserver API</div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.58rem", lineHeight: 1.6,
          color: "var(--color-text)", padding: "var(--space-2)",
          borderRadius: "var(--radius-1)", background: "var(--color-bg)",
          border: "1px solid var(--color-border)", whiteSpace: "pre",
        }}>
{`const ro = new ResizeObserver(entries => {
  for (const entry of entries) {
    const height = entry.borderBoxSize[0]
      .blockSize;
    updateOffsets(entry.target.dataset.idx,
      height);
  }
});`}
        </div>
      </div>
    </>
  );
}
