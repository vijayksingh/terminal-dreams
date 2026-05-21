"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { JSPerfProvider, useJSPerfContext } from "./js-perf-context";
import { FlameChart } from "./ui/FlameChart";
import { ScriptZoneDragger } from "./ui/ScriptZoneDragger";
import styles from "./JavaScriptPerfLab.module.css";

const STEP_LABELS = [
  { code: "Sb", title: "Single bundle" },
  { code: "Rs", title: "Route split" },
  { code: "Dn", title: "Defer non-critical" },
  { code: "Ym", title: "Yield main thread" },
  { code: "Wt", title: "Worker thread" },
  { code: "So", title: "Sort your own" },
];

export function JavaScriptPerfLab({ activeStep }: { activeStep: number }) {
  return (
    <JSPerfProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          <StepView activeStep={activeStep} />
        </div>
      </div>
    </JSPerfProvider>
  );
}

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_LABELS.map((step, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${step.title}`}
          title={step.title}
        >
          {step.code}
        </span>
      ))}
    </div>
  );
}

function StepView({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`view-${activeStep}`}
        className={styles.stepView}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={TRANSITION.enterCard}
      >
        {activeStep === 6 ? <Step6Panel /> : <FlameChartPanel activeStep={activeStep} />}
      </motion.div>
    </AnimatePresence>
  );
}

const STEP_COPY: Record<number, { title: string; caption: string; codeBadge?: string; codeNote?: React.ReactNode }> = {
  1: {
    title: "Step 1 — single 2 MB bundle on main thread",
    caption:
      "One enormous block, capped with a long-task triangle. Until V8 finishes parse + compile + execute, the page is frozen.",
  },
  2: {
    title: "Step 2 — route-based code split",
    caption:
      "The single block tears into chunks. Only the framework + shell + this route ship sync. TTI slides left.",
    codeBadge: "await import('./Dashboard')",
    codeNote: (
      <>
        Every <code>import()</code> emits a separate chunk in Webpack, Vite, esbuild, and Rollup. Same trick works at finer grain — a heavy modal opened on click.
      </>
    ),
  },
  3: {
    title: "Step 3 — defer charting-lib past first paint",
    caption:
      "The yellow block jumps below the First Paint line. It still loads — just later. Main thread is free for input.",
    codeBadge: "const Chart = lazy(() => import('./Chart'))",
    codeNote: (
      <>
        React.lazy + Suspense, Vue&apos;s <code>defineAsyncComponent</code>, and SvelteKit&apos;s <code>+page.ts</code> all wrap dynamic <code>import()</code>. Same browser pipeline.
      </>
    ),
  },
  4: {
    title: "Step 4 — chunk data-processor with scheduler.yield()",
    caption:
      "Same TTI, but the orange block becomes many short bars. No single bar exceeds the 50 ms long-task threshold.",
    codeBadge: "await scheduler.yield()",
    codeNote: (
      <>
        <code>scheduler.yield()</code> (Chrome 129+) returns a promise that resolves after the browser drains pending input. Resumes <em>before</em> lower-priority tasks but <em>after</em> user events.
      </>
    ),
  },
  5: {
    title: "Step 5 — data-processor moved to a Web Worker",
    caption:
      "A second lane appears below main. The orange block flies up and runs in parallel. Main thread is nearly idle after vendor + route load.",
    codeBadge: "new Worker(new URL('./worker.ts', import.meta.url))",
    codeNote: (
      <>
        Workers are a fresh JS realm — no <code>document</code>, no <code>window</code>. Pure computation only: JSON parse, image decode, sort, crypto. Communicate via <code>postMessage</code> + structured clone.
      </>
    ),
  },
};

function FlameChartPanel({ activeStep }: { activeStep: number }) {
  const ctx = useJSPerfContext();
  const copy = STEP_COPY[activeStep] ?? STEP_COPY[1];

  return (
    <div className={styles.flamePanel}>
      <div className={styles.flameTitle}>{copy.title}</div>
      <FlameChart
        blocks={ctx.stepBlocks}
        firstPaintMs={ctx.firstPaintMs}
        highlightId={ctx.highlightId}
        ttiMs={ctx.tti}
        ttiRating={ctx.ttiRating}
        longTaskCount={ctx.longTaskCount}
        clickEvent={ctx.clickEvent}
      />
      <div className={styles.flameCaption}>{copy.caption}</div>
      {copy.codeBadge && (
        <div className={styles.codeCallout}>
          <span className={styles.codeBadge}>{copy.codeBadge}</span>
          <span className={styles.codeNote}>{copy.codeNote}</span>
        </div>
      )}
    </div>
  );
}

function Step6Panel() {
  const ctx = useJSPerfContext();

  return (
    <div className={styles.step6Wrapper}>
      <div className={styles.flamePanel}>
        <div className={styles.flameTitle}>Live flame chart — reflects your zone assignments</div>
        <FlameChart
          blocks={ctx.stepBlocks}
          firstPaintMs={ctx.firstPaintMs}
          highlightId={ctx.highlightId}
          ttiMs={ctx.tti}
          ttiRating={ctx.ttiRating}
          longTaskCount={ctx.longTaskCount}
        />
        <div className={styles.codeCallout}>
          <span className={styles.codeBadge}>{`if (zone === 'worker' && !script.canWorker) return reject;`}</span>
          <span className={styles.codeNote}>
            The drop handler enforces the worker contract — anything that touches
            <code> document</code>, <code>window</code>, or <code>localStorage</code> bounces back with a
            red shake. Use Tab + Arrow keys to move scripts between zones; the chart
            updates the moment a card lands.
          </span>
        </div>
      </div>
      <ScriptZoneDragger />
    </div>
  );
}
