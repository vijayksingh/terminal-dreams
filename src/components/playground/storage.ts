import type {
  PlaygroundFile,
  PlaygroundRecipe,
  PlaygroundRecipeMetadata,
  PlaygroundSnapshot,
  PlaygroundWorkspace,
} from "@/components/playground/types";
import { ensureWorkspacePath, inferLanguageFromPath } from "@/components/playground/workspace-utils";

const PLAYGROUND_STORAGE_PREFIX = "td:playground:workspace";
const PLAYGROUND_RECIPE_INDEX_PREFIX = "td:playground:recipes:index";
const PLAYGROUND_RECIPE_PREFIX = "td:playground:recipes:item";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function coerceFile(value: unknown): PlaygroundFile | null {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const path = typeof value.path === "string" ? ensureWorkspacePath(value.path) : "";
  const content = typeof value.content === "string" ? value.content : "";
  if (id.length === 0 || path.length === 0) return null;
  const language = inferLanguageFromPath(path);
  return { id, path, language, content };
}

function coerceWorkspace(value: unknown): PlaygroundWorkspace | null {
  if (!isPlainObject(value)) return null;
  const filesValue = Array.isArray(value.files) ? value.files : [];
  const files = filesValue.map(coerceFile).filter((file): file is PlaygroundFile => Boolean(file));

  if (files.length === 0) return null;

  const foldersValue = Array.isArray(value.folders) ? value.folders : [];
  const folders = foldersValue
    .filter((folder): folder is string => typeof folder === "string")
    .map((folder) => ensureWorkspacePath(folder))
    .filter((folder, index, arr) => folder.length > 0 && arr.indexOf(folder) === index);

  const entry = typeof value.entry === "string" ? ensureWorkspacePath(value.entry) : files[0].path;
  const activeFileId =
    typeof value.activeFileId === "string" && files.some((file) => file.id === value.activeFileId)
      ? value.activeFileId
      : files[0].id;
  const preset = value.preset === "react-js" ? "react-js" : "react-ts";

  return {
    version: 1,
    preset,
    entry: files.some((file) => file.path === entry) ? entry : files[0].path,
    activeFileId,
    folders: folders.length > 0 ? folders : ["/src"],
    files,
  };
}

export function getWorkspaceStorageKey(storageKey: string): string {
  return `${PLAYGROUND_STORAGE_PREFIX}:${storageKey}`;
}

export function getRecipeIndexStorageKey(storageKey: string): string {
  return `${PLAYGROUND_RECIPE_INDEX_PREFIX}:${storageKey}`;
}

export function getRecipeStorageKey(storageKey: string, recipeId: string): string {
  return `${PLAYGROUND_RECIPE_PREFIX}:${storageKey}:${recipeId}`;
}

export function loadWorkspace(storageKey: string): PlaygroundWorkspace | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getWorkspaceStorageKey(storageKey));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return coerceWorkspace(parsed);
  } catch {
    return null;
  }
}

export function saveWorkspace(storageKey: string, workspace: PlaygroundWorkspace) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getWorkspaceStorageKey(storageKey), JSON.stringify(workspace));
}

export type PlaygroundRecipeIndex = {
  version: 1;
  activeRecipeId: string | null;
  recentRecipeIds: string[];
  recipes: PlaygroundRecipeMetadata[];
};

function toMetadata(recipe: PlaygroundRecipe): PlaygroundRecipeMetadata {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    tags: recipe.tags,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    lastOpenedAt: recipe.lastOpenedAt,
    snapshotsCount: recipe.snapshots.length,
  };
}

function coerceSnapshot(value: unknown): PlaygroundSnapshot | null {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" ? value.id : createId("snapshot");
  const name = typeof value.name === "string" && value.name.trim().length > 0
    ? value.name.trim()
    : "Snapshot";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : nowIso();
  const note = typeof value.note === "string" ? value.note : undefined;
  const workspace = coerceWorkspace(value.workspace);
  if (!workspace) return null;
  return { id, name, createdAt, note, workspace };
}

