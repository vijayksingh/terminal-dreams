"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export const TOTAL_STEPS = 7;

export const STEP_LABELS = ["Nv", "Wn", "Tf", "Os", "Cm", "Cd", "Lb"] as const;

export const STEP_TITLES = [
  "Naive Rendering",
  "Windowed Rendering",
  "Transform Positioning",
  "Overscan Buffer",
  "Combined Pipeline",
  "Implementation Code",
  "Library Comparison",
] as const;

export const VISIBLE_COUNT = 12;
export const OVERSCAN = 3;
export const TOTAL_ITEMS = 500;

type ScrollContextValue = {
  activeStep: number;
  domCount: number;
};

const ScrollContext = createContext<ScrollContextValue | null>(null);

export function useScrollContext(): ScrollContextValue {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScrollContext must be used within ScrollProvider");
  return ctx;
}

export function ScrollProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const domCount = useMemo(() => {
    if (activeStep === 1) return TOTAL_ITEMS;
    if (activeStep === 4) return VISIBLE_COUNT + OVERSCAN * 2;
    return VISIBLE_COUNT;
  }, [activeStep]);

  return (
    <ScrollContext.Provider value={{ activeStep, domCount }}>
      {children}
    </ScrollContext.Provider>
  );
}
