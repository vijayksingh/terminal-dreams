"use client";

import type { ReactNode } from "react";
import { SeriesLabShell } from "./SeriesLabShell";
import { CodeTraceLab } from "./code-primitive-1/CodeTraceLab";
import { ClickableCodeLab } from "./code-primitive-2/ClickableCodeLab";
import { WrappersLab } from "./code-primitive-3/WrappersLab";
import { InlineBridgeLab } from "./code-primitive-4/InlineBridgeLab";

function makeSteps(phase: number, count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${phase}-step-${i + 1}`,
    stepNumber: i + 1,
  }));
}

const PHASES = [
  {
    phaseNumber: 1,
    title: "The Highlight Bar",
    steps: makeSteps(1),
    renderDemo: (step: number) => <CodeTraceLab activeStep={step} />,
  },
  {
    phaseNumber: 2,
    title: "Making Code Clickable",
    steps: makeSteps(2),
    renderDemo: (step: number) => <ClickableCodeLab activeStep={step} />,
  },
  {
    phaseNumber: 3,
    title: "Wrapping the Primitive",
    steps: makeSteps(3),
    renderDemo: (step: number) => <WrappersLab activeStep={step} />,
  },
  {
    phaseNumber: 4,
    title: "Breaking Free",
    steps: makeSteps(4),
    renderDemo: (step: number) => <InlineBridgeLab activeStep={step} />,
  },
];

export function SeriesLabPage({ children }: { children: ReactNode }) {
  return (
    <SeriesLabShell phases={PHASES}>
      {children}
    </SeriesLabShell>
  );
}
