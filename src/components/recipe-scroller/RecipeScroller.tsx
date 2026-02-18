"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef } from "react";

import { useActiveSection } from "@/hooks/useActiveSection";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { RecipeStep } from "@/lib/recipe-types";
import { PlaygroundViewer } from "./PlaygroundViewer";
import { RecipeStepBlock } from "./RecipeStepBlock";
import { RecipeStepProgress } from "./RecipeStepProgress";

type RecipeScrollerProps = {
  steps: RecipeStep[];
};

export function RecipeScroller({ steps }: RecipeScrollerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const activeId = useActiveSection(stepIds, scrollContainerRef);

  const activeStep = steps.find((s) => s.id === activeId) ?? steps[0];

  return (
    <div className="lg:grid lg:grid-cols-2">
      {/* Left column: scrollable steps */}
      <div ref={scrollContainerRef} className="lg:overflow-y-auto lg:h-screen">
        <div className="flex">
          {/* Step progress indicator (desktop) */}
          <RecipeStepProgress
            steps={steps}
            activeId={activeId}
            scrollContainerRef={scrollContainerRef}
          />

          {/* Steps */}
          <div className="flex-1 min-w-0">
            {steps.map((step, i) => (
              <div key={step.id}>
                <RecipeStepBlock
                  step={step}
                  stepNumber={i + 1}
                  isActive={step.id === activeId}
                />
                {/* Mobile viewer: inline after each step */}
                <div
                  className="lg:hidden mx-4 mb-8"
                  style={{ height: "480px" }}
                >
                  <PlaygroundViewer
                    workspace={step.workspace}
                    focusFile={step.focusFile}
                  />
                </div>
              </div>
            ))}
            {/* Bottom spacer so the last step can enter the active zone */}
            <div aria-hidden className="shrink-0" style={{ height: "50vh" }} />
          </div>
        </div>
      </div>

      {/* Right column: sticky viewer (desktop only) */}
      <div
        className="hidden lg:block lg:sticky lg:top-0 lg:h-screen"
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep?.id ?? "empty"}
            className="h-full"
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
          >
            {activeStep && (
              <PlaygroundViewer
                workspace={activeStep.workspace}
                focusFile={activeStep.focusFile}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
