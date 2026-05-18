export type PrincipleCategory =
  | "component-design"
  | "state-management"
  | "animation-motion"
  | "teaching-pedagogy"
  | "architecture"
  | "performance"
  | "accessibility"
  | "data-patterns";

export type DeepDiveRef = {
  series: string;
  part: number;
  label: string;
};

export type PrincipleFrontmatter = {
  title: string;
  slug: string;
  summary: string;
  categories: PrincipleCategory[];
  tags: string[];
  relatedPrinciples: string[];
  learningPaths: string[];
  deepDiveRefs: DeepDiveRef[];
};

export type PrincipleContent = {
  slug: string;
  frontmatter: PrincipleFrontmatter;
  content: string;
  readTime: string;
};

export type PrincipleListItem = {
  slug: string;
  title: string;
  summary: string;
  categories: PrincipleCategory[];
  tags: string[];
  relatedPrinciples: string[];
};

export type CategoryInfo = {
  slug: PrincipleCategory;
  name: string;
  description: string;
  colorToken: string;
};

export type LearningPath = {
  slug: string;
  name: string;
  description: string;
  principles: string[];
};

export type GraphData = {
  nodes: (PrincipleListItem & { x: number; y: number })[];
  edges: { source: string; target: string }[];
  categories: CategoryInfo[];
};
