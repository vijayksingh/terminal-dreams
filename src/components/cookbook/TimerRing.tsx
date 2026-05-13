"use client";

import { motion } from "framer-motion";

import type { Timer } from "@/lib/timer-engine";
import { getTimerProgress } from "@/lib/timer-engine";
import { DURATION, EASE, LOOP, DELAY } from "@/lib/motion";

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
          progress: "var(--color-muted)",
          glow: "var(--color-muted)",
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
        return { scale: [1, 1.02, 1], transition: LOOP.breathe };
      case "warning":
        return { scale: [1, 1.03, 1], transition: LOOP.pulse };
      case "done":
        return {
          scale: [1, 1.1, 1],
          transition: { duration: DURATION.ring * 0.75, ease: EASE.out },
        };
      default:
        return { scale: 1 };
    }
  };

  const getGlowAnimation = () => {
    switch (timer.state) {
      case "idle":
        return { opacity: [0.3, 0.5, 0.3], transition: LOOP.breathe };
      case "running":
        return { opacity: 0.4 };
      case "warning":
        return { opacity: [0.4, 0.8, 0.4], transition: LOOP.glow };
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
          filter={timer.state !== "idle" && timer.state !== "warning" ? `url(#glow-${timer.id})` : undefined}
          animate={getGlowAnimation()}
          transition={{
            strokeDashoffset: { duration: DURATION.normal, ease: EASE.out },
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
            transition={{ duration: DURATION.ring, ease: EASE.out }}
          />
        )}
      </svg>

      {/* Checkmark for done state */}
      {timer.state === "done" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: DELAY.short, duration: DURATION.normal, ease: EASE.out }}
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
              transition={{ delay: DELAY.medium, duration: DURATION.slow, ease: EASE.out }}
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
