"use client";

import React, { useEffect, useRef } from "react";
import { MultiTabProvider } from "./multi-tab-context";
import { StepBar, PlanningView, TabSyncEvolution } from "./ui/MultiTabWidgets";
import styles from "./MultiTabLab.module.css";

export function MultiTabLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    const firstFocusable = scrollRef.current?.querySelector(
      "button, [tabindex='0'], input, [role='role']"
    ) as HTMLElement;
    firstFocusable?.focus({ preventScroll: true });
  }, [activeStep]);

  return (
    <MultiTabProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div ref={scrollRef} className={styles.scrollArea}>
          {isPlanning ? (
            <PlanningView activeStep={activeStep} />
          ) : (
            <TabSyncEvolution />
          )}
        </div>
      </div>
    </MultiTabProvider>
  );
}
