"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { useActiveSection } from "@/hooks/useActiveSection";
import styles from "./recipe-lab.module.css";

type PhaseConfig = {
  phaseNumber: number;
  title: string;
  steps: { id: string; stepNumber: number }[];
  renderDemo: (activeStep: number) => ReactNode;
};

type SeriesLabShellProps = {
  phases: PhaseConfig[];
  children: ReactNode;
};

export function SeriesLabShell({ phases, children }: SeriesLabShellProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allStepIds = useMemo(
    () => phases.flatMap((p) => p.steps.map((s) => s.id)),
    [phases],
  );

  const activeId = useActiveSection(allStepIds, scrollContainerRef);

  const { activePhase, activeStep } = useMemo(() => {
    if (!activeId) return { activePhase: 1, activeStep: 1 };
    for (const phase of phases) {
      const step = phase.steps.find((s) => s.id === activeId);
      if (step) return { activePhase: phase.phaseNumber, activeStep: step.stepNumber };
    }
    return { activePhase: 1, activeStep: 1 };
  }, [activeId, phases]);

  const currentPhase = phases.find((p) => p.phaseNumber === activePhase) ?? phases[0];

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-2">
      {/* Left column: scrollable document */}
      <div ref={scrollContainerRef} className="lg:overflow-y-auto lg:h-screen">
        <div
          className={`max-w-2xl mx-auto px-6 py-8 lg:px-10 lg:py-12 ${styles.prose}`}
          style={{ paddingBottom: "45vh" }}
        >
          {children}
        </div>
        <div aria-hidden className="shrink-0 hidden lg:block" style={{ height: "50vh" }} />
      </div>

      {/* Right column: sticky interactive demo */}
      <div className={styles.demoDesktop}>
        {/* Phase indicator */}
        <div className={styles.phaseIndicator}>
          {phases.map((p) => (
            <span
              key={p.phaseNumber}
              className={styles.phaseIndicatorDot}
              data-active={p.phaseNumber === activePhase || undefined}
              title={`Phase ${p.phaseNumber}: ${p.title}`}
            >
              {p.phaseNumber}
            </span>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhase}
            className="flex-1 min-h-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.enterItem}
          >
            {currentPhase.renderDemo(activeStep)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
