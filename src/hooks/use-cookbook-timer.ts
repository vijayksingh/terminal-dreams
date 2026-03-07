"use client";

import { createContext, useContext } from "react";
import type { Timer, TimerState } from "@/lib/timer-engine";

export type TimerCallbacks = {
  onStateChange?: (timer: Timer, oldState: TimerState) => void;
  onComplete?: (timer: Timer) => void;
  onWarning?: (timer: Timer) => void;
};

export type TimerContextValue = {
  timers: Timer[];
  addTimer: (label: string, duration: number, type?: "active" | "passive", alert?: string) => string;
  start: (timerId: string) => void;
  pause: (timerId: string) => void;
  resume: (timerId: string) => void;
  reset: (timerId: string) => void;
  adjust: (timerId: string, deltaSeconds: number) => void;
  dismiss: (timerId: string) => void;
  remove: (timerId: string) => void;
  getTimer: (timerId: string) => Timer | undefined;
  setCallbacks: (callbacks: TimerCallbacks) => void;
};

export const TimerContext = createContext<TimerContextValue | null>(null);

/**
 * Hook to access timer context
 */
export function useCookbookTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useCookbookTimer must be used within a CookbookTimerProvider");
  }
  return context;
}

