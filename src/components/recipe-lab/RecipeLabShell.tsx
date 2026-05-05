"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import styles from "./recipe-lab.module.css";

// ── Types ──────────────────────────────────────────────────────────

type StepMeta = {
  id: string;
  stepNumber: number;
};

type RecipeLabShellProps = {
  steps: StepMeta[];
  /** The MDX document content — rendered server-side, passed as children */
  children: ReactNode;
  /** Render function for the interactive demo panel */
  renderDemo: (activeStep: number) => ReactNode;
};

// ── Component ──────────────────────────────────────────────────────

export function RecipeLabShell({
  steps,
  children,
  renderDemo,
}: RecipeLabShellProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const activeId = useActiveSection(stepIds, scrollContainerRef);

  const activeStep = steps.find((s) => s.id === activeId)?.stepNumber ?? 1;

  return (
    <div className="lg:grid lg:grid-cols-2">
      {/* Left column: scrollable document */}
      <div
        ref={scrollContainerRef}
        className="lg:overflow-y-auto lg:h-screen"
      >
        <div className={`max-w-2xl mx-auto px-6 py-8 lg:px-10 lg:py-12 ${styles.prose}`}
          style={{ paddingBottom: "45vh" }}
        >
          {children}
        </div>
        {/* Bottom spacer so last step can scroll into view */}
        <div aria-hidden className="shrink-0 hidden lg:block" style={{ height: "50vh" }} />
      </div>

      {/* Right column: sticky interactive demo */}
      <div className={styles.demoDesktop}>
        {renderDemo(activeStep)}
      </div>
    </div>
  );
}
