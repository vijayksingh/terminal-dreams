"use client";

import React, { useEffect, useRef } from "react";
import { MultiTabProvider, useMultiTab } from "./multi-tab-context";
import { STEP_LABELS, PlanningView, TabSyncEvolution } from "./ui/MultiTabWidgets";
import { StepBar } from "../_shared/StepBar";
import styles from "./MultiTabLab.module.css";

export function MultiTabLab({ activeStep }: { activeStep: number }) {
  return (
    <MultiTabProvider activeStep={activeStep}>
      <MultiTabLabContent activeStep={activeStep} />
    </MultiTabProvider>
  );
}

function MultiTabLabContent({ activeStep }: { activeStep: number }) {
  const { stepCompleted } = useMultiTab();
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
    <div className={styles.labRoot}>
      <StepBar activeStep={activeStep} labels={STEP_LABELS} completedSteps={stepCompleted} />
      <div ref={scrollRef} className={styles.scrollArea}>
        {isPlanning ? (
          <PlanningView activeStep={activeStep} />
        ) : (
          <TabSyncEvolution />
        )}
      </div>
    </div>
  );
}
