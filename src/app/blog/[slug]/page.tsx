import styles from "@/components/retro/retro.module.css";
import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { RetroSidebar } from "@/components/retro/RetroSidebar";
import { getAllPostSlugs, getPostBySlug } from "@/lib/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { InteractiveCounter } from "./components";

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  const components = { InteractiveCounter } as const;

  return (
    <div className={styles.container}>
      <ScanlineOverlay />
      {/* Cursor glow is a client effect; keep static page clean */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={`${styles.navLink}`}>
            ← Back
          </Link>
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
                        // @ts-expect-error - typing from plugin is loose
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
        <RetroSidebar
          recentPosts={[post.frontmatter.title]}
          categories={[post.frontmatter.category ?? "General"]}
        />
      </div>

      <RetroFooter />
    </div>
  );
}


