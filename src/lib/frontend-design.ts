import fs from "fs";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";
import { cache } from "react";
import type {
  FdArticleContent,
  FdArticleFrontmatter,
  FdArticleListItem,
  FdMetroMapData,
  FdSectionSlug,
  FdStopKind,
} from "./frontend-design-types";
import { SECTIONS, STOPS, computeIntersections } from "./frontend-design-data";

export { SECTIONS, getSectionBySlug, getStopById, getStopsForSection } from "./frontend-design-data";

const ARTICLES_DIR = path.join(process.cwd(), "content", "frontend-design");

const articleCache = new Map<string, FdArticleContent>();

export function getAllFdArticleSlugs(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(md|mdx)$/i, ""));
}

export async function getFdArticleBySlug(slug: string): Promise<FdArticleContent | null> {
  if (process.env.NODE_ENV === "production" && articleCache.has(slug)) {
    return articleCache.get(slug)!;
  }

  if (!fs.existsSync(ARTICLES_DIR)) return null;
  const fullPathMdx = path.join(ARTICLES_DIR, `${slug}.mdx`);
  const fullPathMd = path.join(ARTICLES_DIR, `${slug}.md`);
  const fullPath = fs.existsSync(fullPathMdx) ? fullPathMdx : fullPathMd;
  if (!fs.existsSync(fullPath)) return null;

  const raw = await readFile(fullPath, "utf8");
  const { data, content } = matter(raw);
  const fm = normalizeFrontmatter(data, slug);
  const article: FdArticleContent = {
    slug,
    frontmatter: fm,
    content,
    readTime: formatReadTime(readingTime(content).text),
  };

  articleCache.set(slug, article);
  return article;
}

export const getAllFdArticles = cache(async (): Promise<FdArticleListItem[]> => {
  const slugs = getAllFdArticleSlugs();
  const all = await Promise.all(slugs.map((s) => getFdArticleBySlug(s)));
  return all
    .filter((a): a is FdArticleContent => a !== null)
    .map((a) => ({
      slug: a.slug,
      title: a.frontmatter.title,
      summary: a.frontmatter.summary,
      section: a.frontmatter.section,
      stopId: a.frontmatter.stopId,
      order: a.frontmatter.order,
      kind: a.frontmatter.kind,
      tags: a.frontmatter.tags,
      intersections: a.frontmatter.intersections,
    }));
});

export async function getFdArticlesBySection(sectionSlug: FdSectionSlug): Promise<FdArticleListItem[]> {
  const all = await getAllFdArticles();
  return all.filter((a) => a.section === sectionSlug).sort((a, b) => a.order - b.order);
}

export const getCommandPaletteFdArticles = cache(async () => {
  const all = await getAllFdArticles();
  return all.map((a) => ({
    slug: a.slug,
    title: a.title,
    category: a.section,
  }));
});

export const getMetroMapData = cache(async (): Promise<FdMetroMapData> => {
  return {
    sections: SECTIONS,
    stops: STOPS,
    intersections: computeIntersections(),
  };
});

// ── Normalization helpers ──────────────────────────────────────────

const VALID_SECTIONS: FdSectionSlug[] = SECTIONS.map((s) => s.slug);

const VALID_KINDS: FdStopKind[] = [
  "article",
  "coding-assignment",
  "live-coding",
  "overview",
  "system-design-problem",
];

function normalizeFrontmatter(data: unknown, slug: string): FdArticleFrontmatter {
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  return {
    title: typeof d.title === "string" ? d.title.trim() : "Untitled",
    slug: typeof d.slug === "string" ? d.slug.trim() : slug,
    section: normalizeSection(d.section),
    stopId: typeof d.stopId === "string" ? d.stopId.trim() : "",
    order: typeof d.order === "number" ? d.order : 0,
    kind: normalizeKind(d.kind),
    summary: typeof d.summary === "string" ? d.summary.trim() : "",
    tags: normalizeStringArray(d.tags),
    intersections: normalizeStringArray(d.intersections),
    prerequisites: normalizeStringArray(d.prerequisites),
  };
}

function normalizeSection(value: unknown): FdSectionSlug {
  if (typeof value === "string" && VALID_SECTIONS.includes(value as FdSectionSlug)) {
    return value as FdSectionSlug;
  }
  return "core-fundamentals";
}

function normalizeKind(value: unknown): FdStopKind {
  if (typeof value === "string" && VALID_KINDS.includes(value as FdStopKind)) {
    return value as FdStopKind;
  }
  return "article";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function formatReadTime(text: string): string {
  const m = text.match(/(\d+)\s+min/);
  if (m) return `${m[1]} min read`;
  return text;
}
