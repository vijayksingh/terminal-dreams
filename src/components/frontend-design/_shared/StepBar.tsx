"use client";

import styles from "./StepBar.module.css";

type StepBarProps = {
  activeStep: number;
  labels: string[];
  completedSteps?: Record<number, boolean>;
};

export function StepBar({ activeStep, labels, completedSteps }: StepBarProps) {
  return (
    <nav className={styles.stepBar} aria-label="Lesson progress">
      <ol className={styles.stepList} role="list">
        {labels.map((label, i) => {
          const step = i + 1;
          const completed = completedSteps
            ? completedSteps[step] || step < activeStep
            : step < activeStep;
          return (
            <li
              key={i}
              className={styles.stepDot}
              data-active={step <= activeStep ? "true" : undefined}
              data-current={step === activeStep ? "true" : undefined}
              data-completed={completed ? "true" : undefined}
              aria-current={step === activeStep ? "step" : undefined}
              aria-label={`Step ${step}: ${label}${completed ? " (complete)" : ""}`}
            >
              {completedSteps && completed && step < activeStep ? "✓" : label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
