"use client";

import type { ReactNode } from "react";
import { SeriesLabShell } from "./SeriesLabShell";
import { EvolutionLab } from "./from-bespoke-to-semantic-1/EvolutionLab";
import { CompoundLab } from "./from-bespoke-to-semantic-2/CompoundLab";
import { SemanticLab } from "./from-bespoke-to-semantic-3/SemanticLab";
import { AssemblyLab } from "./from-bespoke-to-semantic-4/AssemblyLab";

function makeSteps(phase: number, count = 8) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${phase}-step-${i + 1}`,
    stepNumber: i + 1,
  }));
}

const PHASES = [
  {
    phaseNumber: 1,
    title: "The Debt and the Monolith",
    steps: makeSteps(1),
    renderDemo: (step: number) => <EvolutionLab activeStep={step} />,
  },
  {
    phaseNumber: 2,
    title: "The Compound Pattern",
    steps: makeSteps(2),
    renderDemo: (step: number) => <CompoundLab activeStep={step} />,
  },
  {
    phaseNumber: 3,
    title: "The Semantic Layer",
    steps: makeSteps(3),
    renderDemo: (step: number) => <SemanticLab activeStep={step} />,
  },
  {
    phaseNumber: 4,
    title: "The Assembly",
    steps: makeSteps(4),
    renderDemo: (step: number) => <AssemblyLab activeStep={step} />,
  },
];

export function BespokeSemanticSeriesPage({ children }: { children: ReactNode }) {
  return (
    <SeriesLabShell phases={PHASES}>
      {children}
    </SeriesLabShell>
  );
}
