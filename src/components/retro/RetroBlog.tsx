"use client";

import { useRetroEffects } from "@/hooks/use-retro-effects";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { BlogPostListItem } from "@/lib/posts";
import styles from "./retro.module.css";
import { CursorGlow, ScanlineOverlay } from "./RetroDecor";
import { RetroFooter } from "./RetroFooter";
import { RetroHeader } from "./RetroHeader";
import { RetroSidebar } from "./RetroSidebar";
import { RetroTimeline } from "./RetroTimeline";
export type BlogListItem = BlogPostListItem;

// Sidebar cards for recent posts/categories removed per design update.

//

export function RetroBlog({ posts }: { posts: BlogListItem[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const mousePosition = useRetroEffects(!prefersReducedMotion);

  return (
    <div className={styles.container}>
      <ScanlineOverlay />
      {!prefersReducedMotion ? <CursorGlow x={mousePosition.x} y={mousePosition.y} /> : null}

      <RetroHeader showAboutCard />

      {/* Main Content */}
      <div className={styles.main}>
        <main>
          <RetroTimeline posts={posts} />
          <RetroSidebar postsCount={posts.length} />
        </main>
      </div>

      <RetroFooter />
    </div>
  );
}

export default RetroBlog;


