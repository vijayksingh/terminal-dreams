"use client";

import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  WindowingProvider,
  useWindowing,
  getPhase,
  ITEM_HEIGHT,
  VIEWPORT_HEIGHT,
  NAIVE_CAP,
} from "./windowing-context";
import styles from "./windowing-lab.module.css";

const INSTANT = { duration: 0 };
const MINIMAP_HEIGHT = 320;

const intl = new Intl.NumberFormat("en-US");
function fmt(n: number): string {
  return intl.format(n);
}

// ── Realistic row content ───────────────────────────────────────────
const FILE_POOL = [
  "App.tsx",
  "Button.tsx",
  "Card.tsx",
  "Dialog.tsx",
  "Dropdown.tsx",
  "Editor.tsx",
  "Form.tsx",
  "Grid.tsx",
  "Header.tsx",
  "Input.tsx",
  "Layout.tsx",
  "Modal.tsx",
  "Nav.tsx",
  "Overlay.tsx",
  "Panel.tsx",
  "Router.tsx",
  "Select.tsx",
  "Sidebar.tsx",
  "Table.tsx",
  "Tabs.tsx",
  "Toast.tsx",
  "Tooltip.tsx",
  "Tree.tsx",
  "Upload.tsx",
  "View.tsx",
  "hooks.ts",
  "utils.ts",
  "types.ts",
  "config.ts",
  "theme.css",
];
const SIZE_POOL = [
  "2.1 kB",
  "1.4 kB",
  "3.2 kB",
  "0.8 kB",
  "1.9 kB",
  "4.1 kB",
  "2.7 kB",
  "1.1 kB",
  "3.8 kB",
  "0.6 kB",
  "5.2 kB",
  "0.9 kB",
  "2.4 kB",
  "1.7 kB",
  "3.5 kB",
];

function getName(i: number): string {
  return FILE_POOL[i % FILE_POOL.length];
}
function getSize(i: number): string {
  return SIZE_POOL[i % SIZE_POOL.length];
}
function dotColor(name: string): string {
  if (name.endsWith(".tsx")) return "var(--win-accent)";
  if (name.endsWith(".ts")) return "var(--win-overscan)";
  if (name.endsWith(".css")) return "var(--win-good)";
  return "var(--color-muted)";
}

// ═══════════════════════════════════════════════════════════════════════
// Public entry
// ═══════════════════════════════════════════════════════════════════════

export function WindowingLab({ activeStep }: { activeStep: number }) {
  const phase = getPhase(activeStep);

  return (
    <WindowingProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION.enterCard}
            >
              {phase === "problem" && <ProblemView />}
              {phase === "insight" && <InsightView />}
              {phase === "mechanics" && <MechanicsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </WindowingProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Step indicator
// ═══════════════════════════════════════════════════════════════════════

const STEP_LABELS = ["10K", "DOM", "VP", "WIN", "MATH", "OS"];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar}>
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Phase views — inner AnimatePresence for step-level transitions
// ═══════════════════════════════════════════════════════════════════════

function ProblemView() {
  const { activeStep } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <AnimatePresence mode="wait">
        {activeStep === 1 ? (
          <motion.div
            key="overview"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={prefersReducedMotion ? INSTANT : TRANSITION.enterCard}
          >
            <ProblemOverview />
          </motion.div>
        ) : (
          <motion.div
            key="naive"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={prefersReducedMotion ? INSTANT : TRANSITION.enterCard}
          >
            <NaiveScroller />
          </motion.div>
        )}
      </AnimatePresence>
      <StatsBar />
      <Inspector />
    </>
  );
}

function InsightView() {
  const { activeStep } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <AnimatePresence>
        {activeStep >= 4 && (
          <motion.div
            key="toolbar"
            initial={
              prefersReducedMotion ? false : { opacity: 0, height: 0 }
            }
            animate={{ opacity: 1, height: "auto" }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, height: 0 }
            }
            transition={prefersReducedMotion ? INSTANT : TRANSITION.collapse}
          >
            <WindowingToolbar />
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.splitLayout}>
        <Minimap />
        <VirtualScroller />
      </div>
      <AnimatePresence>
        {activeStep >= 4 && (
          <motion.div
            key="comparison"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, y: -8 }
            }
            transition={
              prefersReducedMotion ? INSTANT : TRANSITION.enterCard
            }
          >
            <ComparisonBanner />
          </motion.div>
        )}
      </AnimatePresence>
      <StatsBar />
      <Inspector />
    </>
  );
}

