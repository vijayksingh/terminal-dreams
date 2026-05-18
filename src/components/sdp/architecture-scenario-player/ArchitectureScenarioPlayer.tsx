"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useScenarioPlayer } from "./use-scenario-player";
import { DiagramCanvas } from "./DiagramCanvas";
import { TypePreviewCard } from "./TypePreviewCard";
import { StateDiffPanel } from "./StateDiffPanel";
import type { ArchitectureScenarioPlayerProps } from "./types";
import styles from "./styles.module.css";

export function ArchitectureScenarioPlayer({
  config,
}: ArchitectureScenarioPlayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const player = useScenarioPlayer({
    scenarios: config.scenarios,
    autoPlayOnce: true,
    enterTarget: rootRef,
    reducedMotion,
  });

  const { scenario, stepIdx, scenarioIdx, totalSteps, isPlaying } = player;
  const currentStep = scenario.steps[stepIdx];
  const prevStep = stepIdx > 0 ? scenario.steps[stepIdx - 1] : undefined;
  const stepKey = `${scenario.id}-${stepIdx}`;

  return (
    <div ref={rootRef} className={styles.root}>
      {/* ── Scenario tabs ────────────────────────────────────────── */}
      <div className={styles.scenarioTabs} role="tablist" aria-label="Scenarios">
        {config.scenarios.map((s, i) => {
          const active = i === scenarioIdx;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={styles.scenarioTab}
              data-active={active ? "true" : undefined}
              onClick={() => player.selectScenario(i)}
            >
              <span className={styles.scenarioTabIndex}>{i + 1}</span>
              <span className={styles.scenarioTabLabel}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Scenario blurb ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`blurb-${scenarioIdx}`}
          className={styles.scenarioBlurb}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
        >
          {scenario.blurb}
        </motion.p>
      </AnimatePresence>

      {/* ── Step caption ───────────────────────────────────────── */}
      <div className={styles.captionStrip}>
        <span className={styles.captionStep}>
          {String(stepIdx + 1).padStart(2, "0")} <span className={styles.captionSlash}>/</span> {String(totalSteps).padStart(2, "0")}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={stepKey}
            className={styles.captionText}
            initial={reducedMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
          >
            {currentStep?.caption}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* ── Diagram canvas ─────────────────────────────────────── */}
      <DiagramCanvas
        viewBox={config.viewBox}
        nodes={config.nodes}
        edges={config.edges}
        protagonist={config.protagonist}
        steps={scenario.steps}
        currentStepIdx={stepIdx}
        reducedMotion={reducedMotion}
      />

      {/* ── Two-panel layout: type preview | state diff ─────── */}
      <div className={styles.panelGrid}>
        <TypePreviewCard
          payload={currentStep?.payload}
          stepKey={stepKey}
          reducedMotion={reducedMotion}
        />
        <StateDiffPanel
          current={currentStep?.stateAfter}
          previous={prevStep?.stateAfter}
          stepKey={stepKey}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* ── Scrub + controls ──────────────────────────────────── */}
      <div className={styles.scrubBar}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={player.stepBack}
          aria-label="Previous step"
          disabled={stepIdx === 0}
        >
          ←
        </button>
        <div className={styles.scrubTrack} role="group" aria-label="Step scrub">
          {scenario.steps.map((_, i) => {
            const visited = i < stepIdx;
            const active = i === stepIdx;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Jump to step ${i + 1}`}
                aria-current={active ? "step" : undefined}
                className={styles.scrubDot}
                data-state={active ? "active" : visited ? "visited" : "future"}
                onClick={() => player.scrubTo(i)}
              />
            );
          })}
        </div>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={player.step}
          aria-label="Next step"
          disabled={stepIdx >= totalSteps - 1}
        >
          →
        </button>
        <button
          type="button"
          className={styles.controlBtnPrimary}
          onClick={isPlaying ? player.pause : player.replay}
          aria-label={isPlaying ? "Pause" : stepIdx >= totalSteps - 1 ? "Replay" : "Play"}
        >
          {isPlaying ? "❚❚" : stepIdx >= totalSteps - 1 ? "↻" : "▶"}
        </button>
      </div>

      {config.footnote && (
        <p className={styles.footnote}>{config.footnote}</p>
      )}
    </div>
  );
}
