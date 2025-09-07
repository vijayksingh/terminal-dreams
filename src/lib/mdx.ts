import fs from "fs";
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

export function getAllPostSlugs(): string[] {
  ensureContentDir();
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(md|mdx)$/i, ""));
}

export function getAllPosts(): PostListItem[] {
  ensureContentDir();
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
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
  return posts;
}

export function getPostBySlug(slug: string): PostContent | null {
  ensureContentDir();
  const fullPathMdx = path.join(BLOG_DIR, `${slug}.mdx`);
  const fullPathMd = path.join(BLOG_DIR, `${slug}.md`);
  const fullPath = fs.existsSync(fullPathMdx) ? fullPathMdx : fullPathMd;
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const fm = normalizeFrontmatter(data);
  return {
    slug,
    frontmatter: fm,
    content,
    readTime: formatReadTime(readingTime(content).text),
  };
}

function normalizeFrontmatter(data: any): PostFrontmatter {
  const fm: PostFrontmatter = {
    title: data.title ?? "Untitled",
    date: data.date ?? new Date().toISOString().slice(0, 10),
    category: data.category ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    summary: data.summary ?? undefined,
  };
  return fm;
}

function ensureContentDir() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }
}

function formatReadTime(text: string): string {
  // reading-time already returns like "3 min read" sometimes, normalize
  const m = text.match(/(\d+)\s+min/);
  if (m) return `${m[1]} min read`;
  return text;
}


