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
import { ShikiCodeViewer } from "./ShikiCodeViewer";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => null }
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
  const [error, setError] = useState<string | null>(null);
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);
  const pendingRevocationRef = useRef<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeFile =
    workspace.files.find((f) => f.id === activeFileId) ?? workspace.files[0];

  useEffect(() => {
    let cancelled = false;
    setIsBuilding(true);
    setError(null);

    buildPlaygroundSource(workspace)
      .then((result) => {
        if (cancelled) {
          revokeBlobUrls(result.blobUrls);
          return;
        }
        // Queue old blob URLs for revocation after iframe loads
        if (blobUrlsRef.current.length > 0) {
          pendingRevocationRef.current.push(...blobUrlsRef.current);
        }
        blobUrlsRef.current = result.blobUrls;
        setBuildResult(result);
        setIsBuilding(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setIsBuilding(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const handleIframeLoad = useCallback(() => {
    // Revoke pending blob URLs now that iframe has loaded
    if (pendingRevocationRef.current.length > 0) {
      revokeBlobUrls(pendingRevocationRef.current);
      pendingRevocationRef.current = [];
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeBlobUrls(blobUrlsRef.current);
      revokeBlobUrls(pendingRevocationRef.current);
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

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const tabBarHeight = 40; // Approximate height of the tab bar
      const availableHeight = rect.height - tabBarHeight;
      const mouseY = e.clientY - rect.top - tabBarHeight;

      // Calculate new split percentage
      let newPercent = (mouseY / availableHeight) * 100;

      // Enforce minimum sizes (80px for each pane)
      const minPixels = 80;
      const minPercent = (minPixels / availableHeight) * 100;
      const maxPercent = 100 - minPercent;

      newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
      setSplitPercent(newPercent);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
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
      <div className="min-h-0 relative" style={{ height: `${splitPercent}%` }}>
        {!isMonacoLoaded && activeFile && (
          <ShikiCodeViewer
            code={activeFile.content}
            language={activeFile.language ?? "typescript"}
            height="100%"
          />
        )}
        <div style={{ display: isMonacoLoaded ? "block" : "none", height: "100%" }}>
          <MonacoEditor
            height="100%"
            path={activeFile ? `file:///embed-${activeFile.id}${activeFile.path.match(/\.[^./\\]+$/)?.[0] ?? ""}` : undefined}
            language={activeFile?.language ?? "typescript"}
            value={activeFile?.content ?? ""}
            onChange={handleChange}
            beforeMount={setupMonaco}
            onMount={() => setIsMonacoLoaded(true)}
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
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={splitPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        onMouseDown={handleMouseDown}
        className="group flex h-[6px] cursor-row-resize items-center justify-center border-y border-[var(--color-border)] bg-[var(--color-bg)]/55 hover:bg-[var(--color-surface-2)]"
        style={{
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <div className="h-[2px] w-8 rounded-full bg-[var(--color-border)] group-hover:bg-[var(--color-text)]/50" />
      </div>

      {/* Preview pane */}
      <div className="flex min-h-0 flex-col" style={{ height: `${100 - splitPercent}%` }}>
        <div className="flex flex-none items-center border-t border-b border-[var(--color-border)] bg-[var(--color-bg)]/55 px-3 py-1 text-xs text-[var(--color-muted)]">
          {isBuilding ? "Building\u2026" : error ? "Build Failed" : "Preview"}
        </div>
        {error ? (
          <div className="flex-1 overflow-auto bg-[var(--color-bg)] p-4">
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
              <div className="mb-2 font-mono text-sm font-semibold text-red-400">
                Build Error
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs text-red-200/90">
                {error}
              </pre>
            </div>
          </div>
        ) : buildResult ? (
          <iframe
            ref={iframeRef}
            title="Playground preview"
            sandbox="allow-scripts allow-same-origin"
            srcDoc={buildResult.srcDoc}
            onLoad={handleIframeLoad}
            className="min-h-0 flex-1 w-full bg-[var(--color-bg)]"
          />
        ) : null}
      </div>
    </div>
  );
}

export default EmbeddedPlayground;
