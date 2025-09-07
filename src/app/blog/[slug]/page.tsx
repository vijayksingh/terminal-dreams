import styles from "@/components/retro/retro.module.css";
import { RetroBackLink } from "@/components/retro/RetroBackLink";
// import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { ToC } from "@/components/retro/ToC";
import { getAllPostSlugs, getPostBySlug } from "@/lib/mdx";
import { buildComponentsForSlug } from "@/mdx/registry";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const awaitedParams = await params;
  const post = getPostBySlug(awaitedParams.slug);
  if (!post) return notFound();

  const components = await buildComponentsForSlug(post.slug);

  return (
    <div className={`${styles.container} readingView`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <RetroBackLink href="/blog" label="Back" />
          <h1 className={`${styles.title}`}>{post.frontmatter.title}</h1>
          <div className={styles.meta}>
            <span>{"// "}{post.frontmatter.date}</span>
            {post.frontmatter.category ? (
              <span>{"// "}{post.frontmatter.category}</span>
            ) : null}
            <span>{"// "}{post.readTime}</span>
          </div>
        </div>
      </header>

      <div className={styles.postLayout}>
        <aside className={styles.tocAsideStickyBottom}>
          <ToC variant="side" />
        </aside>
        <main className={styles.postContent}>
          <article>
            <div className={styles.content}>
              <MDXRemote
                source={post.content}
                components={components}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [
                      [
                        rehypePrettyCode,
                        {
                          theme: {
                            dark: "github-dark",
                            light: "github-light",
                          },
                        },
                      ],
                    ],
                  },
                }}
              />
            </div>
          </article>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