function coerceMetadata(value: unknown): PlaygroundRecipeMetadata | null {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.length > 0 ? value.id : createId("recipe");
  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name.trim()
      : "Untitled recipe";
  const description = typeof value.description === "string" ? value.description : undefined;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
    : [];
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : nowIso();
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : createdAt;
  const lastOpenedAt = typeof value.lastOpenedAt === "string" ? value.lastOpenedAt : updatedAt;
  const snapshotsCount = typeof value.snapshotsCount === "number" && value.snapshotsCount >= 0
    ? value.snapshotsCount
    : 0;
  return {
    id,
    name,
    description,
    tags,
    createdAt,
    updatedAt,
    lastOpenedAt,
    snapshotsCount,
  };
}

function coerceRecipe(value: unknown): PlaygroundRecipe | null {
  if (!isPlainObject(value)) return null;
  const metadata = coerceMetadata(value);
  const workspace = coerceWorkspace(value.workspace);
  if (!metadata || !workspace) return null;
  const snapshotsValue = Array.isArray(value.snapshots) ? value.snapshots : [];
  const snapshots = snapshotsValue
    .map(coerceSnapshot)
    .filter((snapshot): snapshot is PlaygroundSnapshot => Boolean(snapshot));
  const notes = typeof value.notes === "string" ? value.notes : "";

  return {
    ...metadata,
    notes,
    snapshots,
    snapshotsCount: snapshots.length,
    workspace,
  };
}

function coerceRecipeIndex(value: unknown): PlaygroundRecipeIndex | null {
  if (!isPlainObject(value)) return null;
  const recipesValue = Array.isArray(value.recipes) ? value.recipes : [];
  const recipes = recipesValue
    .map(coerceMetadata)
    .filter((metadata): metadata is PlaygroundRecipeMetadata => Boolean(metadata));
  const activeRecipeId =
    typeof value.activeRecipeId === "string" && recipes.some((recipe) => recipe.id === value.activeRecipeId)
      ? value.activeRecipeId
      : recipes[0]?.id ?? null;
  const recentRecipeIds = Array.isArray(value.recentRecipeIds)
    ? value.recentRecipeIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    version: 1,
    activeRecipeId,
    recentRecipeIds,
    recipes,
  };
}

function readRecipeIndex(storageKey: string): PlaygroundRecipeIndex | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getRecipeIndexStorageKey(storageKey));
  if (!raw) return null;
  try {
    return coerceRecipeIndex(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeRecipeIndex(storageKey: string, index: PlaygroundRecipeIndex) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getRecipeIndexStorageKey(storageKey), JSON.stringify(index));
}

function withRecentIds(previous: string[], nextId: string): string[] {
  const next = [nextId, ...previous.filter((id) => id !== nextId)];
  return next.slice(0, 12);
}

