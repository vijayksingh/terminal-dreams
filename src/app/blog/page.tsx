import RetroBlog from "@/components/retro/RetroBlog";
import { getBlogListItems } from "@/lib/posts";

export default function BlogIndexPage() {
  const posts = getBlogListItems();
  return <RetroBlog posts={posts} />;
}
