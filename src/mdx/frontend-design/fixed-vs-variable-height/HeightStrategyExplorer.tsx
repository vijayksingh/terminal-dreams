"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import styles from "./HeightStrategyExplorer.module.css";

type HeightMode = "fixed" | "variable";

const ITEM_COUNT = 50;
const FIXED_HEIGHT = 40;
const CONTAINER_HEIGHT = 340;
const MAX_VAR_HEIGHT = 96;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateVariableHeights(count: number): number[] {
  const rng = seededRandom(42);
  return Array.from({ length: count }, () =>
    Math.round(28 + rng() * (MAX_VAR_HEIGHT - 28)),
  );
}

function buildOffsets(heights: number[]): number[] {
  const offsets = [0];
  for (let i = 0; i < heights.length; i++) {
    offsets.push(offsets[i] + heights[i]);
  }
  return offsets;
}

type SearchStep = { lo: number; hi: number; mid: number; final: boolean };

function binarySearchOffset(
  offsets: number[],
  target: number,
): { index: number; steps: SearchStep[] } {
  const steps: SearchStep[] = [];
  let lo = 0;
  let hi = offsets.length - 2;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (target < offsets[mid]) {
      steps.push({ lo, hi, mid, final: false });
      hi = mid - 1;
    } else if (target >= offsets[mid + 1]) {
      steps.push({ lo, hi, mid, final: false });
      lo = mid + 1;
    } else {
      steps.push({ lo, hi, mid, final: true });
      return { index: mid, steps };
    }
  }

  const idx = Math.max(0, Math.min(lo, offsets.length - 2));
  if (steps.length > 0) steps[steps.length - 1].final = true;
  return { index: idx, steps };
}

