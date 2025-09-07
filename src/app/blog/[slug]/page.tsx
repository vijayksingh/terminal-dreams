import styles from "@/components/retro/retro.module.css";
import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { RetroSidebar } from "@/components/retro/RetroSidebar";
import { getAllPostSlugs, getPostBySlug } from "@/lib/mdx";
import { buildComponentsForSlug } from "@/mdx/registry";
import { MDXRemote } from "next-mdx-remote/rsc";
// import Link from "next/link";
import { RetroBackLink } from "@/components/retro/RetroBackLink";
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
    <div className={styles.container}>
      <ScanlineOverlay />
      {/* Cursor glow is a client effect; keep static page clean */}
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

      <div className={styles.main}>
        <main>
          <article className={styles.article}>
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
        <RetroSidebar />
      </div>

      <RetroFooter />
    </div>
  );
}


