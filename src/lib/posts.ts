import { getAllPosts } from "@/lib/mdx";
import { cache } from "react";

export type BlogPostListItem = {
  slug: string;
  title: string;
  date: string;
  category?: string;
  readTime: string;
  summary?: string;
};

export type CommandPalettePostItem = {
  slug: string;
  title: string;
  category?: string;
};

const getAllPostsCached = cache(() => getAllPosts());

export const getBlogListItems = cache((): BlogPostListItem[] => {
  return getAllPostsCached().map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    date: post.frontmatter.date,
    category: post.frontmatter.category,
    readTime: post.readTime,
    summary: post.frontmatter.summary,
  }));
});

export const getCommandPalettePosts = cache((): CommandPalettePostItem[] => {
  return getAllPostsCached().map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    category: post.frontmatter.category,
  }));
});
