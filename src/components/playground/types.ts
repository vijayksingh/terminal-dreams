export type PlaygroundFileLanguage = "typescript" | "javascript" | "css" | "json";

export type PlaygroundPresetId = "react-ts" | "react-js";

export type PlaygroundDependencyMap = Record<string, string>;

export type PlaygroundFile = {
  id: string;
  path: string;
  language: PlaygroundFileLanguage;
  content: string;
};

export type PlaygroundWorkspace = {
  version: 1;
  preset: PlaygroundPresetId;
  entry: string;
  activeFileId: string;
  folders: string[];
  files: PlaygroundFile[];
  dependencies: PlaygroundDependencyMap;
};

export type PlaygroundRunStatus = "idle" | "building" | "running" | "error";

export type PlaygroundSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  note?: string;
  workspace: PlaygroundWorkspace;
};

export type PlaygroundRecipeMetadata = {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  snapshotsCount: number;
};

export type PlaygroundRecipe = PlaygroundRecipeMetadata & {
  notes: string;
  workspace: PlaygroundWorkspace;
  snapshots: PlaygroundSnapshot[];
};
