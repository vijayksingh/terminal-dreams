import type { PlaygroundWorkspace } from "@/components/playground/types";

export type RecipeStep = {
  id: string;
  heading: string;
  text: string;
  workspace: PlaygroundWorkspace;
  focusFile?: string;
};

export type RecipeArticle = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  steps: RecipeStep[];
};
