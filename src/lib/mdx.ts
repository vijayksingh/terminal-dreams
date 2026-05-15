import fs from "fs";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";

export type PostFrontmatter = {
  title: string;
  date: string;
  category?: string;
  tags?: string[];
  summary?: string;
};

export type PostListItem = {
  slug: string;
  frontmatter: PostFrontmatter;
  readTime: string;
};

export type PostContent = PostListItem & {
  content: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
let cachedPosts: PostListItem[] | null = null;
const postCache = new Map<string, PostContent>();

type FrontmatterInput = {
  title?: unknown;
  date?: unknown;
  category?: unknown;
  tags?: unknown;
  summary?: unknown;
};

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(md|mdx)$/i, ""));
}

export async function getAllPosts(): Promise<PostListItem[]> {
  if (process.env.NODE_ENV === "production" && cachedPosts) {
    return cachedPosts;
  }

  const slugs = getAllPostSlugs();
  const postPromises = slugs.map((slug) => getPostBySlug(slug));
  const postsWithNull = await Promise.all(postPromises);
  const posts = postsWithNull
    .filter((p): p is PostContent => Boolean(p))
    .map(({ slug, frontmatter, content }) => ({
      slug,
      frontmatter,
      readTime: formatReadTime(readingTime(content).text),
    }))
    .sort((a, b) => {
      const ad = new Date(a.frontmatter.date).getTime();
      const bd = new Date(b.frontmatter.date).getTime();
      return bd - ad;
    });

  if (process.env.NODE_ENV === "production") {
    cachedPosts = posts;
  }

  return posts;
}

export async function getPostBySlug(slug: string): Promise<PostContent | null> {
  if (process.env.NODE_ENV === "production" && postCache.has(slug)) {
    return postCache.get(slug)!;
  }

  if (!fs.existsSync(BLOG_DIR)) return null;
  const fullPathMdx = path.join(BLOG_DIR, `${slug}.mdx`);
  const fullPathMd = path.join(BLOG_DIR, `${slug}.md`);
  const fullPath = fs.existsSync(fullPathMdx) ? fullPathMdx : fullPathMd;
  if (!fs.existsSync(fullPath)) return null;

  const raw = await readFile(fullPath, "utf8");
  const { data, content } = matter(raw);
  const fm = normalizeFrontmatter(data);
  const post = {
    slug,
    frontmatter: fm,
    content,
    readTime: formatReadTime(readingTime(content).text),
  };

  postCache.set(slug, post);
  return post;
}

function normalizeFrontmatter(data: unknown): PostFrontmatter {
  const fmInput = (typeof data === "object" && data !== null ? data : {}) as FrontmatterInput;
  const fm: PostFrontmatter = {
    title: normalizeRequiredTitle(fmInput.title),
    date: normalizeDate(fmInput.date),
    category: normalizeOptionalString(fmInput.category),
    tags: normalizeTags(fmInput.tags),
    summary: normalizeOptionalString(fmInput.summary),
  };
  return fm;
}

function normalizeRequiredTitle(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "Untitled";
}

function normalizeDate(value: unknown): string {
  const fallback = new Date().toISOString().slice(0, 10);
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

function formatReadTime(text: string): string {
  // reading-time already returns like "3 min read" sometimes, normalize
  const m = text.match(/(\d+)\s+min/);
  if (m) return `${m[1]} min read`;
  return text;
}


