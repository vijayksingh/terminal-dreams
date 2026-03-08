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
        <div className="mb-3 px-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Active Timer
          </h2>
        </div>

        {/* Single timer display */}
        <AnimatePresence mode="popLayout">
          {timers[0] && (
            <Timer
              key={timers[0].id}
              timer={timers[0]}
              onPause={() => pause(timers[0].id)}
              onResume={() => resume(timers[0].id)}
              onReset={() => reset(timers[0].id)}
              onAdjust={(delta) => adjust(timers[0].id, delta)}
              onDismiss={() => dismiss(timers[0].id)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

