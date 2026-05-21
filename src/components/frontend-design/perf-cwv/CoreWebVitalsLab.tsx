"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { CwvProvider, useCwvContext } from "./cwv-context";
import { CwvGauges } from "./ui/CwvGauges";
import { LcpDiscoveryPage } from "./ui/LcpDiscoveryPage";
import { LcpSubparts } from "./ui/LcpSubparts";
import { InpButton } from "./ui/InpButton";
import { InpOptimization } from "./ui/InpOptimization";
import { ClsSessionWindows } from "./ui/ClsSessionWindows";
import { FieldVsLab } from "./ui/FieldVsLab";
import styles from "./CoreWebVitalsLab.module.css";

// Step initials used by the step bar. The lab itself contains no MCQ — all
// prediction gates live in MDX via <PredictionChallenge>.
const STEP_LABELS = ["Tx", "Lc", "Lo", "In", "Io", "Cl", "Fl"];

export function CoreWebVitalsLab({ activeStep }: { activeStep: number }) {
  return (
    <CwvProvider>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          <ActiveStep activeStep={activeStep} />
        </div>
      </div>
    </CwvProvider>
  );
}

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Core Web Vitals lesson progress">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${label}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function ActiveStep({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`step-${activeStep}`}
        className={styles.stepFrame}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={TRANSITION.enterCard}
      >
        <StepDispatch activeStep={activeStep} />
      </motion.div>
    </AnimatePresence>
  );
}

function StepDispatch({ activeStep }: { activeStep: number }) {
  switch (activeStep) {
    case 1: return <ThreeMetrics />;
    case 2: return <LcpDiscoveryStep />;
    case 3: return <LcpOptimisationStep />;
    case 4: return <InpFeltStep />;
    case 5: return <InpOptimisationStep />;
    case 6: return <ClsStep />;
    case 7: return <FieldVsLabStep />;
    default: return <ThreeMetrics />;
  }
}

// ── Step 1 — Three gauges sweeping red → green ──────────────────

function ThreeMetrics() {
  // The gauges read live context state — LCP from sub-parts (default 2.7s),
  // INP from the felt-delay state (default 240ms), CLS from session-window
  // computation (default 0.19). All start broken; later steps fix them.
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <Panel title="Three numbers, three dimensions" eyebrow="step 01">
      <CwvGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} />
      <p className={styles.panelNote}>
        Each gauge is a live <code>PerformanceObserver</code> output. Flip toggles in the next steps to watch each value sweep from red to green.
      </p>
    </Panel>
  );
}

// ── Step 2 — LCP discovery on a real mock page ──────────────────

function LcpDiscoveryStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="Which element is LCP?" eyebrow="step 02">
        <LcpDiscoveryPage />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} />
    </>
  );
}

// ── Step 3 — LCP optimisation toggles ───────────────────────────

function LcpOptimisationStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="LCP = TTFB + load delay + load duration + render delay" eyebrow="step 03">
        <LcpSubparts />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} />
    </>
  );
}

// ── Step 4 — INP felt delay ────────────────────────────────────

function InpFeltStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="Click the button. Feel the 200ms." eyebrow="step 04">
        <InpButton />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} pulseKey="inp" />
    </>
  );
}

// ── Step 5 — INP optimisation ──────────────────────────────────

function InpOptimisationStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="Three patterns for fixing INP" eyebrow="step 05">
        <InpOptimization />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} />
    </>
  );
}

// ── Step 6 — CLS visible jump + session window timeline ────────

function ClsStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="CLS is the worst session window — not the sum" eyebrow="step 06">
        <ClsSessionWindows />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} pulseKey="cls" />
    </>
  );
}

// ── Step 7 — Field vs lab ──────────────────────────────────────

function FieldVsLabStep() {
  const { lcpTotalSeconds, inpTotalMs, clsValue } = useCwvContext();
  return (
    <>
      <Panel title="Lab is optimistic. Field is the truth." eyebrow="step 07">
        <FieldVsLab />
      </Panel>
      <CompactGauges lcpSeconds={lcpTotalSeconds} inpMs={inpTotalMs} cls={clsValue} />
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────

type PanelProps = { title: string; eyebrow?: string; children: React.ReactNode };

function Panel({ title, eyebrow, children }: PanelProps) {
  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.panelHeader}>
        {eyebrow && <span className={styles.panelEyebrow}>{eyebrow}</span>}
        <h3 className={styles.panelTitle}>{title}</h3>
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function CompactGauges({ lcpSeconds, inpMs, cls, pulseKey }: { lcpSeconds: number; inpMs: number; cls: number; pulseKey?: string | null }) {
  return (
    <section className={styles.compactGaugesPanel} aria-label="Current Core Web Vitals">
      <span className={styles.compactGaugesLabel}>Live metrics</span>
      <CwvGauges lcpSeconds={lcpSeconds} inpMs={inpMs} cls={cls} pulseKey={pulseKey ?? null} />
    </section>
  );
}
