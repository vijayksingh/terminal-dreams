import styles from "@/components/retro/retro.module.css";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
// import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { ToC } from "@/components/retro/ToC";
import { PostMetrics } from "@/components/post-metrics/PostMetrics";
import { getAllPostSlugs, getPostBySlug } from "@/lib/mdx";
import { buildComponentsForSlug } from "@/mdx/registry";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const awaitedParams = await params;
  const post = await getPostBySlug(awaitedParams.slug);
  if (!post) return notFound();

  const components = await buildComponentsForSlug(post.slug);

  return (
    <div className={`${styles.container} readingView`}>
      <BreadcrumbBar items={[{ label: "blog", href: "/blog" }, { label: post.frontmatter.title }]} />

      <div className={styles.headerInner} style={{ paddingTop: "2rem" }}>
        <h1 className={styles.title}>{post.frontmatter.title}</h1>
        <div className={styles.meta}>
          <span>{"// "}{post.frontmatter.date}</span>
          {post.frontmatter.category ? (
            <span>{"// "}{post.frontmatter.category}</span>
          ) : null}
          <span>{"// "}{post.readTime}</span>
        </div>
        <PostMetrics slug={`blog/${post.slug}`} />
      </div>

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
                    rehypePlugins: [],
                  },
                }}
              />
            </div>
          </article>
          <div className={styles.tocMobileBottom}>
            <ToC variant="bottom" />
          </div>
        </main>
      </div>
      <RetroFooter />
    </div>
  );
}


