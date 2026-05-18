import styles from "@/components/retro/retro.module.css";
import pStyles from "@/components/principles/principles.module.css";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { ToC } from "@/components/retro/ToC";
import { CategoryChip } from "@/components/principles/CategoryChip";
import { RelatedPrincipleCards } from "@/components/principles/RelatedPrincipleCards";
import {
  getAllPrincipleSlugs,
  getAllPrinciples,
  getPrincipleBySlug,
} from "@/lib/principles";
import { buildComponentsForPrincipleSlug } from "@/mdx/principle-registry";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
  return getAllPrincipleSlugs().map((slug) => ({ slug }));
}

export default async function PrinciplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const principle = await getPrincipleBySlug(slug);
  if (!principle) return notFound();

  const [components, allPrinciples] = await Promise.all([
    buildComponentsForPrincipleSlug(slug),
    getAllPrinciples(),
  ]);

  const relatedPrinciples = principle.frontmatter.relatedPrinciples
    .map((rs) => allPrinciples.find((p) => p.slug === rs))
    .filter((p) => p !== undefined);

  return (
    <div className={`${styles.container} readingView`}>
      <BreadcrumbBar
        items={[
          { label: "principles", href: "/principles" },
          { label: principle.frontmatter.title },
        ]}
      />

      <div className={styles.headerInner} style={{ paddingTop: "2rem" }}>
        <h1 className={pStyles.principleTitle}>
          {principle.frontmatter.title}
        </h1>
        <div className={pStyles.metaBar}>
          {principle.frontmatter.categories.map((cat) => (
            <CategoryChip key={cat} category={cat} />
          ))}
          <span>{"// "}{principle.readTime}</span>
        </div>
        <p className={pStyles.summary}>{principle.frontmatter.summary}</p>
      </div>

      <div className={styles.postLayout}>
        <aside className={styles.tocAsideStickyBottom}>
          <ToC variant="side" />
        </aside>
        <main className={styles.postContent}>
          <article>
            <div className={`${styles.content} ${pStyles.editorialContent}`}>
              <MDXRemote
                source={principle.content}
                components={components}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [],
                  },
                }}
              />
            </div>
          </article>
          <div className={styles.tocMobileBottom}>
            <ToC variant="bottom" />
          </div>
          <RelatedPrincipleCards principles={relatedPrinciples} />
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}
