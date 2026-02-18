"use client";

import dynamic from "next/dynamic";

import type { PlaygroundPresetId } from "@/components/playground/types";

const LazyEmbeddedPlayground = dynamic(
  () => import("@/mdx/shared/EmbeddedPlayground").then((mod) => mod.EmbeddedPlayground),
  {
    ssr: false,
    loading: () => (
      <div className="my-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        Loading playground...
      </div>
    ),
  }
);

type PlaygroundProps = {
  preset?: PlaygroundPresetId;
  height?: number | string;
};

function normalizePreset(preset: string | undefined): PlaygroundPresetId {
  return preset === "react-js" ? "react-js" : "react-ts";
}

function normalizeHeight(height: number | string | undefined): number {
  if (typeof height === "number" && Number.isFinite(height)) {
    return Math.max(320, Math.min(900, height));
  }
  if (typeof height === "string") {
    const parsed = Number.parseInt(height, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(320, Math.min(900, parsed));
    }
  }
  return 420;
}

export function Playground({ preset, height }: PlaygroundProps) {
  return (
    <div className="my-6">
      <LazyEmbeddedPlayground
        preset={normalizePreset(preset)}
        height={normalizeHeight(height)}
      />
    </div>
  );
}

export default Playground;
