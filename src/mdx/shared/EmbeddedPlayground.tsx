"use client";

import dynamic from "next/dynamic";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { createWorkspaceFromPreset } from "@/components/playground/presets";
import {
  type PlaygroundBuildResult,
  buildPlaygroundSource,
  revokeBlobUrls,
} from "@/components/playground/runtime";
import type { PlaygroundPresetId, PlaygroundWorkspace } from "@/components/playground/types";
import { normalizePath } from "@/components/playground/workspace-utils";
import { setupMonaco, useMonacoTheme } from "@/lib/monaco-setup";
import { ShikiCodeViewer } from "./ShikiCodeViewer";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => null }
);

function getFileName(path: string): string {
  const parts = normalizePath(path).split("/");
  return parts[parts.length - 1] ?? path;
}

const SPLIT_MIN = 0.25;
const SPLIT_MAX = 0.75;

type PanelMode = "both" | "code" | "preview";

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
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isResizing, setIsResizing] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("both");
  const blobUrlsRef = useRef<string[]>([]);
  const pendingRevocationRef = useRef<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const monacoTheme = useMonacoTheme();

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

  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = containerRef.current;
    if (!panel) return;
    event.preventDefault();
    const bounds = panel.getBoundingClientRect();
    setIsResizing(true);
    const onMove = (e: PointerEvent) => {
      const next = (e.clientX - bounds.left) / bounds.width;
      setSplitRatio(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, next)));
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const togglePanel = useCallback((target: "code" | "preview") => {
    setPanelMode((prev) => {
      if (prev === "both") return target === "code" ? "code" : "preview";
      if (prev === target) return "both";
      return target;
    });
  }, []);

  const showCode = panelMode === "both" || panelMode === "code";
  const showPreview = panelMode === "both" || panelMode === "preview";

  const gridTemplate =
    panelMode === "code"
      ? "1fr"
      : panelMode === "preview"
        ? "1fr"
        : `${Math.round(splitRatio * 100)}% 6px minmax(0, 1fr)`;

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
      style={{
        height: `${height}px`,
        display: "grid",
        gridTemplateColumns: gridTemplate,
        gridTemplateRows: "1fr",
        userSelect: isResizing ? "none" : undefined,
      }}
    >
      {/* Code panel */}
      {showCode && (
        <div className="flex min-w-0 flex-col overflow-hidden">
          {/* File tab bar + toggle controls */}
          <div className="flex flex-none items-center border-b border-[var(--color-border)] bg-[var(--color-bg)]/55">
            <div className="flex flex-1 items-center overflow-x-auto">
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
            <div className="flex shrink-0 items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => togglePanel("code")}
                title={panelMode === "code" ? "Show preview" : "Focus code"}
                className="rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                {panelMode === "code" ? "◧" : "◨"}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="relative min-h-0 flex-1">
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
                theme={monacoTheme}
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
        </div>
      )}

      {/* Resize handle — only when both panels visible */}
      {panelMode === "both" && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize code and preview"
          tabIndex={0}
          onPointerDown={beginResize}
          onKeyDown={(e) => {
            const step = 0.05;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setSplitRatio((r) => Math.max(SPLIT_MIN, r - step));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              setSplitRatio((r) => Math.min(SPLIT_MAX, r + step));
            }
          }}
          className="cursor-col-resize border-x border-[var(--color-border)] bg-[var(--color-bg)]/55 transition-colors duration-150 hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/40"
        />
      )}

      {/* Preview panel */}
      {showPreview && (
        <div className="relative flex min-w-0 flex-col overflow-hidden">
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
              className="h-full w-full bg-[var(--color-bg)]"
            />
          ) : null}

          {/* Floating status pill */}
          <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => togglePanel("preview")}
              title={panelMode === "preview" ? "Show code" : "Focus preview"}
              className="pointer-events-auto rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-2.5 py-1 font-mono text-[10px] text-[var(--color-muted)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              {isBuilding ? "Building…" : error ? "Error" : panelMode === "preview" ? "◧ Code" : "Preview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmbeddedPlayground;
