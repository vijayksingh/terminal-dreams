"use client";

import dynamic from "next/dynamic";
import type { Monaco } from "@monaco-editor/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  buildPlaygroundSource,
  revokeBlobUrls,
  type PlaygroundBuildResult,
} from "@/components/playground/runtime";
import { createRecipeId, upsertRecipe } from "@/components/playground/storage";
import type { PlaygroundWorkspace } from "@/components/playground/types";
import { VESPER_THEME_DATA, VESPER_THEME_NAME } from "@/lib/monaco-vesper";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false }
);

function defineVesperTheme(monaco: Monaco) {
  monaco.editor.defineTheme(VESPER_THEME_NAME, VESPER_THEME_DATA);
}

const LANGUAGE_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  css: "css",
  json: "json",
};

const VIEWER_MIN_RATIO = 0.20;
const VIEWER_MAX_RATIO = 0.82;

type PlaygroundViewerProps = {
  workspace: PlaygroundWorkspace;
  focusFile?: string;
};

export function PlaygroundViewer({ workspace, focusFile }: PlaygroundViewerProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [buildResult, setBuildResult] = useState<PlaygroundBuildResult | null>(null);
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.55);
  const blobUrlsRef = useRef<string[]>([]);
  const pendingRevocationRef = useRef<string[]>([]);

  const resolvedFocusPath = focusFile ?? workspace.entry;
  const defaultFile =
    workspace.files.find((f) => f.path === resolvedFocusPath) ?? workspace.files[0];

  const [activeFileId, setActiveFileId] = useState(defaultFile?.id ?? "");

  // Sync displayed file when workspace or focusFile changes
  useEffect(() => {
    const target =
      workspace.files.find((f) => f.path === resolvedFocusPath) ?? workspace.files[0];
    setActiveFileId(target?.id ?? "");
  }, [workspace, resolvedFocusPath]);

  const displayedFile =
    workspace.files.find((f) => f.id === activeFileId) ?? workspace.files[0];

  // Build on workspace change
  useEffect(() => {
    setIsBuilding(true);
    setBuildError(null);
    let cancelled = false;

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
          setBuildError(err instanceof Error ? err.message : String(err));
          setIsBuilding(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  // Revoke pending blob URLs once the iframe has loaded the new document
  const handleIframeLoad = useCallback(() => {
    if (pendingRevocationRef.current.length > 0) {
      revokeBlobUrls(pendingRevocationRef.current);
      pendingRevocationRef.current = [];
    }
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      revokeBlobUrls(blobUrlsRef.current);
      revokeBlobUrls(pendingRevocationRef.current);
    };
  }, []);

  function openInPlayground() {
    const now = new Date().toISOString();
    const recipe = {
      id: createRecipeId(),
      name: "Recipe Fork",
      description: "Opened from recipe viewer",
      tags: ["recipe"],
      notes: "",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      snapshotsCount: 0,
      snapshots: [],
      workspace,
    };
    upsertRecipe("global-playground", recipe, { setActive: true, touchRecent: true });
    router.push("/playground");
  }

  function beginVerticalResize(event: ReactPointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    event.preventDefault();
    const bounds = panel.getBoundingClientRect();
    const onMove = (e: PointerEvent) => {
      const next = (e.clientY - bounds.top) / bounds.height;
      setSplitRatio(Math.max(VIEWER_MIN_RATIO, Math.min(VIEWER_MAX_RATIO, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const pct = Math.round(splitRatio * 100);

  return (
    <div
      ref={panelRef}
      className="grid h-full"
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        gridTemplateRows: `${pct}% 4px 1fr`,
      }}
    >
      {/* Live Preview */}
      <div
        className="relative min-h-0 overflow-hidden"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {buildError ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-4 overflow-auto"
            style={{ background: "var(--color-bg)" }}
          >
            <pre
              className="text-xs font-mono whitespace-pre-wrap max-w-full"
              style={{ color: "var(--color-app-accent, #e06)" }}
            >
              {buildError}
            </pre>
          </div>
        ) : buildResult?.srcDoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={buildResult.srcDoc}
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            title="Live preview"
          />
        ) : null}
        {isBuilding && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "var(--color-bg)" }}
          >
            <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
              Building...
            </span>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize preview and editor"
        tabIndex={0}
        onPointerDown={beginVerticalResize}
        onKeyDown={(event) => {
          const step = 0.05;
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSplitRatio((r) => Math.max(VIEWER_MIN_RATIO, r - step));
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setSplitRatio((r) => Math.min(VIEWER_MAX_RATIO, r + step));
          }
        }}
        style={{
          cursor: "row-resize",
          background: "var(--color-surface-2)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "var(--color-border)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)";
        }}
      />

      {/* Editor section */}
      <div className="flex flex-col min-h-0">
        {/* File tabs */}
        <div
          className="flex items-center overflow-x-auto shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          {workspace.files.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className="px-3 py-1.5 text-xs font-mono whitespace-nowrap shrink-0 transition-colors"
              style={
                file.id === activeFileId
                  ? {
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      borderRight: "1px solid var(--color-border)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--color-muted)",
                      borderRight: "1px solid var(--color-border)",
                    }
              }
            >
              {file.path.split("/").pop()}
            </button>
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={LANGUAGE_MAP[displayedFile?.language ?? "typescript"] ?? "typescript"}
            value={displayedFile?.content ?? ""}
            beforeMount={defineVesperTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "none",
              contextmenu: false,
            }}
            theme={VESPER_THEME_NAME}
          />
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-3 py-2 flex justify-end"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={openInPlayground}
            className="text-xs font-mono transition-colors"
            style={{ color: "var(--color-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)";
            }}
          >
            Open in Playground →
          </button>
        </div>
      </div>
    </div>
  );
}
