"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useScenarioPlayer } from "./use-scenario-player";
import { DiagramCanvas } from "./DiagramCanvas";
import { ActiveNodeBubble } from "./ActiveNodeBubble";
import { AnchoredDetailCard } from "./AnchoredDetailCard";
import { BandwidthMeter } from "./BandwidthMeter";
import type { ArchitectureScenarioPlayerProps } from "./types";
import styles from "./styles.module.css";

const DEFAULT_CARD_AREA = { side: "right" as const, widthVB: 200, gapVB: 16 };

export function ArchitectureScenarioPlayer({
  config,
  onScenarioChange,
}: ArchitectureScenarioPlayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const player = useScenarioPlayer({
    scenarios: config.scenarios,
    autoPlayOnce: true,
    enterTarget: rootRef,
    reducedMotion,
  });

  const {
    scenario,
    activeSteps,
    stepIdx,
    displayedStepIdx,
    scenarioIdx,
    totalSteps,
    isPlaying,
    splitEnabled,
  } = player;

  useEffect(() => {
    onScenarioChange?.(scenarioIdx);
  }, [scenarioIdx, onScenarioChange]);

  const panelStep = activeSteps[displayedStepIdx];
  const panelPrevStep =
    displayedStepIdx > 0 ? activeSteps[displayedStepIdx - 1] : undefined;
  const panelStepKey = `${scenario.id}-${splitEnabled ? "split" : "nosplit"}-${displayedStepIdx}`;

  const anchorNode = config.nodes.find((n) => n.id === panelStep?.nodeId);
  const viewBoxParts = config.viewBox.split(" ");
  const viewBoxW = parseFloat(viewBoxParts[2] ?? "480") || 480;
  const viewBoxH = parseFloat(viewBoxParts[3] ?? "168") || 168;
  const tailXPercent = anchorNode
    ? ((anchorNode.x + (anchorNode.w ?? 100) / 2) / viewBoxW) * 100
    : 50;

  const layout = config.layout ?? "stacked";
  const cardArea = config.cardArea ?? DEFAULT_CARD_AREA;
  const gapVB = cardArea.gapVB ?? 16;
  const cardAnchorX = viewBoxW - cardArea.widthVB - gapVB;
  // Card vertical center tracks the active node's center.
  const anchorYPercent = anchorNode
    ? ((anchorNode.y + (anchorNode.h ?? 40) / 2) / viewBoxH) * 100
    : 50;
  // CSS percentages for card overlay positioning.
  const cardRightPercent = (gapVB / viewBoxW) * 100;
  const cardWidthPercent = (cardArea.widthVB / viewBoxW) * 100;

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

      {/* ── Split toggle pill ──────────────────────────────────── */}
      <div
        className={styles.splitToggle}
        role="radiogroup"
        aria-label="Architecture mode"
      >
        <span className={styles.splitToggleLabel}>Mode</span>
        <div className={styles.splitToggleTrack}>
          <button
            type="button"
            role="radio"
            aria-checked={splitEnabled}
            className={styles.splitToggleOption}
            data-active={splitEnabled ? "true" : undefined}
            onClick={() => player.setSplitEnabled(true)}
          >
            with split
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!splitEnabled}
            className={styles.splitToggleOption}
            data-active={!splitEnabled ? "true" : undefined}
            data-mode="nosplit"
            onClick={() => player.setSplitEnabled(false)}
          >
            without split
          </button>
        </div>
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

      {/* ── Canvas frame: diagram + meter + bubble/card ─────────── */}
      <div
        className={styles.canvasFrame}
        data-layout={layout}
      >
        {layout === "anchored" ? (
          <div
            className={styles.canvasInner}
            style={{
              ["--card-right" as string]: `${cardRightPercent}%`,
              ["--card-width" as string]: `${cardWidthPercent}%`,
            }}
          >
            <DiagramCanvas
              viewBox={config.viewBox}
              nodes={config.nodes}
              edges={config.edges}
              protagonist={config.protagonist}
              steps={activeSteps}
              currentStepIdx={stepIdx}
              reducedMotion={reducedMotion}
              splitEnabled={splitEnabled}
              cardAnchorX={cardAnchorX}
              layout="anchored"
            />
            <div className={styles.meterMount}>
              <BandwidthMeter
                steps={activeSteps}
                stepIdx={stepIdx}
                splitEnabled={splitEnabled}
                reducedMotion={reducedMotion}
              />
            </div>
            <AnchoredDetailCard
              node={anchorNode}
              caption={panelStep?.caption ?? ""}
              stepNumber={displayedStepIdx + 1}
              totalSteps={totalSteps}
              payload={panelStep?.payload}
              stateAfter={panelStep?.stateAfter}
              prevState={panelPrevStep?.stateAfter}
              stepKey={panelStepKey}
              reducedMotion={reducedMotion}
              anchorYPercent={anchorYPercent}
            />
          </div>
        ) : (
          <>
            <div className={styles.canvasWrap}>
              <DiagramCanvas
                viewBox={config.viewBox}
                nodes={config.nodes}
                edges={config.edges}
                protagonist={config.protagonist}
                steps={activeSteps}
                currentStepIdx={stepIdx}
                reducedMotion={reducedMotion}
                splitEnabled={splitEnabled}
              />
              <div className={styles.meterMount}>
                <BandwidthMeter
                  steps={activeSteps}
                  stepIdx={stepIdx}
                  splitEnabled={splitEnabled}
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>
            <ActiveNodeBubble
              node={anchorNode}
              caption={panelStep?.caption ?? ""}
              stepNumber={displayedStepIdx + 1}
              totalSteps={totalSteps}
              payload={panelStep?.payload}
              stateAfter={panelStep?.stateAfter}
              prevState={panelPrevStep?.stateAfter}
              stepKey={panelStepKey}
              tailXPercent={tailXPercent}
              reducedMotion={reducedMotion}
            />
          </>
        )}
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
          {activeSteps.map((_, i) => {
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
    </div>
  );
}
