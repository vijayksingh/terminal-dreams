import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/retro/Breadcrumb";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { RecipeScroller } from "@/components/recipe-scroller/RecipeScroller";
import { getAllRecipeSlugs, getRecipeBySlug } from "@/lib/recipes";

export async function generateStaticParams() {
  return getAllRecipeSlugs().map((slug) => ({ slug }));
}

export default async function RecipeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getRecipeBySlug(slug);
  if (!article) return notFound();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap max-w-[1400px] mx-auto w-full">
          <Breadcrumb items={[{ label: "recipes", href: "/recipes" }]} />
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-semibold leading-tight mb-1"
              style={{ color: "var(--color-text)" }}
            >
              {article.title}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {article.summary}
            </p>
          </div>
          <div
            className="text-xs font-mono shrink-0"
            style={{ color: "var(--color-muted)" }}
          >
            <span>{article.date}</span>
            {article.tags.length > 0 && (
              <span className="ml-2">{"// "}{article.tags.join(", ")}</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <RecipeScroller steps={article.steps} />
      </main>

      <RetroFooter />
    </div>
  );
}
