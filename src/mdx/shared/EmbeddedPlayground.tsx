"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { createWorkspaceFromPreset } from "@/components/playground/presets";
import {
  type PlaygroundBuildResult,
  buildPlaygroundSource,
  revokeBlobUrls,
} from "@/components/playground/runtime";
import type { PlaygroundPresetId, PlaygroundWorkspace } from "@/components/playground/types";
import { normalizePath } from "@/components/playground/workspace-utils";
import { setupMonaco } from "@/lib/monaco-setup";
import { VESPER_THEME_NAME } from "@/lib/monaco-vesper";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false }
);

function getFileName(path: string): string {
  const parts = normalizePath(path).split("/");
  return parts[parts.length - 1] ?? path;
}

type Props = {
  preset: PlaygroundPresetId;
  height: number;
  initialWorkspace?: PlaygroundWorkspace;
};

export function EmbeddedPlayground({ preset, height, initialWorkspace }: Props) {
  const initialWorkspaceRef = useRef<PlaygroundWorkspace | null>(null);
  if (initialWorkspaceRef.current === null) {
    initialWorkspaceRef.current = initialWorkspace ?? createWorkspaceFromPreset(preset);
  }

  const [workspace, setWorkspace] = useState<PlaygroundWorkspace>(
    initialWorkspaceRef.current
  );
  const [activeFileId, setActiveFileId] = useState<string>(
    initialWorkspaceRef.current.activeFileId
  );
  const [buildResult, setBuildResult] = useState<PlaygroundBuildResult | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const activeFile =
    workspace.files.find((f) => f.id === activeFileId) ?? workspace.files[0];

  useEffect(() => {
    let cancelled = false;
    setIsBuilding(true);

    buildPlaygroundSource(workspace)
      .then((result) => {
        if (cancelled) {
          revokeBlobUrls(result.blobUrls);
          return;
        }
        revokeBlobUrls(blobUrlsRef.current);
        blobUrlsRef.current = result.blobUrls;
        setBuildResult(result);
        setIsBuilding(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIsBuilding(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  useEffect(() => {
    return () => {
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      setWorkspace((ws) => ({
        ...ws,
        files: ws.files.map((f) =>
          f.id === activeFileId ? { ...f, content: val ?? "" } : f
        ),
      }));
    },
    [activeFileId]
  );

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
      style={{ height: `${height}px` }}
    >
      {/* File tab bar */}
      <div className="flex flex-none items-center overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)]/55">
        {workspace.files.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => setActiveFileId(file.id)}
            className={[
              "shrink-0 border-r border-[var(--color-border)] px-3 py-2 font-mono text-xs",
              activeFileId === file.id
                ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
            ].join(" ")}
          >
            {getFileName(file.path)}
          </button>
        ))}
      </div>

      {/* Editor pane */}
      <div className="min-h-0" style={{ flex: 1 }}>
        <MonacoEditor
          height="100%"
          path={activeFile ? `file:///embed-${activeFile.id}${activeFile.path.match(/\.[^./\\]+$/)?.[0] ?? ""}` : undefined}
          language={activeFile?.language ?? "typescript"}
          value={activeFile?.content ?? ""}
          onChange={handleChange}
          beforeMount={setupMonaco}
          theme={VESPER_THEME_NAME}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            smoothScrolling: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 14, bottom: 14 },
            contextmenu: false,
          }}
        />
      </div>

      {/* Preview pane */}
      <div className="flex min-h-0 flex-col" style={{ flex: 1 }}>
        <div className="flex flex-none items-center border-t border-b border-[var(--color-border)] bg-[var(--color-bg)]/55 px-3 py-1 text-xs text-[var(--color-muted)]">
          {isBuilding ? "Building\u2026" : "Preview"}
        </div>
        <iframe
          title="Playground preview"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={buildResult?.srcDoc ?? ""}
          className="min-h-0 flex-1 w-full bg-[var(--color-bg)]"
        />
      </div>
    </div>
  );
}

export default EmbeddedPlayground;
