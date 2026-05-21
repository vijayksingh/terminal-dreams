"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  BundleProvider,
  useBundleContext,
} from "./bundle-context";
import {
  STAGE_LABELS,
  STAGE_TITLES,
  TOTAL_STAGES,
} from "./engine/bundle-simulator";
import { Treemap } from "./ui/Treemap";
import { ChunkList } from "./ui/ChunkList";
import { InitialLoadCounter } from "./ui/InitialLoadCounter";
import { OptimizationSequencer } from "./ui/OptimizationSequencer";
import { WaterfallStrip } from "./ui/WaterfallStrip";
import styles from "./BundleOptLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function BundleOptLab({ activeStep }: { activeStep: number }) {
  return (
    <BundleProvider activeStep={activeStep}>
      <LabSurface />
    </BundleProvider>
  );
}

function LabSurface() {
  const { activeStep, stateEntries } = useBundleContext();

  return (
    <div className={styles.labRoot}>
      <StepBar activeStep={activeStep} />
      <div className={styles.scrollArea}>
        <StageHeader activeStep={activeStep} />

        <div className={styles.layout}>
          <div className={styles.treemapColumn}>
            <TreemapPanel />
            <WaterfallPanel />
            <ChunkListPanel />
          </div>
          <div className={styles.sideColumn}>
            <CounterPanel />
            <NarrativePanel />
          </div>
        </div>

        <StateInspector entries={stateEntries} title="Bundle State" />
      </div>
    </div>
  );
}

// ── Step indicator bar ─────────────────────────────────────────────

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STAGE_LABELS.map((label, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${STAGE_TITLES[i + 1]}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function StageHeader({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stageHeader}>
      <span className={styles.stageNumber}>
        Step {String(activeStep).padStart(2, "0")} / {String(TOTAL_STAGES).padStart(2, "0")}
      </span>
      <span className={styles.stageTitle}>{STAGE_TITLES[activeStep]}</span>
    </div>
  );
}

// ── Sticky treemap (the headline visual) ───────────────────────────

function TreemapPanel() {
  const { treemap, activeStep, setTreemapSize } = useBundleContext();

  return (
    <div className={styles.treemapPanel}>
      <div className={styles.treemapCaption}>
        <span className={styles.treemapTitle}>Bundle treemap</span>
        <span className={styles.treemapHint}>Areas scale by KB · color encodes chunk</span>
      </div>
      <div className={styles.treemapBox}>
        <Treemap layout={treemap} stageKey={activeStep} onResize={setTreemapSize} />
      </div>
      <LegendStrip />
    </div>
  );
}

const LEGEND_ITEMS = [
  { category: "framework", label: "framework" },
  { category: "library-dead", label: "library (dead code)" },
  { category: "library", label: "library (clean)" },
  { category: "app-shared", label: "app shell · ui kit" },
  { category: "app-route", label: "route" },
  { category: "feature-heavy", label: "heavy feature" },
];

function LegendStrip() {
  return (
    <div className={styles.legend} role="presentation">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.category} className={styles.legendItem}>
          <span className={styles.legendSwatch} data-category={item.category} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChunkListPanel() {
  const { state } = useBundleContext();
  return (
    <div className={styles.chunkPanel}>
      <ChunkList state={state} />
    </div>
  );
}

function WaterfallPanel() {
  const { state, activeStep } = useBundleContext();
  return (
    <div className={styles.waterfallPanel}>
      <WaterfallStrip state={state} stage={activeStep} />
    </div>
  );
}

// ── Right column ───────────────────────────────────────────────────

function CounterPanel() {
  const { state } = useBundleContext();
  return (
    <InitialLoadCounter
      cold={state.initialLoadKB}
      warm={state.warmLoadKB}
      total={state.totalKB}
      chunkCount={state.chunks.length}
    />
  );
}

function NarrativePanel() {
  const { activeStep, mode } = useBundleContext();
  if (mode === "capstone") return <CapstonePanel />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`narrative-${activeStep}`}
        className={styles.narrativeCard}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={TRANSITION.enterCard}
      >
        <StageNarrative activeStep={activeStep} />
      </motion.div>
    </AnimatePresence>
  );
}

