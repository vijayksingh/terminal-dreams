"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import type { CookbookStep } from "@/lib/cookbook-types";
import { useCookbookTimer } from "@/hooks/use-cookbook-timer";
import { useSound } from "@/hooks/use-sound";

type StepCardProps = {
  step: CookbookStep;
  stepNumber: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
};

/**
 * Step card component for recipe instructions
 * Shows step details and timer controls
 */
export function StepCard({ step, stepNumber, totalSteps, onNext, onPrevious, canGoNext = true, canGoPrevious = true }: StepCardProps) {
  const { play: playSound } = useSound();
  const { addTimer, setCallbacks } = useCookbookTimer();

  // Set up callbacks for timer events
  useEffect(() => {
    setCallbacks({
      onComplete: () => {
        playSound("bell-ding", 0.8);
      },
      onWarning: () => {
        // Subtle warning sound when timer enters last 20%
        playSound("ceramic-clink", 0.5);
      },
    });
  }, [playSound, setCallbacks]);

  const handleStartTimer = (label: string, duration: number, type: "active" | "passive", alert?: string) => {
    addTimer(label, duration, type, alert);
    playSound("match-strike", 0.7);
  };

  return (
    <motion.div
      className="step-card bg-[var(--color-surface)] rounded-2xl p-8 shadow-lg border border-[var(--color-border)]"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: "easeOut" as const }}
    >
      {/* Step progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Step {stepNumber} of {totalSteps}
          </span>
          <div className="flex-1 mx-4 h-1 bg-[var(--color-muted)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--color-primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" as const }}
            />
          </div>
        </div>
      </div>

      {/* Step title */}
      <h2 className="text-3xl font-bold mb-4">{step.title}</h2>

      {/* Step instruction */}
      <div className="prose prose-lg mb-6 text-[var(--color-text)]">
        <p className="leading-relaxed">{step.instruction}</p>
      </div>

      {/* Chef's tip */}
      {step.tip && (
        <div className="mb-6 p-4 rounded-lg bg-[#E8B339]/10 border border-[#E8B339]/30">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[#E8B339]">💡 Chef&apos;s Tip:</span> {step.tip}
          </p>
        </div>
      )}

      {/* Timers */}
      {step.timers && step.timers.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Timers
          </h3>
          {step.timers.map((timer, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-muted)]/30 border border-[var(--color-border)]"
            >
              <div className="flex-1">
                <div className="font-medium">{timer.label}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  {Math.floor(timer.duration / 60)}:{(timer.duration % 60).toString().padStart(2, "0")} •{" "}
                  <span className="capitalize">{timer.type}</span>
                </div>
              </div>
              <button
                onClick={() => handleStartTimer(timer.label, timer.duration, timer.type, timer.alert)}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Start Timer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-6 border-t border-[var(--color-border)]">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="px-6 py-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="ml-auto px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {stepNumber === totalSteps ? "Complete Recipe" : "Next Step →"}
        </button>
      </div>
    </motion.div>
  );
}
