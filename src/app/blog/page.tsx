import RetroBlog from "@/components/retro/RetroBlog";
import { getBlogListItems } from "@/lib/posts";
import { getRecipeListItems } from "@/lib/recipes";

export default async function BlogIndexPage() {
  const posts = await getBlogListItems();
  const recipes = await getRecipeListItems();
  const all = [...posts, ...recipes].sort((a, b) => b.date.localeCompare(a.date));
  return <RetroBlog posts={all} />;
}
