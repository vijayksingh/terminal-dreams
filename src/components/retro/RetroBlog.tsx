"use client";

import { useRetroEffects } from "@/hooks/use-retro-effects";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { TimelinePost } from "@/lib/timeline";
import styles from "./retro.module.css";
import { CursorGlow, ScanlineOverlay } from "./RetroDecor";
import { RetroFooter } from "./RetroFooter";
import { RetroHeader } from "./RetroHeader";
import { RetroSidebar } from "./RetroSidebar";
import { RetroTimeline } from "./RetroTimeline";

export function RetroBlog({ posts }: { posts: TimelinePost[] }) {
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


