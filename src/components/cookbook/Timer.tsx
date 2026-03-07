"use client";

import { motion } from "framer-motion";

import type { Timer as TimerType } from "@/lib/timer-engine";
import { formatTime } from "@/lib/timer-engine";

import { TimerRing } from "./TimerRing";

type TimerProps = {
  timer: TimerType;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
};

/**
 * Individual timer card with controls
 * Shows timer state, countdown, and interactive controls
 */
export function Timer({ timer, onPause, onResume, onReset, onAdjust, onDismiss }: TimerProps) {
  const isActive = timer.state === "running" || timer.state === "warning";
  const isPaused = timer.state === "paused";
  const isDone = timer.state === "done";

  // State-specific styles
  const getCardStyles = () => {
    const base = "rounded-xl p-4 backdrop-blur-md transition-all duration-300";

    switch (timer.state) {
      case "idle":
        return `${base} bg-[var(--color-surface)]/80 border border-[var(--color-border)]`;
      case "running":
        return `${base} bg-[var(--color-surface)]/90 border border-[#5B7D4A]/30`;
      case "warning":
        return `${base} bg-[#E8A838]/10 border border-[#E8A838]/50 shadow-lg shadow-[#E8A838]/20`;
      case "done":
        return `${base} bg-[#7FA87F]/20 border border-[#7FA87F]/50 shadow-lg shadow-[#7FA87F]/20`;
      case "paused":
        return `${base} bg-[var(--color-surface)]/70 border border-[var(--color-border)] opacity-80`;
      default:
        return `${base} bg-[var(--color-surface)]/80 border border-[var(--color-border)]`;
    }
  };

  // Wobble animation for warning state
  const wobbleVariants = {
    warning: {
      rotate: [0, -1, 1, -1, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 3,
      },
    },
  };

  return (
    <motion.div
      className={getCardStyles()}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: timer.state === "dismissed" ? 0 : 1,
        y: timer.state === "dismissed" ? -20 : 0,
        ...wobbleVariants[timer.state as keyof typeof wobbleVariants],
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-4">
        {/* Timer ring */}
        <TimerRing timer={timer} size={80} strokeWidth={6} />

        {/* Timer info and controls */}
        <div className="flex-1 min-w-0">
          {/* Label and type */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{timer.label}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-text-secondary)",
              }}
            >
              {timer.type}
            </span>
          </div>

          {/* Time display */}
          <div className="text-2xl font-mono font-bold tabular-nums mb-3">
            {formatTime(timer.remainingTime)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause button */}
            {!isDone && (
              <button
                onClick={isActive ? onPause : onResume}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-[var(--color-muted)]"
                aria-label={isActive ? "Pause timer" : "Resume timer"}
              >
                {isActive ? "⏸ Pause" : "▶ Resume"}
              </button>
            )}

            {/* Adjust buttons (only when not done) */}
            {!isDone && (
              <>
                <button
                  onClick={() => onAdjust(-30)}
                  className="px-2 py-1.5 text-xs rounded-lg transition-colors hover:bg-[var(--color-muted)]"
                  aria-label="Subtract 30 seconds"
                  disabled={timer.remainingTime <= 30}
                >
                  -30s
                </button>
                <button
                  onClick={() => onAdjust(30)}
                  className="px-2 py-1.5 text-xs rounded-lg transition-colors hover:bg-[var(--color-muted)]"
                  aria-label="Add 30 seconds"
                >
                  +30s
                </button>
              </>
            )}

            {/* Reset button */}
            {(isPaused || isDone) && (
              <button
                onClick={onReset}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-[var(--color-muted)]"
                aria-label="Reset timer"
              >
                ↺ Reset
              </button>
            )}

            {/* Dismiss button (done state) */}
            {isDone && (
              <button
                onClick={onDismiss}
                className="ml-auto px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-[var(--color-muted)]"
                aria-label="Dismiss timer"
              >
                ✓ Done
              </button>
            )}
          </div>

          {/* Alert message for done state */}
          {isDone && timer.alert && (
            <motion.p
              className="mt-2 text-xs text-[var(--color-text-secondary)]"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {timer.alert}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
