"use client";

import dynamic from "next/dynamic";
import type { Monaco } from "@monaco-editor/react";
import {
  type NodeRendererProps,
  Tree,
  type NodeApi,
} from "react-arborist";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createWorkspaceFromPreset, getPresetDependencies } from "@/components/playground/presets";
import {
  PLAYGROUND_POST_MESSAGE_CHANNEL,
  PlaygroundBuildError,
  buildPlaygroundSource,
  revokeBlobUrls,
} from "@/components/playground/runtime";
import {
  coerceRecipe,
  createRecipeId,
  ensureRecipeStore,
  loadRecipe,
  removeRecipe,
  setActiveRecipe as setActiveRecipeInStore,
  upsertRecipe,
  type PlaygroundRecipeIndex,
} from "@/components/playground/storage";
import type {
  PlaygroundDependencyMap,
  PlaygroundFile,
  PlaygroundPresetId,
  PlaygroundRecipe,
  PlaygroundRunStatus,
  PlaygroundSnapshot,
  PlaygroundWorkspace,
} from "@/components/playground/types";
import {
  createFileId,
  dirname,
  ensureWorkspacePath,
  hasKnownExtension,
  inferLanguageFromPath,
  isRunnableFile,
  normalizeFolderPath,
  normalizePath,
} from "@/components/playground/workspace-utils";
import { useDimensions } from "@/hooks/use-dimensions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { setupMonaco } from "@/lib/monaco-setup";
import { VESPER_THEME_NAME } from "@/lib/monaco-vesper";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[260px] place-items-center text-sm text-[var(--color-muted)]">
      Setting up the editor...
    </div>
  ),
});

const DEFAULT_PREVIEW_DOC = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        background: #0b0b0b;
        color: #d8d8d8;
      }
      .hint {
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 16px 20px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="hint">Press Run to see your code in action.</div>
  </body>
</html>`;

const PANEL_MIN_RATIO = 0.32;
const PANEL_MAX_RATIO = 0.72;
const NPM_SEARCH_DEBOUNCE_MS = 260;
const NPM_SEARCH_LIMIT = 7;

const statusLabelMap: Record<PlaygroundRunStatus, string> = {
  idle: "Ready",
  building: "Building...",
  running: "Running...",
  error: "Error",
};

const statusColorMap: Record<PlaygroundRunStatus, string> = {
  idle: "text-[var(--color-muted)]",
  building: "text-[var(--color-text)]",
  running: "text-emerald-300",
  error: "text-red-400",
};

type CraftPlaygroundProps = {
  storageKey?: string;
  initialPreset?: PlaygroundPresetId;
  embedded?: boolean;
  minHeight?: number;
  fillHeight?: boolean;
  fullPageChrome?: boolean;
  className?: string;
};

type RuntimePayload = {
  message?: string;
  stack?: string;
};

type NpmSearchResult = {
  name: string;
  version: string;
  description: string;
};

type ExplorerNode = {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  fileId?: string;
  children?: ExplorerNode[];
};

type SelectedNode =
  | { type: "folder"; path: string }
  | { type: "file"; path: string; fileId: string }
  | null;

type DraftActionKind =
  | "new-file"
  | "new-folder"
  | "rename-node"
  | "new-recipe"
  | "rename-recipe"
  | "new-snapshot";

type DraftAction = {
  kind: DraftActionKind;
  value: string;
};

type ConfirmAction =
  | { kind: "delete-node"; node: SelectedNode }
  | { kind: "delete-recipe" };

type ExplorerContextMenu = {
  x: number;
  y: number;
  node: SelectedNode;
  baseFolder: string;
};

function toMonacoFileUri(path: string): string {
  return `file://${normalizePath(path)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getPathSegments(path: string): string[] {
  return normalizePath(path).split("/").filter(Boolean);
}

function getFolderAncestors(path: string): string[] {
  const segments = getPathSegments(path);
  return segments.slice(0, -1).map((_, index) => `/${segments.slice(0, index + 1).join("/")}`);
}

function getFolderChain(path: string): string[] {
  const segments = getPathSegments(path);
  return segments.map((_, index) => `/${segments.slice(0, index + 1).join("/")}`);
}

function sortFolders(folders: Iterable<string>): string[] {
  return [...new Set([...folders].map((folder) => normalizeFolderPath(folder)))]
    .sort((left, right) => {
      if (left.length === right.length) return left.localeCompare(right);
      return left.length - right.length;
    });
}

function sortExplorerNodes(nodes: ExplorerNode[]): ExplorerNode[] {
  return [...nodes]
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortExplorerNodes(node.children) : undefined,
    }));
}

function buildExplorerTree(files: PlaygroundFile[], folders: string[]): ExplorerNode[] {
  const roots: ExplorerNode[] = [];

  const upsertPath = (path: string, asFile: boolean, fileId?: string) => {
    const segments = getPathSegments(path);
    let current = roots;
    let acc = "";

    segments.forEach((segment, index) => {
      acc += `/${segment}`;
      const isLeaf = index === segments.length - 1;
      let node = current.find((candidate) => candidate.path === acc);
      if (!node) {
        node = {
          id: acc,
          name: segment,
          path: acc,
          type: isLeaf && asFile ? "file" : "folder",
          fileId: isLeaf && asFile ? fileId : undefined,
          children: isLeaf && asFile ? undefined : [],
        };
        current.push(node);
      }
      if (isLeaf && asFile) {
        node.type = "file";
        node.fileId = fileId;
        node.children = undefined;
      } else {
        node.type = "folder";
        node.children = node.children ?? [];
        current = node.children;
      }
    });
  };

  sortFolders(["/src", ...folders]).forEach((folder) => upsertPath(folder, false));
  files.forEach((file) => upsertPath(file.path, true, file.id));

  return sortExplorerNodes(roots);
}

function withDefaultExtension(path: string, fallbackExtension = ".ts"): string {
  if (hasKnownExtension(path)) return path;
  return `${path}${fallbackExtension}`;
}

function getStarterContent(path: string): string {
  if (path.endsWith(".json")) return JSON.stringify({ note: "Scratch data" }, null, 2);
  if (path.endsWith(".css")) return "body {\n  font-family: Inter, system-ui, sans-serif;\n}\n";
  if (path.endsWith(".js") || path.endsWith(".jsx")) {
    return "export function greet(name) {\n  return `Hello, ${name}!`;\n}\n";
  }
  return "export function greet(name: string) {\n  return `Hello, ${name}!`;\n}\n";
}

function readableError(value: RuntimePayload | undefined): string {
  if (!value) return "Unknown runtime error.";
  const message = value.message ?? "Unknown runtime error.";
  if (!value.stack) return message;
  return `${message}\n\n${value.stack}`;
}

