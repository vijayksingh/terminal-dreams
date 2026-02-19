import { getAllPosts } from "@/lib/mdx";
import { cache } from "react";

export type BlogPostListItem = {
  slug: string;
  title: string;
  date: string;
  category?: string;
  readTime: string;
  summary?: string;
  kind: "post";
};

export type CommandPalettePostItem = {
  slug: string;
  title: string;
  category?: string;
};

const getAllPostsCached = cache(async () => await getAllPosts());

export const getBlogListItems = cache(async (): Promise<BlogPostListItem[]> => {
  const posts = await getAllPostsCached();
  return posts.map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    date: post.frontmatter.date,
    category: post.frontmatter.category,
    readTime: post.readTime,
    summary: post.frontmatter.summary,
    kind: "post" as const,
  }));
});

export const getCommandPalettePosts = cache(async (): Promise<CommandPalettePostItem[]> => {
  const posts = await getAllPostsCached();
  return posts.map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    category: post.frontmatter.category,
  }));
});