const STAGE_NOTES: Record<number, { headline: string; body: string }> = {
  1: {
    headline: "Every byte in one file",
    body: "main.js holds every route, every library, every locale. The browser parses all 1.1 MB before painting anything — and three quarters of it is code the current page never executes.",
  },
  2: {
    headline: "Routes get their own chunk",
    body: "Only the shared kernel plus the current route ships on first paint. /admin (305 KB) and /dashboard (357 KB) sit on disk until the user navigates. Initial drops from 1131 KB to ~450 KB without changing a single line of business logic.",
  },
  3: {
    headline: "Dead code stops shipping",
    body: "lodash full → lodash-es per-method (72 → 4 KB). moment + locales → date-fns (232 → 16 KB on the lazy route). Icon barrel → per-file imports. The shared chunk loses 90 KB of waste in a single build config change.",
  },
  4: {
    headline: "Heavy features wait for use",
    body: "chart-lib, rich-editor, pdf-renderer all sat in a route chunk because someone imported them at the top of a route file. Move them to dynamic import() and they become a dedicated on-demand chunk. The dashboard route loses 90 KB; first paint drops to ~225 KB.",
  },
  5: {
    headline: "Cache the bits that never change",
    body: "Framework + utils + icon glyphs go into vendor.<hash>.js with a 1-year immutable cache. First visit pays the same 224 KB; every deploy after that delivers only the 116 KB of code that actually changed.",
  },
  6: {
    headline: "Reorder the build steps",
    body: "Drag the four optimization cards into any order. The treemap reflows in real time. Tree-shake before route-splitting and the shared chunk hides waste that per-route shaking would have caught — order matters.",
  },
};

function StageNarrative({ activeStep }: { activeStep: number }) {
  const note = STAGE_NOTES[activeStep];
  if (!note) return null;
  return (
    <>
      <span className={styles.narrativeLabel}>What just happened</span>
      <span className={styles.narrativeHeadline}>{note.headline}</span>
      <span className={styles.narrativeBody}>{note.body}</span>
    </>
  );
}

// ── Capstone (stage 6) ─────────────────────────────────────────────

function CapstonePanel() {
  const { capstoneSeq, setCapstoneSeq, resetCapstone, state } = useBundleContext();
  const allApplied = capstoneSeq.length === 4;
  const optimalShape = useMemo(() => {
    return allApplied && state.warmLoadKB <= 130;
  }, [allApplied, state.warmLoadKB]);
  // Once all four optimizations are in place but warm is still over budget,
  // ordering — not coverage — is the lever the reader needs to move next.
  const suboptimalOrder = allApplied && !optimalShape;

  return (
    <div className={styles.capstoneRoot}>
      <OptimizationSequencer
        applied={capstoneSeq}
        onApply={setCapstoneSeq}
        onReset={resetCapstone}
      />
      <div className={styles.capstoneReadout} data-status={optimalShape ? "optimal" : "partial"}>
        <span className={styles.readoutLabel}>Build result</span>
        <span className={styles.readoutBody}>
          {capstoneSeq.length === 0 && "Nothing applied. The bundle is still a 1.1 MB monolith."}
          {capstoneSeq.length > 0 && !allApplied && (
            <>Initial: <strong>{state.initialLoadKB} KB</strong>. Add the remaining optimizations to clear the 250 KB budget and unlock a warm-cache load under 130 KB.</>
          )}
          {suboptimalOrder && (
            <>Initial: <strong>{state.initialLoadKB} KB</strong> cold, <strong>{state.warmLoadKB} KB</strong> warm. All four optimizations are applied but the order leaks dead code into the warm-cache load. Reorder so route-split runs before tree-shake — the monolith hides waste that per-route shaking would catch.</>
          )}
          {optimalShape && (
            <>Initial: <strong>{state.initialLoadKB} KB</strong> cold, <strong>{state.warmLoadKB} KB</strong> warm. Under the 250 KB budget on first load and the long tail of repeat visits ships only <strong>{state.warmLoadKB} KB</strong> across the wire.</>
          )}
        </span>
      </div>
    </div>
  );
}
