import RetroBlog from "@/components/retro/RetroBlog";
import { getAllPosts } from "@/lib/mdx";

export default function BlogIndexPage() {
  const posts = getAllPosts().map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    date: p.frontmatter.date,
    category: p.frontmatter.category,
    readTime: p.readTime,
    summary: p.frontmatter.summary,
  }));
  return <RetroBlog posts={posts} />;
}


