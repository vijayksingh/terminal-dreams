import { getAllRecipeSlugs, getRecipeBySlug } from "@/lib/cookbook";
import { CookbookPlayground } from "@/components/cookbook/CookbookPlayground";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllRecipeSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: "Recipe Not Found",
    };
  }

  return {
    title: `${recipe.title} | Kitchen Recipe Playground`,
    description: recipe.description,
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  return <CookbookPlayground recipe={recipe} />;
}
