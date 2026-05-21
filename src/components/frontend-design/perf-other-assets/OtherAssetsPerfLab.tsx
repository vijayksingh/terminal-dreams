"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  AssetsPerfProvider,
  STEP_CODES,
  STEP_LABELS,
  TOTAL_STEPS,
  useAssetsPerf,
} from "./assets-perf-context";
import { FontPagePreview } from "./ui/FontPagePreview";
import { VideoStrategyBoard } from "./ui/VideoStrategyBoard";
import { ThirdPartyAudit } from "./ui/ThirdPartyAudit";
import styles from "./OtherAssetsPerfLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function OtherAssetsPerfLab({ activeStep }: { activeStep: number }) {
  return (
    <AssetsPerfProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          <ZoneSwitch activeStep={activeStep} />
        </div>
      </div>
    </AssetsPerfProvider>
  );
}

// ── Step indicator bar ─────────────────────────────────────────────

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_CODES.map((code, i) => {
        const stepNum = i + 1;
        return (
          <span
            key={code}
            role="listitem"
            className={styles.stepDot}
            data-active={stepNum <= activeStep ? "true" : undefined}
            data-current={stepNum === activeStep ? "true" : undefined}
            aria-current={stepNum === activeStep ? "step" : undefined}
            aria-label={`Step ${stepNum}: ${STEP_LABELS[i]}`}
            title={STEP_LABELS[i]}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
}

// ── Zone switch ────────────────────────────────────────────────────

function ZoneSwitch({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const clamped = Math.max(1, Math.min(TOTAL_STEPS, activeStep));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`zone-${clamped}`}
        className={styles.zoneFrame}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={TRANSITION.enterCard}
      >
        <ZoneContent activeStep={clamped} />
      </motion.div>
    </AnimatePresence>
  );
}

function ZoneContent({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <FontZone />;
  if (activeStep === 2) return <VideoZone />;
  return <ThirdPartyZone />;
}

// ── Zone wrappers ──────────────────────────────────────────────────

function FontZone() {
  const { stateEntries } = useAssetsPerf();
  return (
    <div className={styles.zoneLayout}>
      <h3 className={styles.sectionHeading}>Font CLS — the swap and its shift</h3>
      <FontPagePreview />
      <StateInspector entries={stateEntries} title="Font state" />
    </div>
  );
}

function VideoZone() {
  const { stateEntries } = useAssetsPerf();
  return (
    <div className={styles.zoneLayout}>
      <h3 className={styles.sectionHeading}>Video — fold decides</h3>
      <VideoStrategyBoard />
      <StateInspector entries={stateEntries} title="Video state" />
    </div>
  );
}

function ThirdPartyZone() {
  const { stateEntries } = useAssetsPerf();
  return (
    <div className={styles.zoneLayout}>
      <h3 className={styles.sectionHeading}>Third-party audit — Partytown vs the trap</h3>
      <ThirdPartyAudit />
      <StateInspector entries={stateEntries} title="Audit state" />
    </div>
  );
}
