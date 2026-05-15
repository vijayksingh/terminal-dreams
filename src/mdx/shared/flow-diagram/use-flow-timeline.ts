"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlowTimeline, FlowScenario, FlowStep } from "./types";

const DEFAULT_STEP_MS = 1800;

export type UseFlowTimelineReturn = {
  isActive: boolean;

  currentScenarioIdx: number;
  currentStepIdx: number;
  isPlaying: boolean;
  isComplete: boolean;

  currentScenario: FlowScenario | null;
  currentStep: FlowStep | null;
  activeNodeId: string | null;
  visitedNodeIds: Set<string>;
  traversedEdgeKeys: Set<string>;

  scenarios: FlowScenario[];
  stepCount: number;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  step: () => void;
  stepBack: () => void;
  reset: () => void;
  selectScenario: (idx: number) => void;
  scrubTo: (stepIdx: number) => void;
};

function edgeKey(a: string, b: string) {
  return `${a}→${b}`;
}

export function useFlowTimeline(
  timeline: FlowTimeline | null,
): UseFlowTimelineReturn | null {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const isActive = !!timeline && timeline.scenarios.length > 0;
  const scenarios = isActive ? timeline.scenarios : [];
  const scenario = scenarios[scenarioIdx] ?? scenarios[0] ?? null;
  const path = scenario?.path ?? [];
  const stepCount = path.length;
  const isComplete = stepCount > 0 && stepIdx >= stepCount - 1;
  const currentStep = path[stepIdx] ?? null;
  const activeNodeId = currentStep?.nodeId ?? null;
  const stepDuration = currentStep?.duration ?? timeline?.stepDuration ?? DEFAULT_STEP_MS;

  const visitedNodeIds = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i <= stepIdx && i < path.length; i++) s.add(path[i].nodeId);
    return s;
  }, [path, stepIdx]);

  const traversedEdgeKeys = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < stepIdx && i + 1 < path.length; i++) {
      s.add(edgeKey(path[i].nodeId, path[i + 1].nodeId));
    }
    return s;
  }, [path, stepIdx]);

  useEffect(() => {
    if (!isActive || !playing || isComplete) {
      if (isComplete) setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIdx((s) => Math.min(s + 1, stepCount - 1));
    }, stepDuration);
    return () => clearTimeout(timer);
  }, [isActive, playing, stepIdx, isComplete, stepCount, stepDuration]);

  const step = useCallback(() => {
    if (stepIdx < stepCount - 1) setStepIdx((s) => s + 1);
  }, [stepIdx, stepCount]);

  const stepBack = useCallback(() => {
    if (stepIdx > 0) setStepIdx((s) => s - 1);
  }, [stepIdx]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const reset = useCallback(() => {
    setStepIdx(0);
    setPlaying(false);
  }, []);

  const selectScenario = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setStepIdx(0);
    setPlaying(false);
  }, []);

  const scrubTo = useCallback(
    (idx: number) => {
      setStepIdx(Math.max(0, Math.min(idx, stepCount - 1)));
    },
    [stepCount],
  );

  if (!isActive) return null;

  return {
    isActive: true,
    currentScenarioIdx: scenarioIdx,
    currentStepIdx: stepIdx,
    isPlaying: playing,
    isComplete,
    currentScenario: scenario,
    currentStep,
    activeNodeId,
    visitedNodeIds,
    traversedEdgeKeys,
    scenarios,
    stepCount,
    play,
    pause,
    togglePlay,
    step,
    stepBack,
    reset,
    selectScenario,
    scrubTo,
  };
}
