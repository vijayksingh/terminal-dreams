// Central registry for MDX components available to posts.
// - Shared components available everywhere
// - Per-post components can be registered in postComponentLoaders

import { RichParagraph } from "@/components/ui/RichParagraph";
import { RichText } from "@/components/ui/RichText";
import {
  RichStrong,
  RichEmphasis,
  RichMark,
  RichLink,
  RichBlockquote,
  RichDivider,
  RichList,
  RichOrderedList,
  RichListItem,
} from "@/components/ui/RichElements";
import { SmartCode } from "@/components/ui/richtext-endpoint";
import { CodeAnnotator } from "@/mdx/shared/CodeAnnotator";
import { EmbeddablePlayground } from "@/mdx/shared/EmbeddablePlayground";
import { FlowDiagram } from "@/mdx/shared/FlowDiagram";
import { InteractiveCounter } from "@/mdx/shared/InteractiveCounter";
import { CodeBlock } from "@/mdx/shared/CodeBlock";
import { MotionBadge } from "@/mdx/shared/MotionBadge";
import { Playground } from "@/mdx/shared/Playground";
import { PredictionChallenge } from "@/mdx/shared/PredictionChallenge";
import type { ComponentType } from "react";
import { cache } from "react";

type MdxComponent = ComponentType<Record<string, unknown>>;
type MdxComponentModule = { default?: unknown } & Record<string, unknown>;
type PostComponentLoader = () => Promise<MdxComponentModule>;

export type MdxComponentMap = Record<string, MdxComponent>;

export const sharedComponents: MdxComponentMap = {
  CodeAnnotator: CodeAnnotator as unknown as MdxComponent,
  EmbeddablePlayground,
  FlowDiagram: FlowDiagram as unknown as MdxComponent,
  InteractiveCounter,
  CodeBlock,
  MotionBadge,
  Playground,
  PredictionChallenge: PredictionChallenge as unknown as MdxComponent,
  RichText: RichText as unknown as MdxComponent,
  p: RichParagraph as unknown as MdxComponent,
  pre: CodeBlock,
  // Inline `<code>` (backticks) — routes to endpoint/type/code variants.
  // Code blocks pass `className="language-*"` and bail out inside SmartCode.
  code: SmartCode as unknown as MdxComponent,
  strong: RichStrong as unknown as MdxComponent,
  em: RichEmphasis as unknown as MdxComponent,
  mark: RichMark as unknown as MdxComponent,
  a: RichLink as unknown as MdxComponent,
  blockquote: RichBlockquote as unknown as MdxComponent,
  hr: RichDivider as unknown as MdxComponent,
  ul: RichList as unknown as MdxComponent,
  ol: RichOrderedList as unknown as MdxComponent,
  li: RichListItem as unknown as MdxComponent,
};

const postComponentLoaders: Record<string, PostComponentLoader> = {
  "anatomy-of-an-agent-harness": () =>
    import("@/mdx/posts/anatomy-of-an-agent-harness"),
  "frontend-architecture-patterns": () =>
    import("@/mdx/posts/frontend-architecture-patterns"),
  "how-we-built-the-playground": () =>
    import("@/mdx/posts/how-we-built-the-playground"),
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
