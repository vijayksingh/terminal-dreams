"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArchScenario, ArchStep } from "./types";

const DEFAULT_STEP_MS = 1500;
/** Panels lag the diagram by this much so cause (chip flying) precedes effect (state/type updates). */
const PANEL_LAG_MS = 500;

export type ScenarioPlayerState = {
  scenarioIdx: number;
  stepIdx: number;
  displayedStepIdx: number;
  isPlaying: boolean;
  isComplete: boolean;
  scenario: ArchScenario;
  /**
   * The step list currently being played — equals `scenario.steps` when
   * splitEnabled is true, or `scenario.stepsWithoutSplit` when false.
   * Consumers should use this instead of `scenario.steps` directly.
   */
  activeSteps: ArchStep[];
  totalSteps: number;
  splitEnabled: boolean;
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
  setSplitEnabled: (enabled: boolean) => void;
  toggleSplit: () => void;
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
  const [displayedStepIdx, setDisplayedStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [splitEnabled, setSplitEnabledState] = useState(true);
  const hasAutoPlayedRef = useRef(false);

  const scenario = scenarios[scenarioIdx] ?? scenarios[0];

  // ── Active step list: depends on which split mode we're in ──
  const activeSteps: ArchStep[] = useMemo(
    () =>
      splitEnabled
        ? scenario.steps
        : (scenario.stepsWithoutSplit ?? scenario.steps),
    [splitEnabled, scenario],
  );

  const totalSteps = activeSteps.length;
  const isComplete = stepIdx >= totalSteps - 1;
  const currentStep = activeSteps[stepIdx];
  const stepMs = currentStep?.duration ?? stepDuration;

  // ── Reduced motion: jump to final frame, never tick ──
  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStepIdx(activeSteps.length - 1);
    }
  }, [reducedMotion, activeSteps]);

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

  // ── Panel lag: displayedStepIdx catches up to stepIdx after PANEL_LAG_MS ──
  useEffect(() => {
    if (reducedMotion) {
      setDisplayedStepIdx(stepIdx);
      return;
    }
    const t = setTimeout(() => setDisplayedStepIdx(stepIdx), PANEL_LAG_MS);
    return () => clearTimeout(t);
  }, [stepIdx, reducedMotion]);

  // ── Controls ──
  const selectScenario = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setStepIdx(0);
    setDisplayedStepIdx(0);
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

  const setSplitEnabled = useCallback((enabled: boolean) => {
    setSplitEnabledState(enabled);
    setStepIdx(0);
    setDisplayedStepIdx(0);
    setPlaying(false);
  }, []);

  const toggleSplit = useCallback(() => {
    setSplitEnabledState((s) => !s);
    setStepIdx(0);
    setDisplayedStepIdx(0);
    setPlaying(false);
  }, []);

  return useMemo(
    () => ({
      scenarioIdx,
      stepIdx,
      displayedStepIdx,
      isPlaying: playing,
      isComplete,
      scenario,
      activeSteps,
      totalSteps,
      splitEnabled,
      selectScenario,
      play,
      pause,
      togglePlay,
      step,
      stepBack,
      replay,
      scrubTo,
      setSplitEnabled,
      toggleSplit,
    }),
    [
      scenarioIdx,
      stepIdx,
      displayedStepIdx,
      playing,
      isComplete,
      scenario,
      activeSteps,
      totalSteps,
      splitEnabled,
      selectScenario,
      play,
      pause,
      togglePlay,
      step,
      stepBack,
      replay,
      scrubTo,
      setSplitEnabled,
      toggleSplit,
    ],
  );
}
