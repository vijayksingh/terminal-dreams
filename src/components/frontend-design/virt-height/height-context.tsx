"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export const TOTAL_STEPS = 6;

export const STEP_LABELS = ["Pr", "Fx", "Pf", "Bs", "Es", "Rc"] as const;

export const STEP_TITLES = [
  "The Position Problem",
  "Fixed Height: O(1)",
  "Prefix Sums",
  "Binary Search",
  "Estimation",
  "ResizeObserver",
] as const;

export const FIXED_HEIGHT = 40;
export const ITEM_COUNT = 50;
export const MAX_VAR_HEIGHT = 96;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function generateVariableHeights(count: number): number[] {
  const rng = seededRandom(42);
  return Array.from({ length: count }, () =>
    Math.round(28 + rng() * (MAX_VAR_HEIGHT - 28)),
  );
}

export function buildOffsets(heights: number[]): number[] {
  const offsets = [0];
  for (let i = 0; i < heights.length; i++) {
    offsets.push(offsets[i] + heights[i]);
  }
  return offsets;
}

export type SearchStep = { lo: number; hi: number; mid: number; final: boolean };

export function binarySearchOffset(
  offsets: number[],
  target: number,
): { index: number; steps: SearchStep[] } {
  const steps: SearchStep[] = [];
  let lo = 0;
  let hi = offsets.length - 2;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (target < offsets[mid]) {
      steps.push({ lo, hi, mid, final: false });
      hi = mid - 1;
    } else if (target >= offsets[mid + 1]) {
      steps.push({ lo, hi, mid, final: false });
      lo = mid + 1;
    } else {
      steps.push({ lo, hi, mid, final: true });
      return { index: mid, steps };
    }
  }

  const idx = Math.max(0, Math.min(lo, offsets.length - 2));
  if (steps.length > 0) steps[steps.length - 1].final = true;
  return { index: idx, steps };
}

type HeightContextValue = {
  activeStep: number;
  varHeights: number[];
  varOffsets: number[];
  fixedHeights: number[];
  fixedOffsets: number[];
};

const HeightContext = createContext<HeightContextValue | null>(null);

export function useHeightContext(): HeightContextValue {
  const ctx = useContext(HeightContext);
  if (!ctx) throw new Error("useHeightContext must be used within HeightProvider");
  return ctx;
}

export function HeightProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const varHeights = useMemo(() => generateVariableHeights(ITEM_COUNT), []);
  const varOffsets = useMemo(() => buildOffsets(varHeights), [varHeights]);
  const fixedHeights = useMemo(() => Array.from({ length: ITEM_COUNT }, () => FIXED_HEIGHT), []);
  const fixedOffsets = useMemo(() => buildOffsets(fixedHeights), [fixedHeights]);

  return (
    <HeightContext.Provider value={{ activeStep, varHeights, varOffsets, fixedHeights, fixedOffsets }}>
      {children}
    </HeightContext.Provider>
  );
}
