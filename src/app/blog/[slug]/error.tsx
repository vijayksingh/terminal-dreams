"use client";

import Link from "next/link";
import styles from "@/components/retro/retro.module.css";
import { useEffect } from "react";

type BlogPostErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BlogPostError({ error, reset }: BlogPostErrorProps) {
  useEffect(() => {
    console.error("Failed to render blog post:", error);
  }, [error]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Render Error</h1>
          <p className={styles.subtitle}>{"// Could not render this post content"}</p>
        </div>
      </header>
      <div className={styles.main}>
        <main>
          <article className={styles.widget}>
            <p className={styles.content}>
              Something went wrong while rendering this post. You can retry or return to the
              archive.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => reset()}
                className={styles.navLink}
                style={{ borderRadius: "var(--radius-1)" }}
              >
                Retry
              </button>
              <Link href="/blog" className={styles.navLink}>
                Back to Archive
              </Link>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
