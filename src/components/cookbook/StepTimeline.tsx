"use client";

import type { CookbookStep } from "@/lib/cookbook-types";

interface StepTimelineProps {
  steps: CookbookStep[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

export function StepTimeline({ steps, currentStepIndex, onStepClick }: StepTimelineProps) {
  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
      <div className="mx-auto max-w-7xl">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Recipe Progress
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => onStepClick(index)}
                className={`group relative flex min-w-[3rem] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all ${
                  isCurrent
                    ? "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-md ring-1 ring-[var(--color-border)]"
                    : isCompleted
                      ? "bg-[var(--color-muted)]/20 text-[var(--accent-weak)] hover:bg-[var(--color-muted)]/30"
                      : "bg-[var(--color-muted)]/10 text-[var(--color-muted)] hover:bg-[var(--color-muted)]/20"
                }`}
                aria-label={`Go to step ${index + 1}: ${step.title}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Step number */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-[var(--color-border)]"
                      : isCompleted
                        ? "bg-[var(--accent-weak)]/30"
                        : "bg-[var(--color-muted)]/20"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Step title (shows on hover for larger screens) */}
                <span className="hidden text-xs group-hover:block md:block">{step.title}</span>

                {/* Active indicator */}
                {isCurrent && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-[var(--accent-weak)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
