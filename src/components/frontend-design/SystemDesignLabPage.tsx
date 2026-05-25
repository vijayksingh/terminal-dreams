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
import { OfflineFirstLab } from "./sdp-offline-first/OfflineFirstLab";
import { MultiTabLab } from "./sdp-multi-tab/MultiTabLab";
import { VideoStreamingLab } from "./sdp-video-streaming/VideoStreamingLab";
import { NotificationLab } from "./sdp-notification-system/NotificationLab";
import { MicrofrontendLab } from "./sdp-microfrontend/MicrofrontendLab";
import { WebPerformanceLab } from "./sdp-web-performance/WebPerformanceLab";
import { CoreWebVitalsLab } from "./perf-cwv/CoreWebVitalsLab";
import { BundleOptLab } from "./perf-bundle/BundleOptLab";
import { JavaScriptPerfLab } from "./perf-javascript/JavaScriptPerfLab";
import { CSSPerfLab } from "./perf-css/CSSPerfLab";
import { ImagePerfLab } from "./perf-images/ImagePerfLab";
import { OtherAssetsPerfLab } from "./perf-other-assets/OtherAssetsPerfLab";
import { ResourceHintsLab } from "./perf-resource-hints/ResourceHintsLab";
import { HeightComparisonLab } from "./virt-height/HeightComparisonLab";
import { VirtualScrollLab } from "./virt-scroll/VirtualScrollLab";
import { TreeGridLab } from "./virt-tree-grid/TreeGridLab";
import { CanvasDomLab } from "./virt-canvas-dom/CanvasDomLab";

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
      <HeightComparisonLab activeStep={activeStep} />
    ),
  },
  "virtual-scroll-implementation": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <VirtualScrollLab activeStep={activeStep} />
    ),
  },
  "tree-grid-virtualization": {
    steps: Array.from({ length: 8 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <TreeGridLab activeStep={activeStep} />
    ),
  },
  "canvas-vs-dom": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <CanvasDomLab activeStep={activeStep} />
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
  "design-offline-first-app": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <OfflineFirstLab activeStep={activeStep} />
    ),
  },
  "design-multi-tab-sync": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <MultiTabLab activeStep={activeStep} />
    ),
  },
  "design-video-streaming": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <VideoStreamingLab activeStep={activeStep} />
    ),
  },
  "design-notification-system": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <NotificationLab activeStep={activeStep} />
    ),
  },
  "design-microfrontend": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <MicrofrontendLab activeStep={activeStep} />
    ),
  },
  "design-web-performance": {
    steps: Array.from({ length: 15 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <WebPerformanceLab activeStep={activeStep} />
    ),
  },
  "core-web-vitals": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <CoreWebVitalsLab activeStep={activeStep} />
    ),
  },
  "bundle-optimization": {
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <BundleOptLab activeStep={activeStep} />
    ),
  },
  "perf-javascript": {
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <JavaScriptPerfLab activeStep={activeStep} />
    ),
  },
  "perf-css": {
    steps: Array.from({ length: 6 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <CSSPerfLab activeStep={activeStep} />
    ),
  },
  "perf-images": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <ImagePerfLab activeStep={activeStep} />
    ),
  },
  "perf-other-assets": {
    steps: Array.from({ length: 3 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <OtherAssetsPerfLab activeStep={activeStep} />
    ),
  },
  "resource-hints": {
    steps: Array.from({ length: 7 }, (_, i) => ({
      id: `step-${i + 1}`,
      stepNumber: i + 1,
    })),
    render: (activeStep: number) => (
      <ResourceHintsLab activeStep={activeStep} />
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
