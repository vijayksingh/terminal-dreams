"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useCookbookTimer } from "@/hooks/use-cookbook-timer";

import { Timer } from "./Timer";

/**
 * Floating timer tray that displays all active timers
 * Visible from any step, anchored to bottom-right
 * Positioned at bottom-right on desktop, bottom bar on mobile
 */
export function TimerTray() {
  const { timers, pause, resume, reset, adjust, dismiss } = useCookbookTimer();

  if (timers.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] lg:bottom-6 lg:right-6"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glassmorphic container */}
      <div className="rounded-2xl backdrop-blur-xl bg-[var(--color-surface)]/80 border border-[var(--color-border)] shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Active Timers
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            {timers.length}
          </span>
        </div>

        {/* Timer list with animations */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {timers.map((timer) => (
              <Timer
                key={timer.id}
                timer={timer}
                onPause={() => pause(timer.id)}
                onResume={() => resume(timer.id)}
                onReset={() => reset(timer.id)}
                onAdjust={(delta) => adjust(timer.id, delta)}
                onDismiss={() => dismiss(timer.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

