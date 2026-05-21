"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  HintsProvider,
  STEP_SCENARIOS,
  useHintsContext,
} from "./hints-context";
import { HintsTimeline } from "./ui/HintsTimeline";
import { HintCodePanel } from "./ui/HintCodePanel";
import styles from "./ResourceHintsLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function ResourceHintsLab({ activeStep }: { activeStep: number }) {
  return (
    <HintsProvider activeStep={activeStep}>
      <LabShell />
    </HintsProvider>
  );
}

function LabShell() {
  const { activeStep } = useHintsContext();
  return (
    <div className={styles.labRoot}>
      <StepBar activeStep={activeStep} />
      <ScrollArea />
    </div>
  );
}

// ── Step indicator bar ──────────────────────────────────────────────

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_SCENARIOS.map((s, i) => (
        <span
          key={s.id}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${s.label}`}
        >
          {s.code}
        </span>
      ))}
    </div>
  );
}

// ── Scroll area: timeline + step panel ──────────────────────────────

function ScrollArea() {
  const reducedMotion = usePrefersReducedMotion();
  const {
    activeStep,
    scenario,
    bars,
    loadEndMs,
    nextPageEndMs,
    savedMs,
    priorityInversion,
    highPriorityCount,
  } = useHintsContext();
  const focusBar = bars.find((b) => b.resourceId === scenario.focusId);
  const focusLabel = focusBar?.label ?? scenario.focusId;
  const focusSavedMs = savedMs[scenario.focusId] ?? 0;

  return (
    <div className={styles.scrollArea}>
      <HintsTimeline
        bars={bars}
        loadEndMs={loadEndMs}
        nextPageEndMs={nextPageEndMs}
        focusId={scenario.focusId}
        highlightInversion={priorityInversion}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={`code-${activeStep}`}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={TRANSITION.enterCard}
        >
          <HintCodePanel
            stepCode={scenario.code}
            stepTitle={scenario.label}
            callout={scenario.callout}
            snippet={scenario.snippet}
            savedMs={focusSavedMs}
            focusLabel={focusLabel}
          />
        </motion.div>
      </AnimatePresence>

      <PriorityInversionTrap
        active={priorityInversion}
        highPriorityCount={highPriorityCount}
      />
    </div>
  );
}

function PriorityInversionTrap({
  active,
  highPriorityCount,
}: {
  active: boolean;
  highPriorityCount: number;
}) {
  return (
    <motion.div
      className={styles.trapPanel}
      data-active={active ? "true" : undefined}
      initial={false}
      animate={{ opacity: 1 }}
    >
      <div className={styles.trapHeader}>
        <span className={styles.trapDot} data-active={active ? "true" : undefined} />
        <span className={styles.trapTitle}>Priority inversion guardrail</span>
        <span className={styles.trapCount}>
          {highPriorityCount}/5 high-priority hints
        </span>
      </div>
      <p className={styles.trapBody}>
        {active
          ? "Too many resources are competing for the same high-priority lane. Bandwidth saturates, every preloaded download stretches ~35% longer, and the load endpoint moves RIGHT — slower, not faster. Keep preload + fetchpriority='high' to your 3–4 most critical assets."
          : "Each preload or fetchpriority='high' consumes a slot in the high-priority lane. The browser caps useful boosts at ~4–5 resources — past that, bandwidth saturates and the load gets slower."}
      </p>
    </motion.div>
  );
}
