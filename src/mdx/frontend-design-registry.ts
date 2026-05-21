import { cache } from "react";
import type { MdxComponentMap } from "./registry";
import { sharedComponents } from "./registry";

type MdxComponentModule = { default?: unknown } & Record<string, unknown>;
type MdxComponent = React.ComponentType<Record<string, unknown>>;
type FdComponentLoader = () => Promise<MdxComponentModule>;

const frontendDesignComponentLoaders: Record<string, FdComponentLoader> = {
  "box-model": () => import("@/mdx/frontend-design/box-model"),
  "design-image-gallery": () =>
    import("@/mdx/frontend-design/design-image-gallery"),
  "design-drag-drop": () =>
    import("@/mdx/frontend-design/design-drag-drop"),
  "design-notification-system": () =>
    import("@/mdx/frontend-design/design-notification-system"),
  "design-autocomplete": () =>
    import("@/mdx/frontend-design/design-autocomplete"),
  "design-spreadsheet": () =>
    import("@/mdx/frontend-design/design-spreadsheet"),
  "design-collaborative-whiteboard": () =>
    import("@/mdx/frontend-design/design-collaborative-whiteboard"),
  "design-offline-first-app": () =>
    import("@/mdx/frontend-design/design-offline-first-app"),
  "design-multi-tab-sync": () =>
    import("@/mdx/frontend-design/design-multi-tab-sync"),
  "design-booking-platform": () =>
    import("@/mdx/frontend-design/design-booking-platform"),
  "design-news-feed": () =>
    import("@/mdx/frontend-design/design-news-feed"),
  "design-realtime-chat": () =>
    import("@/mdx/frontend-design/design-realtime-chat"),
  "design-video-streaming": () =>
    import("@/mdx/frontend-design/design-video-streaming"),
  "design-microfrontend": () =>
    import("@/mdx/frontend-design/design-microfrontend"),
  "design-web-performance": () =>
    import("@/mdx/frontend-design/design-web-performance"),
  "fixed-vs-variable-height": () =>
    import("@/mdx/frontend-design/fixed-vs-variable-height"),
  "virtual-scroll-implementation": () =>
    import("@/mdx/frontend-design/virtual-scroll-implementation"),
  "tree-grid-virtualization": () =>
    import("@/mdx/frontend-design/tree-grid-virtualization"),
  "canvas-vs-dom": () =>
    import("@/mdx/frontend-design/canvas-vs-dom"),
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

async function getFdComponents(slug: string): Promise<MdxComponentMap> {
  const loader = frontendDesignComponentLoaders[slug];
  if (!loader) return {};
  try {
    const mod = await loader();
    return normalizeComponentMap(mod);
  } catch {
    return {};
  }
}

export const buildComponentsForFdSlug = cache(
  async (slug: string): Promise<MdxComponentMap> => {
    const perArticle = await getFdComponents(slug);
    return {
      ...sharedComponents,
      ...perArticle,
    };
  }
);