function sortByUpdatedAt(recipes: PlaygroundRecipeMetadata[]): PlaygroundRecipeMetadata[] {
  return [...recipes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function createDefaultRecipe(workspace: PlaygroundWorkspace, name: string): PlaygroundRecipe {
  const timestamp = nowIso();
  return {
    id: createId("recipe"),
    name,
    description: "Workspace recipe",
    tags: [],
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastOpenedAt: timestamp,
    snapshotsCount: 0,
    snapshots: [],
    workspace,
  };
}

function migrateLegacyWorkspace(storageKey: string): PlaygroundRecipe | null {
  const legacyWorkspace = loadWorkspace(storageKey);
  if (!legacyWorkspace) return null;
  const legacyRecipe = createDefaultRecipe(legacyWorkspace, "Migrated recipe");
  legacyRecipe.description = "Migrated from previous single-workspace storage.";
  upsertRecipe(storageKey, legacyRecipe, { setActive: true, touchRecent: true });
  return legacyRecipe;
}

export function loadRecipeIndex(storageKey: string): PlaygroundRecipeIndex | null {
  return readRecipeIndex(storageKey);
}

export function loadRecipe(storageKey: string, recipeId: string): PlaygroundRecipe | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getRecipeStorageKey(storageKey, recipeId));
  if (!raw) return null;
  try {
    return coerceRecipe(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function ensureRecipeStore(
  storageKey: string,
  fallbackWorkspace: PlaygroundWorkspace,
  fallbackName = "My recipe"
): { index: PlaygroundRecipeIndex; activeRecipe: PlaygroundRecipe } {
  const existingIndex = readRecipeIndex(storageKey);
  if (existingIndex && existingIndex.recipes.length > 0) {
    const activeId = existingIndex.activeRecipeId ?? existingIndex.recipes[0].id;
    const activeRecipe = loadRecipe(storageKey, activeId);
    if (activeRecipe) {
      return {
        index: existingIndex,
        activeRecipe,
      };
    }
  }

  const migrated = migrateLegacyWorkspace(storageKey);
  if (migrated) {
    const index = readRecipeIndex(storageKey);
    if (index) {
      return { index, activeRecipe: migrated };
    }
  }

  const seededRecipe = createDefaultRecipe(fallbackWorkspace, fallbackName);
  const index = upsertRecipe(storageKey, seededRecipe, { setActive: true, touchRecent: true });
  return { index, activeRecipe: seededRecipe };
}

export function upsertRecipe(
  storageKey: string,
  recipe: PlaygroundRecipe,
  options?: { setActive?: boolean; touchRecent?: boolean }
): PlaygroundRecipeIndex {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getRecipeStorageKey(storageKey, recipe.id), JSON.stringify(recipe));
  }

  const currentIndex = readRecipeIndex(storageKey) ?? {
    version: 1 as const,
    activeRecipeId: null,
    recentRecipeIds: [],
    recipes: [],
  };

  const nextMetadata = toMetadata({
    ...recipe,
    snapshotsCount: recipe.snapshots.length,
  });
  const withoutCurrent = currentIndex.recipes.filter((item) => item.id !== recipe.id);
  const nextRecipes = sortByUpdatedAt([...withoutCurrent, nextMetadata]);
  const nextRecent = options?.touchRecent
    ? withRecentIds(currentIndex.recentRecipeIds, recipe.id)
    : currentIndex.recentRecipeIds;
  const nextActiveRecipeId = options?.setActive
    ? recipe.id
    : currentIndex.activeRecipeId ?? recipe.id;

  const nextIndex: PlaygroundRecipeIndex = {
    version: 1,
    activeRecipeId: nextActiveRecipeId,
    recentRecipeIds: nextRecent,
    recipes: nextRecipes,
  };

  writeRecipeIndex(storageKey, nextIndex);
  return nextIndex;
}

export function setActiveRecipe(storageKey: string, recipeId: string): PlaygroundRecipeIndex | null {
  const index = readRecipeIndex(storageKey);
  if (!index) return null;
  if (!index.recipes.some((item) => item.id === recipeId)) return index;
  const next: PlaygroundRecipeIndex = {
    ...index,
    activeRecipeId: recipeId,
    recentRecipeIds: withRecentIds(index.recentRecipeIds, recipeId),
  };
  writeRecipeIndex(storageKey, next);
  return next;
}

export function removeRecipe(storageKey: string, recipeId: string): PlaygroundRecipeIndex | null {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(getRecipeStorageKey(storageKey, recipeId));
  }
  const index = readRecipeIndex(storageKey);
  if (!index) return null;

  const nextRecipes = index.recipes.filter((item) => item.id !== recipeId);
  const nextActiveRecipeId =
    index.activeRecipeId === recipeId ? nextRecipes[0]?.id ?? null : index.activeRecipeId;
  const nextRecent = index.recentRecipeIds.filter((id) => id !== recipeId);

  const nextIndex: PlaygroundRecipeIndex = {
    version: 1,
    activeRecipeId: nextActiveRecipeId,
    recentRecipeIds: nextRecent,
    recipes: nextRecipes,
  };

  writeRecipeIndex(storageKey, nextIndex);
  return nextIndex;
}

export function createRecipeId(): string {
  return createId("recipe");
}
