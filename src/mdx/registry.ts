// Central registry for MDX components available to posts.
// - Shared components available everywhere
// - Per-post components can be registered in postComponentLoaders

import { EmbeddablePlayground } from "@/mdx/shared/EmbeddablePlayground";
import { InteractiveCounter } from "@/mdx/shared/InteractiveCounter";
import { MonacoCodeBlock } from "@/mdx/shared/MonacoCodeBlock";
import { MotionBadge } from "@/mdx/shared/MotionBadge";
import { Playground } from "@/mdx/shared/Playground";
import type { ComponentType } from "react";
import { cache } from "react";

type MdxComponent = ComponentType<Record<string, unknown>>;
type MdxComponentModule = { default?: unknown } & Record<string, unknown>;
type PostComponentLoader = () => Promise<MdxComponentModule>;

export type MdxComponentMap = Record<string, MdxComponent>;

export const sharedComponents: MdxComponentMap = {
  EmbeddablePlayground,
  InteractiveCounter,
  MonacoCodeBlock,
  MotionBadge,
  Playground,
  pre: MonacoCodeBlock,
};

const postComponentLoaders: Record<string, PostComponentLoader> = {
  // Example:
  // "my-post-slug": () => import("@/mdx/posts/my-post-slug"),
};

function isMdxComponent(value: unknown): value is MdxComponent {
  return typeof value === "function";
}

function normalizeComponentMap(module: MdxComponentModule): MdxComponentMap {
  const candidate = (module.default ?? module) as Record<string, unknown>;
  const components: MdxComponentMap = {};

  Object.entries(candidate).forEach(([name, component]) => {
    if (isMdxComponent(component)) {
      components[name] = component;
    }
  });

  return components;
}

export async function getPostComponents(slug: string): Promise<MdxComponentMap> {
  const loader = postComponentLoaders[slug];
  if (!loader) return {};

  try {
    const mod = await loader();
    return normalizeComponentMap(mod);
  } catch {
    return {};
  }
}

export const buildComponentsForSlug = cache(async (slug: string): Promise<MdxComponentMap> => {
  const perPost = await getPostComponents(slug);
  return {
    ...sharedComponents,
    ...perPost,
  };
});
