import fs from "fs";
import path from "path";

import type { RecipeArticle } from "./recipe-types";
import type { TimelinePost } from "./timeline";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export function getAllRecipeSlugs(): string[] {
  if (!fs.existsSync(RECIPES_DIR)) return [];
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""));
}

// Registry maps slugs to their module loaders.
// Add a new entry here when creating a new recipe file in content/recipes/.
const recipeLoaders: Record<string, () => Promise<{ article: RecipeArticle }>> = {
  "live-search": () => import("../../content/recipes/live-search"),
};

export async function getRecipeBySlug(slug: string): Promise<RecipeArticle | null> {
  const loader = recipeLoaders[slug];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.article ?? null;
  } catch {
    return null;
  }
}

export async function getRecipeListItems(): Promise<TimelinePost[]> {
  const slugs = getAllRecipeSlugs();
  const articles = await Promise.all(slugs.map((slug) => getRecipeBySlug(slug)));
  return articles
    .filter((article): article is RecipeArticle => article !== null)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      date: article.date,
      readTime: `${article.steps.length} steps`,
      kind: "recipe" as const,
    }));
}
