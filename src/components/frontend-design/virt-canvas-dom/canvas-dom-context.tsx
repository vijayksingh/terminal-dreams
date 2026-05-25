"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const TOTAL_STEPS = 7;

export const STEP_LABELS = ["Pp", "Dm", "Dv", "Cv", "Xo", "Hy", "Ex"] as const;

export const STEP_TITLES = [
  "Rendering Pipelines",
  "DOM Pipeline",
  "DOM Advantages",
  "Canvas Pipeline",
  "Crossover Point",
  "Hybrid Approach",
  "Real-World Examples",
] as const;

type CanvasDomContextValue = {
  activeStep: number;
  elementCount: number;
  setElementCount: (count: number) => void;
};

const CanvasDomContext = createContext<CanvasDomContextValue | null>(null);

export function useCanvasDomContext(): CanvasDomContextValue {
  const ctx = useContext(CanvasDomContext);
  if (!ctx) throw new Error("useCanvasDomContext must be used within CanvasDomProvider");
  return ctx;
}

export function CanvasDomProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const [elementCount, setElementCount] = useState(1000);

  return (
    <CanvasDomContext.Provider value={{ activeStep, elementCount, setElementCount }}>
      {children}
    </CanvasDomContext.Provider>
  );
}
