import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { RichParagraph } from "@/components/ui/RichParagraph";
import { RichText } from "@/components/ui/RichText";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { CodeAnnotator } from "@/mdx/shared/CodeAnnotator";
import { MonacoCodeBlock } from "@/mdx/shared/MonacoCodeBlock";
import { SeriesLabPage } from "@/components/recipe-lab/SeriesLabPage";
import { getRecipeMdx } from "@/lib/recipes";
import styles from "@/components/recipe-lab/recipe-lab.module.css";

const PHASE_SLUGS = [
  { slug: "code-primitive-1-highlight-bar", phase: 1, subtitle: "The Highlight Bar" },
  { slug: "code-primitive-2-clickable-lines", phase: 2, subtitle: "Making Code Clickable" },
  { slug: "code-primitive-3-wrappers", phase: 3, subtitle: "Wrapping the Primitive" },
  { slug: "code-primitive-4-inline-bridge", phase: 4, subtitle: "Breaking Free" },
];

export default async function CodePrimitiveSeriesPage() {
  const recipeComponents = {
    pre: MonacoCodeBlock,
    p: RichParagraph,
    RichText,
    CodeAnnotator,
  };

  const phaseData = await Promise.all(
    PHASE_SLUGS.map(async ({ slug, phase, subtitle }) => {
      const mdx = await getRecipeMdx(slug);
      if (!mdx) return null;
      const content = mdx.content.replace(
        /id="step-(\d+)"/g,
        `id="p${phase}-step-$1"`,
      );
      return { phase, subtitle, content };
    }),
  );

  const validPhases = phaseData.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );
  if (validPhases.length === 0) return notFound();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <BreadcrumbBar
        items={[
          { label: "recipes", href: "/recipes" },
          { label: "Anatomy of a Code Primitive" },
        ]}
      />
      <main className="flex-1 min-h-0">
        <SeriesLabPage>
          {validPhases.map(({ phase, subtitle, content }) => (
            <div key={phase}>
              <div className={styles.phaseDivider} id={`phase-${phase}`}>
                <span className={styles.phaseLabel}>Phase {phase}</span>
                <h2 className={styles.phaseHeading}>{subtitle}</h2>
              </div>
              <MDXRemote
                source={content}
                components={recipeComponents}
                options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
              />
            </div>
          ))}
        </SeriesLabPage>
      </main>
      <RetroFooter />
    </div>
  );
}
