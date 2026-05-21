import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { RichParagraph } from "@/components/ui/RichParagraph";
import { RichText } from "@/components/ui/RichText";
import { richTextOverrides } from "@/components/ui/RichElements";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { CodeAnnotator } from "@/mdx/shared/CodeAnnotator";
import { CodeBlock } from "@/mdx/shared/CodeBlock";
import { BespokeSemanticSeriesPage } from "@/components/recipe-lab/BespokeSemanticSeriesPage";
import { getRecipeMdx } from "@/lib/recipes";
import styles from "@/components/recipe-lab/recipe-lab.module.css";

const PHASE_SLUGS = [
  { slug: "from-bespoke-to-semantic-1", phase: 1, subtitle: "The Debt and the Monolith" },
  { slug: "from-bespoke-to-semantic-2", phase: 2, subtitle: "The Compound Pattern" },
  { slug: "from-bespoke-to-semantic-3", phase: 3, subtitle: "The Semantic Layer" },
  { slug: "from-bespoke-to-semantic-4", phase: 4, subtitle: "The Assembly" },
];

export default async function BespokeSemanticSeriesPage_Route() {
  const recipeComponents = {
    pre: CodeBlock,
    p: RichParagraph,
    RichText,
    CodeAnnotator,
    ...richTextOverrides,
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
          { label: "From Bespoke to Semantic" },
        ]}
      />
      <main className="flex-1 min-h-0">
        <BespokeSemanticSeriesPage>
          {validPhases.map(({ phase, subtitle, content }) => (
            <div key={phase}>
              <div className={styles.phaseDivider} id={`phase-${phase}`}>
                <span className={styles.phaseLabel}>Phase {phase}</span>
                <h2 className={styles.phaseHeading}>{subtitle}</h2>
              </div>
              <MDXRemote
                source={content}
                components={recipeComponents}
                options={{ mdxOptions: { remarkPlugins: [remarkGfm] }, blockJS: false }}
              />
            </div>
          ))}
        </BespokeSemanticSeriesPage>
      </main>
      <RetroFooter />
    </div>
  );
}
