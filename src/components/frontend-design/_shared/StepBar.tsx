"use client";

import styles from "./StepBar.module.css";

type StepBarProps = {
  activeStep: number;
  labels: string[];
};

export function StepBar({ activeStep, labels }: StepBarProps) {
  return (
    <nav className={styles.stepBar} aria-label="Lesson progress">
      <ol className={styles.stepList} role="list">
        {labels.map((label, i) => (
          <li
            key={i}
            className={styles.stepDot}
            data-active={i + 1 <= activeStep ? "true" : undefined}
            data-current={i + 1 === activeStep ? "true" : undefined}
            aria-current={i + 1 === activeStep ? "step" : undefined}
            aria-label={`Step ${i + 1}: ${label}`}
          >
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
