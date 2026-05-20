"use client";

import type { ReactNode } from "react";
import { RecipeLabShell } from "@/components/recipe-lab/RecipeLabShell";
import { ImageGalleryLab } from "./sdp-image-gallery/ImageGalleryLab";
import { BookingPlatformLab } from "./sdp-booking-platform/BookingPlatformLab";
import { NewsFeedLab } from "./sdp-news-feed/NewsFeedLab";
import { ChatLab } from "./sdp-chat/ChatLab";
import { AutocompleteLab } from "./sdp-autocomplete/AutocompleteLab";
import { DragDropLab } from "./sdp-drag-drop/DragDropLab";
import { SpreadsheetLab } from "./sdp-spreadsheet/SpreadsheetLab";
import { WindowingLab } from "./sdp-windowing/WindowingLab";
import { WhiteboardLab } from "./sdp-whiteboard/WhiteboardLab";

function Placeholder({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        color: "var(--color-muted)",
      }}
    >
      {label} — rebuilding
    </div>
  );
}

// ── Demo registry ──────────────────────────────────────────────────
// Maps system-design-problem slugs to their lab components and step configs.

const DEMO_REGISTRY: Record<
  string,
  {
    steps: { id: string; stepNumber: number }[];
    render: (activeStep: number) => ReactNode;
  }
> = {
  "windowing-fundamentals": {
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <WindowingLab activeStep={activeStep} />
    ),
  },
  "fixed-vs-variable-height": {
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <Placeholder label="Fixed vs Variable Height" />
    ),
  },
  "virtual-scroll-implementation": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <Placeholder label="Virtual Scroll Implementation" />
    ),
  },
  "tree-grid-virtualization": {
    steps: Array.from({ length: 8 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <Placeholder label="Tree & Grid Virtualization" />
    ),
  },
  "canvas-vs-dom": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <Placeholder label="Canvas vs DOM" />
    ),
  },
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
  "design-news-feed": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <NewsFeedLab activeStep={activeStep} />
    ),
  },
  "design-realtime-chat": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <ChatLab activeStep={activeStep} />
    ),
  },
  "design-autocomplete": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <AutocompleteLab activeStep={activeStep} />
    ),
  },
  "design-drag-drop": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <DragDropLab activeStep={activeStep} />
    ),
  },
  "design-spreadsheet": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <SpreadsheetLab activeStep={activeStep} />
    ),
  },
  "design-collaborative-whiteboard": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <WhiteboardLab activeStep={activeStep} />
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
