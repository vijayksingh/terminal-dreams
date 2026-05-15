"use client";

import type { ReactNode } from "react";
import { RecipeLabShell } from "./RecipeLabShell";
import { LiveSearchLab } from "./live-search/LiveSearchLab";
import { CodeTraceLab } from "./code-primitive-1/CodeTraceLab";
import { ClickableCodeLab } from "./code-primitive-2/ClickableCodeLab";
import { WrappersLab } from "./code-primitive-3/WrappersLab";
import { InlineBridgeLab } from "./code-primitive-4/InlineBridgeLab";
import { EvolutionLab } from "./from-bespoke-to-semantic-1/EvolutionLab";
import { CompoundLab } from "./from-bespoke-to-semantic-2/CompoundLab";
import { SemanticLab } from "./from-bespoke-to-semantic-3/SemanticLab";
import { AssemblyLab } from "./from-bespoke-to-semantic-4/AssemblyLab";

// ── Demo registry ──────────────────────────────────────────────────
// Maps demo IDs (from MDX frontmatter) to their render functions.
// Add new demos here when creating new interactive recipes.

const DEMO_REGISTRY: Record<
  string,
  {
    steps: { id: string; stepNumber: number }[];
    render: (activeStep: number) => ReactNode;
  }
> = {
  "live-search": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
      { id: "step-7", stepNumber: 7 },
      { id: "step-8", stepNumber: 8 },
      { id: "step-9", stepNumber: 9 },
    ],
    render: (activeStep: number) => <LiveSearchLab activeStep={activeStep} />,
  },
  "code-primitive-1-highlight-bar": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
    ],
    render: (activeStep: number) => <CodeTraceLab activeStep={activeStep} />,
  },
  "code-primitive-2-clickable-lines": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
    ],
    render: (activeStep: number) => (
      <ClickableCodeLab activeStep={activeStep} />
    ),
  },
  "code-primitive-3-wrappers": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
    ],
    render: (activeStep: number) => <WrappersLab activeStep={activeStep} />,
  },
  "code-primitive-4-inline-bridge": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
    ],
    render: (activeStep: number) => (
      <InlineBridgeLab activeStep={activeStep} />
    ),
  },
  "from-bespoke-to-semantic-1": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
      { id: "step-7", stepNumber: 7 },
      { id: "step-8", stepNumber: 8 },
    ],
    render: (activeStep: number) => (
      <EvolutionLab activeStep={activeStep} />
    ),
  },
  "from-bespoke-to-semantic-2": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
      { id: "step-7", stepNumber: 7 },
      { id: "step-8", stepNumber: 8 },
    ],
    render: (activeStep: number) => (
      <CompoundLab activeStep={activeStep} />
    ),
  },
  "from-bespoke-to-semantic-3": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
      { id: "step-7", stepNumber: 7 },
      { id: "step-8", stepNumber: 8 },
    ],
    render: (activeStep: number) => (
      <SemanticLab activeStep={activeStep} />
    ),
  },
  "from-bespoke-to-semantic-4": {
    steps: [
      { id: "step-1", stepNumber: 1 },
      { id: "step-2", stepNumber: 2 },
      { id: "step-3", stepNumber: 3 },
      { id: "step-4", stepNumber: 4 },
      { id: "step-5", stepNumber: 5 },
      { id: "step-6", stepNumber: 6 },
      { id: "step-7", stepNumber: 7 },
      { id: "step-8", stepNumber: 8 },
    ],
    render: (activeStep: number) => (
      <AssemblyLab activeStep={activeStep} />
    ),
  },
};

// ── Component ──────────────────────────────────────────────────────

type RecipeLabPageProps = {
  demo: string;
  children: ReactNode;
};

export function RecipeLabPage({ demo, children }: RecipeLabPageProps) {
  const config = DEMO_REGISTRY[demo];

  if (!config) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p style={{ color: "var(--color-muted)" }}>
          Unknown demo: {demo}
        </p>
        {children}
      </div>
    );
  }

  return (
    <RecipeLabShell steps={config.steps} renderDemo={config.render}>
      {children}
    </RecipeLabShell>
  );
}
