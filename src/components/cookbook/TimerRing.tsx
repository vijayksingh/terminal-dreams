"use client";

import { motion } from "framer-motion";

import type { Timer } from "@/lib/timer-engine";
import { getTimerProgress } from "@/lib/timer-engine";

type TimerRingProps = {
  timer: Timer;
  size?: number;
  strokeWidth?: number;
};

/**
 * Circular SVG progress ring for timer visualization
 * Shows smooth progress animation with state-specific colors and effects
 */
export function TimerRing({ timer, size = 120, strokeWidth = 8 }: TimerRingProps) {
  const progress = getTimerProgress(timer);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // State-specific colors
  const getColors = () => {
    switch (timer.state) {
      case "idle":
        return {
          track: "var(--color-muted)",
          progress: "var(--color-accent)",
          glow: "var(--color-accent)",
        };
      case "running":
        return {
          track: "var(--color-muted)",
          progress: "var(--cookbook-timer-done)", // Herb green
          glow: "var(--cookbook-timer-done)",
        };
      case "warning":
        return {
          track: "var(--color-muted)",
          progress: "var(--cookbook-timer-warning)", // Warm amber
          glow: "var(--cookbook-timer-warning)",
        };
      case "done":
        return {
          track: "var(--color-muted)",
          progress: "var(--cookbook-timer-done)", // Sage green
          glow: "var(--cookbook-timer-done)",
        };
      case "paused":
        return {
          track: "var(--color-muted)",
          progress: "#8B7B6B", // Muted
          glow: "#8B7B6B",
        };
      default:
        return {
          track: "var(--color-muted)",
          progress: "var(--color-accent)",
          glow: "var(--color-accent)",
        };
    }
  };

  const colors = getColors();

  // Get animation props based on timer state
  const getPulseAnimation = () => {
    switch (timer.state) {
      case "idle":
        return {
          scale: [1, 1.02, 1],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "warning":
        return {
          scale: [1, 1.03, 1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "done":
        return {
          scale: [1, 1.1, 1],
          transition: { duration: 0.6, ease: "easeOut" as const },
        };
      default:
        return { scale: 1 };
    }
  };

  const getGlowAnimation = () => {
    switch (timer.state) {
      case "idle":
        return {
          opacity: [0.3, 0.5, 0.3],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "running":
        return { opacity: 0.4 };
      case "warning":
        return {
          opacity: [0.4, 0.8, 0.4],
          transition: { duration: 1, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "done":
        return { opacity: 0.8 };
      case "paused":
        return { opacity: 0.2 };
      default:
        return { opacity: 0.4 };
    }
  };

  return (
    <motion.div
      className="timer-ring relative"
      style={{ width: size, height: size }}
      animate={getPulseAnimation()}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Glow effect */}
        <defs>
          <filter id={`glow-${timer.id}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
          opacity={0.2}
        />

        {/* Progress ring with glow */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.progress}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter={`url(#glow-${timer.id})`}
          animate={getGlowAnimation()}
          transition={{
            strokeDashoffset: { duration: 0.3, ease: "easeOut" as const },
          }}
        />

        {/* Done state: expanding ring burst */}
        {timer.state === "done" && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.glow}
            strokeWidth={strokeWidth / 2}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" as const }}
          />
        )}
      </svg>

      {/* Checkmark for done state */}
      {timer.state === "done" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" as const }}
        >
          <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="var(--cookbook-timer-done)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" as const }}
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
