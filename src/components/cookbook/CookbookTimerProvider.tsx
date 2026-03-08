"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { TimerContext } from "@/hooks/use-cookbook-timer";

import type { Timer, TimerState } from "@/lib/timer-engine";
import {
  adjustTimer,
  createTimer,
  dismissTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  tickTimer,
} from "@/lib/timer-engine";

const STORAGE_KEY = "cookbook-timers";
const TICK_INTERVAL = 100; // Update every 100ms for smooth progress

type TimerCallbacks = {
  onStateChange?: (timer: Timer, oldState: TimerState) => void;
  onComplete?: (timer: Timer) => void;
  onWarning?: (timer: Timer) => void;
};

/**
 * Provider component that manages timer state globally
 */
export function CookbookTimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbacksRef = useRef<TimerCallbacks>({});

  // Load timers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Timer[];
        // Filter out dismissed timers and validate
        const valid = parsed.filter(
          (t) => t.state !== "dismissed" && t.id && t.label && typeof t.duration === "number"
        );
        setTimers(valid);
      } catch {
        // Invalid data, start fresh
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save timers to localStorage whenever they change
  useEffect(() => {
    if (timers.length > 0) {
      const toSave = timers.filter((t) => t.state !== "dismissed");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [timers]);

  // Tick interval for running timers
  useEffect(() => {
    const hasRunning = timers.some((t) => t.state === "running" || t.state === "warning");

    if (hasRunning) {
      intervalRef.current = setInterval(() => {
        setTimers((current) => {
          return current.map((timer) => {
            if (timer.state !== "running" && timer.state !== "warning") {
              return timer;
            }

            const { timer: updated, stateChanged } = tickTimer(timer);

            // Trigger callbacks on state change
            if (stateChanged && callbacksRef.current) {
              const oldState = timer.state;
              if (updated.state === "done" && callbacksRef.current.onComplete) {
                callbacksRef.current.onComplete(updated);
              }
              if (updated.state === "warning" && callbacksRef.current.onWarning) {
                callbacksRef.current.onWarning(updated);
              }
              if (callbacksRef.current.onStateChange) {
                callbacksRef.current.onStateChange(updated, oldState);
              }
            }

            return updated;
          });
        });
      }, TICK_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timers]);

  /**
   * Add and start a new timer
   * Replaces any existing timer with the new one (single global timer)
   */
  const addTimer = useCallback(
    (label: string, duration: number, type: "active" | "passive" = "active", alert?: string) => {
      const timer = createTimer(label, duration, type, alert);
      const started = startTimer(timer);
      // Clear all existing timers and set only the new one
      setTimers([started]);
      return started.id;
    },
    []
  );

  /**
   * Start an idle timer
   */
  const start = useCallback((timerId: string) => {
    setTimers((current) =>
      current.map((timer) => (timer.id === timerId ? startTimer(timer) : timer))
    );
  }, []);

  /**
   * Pause a running timer
   */
  const pause = useCallback((timerId: string) => {
    setTimers((current) =>
      current.map((timer) => (timer.id === timerId ? pauseTimer(timer) : timer))
    );
  }, []);

  /**
   * Resume a paused timer
   */
  const resume = useCallback((timerId: string) => {
    setTimers((current) =>
      current.map((timer) => (timer.id === timerId ? resumeTimer(timer) : timer))
    );
  }, []);

  /**
   * Reset a timer to its initial state
   */
  const reset = useCallback((timerId: string) => {
    setTimers((current) =>
      current.map((timer) => (timer.id === timerId ? resetTimer(timer) : timer))
    );
  }, []);

  /**
   * Adjust timer by adding or subtracting seconds
   */
  const adjust = useCallback((timerId: string, deltaSeconds: number) => {
    setTimers((current) =>
      current.map((timer) => (timer.id === timerId ? adjustTimer(timer, deltaSeconds) : timer))
    );
  }, []);

  /**
   * Dismiss a completed timer
   */
  const dismiss = useCallback((timerId: string) => {
    setTimers((current) => {
      const updated = current.map((timer) =>
        timer.id === timerId ? dismissTimer(timer) : timer
      );
      // Filter out dismissed timers after a brief delay for animation
      setTimeout(() => {
        setTimers((curr) => curr.filter((t) => t.state !== "dismissed"));
      }, 300);
      return updated;
    });
  }, []);

  /**
   * Remove a timer completely (for cleanup)
   */
  const remove = useCallback((timerId: string) => {
    setTimers((current) => current.filter((t) => t.id !== timerId));
  }, []);

  /**
   * Get active timers (not dismissed)
   */
  const activeTimers = timers.filter((t) => t.state !== "dismissed");

  /**
   * Get a specific timer by ID
   */
  const getTimer = useCallback(
    (timerId: string) => {
      return timers.find((t) => t.id === timerId);
    },
    [timers]
  );

  /**
   * Set callbacks for timer events
   */
  const setCallbacks = useCallback((callbacks: TimerCallbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  const value = {
    timers: activeTimers,
    addTimer,
    start,
    pause,
    resume,
    reset,
    adjust,
    dismiss,
    remove,
    getTimer,
    setCallbacks,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
