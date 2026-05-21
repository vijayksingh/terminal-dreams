"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  ImagePerfProvider,
  STEP_CODES,
  STEP_LABELS,
  BUDGET_KB,
  useImagePerfContext,
} from "./image-perf-context";
import {
  FormatLandscape,
  CompressionQuality,
  SrcsetBuilder,
  ArtDirection,
  LazyBudget,
  PriorityHints,
  ImageCDN,
} from "./ui/StepWidgets";
import styles from "./ImagePerfLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function ImagePerfLab({ activeStep }: { activeStep: number }) {
  return (
    <ImagePerfProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar />
        <BudgetStrip />
        <ScrollArea />
      </div>
    </ImagePerfProvider>
  );
}

// ── Step indicator bar ──────────────────────────────────────────────

function StepBar() {
  const { activeStep } = useImagePerfContext();

  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_CODES.map((code, i) => (
        <span
          key={code}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${STEP_LABELS[i]}`}
        >
          {code}
        </span>
      ))}
    </div>
  );
}

// ── Budget strip (scenario through-line) ────────────────────────────

function BudgetStrip() {
  return (
    <div className={styles.budgetStrip}>
      <span className={styles.budgetLabel}>Scenario</span>
      <span className={styles.budgetCopy}>
        One page · 20 images · initial-load budget {(BUDGET_KB / 1024).toFixed(1)} MB
      </span>
    </div>
  );
}

// ── Scroll area with step-keyed crossfade ───────────────────────────

function ScrollArea() {
  const { activeStep } = useImagePerfContext();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.scrollArea}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${activeStep}`}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={TRANSITION.enterCard}
        >
          <StepWidget activeStep={activeStep} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepWidget({ activeStep }: { activeStep: number }) {
  switch (activeStep) {
    case 1:
      return <FormatLandscape />;
    case 2:
      return <CompressionQuality />;
    case 3:
      return <SrcsetBuilder />;
    case 4:
      return <ArtDirection />;
    case 5:
      return <LazyBudget />;
    case 6:
      return <PriorityHints />;
    case 7:
      return <ImageCDN />;
    default:
      return null;
  }
}
