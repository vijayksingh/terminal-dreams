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
  "design-booking-platform": () =>
    import("@/mdx/frontend-design/design-booking-platform"),
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
