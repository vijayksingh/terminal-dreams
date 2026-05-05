import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { RichParagraph } from "@/components/ui/RichParagraph";
import { RichText } from "@/components/ui/RichText";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { RecipeScroller } from "@/components/recipe-scroller/RecipeScroller";
import { RecipeLabPage } from "@/components/recipe-lab/RecipeLabPage";
import { CodeAnnotator } from "@/mdx/shared/CodeAnnotator";
import { MonacoCodeBlock } from "@/mdx/shared/MonacoCodeBlock";
import { getAllRecipeSlugs, getRecipeBySlug, getRecipeMdx } from "@/lib/recipes";
import { sharedComponents } from "@/mdx/registry";

export async function generateStaticParams() {
  return getAllRecipeSlugs().map((slug) => ({ slug }));
}

export default async function RecipeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try MDX format first (new interactive lab)
  const mdxData = await getRecipeMdx(slug);
  if (mdxData) {
    // Recipe MDX uses lightweight components — no Monaco, no Playground
    const recipeComponents = {
      pre: MonacoCodeBlock,
      p: RichParagraph,
      RichText,
      CodeAnnotator,
    };

    const mdxContent = (
      <MDXRemote
        source={mdxData.content}
        components={recipeComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    );

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
        <BreadcrumbBar
          items={[
            { label: "recipes", href: "/recipes" },
            { label: mdxData.frontmatter.title },
          ]}
        />
        <main className="flex-1 min-h-0">
          <RecipeLabPage demo={mdxData.frontmatter.demo}>
            {mdxContent}
          </RecipeLabPage>
        </main>
        <RetroFooter />
      </div>
    );
  }

  // Fallback to legacy TS format
  const article = await getRecipeBySlug(slug);
  if (!article) return notFound();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <BreadcrumbBar
        items={[
          { label: "recipes", href: "/recipes" },
          { label: article.title },
        ]}
      />
      <main className="flex-1 min-h-0">
        <RecipeScroller steps={article.steps} />
      </main>
      <RetroFooter />
    </div>
  );
}
