"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useActiveSection } from "@/hooks/useActiveSection";
import type { RecipeStep } from "@/lib/recipe-types";
import { PlaygroundViewer } from "./PlaygroundViewer";
import { RecipeStepBlock } from "./RecipeStepBlock";
import { RecipeStepProgress } from "./RecipeStepProgress";

/** True on lg+ screens (1024px), null until measured on the client. */
function useIsLg() {
  const [isLg, setIsLg] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsLg(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLg;
}

type RecipeScrollerProps = {
  steps: RecipeStep[];
};

export function RecipeScroller({ steps }: RecipeScrollerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const activeId = useActiveSection(stepIds, scrollContainerRef);
  const isLg = useIsLg();

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
                {/* Mobile viewer: reserve space, but only mount PlaygroundViewer on small screens */}
                <div
                  className="lg:hidden mx-4 mb-8"
                  style={{ height: "480px" }}
                >
                  {isLg === false && (
                    <PlaygroundViewer
                      workspace={step.workspace}
                      focusFile={step.focusFile}
                    />
                  )}
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
        {isLg && activeStep && (
          <PlaygroundViewer
            workspace={activeStep.workspace}
            focusFile={activeStep.focusFile}
          />
        )}
      </div>
    </div>
  );
}