function MechanicsView() {
  const { activeStep } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <WindowingToolbar />
      <AnimatePresence>
        {activeStep >= 6 && (
          <motion.div
            key="overscan"
            initial={
              prefersReducedMotion ? false : { opacity: 0, height: 0 }
            }
            animate={{ opacity: 1, height: "auto" }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, height: 0 }
            }
            transition={prefersReducedMotion ? INSTANT : TRANSITION.collapse}
          >
            <OverscanControl />
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.splitLayout}>
        <Minimap />
        <VirtualScroller />
      </div>
      <Pipeline />
      <StatsBar />
      <Inspector />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Problem overview (Step 1) — the math
// ═══════════════════════════════════════════════════════════════════════

function ProblemOverview() {
  const { totalItems, itemHeight, totalHeight } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.problemOverview}>
      <div className={styles.problemCalc}>
        <motion.div
          className={styles.calcLine}
          initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReducedMotion
              ? INSTANT
              : { ...TRANSITION.enterItem, delay: 0 }
          }
        >
          <span className={styles.calcLabel}>items</span>
          <span className={styles.calcValue}>{fmt(totalItems)}</span>
        </motion.div>
        <motion.div
          className={styles.calcOperator}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? INSTANT
              : { ...TRANSITION.enterItem, delay: STAGGER.fast }
          }
        >
          &times;
        </motion.div>
        <motion.div
          className={styles.calcLine}
          initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReducedMotion
              ? INSTANT
              : { ...TRANSITION.enterItem, delay: STAGGER.fast * 2 }
          }
        >
          <span className={styles.calcLabel}>height</span>
          <span className={styles.calcValue}>{itemHeight}px</span>
        </motion.div>
        <motion.div
          className={styles.calcOperator}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? INSTANT
              : { ...TRANSITION.enterItem, delay: STAGGER.fast * 3 }
          }
        >
          =
        </motion.div>
        <motion.div
          className={styles.calcLine}
          initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReducedMotion
              ? INSTANT
              : { ...TRANSITION.enterItem, delay: STAGGER.fast * 4 }
          }
        >
          <span className={styles.calcLabel}>total height</span>
          <span className={styles.calcResult}>{fmt(totalHeight)}px</span>
        </motion.div>
      </div>

      <motion.div
        className={styles.problemVisual}
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          prefersReducedMotion
            ? INSTANT
            : { ...TRANSITION.enterCard, delay: STAGGER.fast * 6 }
        }
      >
        <div className={styles.problemBar}>
          <div className={styles.problemBarViewport}>
            <span className={styles.problemBarLabel}>
              viewport ({VIEWPORT_HEIGHT}px)
            </span>
          </div>
        </div>
        <div className={styles.problemBarCaption}>
          You can see {Math.ceil(VIEWPORT_HEIGHT / itemHeight)} items. The
          other {fmt(totalItems - Math.ceil(VIEWPORT_HEIGHT / itemHeight))}{" "}
          are invisible — but every one of them is a real DOM node.
        </div>
      </motion.div>

      <ItemCountSlider />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Naive scroller (Step 2)
// ═══════════════════════════════════════════════════════════════════════

