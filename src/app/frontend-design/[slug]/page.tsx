import styles from "@/components/retro/retro.module.css";
import fdStyles from "@/components/frontend-design/frontend-design.module.css";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { ToC } from "@/components/retro/ToC";
import {
  getAllFdArticleSlugs,
  getFdArticleBySlug,
  getSectionBySlug,
} from "@/lib/frontend-design";
import { FdArticleNav } from "@/components/frontend-design/FdArticleNav";
import { SystemDesignLabPage } from "@/components/frontend-design/SystemDesignLabPage";
import { buildComponentsForFdSlug } from "@/mdx/frontend-design-registry";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export async function generateStaticParams() {
  return getAllFdArticleSlugs().map((slug) => ({ slug }));
}

export default async function FdArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getFdArticleBySlug(slug);
  if (!article) return notFound();

  const components = await buildComponentsForFdSlug(slug);
  const section = getSectionBySlug(article.frontmatter.section);

  const isSystemDesign = article.frontmatter.kind === "system-design-problem";

  const mdxContent = (
    <MDXRemote
      source={article.content}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [],
        },
      }}
    />
  );

  /* ── System design problem: two-column lab layout ────────────── */
  if (isSystemDesign) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
        <BreadcrumbBar
          items={[
            { label: "frontend-design", href: "/frontend-design" },
            { label: section?.shortName ?? article.frontmatter.section, href: `/frontend-design/section/${article.frontmatter.section}` },
            { label: article.frontmatter.title },
          ]}
        />
        <main className="flex-1 min-h-0">
          <SystemDesignLabPage demo={slug}>
            {mdxContent}
          </SystemDesignLabPage>
        </main>
        <RetroFooter />
      </div>
    );
  }

  /* ── Default: single-column article with ToC sidebar ─────────── */
  return (
    <div className={`${styles.container} readingView`}>
      <BreadcrumbBar
        items={[
          { label: "frontend-design", href: "/frontend-design" },
          { label: section?.shortName ?? article.frontmatter.section, href: `/frontend-design/section/${article.frontmatter.section}` },
          { label: article.frontmatter.title },
        ]}
      />

      <div className={styles.headerInner} style={{ paddingTop: "2rem" }}>
        <h1 className={fdStyles.articleTitle}>
          {article.frontmatter.title}
        </h1>
        <div className={fdStyles.metaBar}>
          {section && (
            <Link
              href={`/frontend-design/section/${section.slug}`}
              className={fdStyles.sectionChip}
              style={{
                borderColor: `var(${section.colorToken})`,
                color: `var(${section.colorToken})`,
              }}
            >
              <span
                className={fdStyles.chipDot}
                style={{ backgroundColor: `var(${section.colorToken})` }}
              />
              {section.shortName}
            </Link>
          )}
          <span>{"// "}{article.readTime}</span>
          <span>{"// "}stop {article.frontmatter.order}</span>
        </div>
        <p className={fdStyles.articleSummary}>{article.frontmatter.summary}</p>
      </div>

      <div className={styles.postLayout}>
        <aside className={styles.tocAsideStickyBottom}>
          <ToC variant="side" />
        </aside>
        <main className={styles.postContent}>
          <article>
            <div className={`${styles.content} ${fdStyles.editorialContent}`}>
              {mdxContent}
            </div>
          </article>
          <div className={styles.tocMobileBottom}>
            <ToC variant="bottom" />
          </div>
          <FdArticleNav
            sectionSlug={article.frontmatter.section}
            currentStopId={article.frontmatter.stopId}
          />
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}
