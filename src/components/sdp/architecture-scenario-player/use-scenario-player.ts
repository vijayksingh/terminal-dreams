"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArchScenario } from "./types";

const DEFAULT_STEP_MS = 1500;

export type ScenarioPlayerState = {
  scenarioIdx: number;
  stepIdx: number;
  isPlaying: boolean;
  isComplete: boolean;
  scenario: ArchScenario;
  totalSteps: number;
};

export type ScenarioPlayerControls = {
  selectScenario: (idx: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  step: () => void;
  stepBack: () => void;
  replay: () => void;
  scrubTo: (stepIdx: number) => void;
};

export type UseScenarioPlayerOptions = {
  scenarios: ArchScenario[];
  /** Default step duration in ms. Step.duration overrides. */
  stepDuration?: number;
  /** If true, auto-plays the first scenario once on mount (or on enter). */
  autoPlayOnce?: boolean;
  /** Element ref to gate auto-play on intersection observer. */
  enterTarget?: React.RefObject<HTMLElement | null>;
  /** If true, no animation — clamp to last step instantly. */
  reducedMotion?: boolean;
};

export function useScenarioPlayer(
  options: UseScenarioPlayerOptions,
): ScenarioPlayerState & ScenarioPlayerControls {
  const { scenarios, stepDuration = DEFAULT_STEP_MS, autoPlayOnce, enterTarget, reducedMotion } = options;

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  const scenario = scenarios[scenarioIdx] ?? scenarios[0];
  const totalSteps = scenario.steps.length;
  const isComplete = stepIdx >= totalSteps - 1;
  const currentStep = scenario.steps[stepIdx];
  const stepMs = currentStep?.duration ?? stepDuration;

  // ── Reduced motion: jump to final frame, never tick ──
  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStepIdx(scenario.steps.length - 1);
    }
  }, [reducedMotion, scenario]);

  // ── Auto-play once on viewport entry ──
  useEffect(() => {
    if (!autoPlayOnce || reducedMotion || hasAutoPlayedRef.current) return;
    const el = enterTarget?.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      hasAutoPlayedRef.current = true;
      setStepIdx(0);
      setPlaying(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !hasAutoPlayedRef.current) {
            hasAutoPlayedRef.current = true;
            setStepIdx(0);
            setPlaying(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlayOnce, reducedMotion, enterTarget]);

  // ── Tick ──
  useEffect(() => {
    if (!playing || reducedMotion || isComplete) {
      if (isComplete) setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      setStepIdx((i) => Math.min(i + 1, totalSteps - 1));
    }, stepMs);
    return () => clearTimeout(t);
  }, [playing, reducedMotion, isComplete, stepIdx, totalSteps, stepMs]);

  // ── Controls ──
  const selectScenario = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setStepIdx(0);
    setPlaying(false);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const step = useCallback(() => {
    setStepIdx((i) => Math.min(i + 1, totalSteps - 1));
    setPlaying(false);
  }, [totalSteps]);

  const stepBack = useCallback(() => {
    setStepIdx((i) => Math.max(i - 1, 0));
    setPlaying(false);
  }, []);

  const replay = useCallback(() => {
    setStepIdx(0);
    setPlaying(true);
  }, []);

  const scrubTo = useCallback(
    (idx: number) => {
      setStepIdx(Math.max(0, Math.min(idx, totalSteps - 1)));
      setPlaying(false);
    },
    [totalSteps],
  );

  return useMemo(
    () => ({
      scenarioIdx,
      stepIdx,
      isPlaying: playing,
      isComplete,
      scenario,
      totalSteps,
      selectScenario,
      play,
      pause,
      togglePlay,
      step,
      stepBack,
      replay,
      scrubTo,
    }),
    [
      scenarioIdx,
      stepIdx,
      playing,
      isComplete,
      scenario,
      totalSteps,
      selectScenario,
      play,
      pause,
      togglePlay,
      step,
      stepBack,
      replay,
      scrubTo,
    ],
  );
}
