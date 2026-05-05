import fs from "fs";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import path from "path";

import type { RecipeArticle } from "./recipe-types";
import type { TimelinePost } from "./timeline";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export function getAllRecipeSlugs(): string[] {
  if (!fs.existsSync(RECIPES_DIR)) return [];
  const tsFiles = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""));
  const mdxFiles = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
  // Deduplicate — MDX takes precedence
  return [...new Set([...mdxFiles, ...tsFiles])];
}

// ── MDX recipe support ──────────────────────────────────────────────

export type RecipeMdxFrontmatter = {
  title: string;
  summary: string;
  date: string;
  tags: string[];
  format: "lab";
  demo: string;
  series?: string;
  part?: number;
};

export type RecipeMdxData = {
  frontmatter: RecipeMdxFrontmatter;
  content: string;
};

export async function getRecipeMdx(slug: string): Promise<RecipeMdxData | null> {
  const mdxPath = path.join(RECIPES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(mdxPath)) return null;
  const raw = await readFile(mdxPath, "utf8");
  const { data, content } = matter(raw);
  const date = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : String(data.date);
  return {
    frontmatter: { ...data, date } as RecipeMdxFrontmatter,
    content,
  };
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
  const items: TimelinePost[] = [];

  for (const slug of slugs) {
    // Try MDX first
    const mdx = await getRecipeMdx(slug);
    if (mdx) {
      items.push({
        slug,
        title: mdx.frontmatter.title,
        date: mdx.frontmatter.date,
        readTime: "interactive",
        kind: "recipe" as const,
        series: mdx.frontmatter.series,
        part: mdx.frontmatter.part,
      });
      continue;
    }

    // Fallback to TS
    const article = await getRecipeBySlug(slug);
    if (article) {
      items.push({
        slug: article.slug,
        title: article.title,
        date: article.date,
        readTime: `${article.steps.length} steps`,
        kind: "recipe" as const,
      });
    }
  }

  return items;
}
