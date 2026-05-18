import type { CategoryInfo, LearningPath, PrincipleCategory } from "./principle-types";

export const CATEGORIES: CategoryInfo[] = [
  { slug: "component-design", name: "Component Design", description: "React/UI component architecture patterns", colorToken: "--diagram-layer-0" },
  { slug: "state-management", name: "State Management", description: "Data flow, caching, and reactivity", colorToken: "--diagram-layer-1" },
  { slug: "animation-motion", name: "Animation & Motion", description: "Motion design for interactive UIs", colorToken: "--diagram-layer-2" },
  { slug: "teaching-pedagogy", name: "Teaching & Pedagogy", description: "How interactive content teaches", colorToken: "--diagram-layer-3" },
  { slug: "architecture", name: "Architecture", description: "System design and module boundaries", colorToken: "--diagram-layer-4" },
  { slug: "performance", name: "Performance", description: "Speed, efficiency, and budgets", colorToken: "--diagram-layer-5" },
  { slug: "accessibility", name: "Accessibility", description: "Inclusive design patterns", colorToken: "--diagram-layer-6" },
  { slug: "data-patterns", name: "Data Patterns", description: "Network, streaming, and data shape", colorToken: "--diagram-layer-7" },
];

export function getCategoryBySlug(slug: PrincipleCategory): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    slug: "build-a-composable-component",
    name: "Build a Composable Component",
    description: "From monolithic components to composable, reusable primitives",
    principles: ["primitive-composition", "compound-components", "render-delegation"],
  },
  {
    slug: "optimize-a-slow-react-app",
    name: "Optimize a Slow React App",
    description: "Identify and fix re-render waterfalls, unnecessary work, and state bloat",
    principles: ["derived-state"],
  },
  {
    slug: "design-meaningful-animations",
    name: "Design Meaningful Animations",
    description: "Choreograph motion that guides attention and communicates state changes",
    principles: [],
  },
];

export function getLearningPathBySlug(slug: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.slug === slug);
}
