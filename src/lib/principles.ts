import fs from "fs";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";
import { cache } from "react";
import type {
  DeepDiveRef,
  GraphData,
  PrincipleCategory,
  PrincipleContent,
  PrincipleFrontmatter,
  PrincipleListItem,
} from "./principle-types";
import { CATEGORIES } from "./principle-data";

export { CATEGORIES, getCategoryBySlug, LEARNING_PATHS, getLearningPathBySlug } from "./principle-data";

const PRINCIPLES_DIR = path.join(process.cwd(), "content", "principles");

// ── Content loading ────────────────────────────────────────────────

const principleCache = new Map<string, PrincipleContent>();

export function getAllPrincipleSlugs(): string[] {
  if (!fs.existsSync(PRINCIPLES_DIR)) return [];
  return fs
    .readdirSync(PRINCIPLES_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(md|mdx)$/i, ""));
}

export async function getPrincipleBySlug(slug: string): Promise<PrincipleContent | null> {
  if (process.env.NODE_ENV === "production" && principleCache.has(slug)) {
    return principleCache.get(slug)!;
  }

  if (!fs.existsSync(PRINCIPLES_DIR)) return null;
  const fullPathMdx = path.join(PRINCIPLES_DIR, `${slug}.mdx`);
  const fullPathMd = path.join(PRINCIPLES_DIR, `${slug}.md`);
  const fullPath = fs.existsSync(fullPathMdx) ? fullPathMdx : fullPathMd;
  if (!fs.existsSync(fullPath)) return null;

  const raw = await readFile(fullPath, "utf8");
  const { data, content } = matter(raw);
  const fm = normalizeFrontmatter(data, slug);
  const principle: PrincipleContent = {
    slug,
    frontmatter: fm,
    content,
    readTime: formatReadTime(readingTime(content).text),
  };

  principleCache.set(slug, principle);
  return principle;
}

export const getAllPrinciples = cache(async (): Promise<PrincipleListItem[]> => {
  const slugs = getAllPrincipleSlugs();
  const all = await Promise.all(slugs.map((s) => getPrincipleBySlug(s)));
  return all
    .filter((p): p is PrincipleContent => p !== null)
    .map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      summary: p.frontmatter.summary,
      categories: p.frontmatter.categories,
      tags: p.frontmatter.tags,
      relatedPrinciples: p.frontmatter.relatedPrinciples,
    }));
});

export async function getPrinciplesByCategory(cat: PrincipleCategory): Promise<PrincipleListItem[]> {
  const all = await getAllPrinciples();
  return all.filter((p) => p.categories.includes(cat));
}

// ── Command palette integration ────────────────────────────────────

export const getCommandPalettePrinciples = cache(async () => {
  const all = await getAllPrinciples();
  return all.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.categories[0] ?? "",
  }));
});

// ── Knowledge graph data ───────────────────────────────────────────

export const getKnowledgeGraphData = cache(async (): Promise<GraphData> => {
  const principles = await getAllPrinciples();

  const edgeSet = new Set<string>();
  const edges: GraphData["edges"] = [];
  for (const p of principles) {
    for (const related of p.relatedPrinciples) {
      const key = [p.slug, related].sort().join("--");
      if (!edgeSet.has(key) && principles.some((n) => n.slug === related)) {
        edgeSet.add(key);
        edges.push({ source: p.slug, target: related });
      }
    }
  }

  const nodes = principles.map((p, i) => ({
    ...p,
    x: 400 + 150 * Math.cos((2 * Math.PI * i) / principles.length),
    y: 250 + 150 * Math.sin((2 * Math.PI * i) / principles.length),
  }));

  return { nodes, edges, categories: CATEGORIES };
});

// ── Normalization helpers ──────────────────────────────────────────

function normalizeFrontmatter(data: unknown, slug: string): PrincipleFrontmatter {
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  return {
    title: typeof d.title === "string" ? d.title.trim() : "Untitled",
    slug: typeof d.slug === "string" ? d.slug.trim() : slug,
    summary: typeof d.summary === "string" ? d.summary.trim() : "",
    categories: normalizeCategories(d.categories),
    tags: normalizeStringArray(d.tags),
    relatedPrinciples: normalizeStringArray(d.relatedPrinciples),
    learningPaths: normalizeStringArray(d.learningPaths),
    deepDiveRefs: normalizeDeepDiveRefs(d.deepDiveRefs),
  };
}

function normalizeCategories(value: unknown): PrincipleCategory[] {
  if (!Array.isArray(value)) return [];
  const valid: PrincipleCategory[] = CATEGORIES.map((c) => c.slug);
  return value.filter((v): v is PrincipleCategory => valid.includes(v as PrincipleCategory));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function normalizeDeepDiveRefs(value: unknown): DeepDiveRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      series: typeof v.series === "string" ? v.series : "",
      part: typeof v.part === "number" ? v.part : 0,
      label: typeof v.label === "string" ? v.label : "",
    }))
    .filter((v) => v.series.length > 0);
}

function formatReadTime(text: string): string {
  const m = text.match(/(\d+)\s+min/);
  if (m) return `${m[1]} min read`;
  return text;
}