function cloneWorkspace(workspace: PlaygroundWorkspace): PlaygroundWorkspace {
  return JSON.parse(JSON.stringify(workspace)) as PlaygroundWorkspace;
}

function normalizeWorkspace(workspace: PlaygroundWorkspace): PlaygroundWorkspace {
  if (workspace.files.length === 0) {
    return createWorkspaceFromPreset("react-ts");
  }
  const normalizedFiles = workspace.files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
  }));
  const folderSet = new Set<string>(["/src"]);
  (workspace.folders ?? []).forEach((folder) => folderSet.add(normalizeFolderPath(folder)));
  normalizedFiles.forEach((file) => {
    getFolderAncestors(file.path).forEach((folder) => folderSet.add(folder));
  });

  const firstFile = normalizedFiles[0];
  const activeFileId = normalizedFiles.some((file) => file.id === workspace.activeFileId)
    ? workspace.activeFileId
    : firstFile.id;
  const entry = normalizedFiles.some((file) => file.path === workspace.entry)
    ? normalizePath(workspace.entry)
    : firstFile.path;

  const presetDependencies = getPresetDependencies(workspace.preset);
  const workspaceDependencies = normalizeDependencies(workspace.dependencies);

  return {
    ...workspace,
    activeFileId,
    entry,
    folders: sortFolders(folderSet),
    files: normalizedFiles,
    dependencies: {
      ...presetDependencies,
      ...workspaceDependencies,
    },
  };
}

function normalizeRecipe(recipe: PlaygroundRecipe): PlaygroundRecipe {
  const snapshots = (recipe.snapshots ?? [])
    .map((snapshot) => ({
      ...snapshot,
      workspace: normalizeWorkspace(snapshot.workspace),
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    ...recipe,
    tags: recipe.tags ?? [],
    notes: recipe.notes ?? "",
    workspace: normalizeWorkspace(recipe.workspace),
    snapshots,
    snapshotsCount: snapshots.length,
  };
}

function replacePrefix(path: string, fromPrefix: string, toPrefix: string): string {
  if (path === fromPrefix) return toPrefix;
  if (path.startsWith(`${fromPrefix}/`)) {
    return `${toPrefix}${path.slice(fromPrefix.length)}`;
  }
  return path;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeDependencies(value: unknown): PlaygroundDependencyMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const dependencies: PlaygroundDependencyMap = {};
  Object.entries(value as Record<string, unknown>).forEach(([rawName, rawVersion]) => {
    if (typeof rawVersion !== "string") return;
    const name = rawName.trim();
    const version = rawVersion.trim();
    if (!name || !version) return;
    dependencies[name] = version;
  });

  return dependencies;
}

function parseNpmSearchResults(value: unknown): NpmSearchResult[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const objects = (value as { objects?: unknown }).objects;
  if (!Array.isArray(objects)) {
    return [];
  }

  return objects.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const pkg = (item as { package?: unknown }).package;
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
      return [];
    }

    const name = typeof (pkg as { name?: unknown }).name === "string"
      ? (pkg as { name: string }).name.trim()
      : "";
    const version = typeof (pkg as { version?: unknown }).version === "string"
      ? (pkg as { version: string }).version.trim()
      : "";
    const description = typeof (pkg as { description?: unknown }).description === "string"
      ? (pkg as { description: string }).description.trim()
      : "";

    if (!name || !version) {
      return [];
    }

    return [{ name, version, description }];
  });
}