function NaiveScroller() {
  const { totalItems, totalHeight, items, setScrollTop } = useWindowing();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(Math.round(e.currentTarget.scrollTop));
    },
    [setScrollTop],
  );

  const domCount = Math.min(totalItems, NAIVE_CAP);

  return (
    <div className={styles.scrollerContainer}>
      <div className={styles.scrollerHeader}>
        <span className={styles.scrollerTitle}>Naive Rendering</span>
        <motion.span
          key="naive-badge"
          className={styles.domBadgeRed}
          initial={prefersReducedMotion ? false : { scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={prefersReducedMotion ? INSTANT : SPRING.snappy}
        >
          {fmt(domCount)} DOM nodes
        </motion.span>
      </div>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={handleScroll}
        style={{ height: VIEWPORT_HEIGHT }}
        role="list"
        aria-label={`Naive list: ${fmt(totalItems)} items, all rendered`}
      >
        <div className={styles.spacer} style={{ height: totalHeight }}>
          {items.map((item) => {
            const name = getName(item.index);
            return (
              <div
                key={item.index}
                role="listitem"
                className={styles.rowNaive}
                style={{
                  transform: `translateY(${item.y}px)`,
                  height: ITEM_HEIGHT,
                }}
              >
                <span className={styles.rowIdx}>{item.index}</span>
                <span
                  className={styles.rowIcon}
                  style={{ color: dotColor(name) }}
                >
                  ●
                </span>
                <span className={styles.rowName}>{name}</span>
                <span className={styles.rowMeta}>
                  {getSize(item.index)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {totalItems > NAIVE_CAP && (
        <div className={styles.naiveWarning}>
          Rendering {fmt(NAIVE_CAP)} of {fmt(totalItems)} (capped to prevent
          browser freeze)
        </div>
      )}
      <ItemCountSlider />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Virtual scroller (Steps 3–6)
// ═══════════════════════════════════════════════════════════════════════

function VirtualScroller() {
  const {
    totalItems,
    totalHeight,
    items,
    windowingEnabled,
    showWindowing,
    showViewportHighlight,
    setScrollTop,
    mountedCount,
  } = useWindowing();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(Math.round(e.currentTarget.scrollTop));
    },
    [setScrollTop],
  );

  const isWindowed = windowingEnabled && showWindowing;
  const domCount = isWindowed
    ? mountedCount
    : Math.min(totalItems, NAIVE_CAP);

  return (
    <div className={styles.scrollerContainer}>
      <div className={styles.scrollerHeader}>
        <span className={styles.scrollerTitle}>
          {isWindowed ? "Windowed" : "Naive"}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={isWindowed ? "windowed" : "naive"}
            className={
              isWindowed ? styles.domBadgeGreen : styles.domBadgeRed
            }
            initial={
              prefersReducedMotion
                ? false
                : { scale: 1.2, opacity: 0.6 }
            }
            animate={{ scale: 1, opacity: 1 }}
            exit={
              prefersReducedMotion
                ? undefined
                : { scale: 0.9, opacity: 0 }
            }
            transition={prefersReducedMotion ? INSTANT : SPRING.snappy}
          >
            {fmt(domCount)} DOM nodes
          </motion.span>
        </AnimatePresence>
      </div>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={handleScroll}
        style={{ height: VIEWPORT_HEIGHT }}
        role="list"
        aria-label={`${isWindowed ? "Windowed" : "Naive"} list of ${fmt(totalItems)} items`}
      >
        <div className={styles.spacer} style={{ height: totalHeight }}>
          {items.map((item) => {
            let rowClass = styles.rowNaive;
            if (isWindowed) {
              rowClass = item.isOverscan
                ? styles.rowOverscan
                : item.inViewport
                  ? styles.rowViewport
                  : styles.rowNaive;
            } else if (showViewportHighlight) {
              rowClass = item.inViewport
                ? styles.rowViewport
                : styles.rowDimmed;
            }

            const name = getName(item.index);
            const meta = isWindowed
              ? `translateY(${fmt(item.y)}px)${item.isOverscan ? " · buffer" : ""}`
              : getSize(item.index);

            return (
              <div
                key={item.index}
                role="listitem"
                className={rowClass}
                style={{
                  transform: `translateY(${item.y}px)`,
                  height: ITEM_HEIGHT,
                }}
              >
                <span className={styles.rowIdx}>{item.index}</span>
                <span
                  className={styles.rowIcon}
                  style={{ color: dotColor(name) }}
                >
                  ●
                </span>
                <span className={styles.rowName}>{name}</span>
                <span className={styles.rowMeta}>{meta}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Minimap
// ═══════════════════════════════════════════════════════════════════════

function Minimap() {
  const {
    totalItems,
    totalHeight,
    scrollTop,
    renderStart,
    windowingEnabled,
    showWindowing,
    mountedCount,
    visibleCount,
  } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  const isWindowed = windowingEnabled && showWindowing;

  const mmScale = Math.min(1, MINIMAP_HEIGHT / totalHeight);
  const mmViewportTop = scrollTop * mmScale;
  const mmViewportH = Math.max(4, VIEWPORT_HEIGHT * mmScale);
  const mmRenderTop = renderStart * ITEM_HEIGHT * mmScale;
  const mmRenderH = isWindowed
    ? Math.max(8, mountedCount * ITEM_HEIGHT * mmScale)
    : MINIMAP_HEIGHT;

  return (
    <motion.div
      className={styles.minimap}
      initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReducedMotion ? INSTANT : TRANSITION.enterCard}
    >
      <div className={styles.mmLabel}>Minimap</div>
      <div
        className={styles.mmTrack}
        style={{ height: MINIMAP_HEIGHT }}
        aria-hidden="true"
      >
        <div
          className={
            isWindowed ? styles.mmRenderedWindowed : styles.mmRenderedFull
          }
          style={{ top: mmRenderTop, height: mmRenderH }}
        />
        <div
          className={styles.mmViewport}
          style={{ top: mmViewportTop, height: mmViewportH }}
        />
      </div>
      <div className={styles.mmStats}>
        <div className={styles.mmStatRow}>
          <span className={styles.mmStatDot} data-type="viewport" />
          <span>viewport</span>
          <span className={styles.mmStatVal}>{visibleCount}</span>
        </div>
        <div className={styles.mmStatRow}>
          <span className={styles.mmStatDot} data-type="rendered" />
          <span>rendered</span>
          <span className={styles.mmStatVal}>
            {isWindowed ? mountedCount : Math.min(totalItems, NAIVE_CAP)}
          </span>
        </div>
        <div className={styles.mmStatRow}>
          <span className={styles.mmStatDot} data-type="total" />
          <span>total</span>
          <span className={styles.mmStatVal}>{fmt(totalItems)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Windowing toolbar
// ═══════════════════════════════════════════════════════════════════════

function WindowingToolbar() {
  const { windowingEnabled, toggleWindowing } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={styles.toolbar}
      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={prefersReducedMotion ? INSTANT : TRANSITION.collapse}
    >
      <button
        onClick={toggleWindowing}
        className={
          windowingEnabled ? styles.toggleBtnActive : styles.toggleBtn
        }
        aria-pressed={windowingEnabled}
      >
        <motion.span
          className={styles.toggleDot}
          animate={{
            background: windowingEnabled
              ? "var(--win-good)"
              : "var(--color-muted)",
            opacity: windowingEnabled ? 1 : 0.4,
          }}
          transition={prefersReducedMotion ? INSTANT : SPRING.snappy}
        />
        Windowing
      </button>
      <AnimatePresence mode="wait">
        {windowingEnabled ? (
          <motion.span
            key="hint"
            initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, x: 4 }
            }
            transition={prefersReducedMotion ? INSTANT : TRANSITION.crossfade}
            className={styles.toolbarHint}
          >
            Only visible items are in the DOM
          </motion.span>
        ) : (
          <motion.span
            key="warn"
            initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, x: 4 }
            }
            transition={prefersReducedMotion ? INSTANT : TRANSITION.crossfade}
            className={styles.toolbarWarning}
          >
            Every item is a real DOM node
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Comparison banner (Step 4)
// ═══════════════════════════════════════════════════════════════════════

function ComparisonBanner() {
  const {
    mountedCount,
    naiveDomCount,
    windowingEnabled,
    showWindowing,
    savings,
  } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  const isWindowed = windowingEnabled && showWindowing;
  const windowedCount = isWindowed ? mountedCount : naiveDomCount;
  const ratio = Math.max(
    1,
    Math.round(naiveDomCount / Math.max(1, windowedCount)),
  );

  return (
    <motion.div
      className={styles.comparison}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? INSTANT : TRANSITION.enterCard}
      role="region"
      aria-label="DOM node comparison"
      aria-live="polite"
    >
      <div className={styles.compRow}>
        <span className={styles.compLabel}>Windowed</span>
        <div className={styles.compTrack}>
          <motion.div
            className={styles.compBarWindowed}
            animate={{
              width: `${Math.max(2, (mountedCount / naiveDomCount) * 100)}%`,
            }}
            transition={prefersReducedMotion ? INSTANT : SPRING.snappy}
          />
        </div>
        <span className={styles.compCount}>{mountedCount}</span>
      </div>
      <div className={styles.compRow}>
        <span className={styles.compLabel}>Naive</span>
        <div className={styles.compTrack}>
          <div className={styles.compBarNaive} style={{ width: "100%" }} />
        </div>
        <span className={styles.compCount}>{fmt(naiveDomCount)}</span>
      </div>
      <AnimatePresence>
        {isWindowed && (
          <motion.div
            key="result"
            className={styles.compResult}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, y: -4 }
            }
            transition={prefersReducedMotion ? INSTANT : TRANSITION.crossfade}
          >
            {ratio}&times; fewer DOM nodes &mdash; {savings}% savings
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Pipeline (Step 5)
// ═══════════════════════════════════════════════════════════════════════

function Pipeline() {
  const {
    scrollTop,
    viewportStart,
    renderStart,
    renderEnd,
    mountedCount,
    showPipeline,
    windowingEnabled,
  } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!showPipeline || !windowingEnabled) return null;

  const pipeSteps = [
    {
      label: "scrollTop",
      value: String(Math.round(scrollTop)),
    },
    {
      label: "startIdx",
      value: `floor(${Math.round(scrollTop)}/${ITEM_HEIGHT}) = ${viewportStart}`,
    },
    {
      label: "mount",
      value: `#${renderStart}–#${renderEnd}`,
    },
    {
      label: "DOM",
      value: `${mountedCount} nodes`,
    },
  ];

  return (
    <motion.div
      className={styles.pipeline}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? INSTANT : TRANSITION.enterCard}
      role="region"
      aria-label="Windowing calculation pipeline"
    >
      <div className={styles.pipelineLabel}>Scroll Pipeline</div>
      <div className={styles.pipelineSteps}>
        {pipeSteps.map((step, i) => (
          <div key={step.label} className={styles.pipelineStep}>
            {i > 0 && (
              <span className={styles.pipelineArrow} aria-hidden="true">
                &rarr;
              </span>
            )}
            <div className={styles.pipelineBox}>
              <span className={styles.pipelineBoxLabel}>{step.label}</span>
              <span className={styles.pipelineBoxValue}>{step.value}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Overscan control (Step 6)
// ═══════════════════════════════════════════════════════════════════════

function OverscanControl() {
  const { overscan, setOverscan, showOverscan } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!showOverscan) return null;

  return (
    <motion.div
      className={styles.overscanControl}
      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={prefersReducedMotion ? INSTANT : TRANSITION.collapse}
    >
      <label className={styles.ctrl}>
        Overscan buffer
        <input
          type="range"
          min={0}
          max={10}
          value={overscan}
          onChange={(e) => setOverscan(Number(e.target.value))}
          aria-valuetext={`${overscan} items overscan`}
        />
        <span className={styles.ctrlVal}>&plusmn;{overscan}</span>
      </label>
      <AnimatePresence>
        {overscan === 0 && (
          <motion.span
            key="warn"
            className={styles.overscanWarning}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={prefersReducedMotion ? INSTANT : TRANSITION.crossfade}
          >
            No buffer — fast scrolling will flash blank space
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Stats bar — animated value flashes
// ═══════════════════════════════════════════════════════════════════════

function StatsBar() {
  const {
    activeStep,
    totalItems,
    mountedCount,
    naiveDomCount,
    windowingEnabled,
    showWindowing,
    savings,
    visibleCount,
    overscan,
    showOverscan,
  } = useWindowing();
  const prefersReducedMotion = usePrefersReducedMotion();

  const isWindowed = windowingEnabled && showWindowing;
  const domCount = isWindowed ? mountedCount : naiveDomCount;

  const stats: Array<{ label: string; value: string; highlight?: boolean }> =
    [];

  stats.push({
    label: "DOM nodes",
    value: fmt(domCount),
    highlight: isWindowed,
  });
  stats.push({
    label: "total items",
    value: fmt(totalItems),
  });

  if (activeStep >= 3) {
    stats.push({
      label: "visible",
      value: String(visibleCount),
    });
  }

  if (activeStep >= 4 && isWindowed) {
    stats.push({
      label: "savings",
      value: `${savings}%`,
      highlight: true,
    });
  }

  if (showOverscan) {
    stats.push({
      label: "overscan",
      value: `±${overscan}`,
    });
  }

  return (
    <div
      className={styles.statsBar}
      role="region"
      aria-label="Windowing statistics"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            layout
            initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              prefersReducedMotion ? undefined : { opacity: 0, y: 4 }
            }
            transition={
              prefersReducedMotion ? INSTANT : TRANSITION.enterItem
            }
            className={styles.stat}
          >
            <span className={styles.statLabel}>{s.label}</span>
            <motion.span
              key={s.value}
              initial={
                prefersReducedMotion ? false : { opacity: 0.4 }
              }
              animate={{ opacity: 1 }}
              transition={
                prefersReducedMotion ? INSTANT : TRANSITION.crossfade
              }
              className={
                s.highlight ? styles.statHighlight : styles.statValue
              }
            >
              {s.value}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Item count slider
// ═══════════════════════════════════════════════════════════════════════

function ItemCountSlider() {
  const { totalItems, setTotalItems } = useWindowing();

  return (
    <label className={styles.ctrl}>
      Items
      <input
        type="range"
        min={100}
        max={100_000}
        step={100}
        value={totalItems}
        onChange={(e) => setTotalItems(Number(e.target.value))}
        aria-valuetext={`${fmt(totalItems)} items`}
      />
      <span className={styles.ctrlVal}>{fmt(totalItems)}</span>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// State inspector with render counter
// ═══════════════════════════════════════════════════════════════════════

function Inspector() {
  const { stateEntries, renderCount } = useWindowing();

  return (
    <StateInspector
      entries={stateEntries}
      title="Windowing State"
      renderCount={renderCount}
    />
  );
}
