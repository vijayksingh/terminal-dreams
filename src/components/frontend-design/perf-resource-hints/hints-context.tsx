"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  computeTimeline,
  STEP_SCENARIOS,
  TOTAL_STEPS,
  type Bar,
  type StepScenario,
} from "./engine/hints-simulator";

type HintsContextValue = {
  activeStep: number;
  scenario: StepScenario;
  bars: Bar[];
  loadEndMs: number;
  nextPageEndMs: number;
  savedMs: Record<string, number>;
  priorityInversion: boolean;
  highPriorityCount: number;
};

const HintsContext = createContext<HintsContextValue | null>(null);

export function useHintsContext(): HintsContextValue {
  const ctx = useContext(HintsContext);
  if (!ctx) {
    throw new Error("useHintsContext must be used within HintsProvider");
  }
  return ctx;
}

export function HintsProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const clampedStep = Math.max(1, Math.min(TOTAL_STEPS, activeStep));
  const scenario = STEP_SCENARIOS[clampedStep - 1];

  const value = useMemo<HintsContextValue>(() => {
    const result = computeTimeline(scenario.hints);
    return {
      activeStep: clampedStep,
      scenario,
      bars: result.bars,
      loadEndMs: result.loadEndMs,
      nextPageEndMs: result.nextPageEndMs,
      savedMs: result.savedMs,
      priorityInversion: result.priorityInversion,
      highPriorityCount: result.highPriorityCount,
    };
  }, [clampedStep, scenario]);

  return (
    <HintsContext.Provider value={value}>{children}</HintsContext.Provider>
  );
}

export { STEP_SCENARIOS, TOTAL_STEPS };