export function CraftPlayground({
  storageKey = "default",
  initialPreset = "react-ts",
  embedded = false,
  minHeight = 440,
  fillHeight = false,
  fullPageChrome = false,
  className,
}: CraftPlaygroundProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const explorerRef = useRef<HTMLDivElement | null>(null);
  const explorerTreeRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const monacoRef = useRef<Monaco | null>(null);
  const workspaceModelUrisRef = useRef<Set<string>>(new Set());
  const initialStoreRef = useRef<{ index: PlaygroundRecipeIndex; activeRecipe: PlaygroundRecipe } | null>(null);
  if (!initialStoreRef.current) {
    initialStoreRef.current = ensureRecipeStore(
      storageKey,
      normalizeWorkspace(createWorkspaceFromPreset(initialPreset)),
      "My recipe"
    );
  }

  const [recipeIndex, setRecipeIndex] = useState<PlaygroundRecipeIndex>(initialStoreRef.current.index);
  const [activeRecipe, setActiveRecipe] = useState<PlaygroundRecipe>(
    normalizeRecipe(initialStoreRef.current.activeRecipe)
  );
  const [templatePreset, setTemplatePreset] = useState<PlaygroundPresetId>(initialPreset);
  const [runStatus, setRunStatus] = useState<PlaygroundRunStatus>("idle");
  const [previewDoc, setPreviewDoc] = useState(DEFAULT_PREVIEW_DOC);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(embedded ? 0.58 : 0.53);
  const [isResizing, setIsResizing] = useState(false);
  const [copyFeedbackState, setCopyFeedbackState] = useState<"idle" | "copied" | "failed">("idle");
  const [, setSaveState] = useState<"saving" | "saved">("saved");
  const [hydrated, setHydrated] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");
  const [openState, setOpenState] = useState<Record<string, boolean>>({ "/src": true });
  const [draftAction, setDraftAction] = useState<DraftAction | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenu | null>(null);
  const [tagsInput, setTagsInput] = useState(() => activeRecipe.tags.join(", "));
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [dependencyPanelOpen, setDependencyPanelOpen] = useState(true);
  const [dependencyQuery, setDependencyQuery] = useState("");
  const [dependencySearchState, setDependencySearchState] = useState<"idle" | "loading" | "error">("idle");
  const [dependencySearchError, setDependencySearchError] = useState<string | null>(null);
  const [dependencySearchResults, setDependencySearchResults] = useState<NpmSearchResult[]>([]);
  const explorerTreeSize = useDimensions(explorerTreeRef);

  const workspace = activeRecipe.workspace;
  const presetDependencies = useMemo(
    () => getPresetDependencies(workspace.preset),
    [workspace.preset]
  );
  const installedDependencies = useMemo(
    () => Object.entries(workspace.dependencies ?? {}).sort(([left], [right]) => left.localeCompare(right)),
    [workspace.dependencies]
  );
  const activeFile = useMemo(
    () => workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0],
    [workspace]
  );
  const activeFileUri = useMemo(
    () => (activeFile ? toMonacoFileUri(activeFile.path) : undefined),
    [activeFile]
  );
  const diagnosticsCount = Number(Boolean(buildError)) + Number(Boolean(runtimeError));
  const treeData = useMemo(
    () => buildExplorerTree(workspace.files, workspace.folders),
    [workspace.files, workspace.folders]
  );
  const fileByPath = useMemo(
    () => new Map(workspace.files.map((file) => [file.path, file])),
    [workspace.files]
  );
  const selectedNode: SelectedNode = useMemo(() => {
    if (!selectedPath) return null;
    const file = fileByPath.get(selectedPath);
    if (file) return { type: "file", path: file.path, fileId: file.id };
    if (workspace.folders.includes(selectedPath)) return { type: "folder", path: selectedPath };
    return null;
  }, [fileByPath, selectedPath, workspace.folders]);

  const compactChrome = fullPageChrome && fillHeight;

  const mutateRecipe = useCallback((updater: (previous: PlaygroundRecipe) => PlaygroundRecipe) => {
    setActiveRecipe((previous) => {
      const nextRaw = updater(previous);
      const next = normalizeRecipe(nextRaw);
      const timestamp = nowIso();
      return {
        ...next,
        updatedAt: timestamp,
        lastOpenedAt: timestamp,
        snapshotsCount: next.snapshots.length,
      };
    });
    setSaveState("saving");
  }, []);

  const updateWorkspace = useCallback((updater: (previous: PlaygroundWorkspace) => PlaygroundWorkspace) => {
    mutateRecipe((previous) => ({
      ...previous,
      workspace: normalizeWorkspace(updater(previous.workspace)),
    }));
  }, [mutateRecipe]);

  const installDependency = useCallback((name: string, version: string) => {
    updateWorkspace((previous) => ({
      ...previous,
      dependencies: {
        ...previous.dependencies,
        [name]: version,
      },
    }));
  }, [updateWorkspace]);

  const removeDependency = useCallback((name: string) => {
    updateWorkspace((previous) => {
      const nextDependencies: PlaygroundDependencyMap = { ...previous.dependencies };
      delete nextDependencies[name];
      return {
        ...previous,
        dependencies: nextDependencies,
      };
    });
  }, [updateWorkspace]);

  const configureMonaco = useCallback((monaco: Monaco) => {
    monacoRef.current = monaco;
    setupMonaco(monaco);
  }, []);

  const syncWorkspaceModels = useCallback(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const nextUris = new Set<string>();
    workspace.files.forEach((file) => {
      const uriString = toMonacoFileUri(file.path);
      const uri = monaco.Uri.parse(uriString);
      nextUris.add(uriString);
      const model = monaco.editor.getModel(uri);
      if (!model) {
        monaco.editor.createModel(file.content, file.language, uri);
        return;
      }
      if (model.getValue() !== file.content) {
        model.setValue(file.content);
      }
    });
    workspaceModelUrisRef.current.forEach((uriString) => {
      if (nextUris.has(uriString)) return;
      const model = monaco.editor.getModel(monaco.Uri.parse(uriString));
      model?.dispose();
    });
    workspaceModelUrisRef.current = nextUris;
  }, [workspace.files]);

  const openFolderChain = useCallback((path: string, isFolder: boolean) => {
    const folders = isFolder ? getFolderChain(path) : getFolderAncestors(path);
    setOpenState((previous) => {
      const next = { ...previous };
      folders.forEach((folder) => {
        next[folder] = true;
      });
      return next;
    });
  }, []);

  const loadRecipeIntoView = useCallback((recipeId: string) => {
    const loaded = loadRecipe(storageKey, recipeId);
    if (!loaded) return;
    const nextIndex = setActiveRecipeInStore(storageKey, recipeId);
    if (nextIndex) setRecipeIndex(nextIndex);
    const nextRecipe = normalizeRecipe(loaded);
    setActiveRecipe(nextRecipe);
    setSelectedPath(nextRecipe.workspace.files[0]?.path ?? null);
    setTemplatePreset(nextRecipe.workspace.preset);
    setPreviewDoc(DEFAULT_PREVIEW_DOC);
    setBuildError(null);
    setRuntimeError(null);
    setRunStatus("idle");
    setDiagnosticsOpen(false);
    setTagsInput(nextRecipe.tags.join(", "));
  }, [storageKey]);

  const runWorkspace = useCallback(async () => {
    setRunStatus("building");
    setBuildError(null);
    setRuntimeError(null);
    try {
      const result = await buildPlaygroundSource(workspace);
      revokeBlobUrls(blobUrlsRef.current);
      blobUrlsRef.current = result.blobUrls;
      setPreviewDoc(result.srcDoc);
      setRunStatus("running");
    } catch (error) {
      const message =
        error instanceof PlaygroundBuildError
          ? error.diagnostics.join("\n")
          : error instanceof Error
            ? error.message
            : "Unknown build error.";
      setBuildError(message);
      setRunStatus("error");
      setDiagnosticsOpen(true);
    }
  }, [workspace]);

  const updateActiveFileContent = useCallback((nextValue: string | undefined) => {
    if (typeof nextValue !== "string") return;
    updateWorkspace((previous) => ({
      ...previous,
      files: previous.files.map((file) =>
        file.id === previous.activeFileId ? { ...file, content: nextValue } : file
      ),
    }));
  }, [updateWorkspace]);

  const setRunTarget = useCallback((path: string) => {
    updateWorkspace((previous) => ({
      ...previous,
      entry: path,
    }));
  }, [updateWorkspace]);

  const openFile = useCallback((fileId: string) => {
    const selected = workspace.files.find((file) => file.id === fileId);
    if (!selected) return;
    openFolderChain(selected.path, false);
    setSelectedPath(selected.path);
    updateWorkspace((previous) => ({
      ...previous,
      activeFileId: fileId,
    }));
  }, [openFolderChain, updateWorkspace, workspace.files]);

  const handleTreeSelect = useCallback((nodes: NodeApi<ExplorerNode>[]) => {
    const node = nodes[0];
    if (!node) return;
    setSelectedPath(node.data.path);
    if (node.data.type === "file" && node.data.fileId) {
      openFile(node.data.fileId);
    }
  }, [openFile]);

  const createFileAtPath = useCallback((rawPath: string) => {
    const fallbackExtension = activeFile?.path.match(/\.[a-z0-9]+$/i)?.[0] ?? ".ts";
    const normalizedPath = normalizePath(withDefaultExtension(ensureWorkspacePath(rawPath), fallbackExtension));
    if (workspace.files.some((file) => file.path === normalizedPath)) {
      return `File "${normalizedPath}" already exists.`;
    }
    const nextFile: PlaygroundFile = {
      id: createFileId(),
      path: normalizedPath,
      language: inferLanguageFromPath(normalizedPath),
      content: getStarterContent(normalizedPath),
    };
    updateWorkspace((previous) => ({
      ...previous,
      activeFileId: nextFile.id,
      folders: sortFolders([
        ...previous.folders,
        ...getFolderAncestors(normalizedPath),
      ]),
      files: [...previous.files, nextFile],
    }));
    openFolderChain(normalizedPath, false);
    setSelectedPath(normalizedPath);
    return null;
  }, [activeFile?.path, openFolderChain, updateWorkspace, workspace.files]);

  const createFolderAtPath = useCallback((rawPath: string) => {
    const normalizedPath = normalizeFolderPath(rawPath);
    if (workspace.folders.includes(normalizedPath)) {
      return `Folder "${normalizedPath}" already exists.`;
    }
    if (workspace.files.some((file) => file.path === normalizedPath)) {
      return `A file already exists at "${normalizedPath}".`;
    }
    updateWorkspace((previous) => ({
      ...previous,
      folders: sortFolders([
        ...previous.folders,
        ...getFolderChain(normalizedPath),
      ]),
    }));
    openFolderChain(normalizedPath, true);
    setSelectedPath(normalizedPath);
    return null;
  }, [openFolderChain, updateWorkspace, workspace.files, workspace.folders]);

  const renameNodePath = useCallback((node: SelectedNode, rawPath: string) => {
    if (!node) return "Select a file or folder to rename.";

    if (node.type === "file") {
      const oldPath = node.path;
      const oldExtension = oldPath.match(/\.[a-z0-9]+$/i)?.[0] ?? ".ts";
      const normalizedPath = normalizePath(withDefaultExtension(ensureWorkspacePath(rawPath), oldExtension));
      if (normalizedPath === oldPath) return null;
      if (workspace.files.some((file) => file.path === normalizedPath)) {
        return `File "${normalizedPath}" already exists.`;
      }
      updateWorkspace((previous) => ({
        ...previous,
        entry: previous.entry === oldPath ? normalizedPath : previous.entry,
        files: previous.files.map((file) =>
          file.path === oldPath
            ? {
                ...file,
                path: normalizedPath,
                language: inferLanguageFromPath(normalizedPath),
              }
            : file
        ),
      }));
      setSelectedPath(normalizedPath);
      openFolderChain(normalizedPath, false);
      return null;
    }

    const oldFolder = node.path;
    const nextFolder = normalizeFolderPath(ensureWorkspacePath(rawPath));
    if (nextFolder === oldFolder) return null;
    if (nextFolder.startsWith(`${oldFolder}/`)) {
      return "Cannot rename a folder into one of its descendants.";
    }
    if (
      workspace.folders.includes(nextFolder) ||
      workspace.files.some((file) => file.path === nextFolder)
    ) {
      return `Path "${nextFolder}" already exists.`;
    }
    updateWorkspace((previous) => ({
      ...previous,
      entry: replacePrefix(previous.entry, oldFolder, nextFolder),
      folders: sortFolders(
        previous.folders.map((folder) => replacePrefix(folder, oldFolder, nextFolder))
      ),
      files: previous.files.map((file) => ({
        ...file,
        path: replacePrefix(file.path, oldFolder, nextFolder),
        language: inferLanguageFromPath(replacePrefix(file.path, oldFolder, nextFolder)),
      })),
    }));
    setSelectedPath(nextFolder);
    openFolderChain(nextFolder, true);
    return null;
  }, [openFolderChain, updateWorkspace, workspace.files, workspace.folders]);

  const deleteNodePath = useCallback((node: SelectedNode) => {
    if (!node) return "Select a file or folder to delete.";

    if (node.type === "file") {
      if (workspace.files.length <= 1) {
        return "At least one file is required.";
      }
      updateWorkspace((previous) => {
        const nextFiles = previous.files.filter((file) => file.id !== node.fileId);
        const fallback = nextFiles[0];
        const removed = previous.files.find((file) => file.id === node.fileId);
        return {
          ...previous,
          activeFileId: previous.activeFileId === node.fileId ? fallback.id : previous.activeFileId,
          entry: removed && previous.entry === removed.path ? fallback.path : previous.entry,
          files: nextFiles,
        };
      });
      return null;
    }

    const pathsToRemove = workspace.files.filter((file) => file.path.startsWith(`${node.path}/`));
    if (pathsToRemove.length >= workspace.files.length) {
      return "Deleting this folder would remove every file.";
    }
    updateWorkspace((previous) => {
      const keptFiles = previous.files.filter((file) => !file.path.startsWith(`${node.path}/`));
      const fallback = keptFiles[0];
      return {
        ...previous,
        activeFileId: keptFiles.some((file) => file.id === previous.activeFileId)
          ? previous.activeFileId
          : fallback.id,
        entry: keptFiles.some((file) => file.path === previous.entry)
          ? previous.entry
          : fallback.path,
        folders: previous.folders.filter((folder) => folder !== node.path && !folder.startsWith(`${node.path}/`)),
        files: keptFiles,
      };
    });
    return null;
  }, [updateWorkspace, workspace.files]);

  const resetRuntimeState = useCallback(() => {
    setPreviewDoc(DEFAULT_PREVIEW_DOC);
    setBuildError(null);
    setRuntimeError(null);
    setRunStatus("idle");
    setDiagnosticsOpen(false);
  }, []);

  const submitDraftAction = useCallback(() => {
    if (!draftAction) return;
    setDraftError(null);

    const value = draftAction.value.trim();
    if (value.length === 0) {
      setDraftError("Value cannot be empty.");
      return;
    }

    if (draftAction.kind === "new-file") {
      const message = createFileAtPath(value);
      if (message) {
        setDraftError(message);
        return;
      }
      setDraftAction(null);
      return;
    }

    if (draftAction.kind === "new-folder") {
      const message = createFolderAtPath(value);
      if (message) {
        setDraftError(message);
        return;
      }
      setDraftAction(null);
      return;
    }

    if (draftAction.kind === "rename-node") {
      const message = renameNodePath(selectedNode, value);
      if (message) {
        setDraftError(message);
        return;
      }
      setDraftAction(null);
      return;
    }

    if (draftAction.kind === "new-recipe") {
      const workspaceFromTemplate = normalizeWorkspace(createWorkspaceFromPreset(templatePreset));
      const timestamp = nowIso();
      const recipe: PlaygroundRecipe = {
        id: createRecipeId(),
        name: value,
        description: "",
        tags: [],
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastOpenedAt: timestamp,
        snapshotsCount: 0,
        snapshots: [],
        workspace: workspaceFromTemplate,
      };
      const nextIndex = upsertRecipe(storageKey, recipe, { setActive: true, touchRecent: true });
      setRecipeIndex(nextIndex);
      setActiveRecipe(recipe);
      setTagsInput("");
      setSelectedPath(recipe.workspace.files[0]?.path ?? null);
      resetRuntimeState();
      setDraftAction(null);
      return;
    }

    if (draftAction.kind === "rename-recipe") {
      mutateRecipe((previous) => ({
        ...previous,
        name: value,
      }));
      setDraftAction(null);
      return;
    }

    if (draftAction.kind === "new-snapshot") {
      mutateRecipe((previous) => {
        const snapshot: PlaygroundSnapshot = {
          id: createRecipeId().replace("recipe", "snapshot"),
          name: value,
          createdAt: nowIso(),
          note: previous.notes.slice(0, 180),
          workspace: cloneWorkspace(previous.workspace),
        };
        return {
          ...previous,
          snapshots: [snapshot, ...previous.snapshots],
          snapshotsCount: previous.snapshots.length + 1,
        };
      });
      setDraftAction(null);
    }
  }, [
    createFileAtPath,
    createFolderAtPath,
    draftAction,
    mutateRecipe,
    renameNodePath,
    resetRuntimeState,
    selectedNode,
    storageKey,
    templatePreset,
  ]);

  const submitConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.kind === "delete-node") {
      const message = deleteNodePath(confirmAction.node);
      if (message) {
        setDraftError(message);
      } else {
        setConfirmAction(null);
        setSelectedPath(null);
      }
      return;
    }

    if (recipeIndex.recipes.length <= 1) {
      setDraftError("At least one recipe is required.");
      setConfirmAction(null);
      return;
    }
    const nextIndex = removeRecipe(storageKey, activeRecipe.id);
    if (!nextIndex) {
      setConfirmAction(null);
      return;
    }
    setRecipeIndex(nextIndex);
    if (nextIndex.activeRecipeId) {
      loadRecipeIntoView(nextIndex.activeRecipeId);
    }
    setConfirmAction(null);
  }, [activeRecipe.id, confirmAction, deleteNodePath, loadRecipeIntoView, recipeIndex.recipes.length, storageKey]);

  const duplicateRecipe = useCallback(() => {
    const timestamp = nowIso();
    const nextRecipe: PlaygroundRecipe = normalizeRecipe({
      ...activeRecipe,
      id: createRecipeId(),
      name: `${activeRecipe.name} copy`,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
      workspace: cloneWorkspace(activeRecipe.workspace),
      snapshots: activeRecipe.snapshots.map((snapshot) => ({
        ...snapshot,
        id: createRecipeId().replace("recipe", "snapshot"),
      })),
    });
    const nextIndex = upsertRecipe(storageKey, nextRecipe, { setActive: true, touchRecent: true });
    setRecipeIndex(nextIndex);
    setActiveRecipe(nextRecipe);
    setTagsInput(nextRecipe.tags.join(", "));
    setSelectedPath(nextRecipe.workspace.files[0]?.path ?? null);
    resetRuntimeState();
  }, [activeRecipe, resetRuntimeState, storageKey]);

  const exportActiveRecipe = useCallback(() => {
    const payload = JSON.stringify(activeRecipe, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeRecipe.name.replace(/\s+/g, "-").toLowerCase() || "recipe"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [activeRecipe]);

  const importRecipe = useCallback(async (file: File) => {
    const raw = await file.text();
    const parsed = coerceRecipe(JSON.parse(raw));
    if (!parsed) throw new Error("Invalid recipe JSON.");
    const timestamp = nowIso();
    const importedRecipe = normalizeRecipe({
      ...parsed,
      id: createRecipeId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
    });
    const nextIndex = upsertRecipe(storageKey, importedRecipe, { setActive: true, touchRecent: true });
    setRecipeIndex(nextIndex);
    setActiveRecipe(importedRecipe);
    setTagsInput(importedRecipe.tags.join(", "));
    setSelectedPath(importedRecipe.workspace.files[0]?.path ?? null);
    resetRuntimeState();
  }, [resetRuntimeState, storageKey]);

  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    event.preventDefault();
    const bounds = panel.getBoundingClientRect();
    setIsResizing(true);
    const onMove = (pointerEvent: PointerEvent) => {
      const next = (pointerEvent.clientX - bounds.left) / bounds.width;
      setSplitRatio(Math.max(PANEL_MIN_RATIO, Math.min(PANEL_MAX_RATIO, next)));
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const renderExplorerNode = useCallback(
    ({ node, style, dragHandle }: NodeRendererProps<ExplorerNode>) => {
      const isRunTarget = node.data.type === "file" && workspace.entry === node.data.path;
      const nodeSelection: SelectedNode =
        node.data.type === "file" && node.data.fileId
          ? { type: "file", path: node.data.path, fileId: node.data.fileId }
          : { type: "folder", path: node.data.path };
      const baseFolder = node.data.type === "folder" ? node.data.path : dirname(node.data.path);
      return (
        <div
          ref={dragHandle}
          style={style}
          data-explorer-node="true"
          className={cn(
            "group flex h-full items-center gap-1 rounded px-2 text-xs",
            node.isSelected
              ? "bg-[var(--color-surface-2)] text-[var(--color-text)]"
              : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          )}
          onClick={node.handleClick}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedPath(node.data.path);
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              node: nodeSelection,
              baseFolder,
            });
          }}
        >
          {node.data.type === "folder" ? (
            <button
              type="button"
              aria-label={node.isOpen ? "Collapse folder" : "Expand folder"}
              className="w-4 text-center text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]/40"
              onClick={(event) => {
                event.stopPropagation();
                node.toggle();
              }}
            >
              {node.isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 text-center text-[10px]">•</span>
          )}
          <span className="truncate">{node.data.name}</span>
          {isRunTarget ? (
            <span className="ml-auto rounded border border-emerald-500/40 px-1 py-0.5 text-[9px] uppercase text-emerald-300">
              Run
            </span>
          ) : null}
        </div>
      );
    },
    [workspace.entry]
  );

  useEffect(() => {
    const term = dependencyQuery.trim();
    if (term.length < 2) {
      setDependencySearchState("idle");
      setDependencySearchError(null);
      setDependencySearchResults([]);
      return;
    }

    const abortController = new AbortController();
    setDependencySearchState("loading");
    setDependencySearchError(null);

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({
        text: term,
        size: String(NPM_SEARCH_LIMIT),
      });

      const run = async () => {
        try {
          const response = await fetch(`https://registry.npmjs.org/-/v1/search?${params.toString()}`, {
            signal: abortController.signal,
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`npm search failed (${response.status}).`);
          }

          const payload = await response.json();
          if (abortController.signal.aborted) return;

          setDependencySearchResults(parseNpmSearchResults(payload));
          setDependencySearchState("idle");
        } catch (error) {
          if (abortController.signal.aborted) return;
          const message = error instanceof Error ? error.message : "Could not search npm packages.";
          setDependencySearchResults([]);
          setDependencySearchError(message);
          setDependencySearchState("error");
        }
      };

      void run();
    }, NPM_SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [dependencyQuery]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextIndex = upsertRecipe(storageKey, normalizeRecipe(activeRecipe), { setActive: false, touchRecent: false });
      setRecipeIndex(nextIndex);
      setSaveState("saved");
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [activeRecipe, storageKey]);

  useEffect(() => {
    const store = ensureRecipeStore(
      storageKey,
      normalizeWorkspace(createWorkspaceFromPreset(initialPreset)),
      "My recipe"
    );
    setRecipeIndex(store.index);
    setActiveRecipe(normalizeRecipe(store.activeRecipe));
    setTemplatePreset(initialPreset);
    setSelectedPath(store.activeRecipe.workspace.files[0]?.path ?? null);
    setOpenState({ "/src": true });
    setPreviewDoc(DEFAULT_PREVIEW_DOC);
    setBuildError(null);
    setRuntimeError(null);
    setRunStatus("idle");
    setDiagnosticsOpen(false);
    setTagsInput(store.activeRecipe.tags.join(", "));
  }, [initialPreset, storageKey]);

  useEffect(() => {
    return () => {
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    syncWorkspaceModels();
  }, [syncWorkspaceModels]);

  useEffect(() => {
    if (!activeFile) return;
    setSelectedPath(activeFile.path);
    openFolderChain(activeFile.path, false);
  }, [activeFile, openFolderChain]);

  useEffect(() => {
    if (buildError || runtimeError) {
      setDiagnosticsOpen(true);
    }
  }, [buildError, runtimeError]);

  useEffect(() => {
    return () => {
      const monaco = monacoRef.current;
      if (!monaco) return;
      workspaceModelUrisRef.current.forEach((uriString) => {
        const model = monaco.editor.getModel(monaco.Uri.parse(uriString));
        model?.dispose();
      });
      workspaceModelUrisRef.current.clear();
    };
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as { channel?: string; type?: string; payload?: RuntimePayload } | undefined;
      if (!data || data.channel !== PLAYGROUND_POST_MESSAGE_CHANNEL) return;
      if (data.type === "ready") {
        setRunStatus("idle");
        setRuntimeError(null);
        return;
      }
      if (data.type === "runtime-error") {
        setRuntimeError(readableError(data.payload));
        setRunStatus("error");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
      if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
      if (!panelRef.current?.contains(document.activeElement)) return;
      event.preventDefault();
      void runWorkspace();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runWorkspace]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (contextMenuRef.current && target && contextMenuRef.current.contains(target)) {
        return;
      }
      setContextMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const diagnosticsText = [buildError ? `Build error:\n${buildError}` : null, runtimeError ? `Runtime error:\n${runtimeError}` : null]
    .filter(Boolean)
    .join("\n\n");

  const editorHeight = embedded ? minHeight : Math.max(minHeight, 520);
  const explorerWidth = embedded ? 230 : 270;
  const col1 = explorerCollapsed ? 40 : explorerWidth;
  const workspaceLayoutStyle = fillHeight
    ? { gridTemplateColumns: `${col1}px minmax(0, 1fr)` }
    : {
        gridTemplateColumns: `${col1}px minmax(0, 1fr)`,
        minHeight: `${editorHeight}px`,
      };
  const editorSplitStyle = fillHeight
    ? { gridTemplateColumns: `${Math.round(splitRatio * 100)}% 8px minmax(0, 1fr)`, minHeight: "100%" }
    : {
        gridTemplateColumns: `${Math.round(splitRatio * 100)}% 8px minmax(0, 1fr)`,
        minHeight: `${editorHeight}px`,
      };
  const treeHeight = Math.max(160, explorerTreeSize.height);
  const selectedNodeName = selectedNode ? selectedNode.path.split("/").filter(Boolean).at(-1) ?? selectedNode.path : "";

  if (!hydrated) {
    return (
      <section
        className={cn(
          fillHeight
            ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]"
            : "w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-1)]",
          className
        )}
      >
        <div className="grid h-full min-h-[320px] place-items-center text-sm text-[var(--color-muted)]">
          Loading playground...
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        fillHeight
          ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]"
          : "w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-1)]",
        className
      )}
    >
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/55 px-3 py-2">
        <span className="flex-1 truncate text-xs font-mono text-[var(--color-muted)]">
          {activeRecipe.name}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border border-[var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.08em]",
            statusColorMap[runStatus]
          )}
        >
          {statusLabelMap[runStatus]}
        </span>
        <button
          type="button"
          disabled={runStatus === "building"}
          onClick={() => void runWorkspace()}
          className="h-8 shrink-0 rounded-md border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => setDiagnosticsOpen((open) => !open)}
          className="h-8 shrink-0 rounded-md border border-[var(--color-border)] px-2 text-[11px] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
        >
          {diagnosticsOpen ? "Hide" : "Diagnostics"}{diagnosticsCount > 0 ? ` (${diagnosticsCount})` : ""}
        </button>
      </header>

      {draftAction ? (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/35 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {draftAction.kind === "new-file" && "Create file"}
              {draftAction.kind === "new-folder" && "Create folder"}
              {draftAction.kind === "rename-node" && `Rename ${selectedNode?.type ?? "item"}`}
              {draftAction.kind === "new-recipe" && "Create recipe"}
              {draftAction.kind === "rename-recipe" && "Rename recipe"}
              {draftAction.kind === "new-snapshot" && "Save snapshot"}
            </span>
            <input
              autoFocus
              value={draftAction.value}
              onChange={(event) => setDraftAction({ ...draftAction, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitDraftAction();
                }
                if (event.key === "Escape") {
                  setDraftAction(null);
                  setDraftError(null);
                }
              }}
              className="h-8 min-w-[18rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            />
            <button
              type="button"
              onClick={submitDraftAction}
              className="h-8 rounded-md border border-[var(--color-border)] px-3 text-xs hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftAction(null);
                setDraftError(null);
              }}
              className="h-8 rounded-md border border-[var(--color-border)] px-3 text-xs hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              Cancel
            </button>
            {draftError ? <span className="text-xs text-red-300">{draftError}</span> : null}
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/35 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-red-300">
              {confirmAction.kind === "delete-node"
                ? `Delete "${confirmAction.node?.path}"?`
                : `Delete recipe "${activeRecipe.name}"?`}
            </span>
            <button
              type="button"
              onClick={submitConfirmAction}
              className="h-8 rounded-md border border-red-500/40 px-3 text-xs text-red-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="h-8 rounded-md border border-[var(--color-border)] px-3 text-xs hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn("grid w-full border-t border-[var(--color-border)]", fillHeight ? "min-h-0 flex-1" : "")}
        style={workspaceLayoutStyle}
      >
        <aside ref={explorerRef} className="flex min-h-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)]/35 overflow-hidden">
          {explorerCollapsed ? (
            <button
              type="button"
              onClick={() => setExplorerCollapsed(false)}
              title="Expand explorer"
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              <span className="text-[10px]">▶</span>
            </button>
          ) : (
          <>
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
            <span>Explorer</span>
            <div className="flex items-center gap-2">
              <span className="truncate text-[10px] normal-case text-[var(--color-muted)]">
                {selectedNodeName || "right-click for options"}
              </span>
              <button
                type="button"
                onClick={() => setExplorerCollapsed(true)}
                title="Collapse explorer"
                className="shrink-0 text-[10px] hover:text-[var(--color-text)] focus-visible:outline-none"
              >
                ◀
              </button>
            </div>
          </div>
          <div
            ref={explorerTreeRef}
            className="min-h-0 flex-1 overflow-hidden px-1 py-1"
            onContextMenu={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("[data-explorer-node='true']")) {
                return;
              }
              event.preventDefault();
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                node: null,
                baseFolder: "/src",
              });
            }}
          >
            <Tree<ExplorerNode>
              data={treeData}
              width="100%"
              height={treeHeight}
              rowHeight={28}
              indent={14}
              openByDefault={false}
              initialOpenState={openState}
              onToggle={(id) => {
                setOpenState((previous) => ({ ...previous, [id]: !previous[id] }));
              }}
              selection={selectedPath ?? undefined}
              onSelect={handleTreeSelect}
              onActivate={(node: NodeApi<ExplorerNode>) => {
                if (node.data.type === "file" && node.data.fileId) {
                  openFile(node.data.fileId);
                }
              }}
              disableDrag
              disableDrop
              disableEdit
            >
              {renderExplorerNode}
            </Tree>
          </div>
          <div className="border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setDependencyPanelOpen((open) => !open)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30 focus-visible:ring-inset"
            >
              <span className="w-3 text-center text-[10px]">{dependencyPanelOpen ? "▾" : "▸"}</span>
              <span>Dependencies</span>
              <span className="ml-auto rounded bg-[var(--color-surface-2)]/70 px-1.5 py-0.5 text-[10px] normal-case">
                {installedDependencies.length}
              </span>
            </button>
            {dependencyPanelOpen ? (
              <div className="space-y-2 px-2 pb-2">
                <input
                  value={dependencyQuery}
                  onChange={(event) => setDependencyQuery(event.target.value)}
                  placeholder="Search npm packages..."
                  aria-label="Search npm packages"
                  className="h-8 w-full rounded-md border border-[var(--color-border)]/60 bg-[var(--color-bg)] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
                />

                {dependencySearchState === "loading" ? (
                  <p className="text-[11px] text-[var(--color-muted)]">Searching...</p>
                ) : null}

                {dependencySearchError ? (
                  <p className="text-[11px] text-red-300">{dependencySearchError}</p>
                ) : null}

                {dependencyQuery.trim().length >= 2
                && dependencySearchState === "idle"
                && dependencySearchResults.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-muted)]">No matching npm packages found.</p>
                ) : null}

                {dependencySearchResults.length > 0 ? (
                  <ul className="max-h-44 space-y-1.5 overflow-auto pr-1">
                    {dependencySearchResults.map((result) => {
                      const installedVersion = workspace.dependencies[result.name];
                      const alreadyInstalled = installedVersion === result.version;

                      return (
                        <li
                          key={`${result.name}@${result.version}`}
                          className="rounded-md bg-[var(--color-surface-2)]/40 px-2 py-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs text-[var(--color-text)]">{result.name}@{result.version}</p>
                              {result.description ? (
                                <p className="truncate text-[11px] text-[var(--color-muted)]">{result.description}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={alreadyInstalled}
                              onClick={() => installDependency(result.name, result.version)}
                              className={cn(
                                "h-6 whitespace-nowrap rounded px-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]/40",
                                alreadyInstalled
                                  ? "cursor-not-allowed text-[var(--color-muted)] opacity-70"
                                  : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                              )}
                            >
                              {alreadyInstalled ? "Installed" : "Install"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <div className="max-h-28 overflow-auto pr-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {installedDependencies.length > 0 ? (
                      installedDependencies.map(([name, version]) => {
                        const isCoreDependency = Object.prototype.hasOwnProperty.call(presetDependencies, name);
                        const canResetCore = isCoreDependency && presetDependencies[name] !== version;

                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)]/40 px-2 py-0.5 text-[10px] text-[var(--color-text)]"
                          >
                            <span className="max-w-[10rem] truncate">{name}@{version}</span>
                            {isCoreDependency ? (
                              <span className="px-1 py-0 text-[9px] text-[var(--color-muted)]">
                                preset
                              </span>
                            ) : null}
                            {!isCoreDependency ? (
                              <button
                                type="button"
                                aria-label={`Remove dependency ${name}`}
                                onClick={() => removeDependency(name)}
                                className="rounded px-1 text-[10px] text-[var(--color-muted)] hover:text-red-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]/40"
                              >
                                x
                              </button>
                            ) : null}
                            {canResetCore ? (
                              <button
                                type="button"
                                aria-label={`Reset dependency ${name} to preset version`}
                                onClick={() => removeDependency(name)}
                                className="rounded px-1 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]/40"
                              >
                                reset
                              </button>
                            ) : null}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-[var(--color-muted)]">No dependencies yet. Search above to add npm packages.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          </>
          )}
        </aside>

        <div
          ref={panelRef}
          className={cn(
            "grid min-h-0",
            !prefersReducedMotion && !isResizing ? "transition-[grid-template-columns] duration-200 ease-out" : ""
          )}
          style={editorSplitStyle}
        >
          <div className="min-w-0 border-r border-[var(--color-border)]">
            <MonacoEditor
              path={activeFileUri}
              language={activeFile?.language ?? "typescript"}
              value={activeFile?.content ?? ""}
              onChange={updateActiveFileContent}
              beforeMount={configureMonaco}
              theme={VESPER_THEME_NAME}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                smoothScrolling: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 14, bottom: 14 },
              }}
            />
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and preview"
            tabIndex={0}
            onPointerDown={beginResize}
            onKeyDown={(event) => {
              const step = 0.05;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setSplitRatio((r) => Math.max(PANEL_MIN_RATIO, r - step));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setSplitRatio((r) => Math.min(PANEL_MAX_RATIO, r + step));
              }
            }}
            className="cursor-col-resize bg-[var(--color-surface-2)] transition-colors duration-150 ease-out hover:bg-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/40"
          />
          <div className="min-w-0 bg-[var(--color-bg)]/30 p-2">
            <iframe
              ref={iframeRef}
              title="Playground preview"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={previewDoc}
              className="h-full min-h-[240px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
            />
          </div>
        </div>
      </div>

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="File actions"
          className="fixed z-50 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-1)]"
          style={{
            left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 196)),
            top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 220)),
          }}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            onClick={() => {
              setDraftError(null);
              setDraftAction({ kind: "new-file", value: `${contextMenu.baseFolder}/new-file.ts` });
              setContextMenu(null);
            }}
          >
            New file...
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            onClick={() => {
              setDraftError(null);
              setDraftAction({ kind: "new-folder", value: `${contextMenu.baseFolder}/new-folder` });
              setContextMenu(null);
            }}
          >
            New folder...
          </button>
          {contextMenu.node?.type === "file" && contextMenu.node.fileId ? (
            <button
              type="button"
              role="menuitem"
              className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
              onClick={() => {
                const node = contextMenu.node;
                if (!node || node.type !== "file") return;
                openFile(node.fileId);
                setContextMenu(null);
              }}
            >
              Open file
            </button>
          ) : null}
          {contextMenu.node?.type === "file" && isRunnableFile(contextMenu.node.path) ? (
            <button
              type="button"
              role="menuitem"
              className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
              onClick={() => {
                const node = contextMenu.node;
                if (!node || node.type !== "file") return;
                setRunTarget(node.path);
                setContextMenu(null);
              }}
            >
              Set as run target
            </button>
          ) : null}
          {contextMenu.node ? (
            <>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <button
                type="button"
                role="menuitem"
                className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
                onClick={() => {
                  const node = contextMenu.node;
                  if (!node) return;
                  setDraftError(null);
                  setDraftAction({ kind: "rename-node", value: node.path });
                  setContextMenu(null);
                }}
              >
                Rename...
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full rounded px-2 py-1.5 text-left text-xs text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                onClick={() => {
                  setConfirmAction({ kind: "delete-node", node: contextMenu.node });
                  setContextMenu(null);
                }}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[var(--color-muted)]",
          compactChrome ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        )}
      >
        <div className="flex items-center gap-2">
          <span>{typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ Enter" : "Ctrl+Enter"} to run</span>
          <button
            type="button"
            onClick={() => setLearningOpen((open) => !open)}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            {learningOpen ? "Hide recipe notebook" : "Show recipe notebook"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftError(null);
              setDraftAction({ kind: "rename-recipe", value: activeRecipe.name });
            }}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            Rename recipe
          </button>
          <button
            type="button"
            onClick={duplicateRecipe}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            Duplicate recipe
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction({ kind: "delete-recipe" })}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            Delete recipe
          </button>
          <button
            type="button"
            onClick={exportActiveRecipe}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            Export recipe
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            Import recipe
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await importRecipe(file);
              } catch {
                setDraftError("Could not import recipe JSON.");
              } finally {
                event.currentTarget.value = "";
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const report = {
                timestamp: new Date().toISOString(),
                status: runStatus,
                recipe: activeRecipe.name,
                runTarget: workspace.entry,
                dependencies: workspace.dependencies,
                files: workspace.files.map((file) => ({
                  path: file.path,
                  language: file.language,
                  size: file.content.length,
                })),
                diagnostics: {
                  buildError,
                  runtimeError,
                },
              };
              try {
                await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
                setCopyFeedbackState("copied");
                window.setTimeout(() => setCopyFeedbackState("idle"), 1200);
              } catch {
                setCopyFeedbackState("failed");
                window.setTimeout(() => setCopyFeedbackState("idle"), 1500);
              }
            }}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            {copyFeedbackState === "copied"
              ? "Report copied"
              : copyFeedbackState === "failed"
                ? "Copy failed"
                : "Copy errors"}
          </button>
          <button
            type="button"
            onClick={() => setDiagnosticsOpen((open) => !open)}
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
          >
            {diagnosticsOpen ? "Hide diagnostics" : "Show diagnostics"}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-[var(--color-border)] transition-all duration-200 ease-out",
          diagnosticsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 py-3 text-xs text-red-300">
          {diagnosticsText || "No errors or warnings."}
        </pre>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-[var(--color-border)] transition-all duration-200 ease-out",
          learningOpen ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="grid gap-3 px-3 py-3 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2">
            <label htmlFor="recipe-description" className="block text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Description</label>
            <input
              id="recipe-description"
              value={activeRecipe.description ?? ""}
              onChange={(event) => mutateRecipe((previous) => ({ ...previous, description: event.target.value }))}
              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            />
            <label htmlFor="recipe-tags" className="block text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Tags</label>
            <input
              id="recipe-tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              onBlur={() => mutateRecipe((previous) => ({ ...previous, tags: parseTags(tagsInput) }))}
              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
              placeholder="ui, animation, card, idea"
            />
            <label htmlFor="recipe-notes" className="block text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Notes</label>
            <textarea
              id="recipe-notes"
              value={activeRecipe.notes}
              onChange={(event) => mutateRecipe((previous) => ({ ...previous, notes: event.target.value }))}
              className="min-h-28 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
              placeholder="Capture what you learned from this recipe..."
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Snapshots</span>
              <button
                type="button"
                onClick={() => {
                  setDraftError(null);
                  setDraftAction({
                    kind: "new-snapshot",
                    value: `Snapshot ${activeRecipe.snapshots.length + 1}`,
                  });
                }}
                className="h-7 rounded-md border border-[var(--color-border)] px-2 text-[11px] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
              >
                Save snapshot
              </button>
            </div>
            <select
              value={selectedSnapshotId}
              onChange={(event) => setSelectedSnapshotId(event.target.value)}
              aria-label="Select snapshot"
              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              <option value="">Select snapshot</option>
              {activeRecipe.snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.name} • {new Date(snapshot.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedSnapshotId}
              onClick={() => {
                const snapshot = activeRecipe.snapshots.find((item) => item.id === selectedSnapshotId);
                if (!snapshot) return;
                updateWorkspace(() => cloneWorkspace(snapshot.workspace));
                setRunStatus("idle");
                setBuildError(null);
                setRuntimeError(null);
                setPreviewDoc(DEFAULT_PREVIEW_DOC);
              }}
              className="h-8 rounded-md border border-[var(--color-border)] px-2 text-xs hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
            >
              Restore snapshot
            </button>
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)]/30 p-2 text-xs text-[var(--color-muted)]">
              <p>Snapshots save your code at a point in time, so you can experiment freely and roll back.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CraftPlayground;
