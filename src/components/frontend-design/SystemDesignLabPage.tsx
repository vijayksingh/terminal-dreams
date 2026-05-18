"use client";

import type { ReactNode } from "react";
import { RecipeLabShell } from "@/components/recipe-lab/RecipeLabShell";
import { ImageGalleryLab } from "./sdp-image-gallery/ImageGalleryLab";
import { BookingPlatformLab } from "./sdp-booking-platform/BookingPlatformLab";

// ── Demo registry ──────────────────────────────────────────────────
// Maps system-design-problem slugs to their lab components and step configs.

const DEMO_REGISTRY: Record<
  string,
  {
    steps: { id: string; stepNumber: number }[];
    render: (activeStep: number) => ReactNode;
  }
> = {
  "design-image-gallery": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <ImageGalleryLab activeStep={activeStep} />
    ),
  },
  "design-booking-platform": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <BookingPlatformLab activeStep={activeStep} />
    ),
  },
};

// ── Component ──────────────────────────────────────────────────────

type SystemDesignLabPageProps = {
  demo: string;
  children: ReactNode;
};

export function SystemDesignLabPage({
  demo,
  children,
}: SystemDesignLabPageProps) {
  const config = DEMO_REGISTRY[demo];

  if (!config) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p style={{ color: "var(--color-muted)" }}>Unknown demo: {demo}</p>
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
