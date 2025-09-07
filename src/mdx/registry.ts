/* eslint-disable @typescript-eslint/no-explicit-any */
// Central registry for MDX components available to posts.
// - Shared components available everywhere
// - Per-post components can be added under src/mdx/posts/<slug>/index.ts

import { InteractiveCounter } from "@/mdx/shared/InteractiveCounter";
import { MotionBadge } from "@/mdx/shared/MotionBadge";
import type { ComponentType } from "react";

export type MdxComponentMap = Record<string, ComponentType<any>>;

export const sharedComponents: MdxComponentMap = {
  InteractiveCounter,
  MotionBadge,
};

export async function getPostComponents(slug: string): Promise<MdxComponentMap> {
  // Convention: add a file at src/mdx/posts/<slug>/index.ts exporting components
  // This dynamic import is optional; missing files are ignored gracefully.
  try {
    const mod = await import(`@/mdx/posts/${slug}/index`);
    return (mod?.default ?? mod) as MdxComponentMap;
  } catch {
    return {} as MdxComponentMap;
  }
}

export async function buildComponentsForSlug(slug: string): Promise<MdxComponentMap> {
  const perPost = await getPostComponents(slug);
  return {
    ...sharedComponents,
    ...perPost,
  } as MdxComponentMap;
}


