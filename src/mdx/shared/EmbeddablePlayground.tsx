"use client";

import dynamic from "next/dynamic";

import { createWorkspaceFromPreset } from "@/components/playground/presets";
import type { PlaygroundPresetId, PlaygroundWorkspace } from "@/components/playground/types";
import { ensureWorkspacePath, inferLanguageFromPath, createFileId } from "@/components/playground/workspace-utils";

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

type FileOverride = {
  path: string;
  content: string;
};

type EmbeddablePlaygroundProps = {
  preset?: PlaygroundPresetId;
  height?: number | string;
  activeFile?: string;
  files?: FileOverride[];
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

function buildWorkspace(
  presetId: PlaygroundPresetId,
  fileOverrides: FileOverride[] | undefined,
  activeFilePath: string | undefined
): PlaygroundWorkspace {
  const workspace = createWorkspaceFromPreset(presetId);

  if (!fileOverrides || fileOverrides.length === 0) {
    if (!activeFilePath) return workspace;
  }

  let files = workspace.files;

  // Apply file content overrides or add new files
  if (fileOverrides && fileOverrides.length > 0) {
    const overrideMap = new Map<string, string>();
    for (const override of fileOverrides) {
      overrideMap.set(ensureWorkspacePath(override.path), override.content);
    }

    // Replace content of matching existing files
    files = files.map((f) => {
      const override = overrideMap.get(f.path);
      if (override !== undefined) {
        overrideMap.delete(f.path);
        return { ...f, content: override };
      }
      return f;
    });

    // Add any remaining overrides as new files
    for (const [path, content] of overrideMap) {
      files = [
        ...files,
        {
          id: createFileId(),
          path,
          language: inferLanguageFromPath(path),
          content,
        },
      ];
    }
  }

  // Resolve active file ID
  let activeFileId = workspace.activeFileId;
  if (activeFilePath) {
    const normalized = ensureWorkspacePath(activeFilePath);
    const match = files.find((f) => f.path === normalized);
    if (match) {
      activeFileId = match.id;
    }
  }

  return { ...workspace, files, activeFileId };
}

export function EmbeddablePlayground({
  preset,
  height,
  activeFile,
  files,
}: EmbeddablePlaygroundProps) {
  const presetId = normalizePreset(preset);
  const resolvedHeight = normalizeHeight(height);
  const workspace = buildWorkspace(presetId, files, activeFile);

  return (
    <div className="my-6">
      <LazyEmbeddedPlayground
        preset={presetId}
        height={resolvedHeight}
        initialWorkspace={workspace}
      />
    </div>
  );
}

export default EmbeddablePlayground;
