import { cache } from "react";
import type { MdxComponentMap } from "./registry";
import { sharedComponents } from "./registry";

type MdxComponentModule = { default?: unknown } & Record<string, unknown>;
type MdxComponent = React.ComponentType<Record<string, unknown>>;
type PrincipleComponentLoader = () => Promise<MdxComponentModule>;

const principleComponentLoaders: Record<string, PrincipleComponentLoader> = {
  "derived-state": () => import("@/mdx/principles/derived-state"),
  "compound-components": () => import("@/mdx/principles/compound-components"),
  "primitive-composition": () => import("@/mdx/principles/primitive-composition"),
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

async function getPrincipleComponents(slug: string): Promise<MdxComponentMap> {
  const loader = principleComponentLoaders[slug];
  if (!loader) return {};
  try {
    const mod = await loader();
    return normalizeComponentMap(mod);
  } catch {
    return {};
  }
}

export const buildComponentsForPrincipleSlug = cache(
  async (slug: string): Promise<MdxComponentMap> => {
    const perPrinciple = await getPrincipleComponents(slug);
    return {
      ...sharedComponents,
      ...perPrinciple,
    };
  }
);
