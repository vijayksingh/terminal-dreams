import type { ReactNode } from "react";

import type { CookbookStep, IngredientGroup } from "@/lib/cookbook-types";
import { StepTimeline } from "./StepTimeline";
import { ProgressBar } from "./ProgressBar";
import { SoundToggle } from "./SoundToggle";
import { TimerTray } from "./TimerTray";

interface CookbookLayoutProps {
  /** 0–100 progress percentage */
  progress: number;
  /** Recipe header slot */
  header: ReactNode;
  /** Step card slot */
  stepCard: ReactNode;
  /** Ingredient panel slot */
  ingredientPanel: ReactNode;
  /** Optional celebration overlay */
  celebration?: ReactNode;
  /** Steps for timeline navigation */
  steps: CookbookStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Timeline step click handler */
  onStepClick: (index: number) => void;
}

/**
 * Pure layout component for the cookbook playground.
 * Handles grid composition, sticky positioning, and slot placement.
 * No hooks or state — that's the Controller's job.
 */
export function CookbookLayout({
  progress,
  header,
  stepCard,
  ingredientPanel,
  celebration,
  steps,
  currentStepIndex,
  onStepClick,
}: CookbookLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Progress Bar */}
      <ProgressBar progress={progress} />

      {/* Sound Toggle - Fixed position top right */}
      <div className="fixed top-6 right-6 z-50">
        <SoundToggle />
      </div>

      {/* Completion Celebration */}
      {celebration}

      {/* Recipe Header */}
      {header}

      {/* Main playground area */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Ingredient Panel (sidebar on desktop, drawer on mobile) */}
        <div className="order-2 border-t border-[var(--color-border)] lg:order-1 lg:w-80 lg:border-r lg:border-t-0">
          {ingredientPanel}
        </div>

        {/* Step Card (main content area) */}
        <div className="order-1 flex-1 p-6 lg:order-2 lg:p-8">
          <div className="mx-auto max-w-3xl">
            {stepCard}
          </div>
        </div>
      </div>

      {/* Step Timeline (bottom navigation) */}
      <div className="sticky bottom-0 z-10">
        <StepTimeline steps={steps} currentStepIndex={currentStepIndex} onStepClick={onStepClick} />
      </div>

      {/* Timer Tray - floating, global across all steps */}
      <TimerTray />
    </div>
  );
}