export function HeightStrategyExplorer() {
  const [mode, setMode] = useState<HeightMode>("variable");
  const [scrollTop, setScrollTop] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState(Infinity);
  const [stepping, setStepping] = useState(false);
  const [autoStepping, setAutoStepping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [itemCount, setItemCount] = useState(ITEM_COUNT);

  const varHeights = useMemo(() => generateVariableHeights(itemCount), [itemCount]);
  const fixedHeights = useMemo(
    () => Array.from({ length: itemCount }, () => FIXED_HEIGHT),
    [itemCount],
  );
  const varOffsets = useMemo(() => buildOffsets(varHeights), [varHeights]);

  const heights = mode === "fixed" ? fixedHeights : varHeights;
  const offsets = useMemo(() => buildOffsets(heights), [heights]);
  const totalHeight = offsets[itemCount];

  const clampedScroll = Math.min(
    scrollTop,
    Math.max(0, totalHeight - CONTAINER_HEIGHT),
  );

  // Both lookups — always computed at the same scroll position
  const fixedIdx = Math.min(
    Math.floor(clampedScroll / FIXED_HEIGHT),
    itemCount - 1,
  );
  const varLookup = useMemo(
    () => binarySearchOffset(varOffsets, clampedScroll),
    [varOffsets, clampedScroll],
  );

  const visibleSteps = stepping
    ? varLookup.steps.slice(0, revealedSteps)
    : varLookup.steps;

  const searchRange =
    visibleSteps.length > 0
      ? {
          lo: visibleSteps[visibleSteps.length - 1].lo,
          hi: visibleSteps[visibleSteps.length - 1].hi,
        }
      : null;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(Math.round(e.currentTarget.scrollTop));
      if (stepping) {
        setRevealedSteps(1);
      }
    },
    [stepping],
  );

  // Auto-step animation: reveal search steps one at a time
  useEffect(() => {
    if (!autoStepping) return;
    if (revealedSteps >= varLookup.steps.length) {
      setAutoStepping(false);
      return;
    }
    autoStepTimer.current = setTimeout(() => {
      setRevealedSteps((prev) => prev + 1);
    }, 180);
    return () => {
      if (autoStepTimer.current) clearTimeout(autoStepTimer.current);
    };
  }, [autoStepping, revealedSteps, varLookup.steps.length]);

  const handleModeChange = useCallback((v: string) => {
    setMode(v as HeightMode);
    setScrollTop(0);
    setStepping(false);
    setRevealedSteps(Infinity);
  }, []);

  const startStepping = useCallback(() => {
    setStepping(true);
    setAutoStepping(true);
    setRevealedSteps(1);
  }, []);

  const nextStep = useCallback(() => {
    setRevealedSteps((prev) =>
      Math.min(prev + 1, varLookup.steps.length),
    );
  }, [varLookup.steps.length]);

  const showAll = useCallback(() => {
    setStepping(false);
    setRevealedSteps(Infinity);
  }, []);

  return (
    <DemoSandbox title="Height Strategy Explorer">
      <DemoSandbox.Tabs
        options={["fixed", "variable"] as const}
        value={mode}
        onChange={handleModeChange}
        formatOption={(v) =>
          v === "fixed" ? "Fixed Height" : "Variable Height"
        }
      />

      <div className={styles.layout}>
        {/* ── Scroll area + height map ── */}
        <div className={styles.scrollArea}>
          <div
            ref={scrollerRef}
            className={styles.scroller}
            onScroll={handleScroll}
            style={{ height: CONTAINER_HEIGHT }}
            role="list"
            aria-label={`${mode === "fixed" ? "Fixed" : "Variable"} height item list`}
          >
            <div className={styles.spacer} style={{ height: totalHeight }}>
              {Array.from({ length: itemCount }, (_, i) => {
                const isTarget =
                  mode === "fixed"
                    ? i === fixedIdx
                    : i === varLookup.index;
                const inSearch =
                  mode === "variable" &&
                  searchRange &&
                  i >= searchRange.lo &&
                  i <= searchRange.hi &&
                  !isTarget;

                const cls = isTarget
                  ? styles.itemTarget
                  : inSearch
                    ? styles.itemInSearch
                    : styles.itemDefault;

                const barW =
                  mode === "variable"
                    ? `${(heights[i] / MAX_VAR_HEIGHT) * 100}%`
                    : "60%";

                return (
                  <div
                    key={i}
                    role="listitem"
                    className={cls}
                    style={{
                      transform: `translateY(${offsets[i]}px)`,
                      height: heights[i],
                    }}
                  >
                    <span className={styles.itemIdx}>{i}</span>
                    <span className={styles.itemHeight}>
                      <span
                        className={styles.itemBar}
                        style={{ width: barW }}
                      />
                      <span className={styles.itemHeightLabel}>
                        {heights[i]}px
                      </span>
                    </span>
                    {isTarget && (
                      <span className={styles.itemBadge}>
                        &#x2190; found
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Height map bar chart */}
          <div className={styles.heightMap}>
            <span className={styles.heightMapLabel}>
              Item heights ({mode === "fixed" ? "uniform" : "varied"})
            </span>
            <div className={styles.heightMapBars}>
              {(mode === "variable" ? varHeights : fixedHeights).map(
                (h, i) => {
                  const isTarget =
                    mode === "fixed"
                      ? i === fixedIdx
                      : i === varLookup.index;
                  const inSearch =
                    mode === "variable" &&
                    searchRange &&
                    i >= searchRange.lo &&
                    i <= searchRange.hi;
                  const barCls = isTarget
                    ? styles.heightMapBarTarget
                    : inSearch
                      ? styles.heightMapBarSearch
                      : styles.heightMapBar;
                  return (
                    <div
                      key={i}
                      className={barCls}
                      style={{
                        height: `${(h / MAX_VAR_HEIGHT) * 100}%`,
                      }}
                    />
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* ── Both calculations — always visible ── */}
        <div
          className={styles.calcPanel}
          role="region"
          aria-label="Position lookup comparison"
          aria-live="polite"
        >
          {/* Fixed lookup */}
          <div className={styles.calcSection}>
            <div className={styles.calcSectionTitle}>
              Fixed Height
              <span className={styles.calcBadge}>O(1)</span>
            </div>
            <div className={styles.formulaCode}>
              floor(
              <span className={styles.formulaVal}>{clampedScroll}</span> /{" "}
              <span className={styles.formulaVal}>{FIXED_HEIGHT}</span>) ={" "}
              <span className={styles.formulaResult}>#{fixedIdx}</span>
            </div>
            <div className={styles.calcNote}>
              1 division — instant
            </div>
          </div>

          <div className={styles.calcDivider} />

          {/* Variable lookup */}
          <div className={styles.calcSection}>
            <div className={styles.calcSectionTitle}>
              Variable Height
              <span className={styles.calcBadgeVar}>O(log n)</span>
            </div>

            {visibleSteps.length > 0 && (
              <div className={styles.searchSteps}>
                {visibleSteps.map((step, si) => (
                  <div
                    key={si}
                    className={
                      step.final
                        ? styles.searchStepActive
                        : styles.searchStep
                    }
                  >
                    <span className={styles.stepNum}>{si + 1}</span>
                    <span className={styles.stepRange}>
                      [{step.lo}..{step.hi}]
                    </span>
                    <span className={styles.stepMid}>
                      mid={step.mid}
                    </span>
                    <span className={styles.stepOffset}>
                      @{varOffsets[step.mid].toLocaleString()}px
                    </span>
                  </div>
                ))}
                {stepping &&
                  revealedSteps < varLookup.steps.length && (
                    <div className={styles.searchStepHidden}>
                      {varLookup.steps.length - revealedSteps} more…
                    </div>
                  )}
              </div>
            )}

            {(!stepping ||
              revealedSteps >= varLookup.steps.length) && (
              <div className={styles.formulaResultBlock}>
                &rarr; item #{varLookup.index} —{" "}
                {varLookup.steps.length} step
                {varLookup.steps.length !== 1 ? "s" : ""}
              </div>
            )}

            {/* Stepper controls */}
            <div className={styles.stepperControls}>
              {!stepping ? (
                <button
                  className={styles.stepBtn}
                  onClick={startStepping}
                  type="button"
                >
                  Step through search
                </button>
              ) : (
                <>
                  <button
                    className={styles.stepBtn}
                    onClick={nextStep}
                    disabled={
                      revealedSteps >= varLookup.steps.length
                    }
                    type="button"
                    aria-label={`Next binary search step, ${revealedSteps} of ${varLookup.steps.length}`}
                  >
                    Next ({revealedSteps}/{varLookup.steps.length})
                  </button>
                  <button
                    className={styles.stepBtnSecondary}
                    onClick={showAll}
                    type="button"
                  >
                    Show all
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.calcDivider} />

          {/* Contrast summary */}
          <div className={styles.contrast}>
            1 operation vs {varLookup.steps.length} steps at
            scroll {clampedScroll.toLocaleString()}px
          </div>
        </div>
      </div>

      <DemoSandbox.Controls>
        <label className={styles.ctrl}>
          Items
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={itemCount}
            onChange={(e) => {
              const next = Number(e.target.value);
              setItemCount(next);
              setStepping(false);
              setAutoStepping(false);
              setRevealedSteps(Infinity);
            }}
            aria-valuetext={`${itemCount} items`}
          />
          <span className={styles.ctrlVal}>{itemCount}</span>
        </label>
      </DemoSandbox.Controls>

      <DemoSandbox.Caption>
        Both lookups run at the same scroll position. Increase the item
        count — fixed always takes 1 step, variable grows logarithmically.
        Click &ldquo;Step through search&rdquo; to watch binary search
        narrow the range.
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}
