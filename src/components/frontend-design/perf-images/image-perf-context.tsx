"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 7;

/** 1.0 MB initial-load budget — the through-line scenario the whole lesson runs against. */
export const BUDGET_KB = 1024;

/** Two-letter step codes for the StepBar. Matches the canonical perf-lab convention. */
export const STEP_CODES = ["Fm", "Ql", "Ss", "Ad", "Lz", "Pr", "Cd"] as const;

/** Long-form step labels — used for aria-labels and tooltips. */
export const STEP_LABELS = [
  "Formats",
  "Quality",
  "srcset",
  "Art direction",
  "Lazy",
  "Priority",
  "CDN",
] as const;

// ── Context ─────────────────────────────────────────────────────────

type ImagePerfContextValue = {
  activeStep: number;
};

const ImagePerfContext = createContext<ImagePerfContextValue | null>(null);

export function useImagePerfContext(): ImagePerfContextValue {
  const ctx = useContext(ImagePerfContext);
  if (!ctx) throw new Error("useImagePerfContext must be used within ImagePerfProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function ImagePerfProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  return (
    <ImagePerfContext.Provider value={{ activeStep }}>
      {children}
    </ImagePerfContext.Provider>
  );
}
