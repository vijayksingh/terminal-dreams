export type FdSectionSlug =
  | "core-fundamentals"
  | "dom-api"
  | "web-apis"
  | "virtualisation"
  | "state-design"
  | "network"
  | "performance"
  | "rendering-strategies"
  | "security-auth"
  | "system-design-problems";

export type FdSection = {
  slug: FdSectionSlug;
  name: string;
  shortName: string;
  description: string;
  colorToken: string;
  order: number;
};

export type FdStopKind =
  | "article"
  | "coding-assignment"
  | "live-coding"
  | "overview"
  | "system-design-problem";

export type FdStop = {
  id: string;
  sectionSlug: FdSectionSlug;
  label: string;
  slug: string;
  order: number;
  kind: FdStopKind;
  intersections: string[];
};

export type FdIntersection = {
  stopA: string;
  stopB: string;
  sectionA: FdSectionSlug;
  sectionB: FdSectionSlug;
};

export type FdArticleFrontmatter = {
  title: string;
  slug: string;
  section: FdSectionSlug;
  stopId: string;
  order: number;
  kind: FdStopKind;
  summary: string;
  tags: string[];
  intersections: string[];
  prerequisites: string[];
};

export type FdArticleContent = {
  slug: string;
  frontmatter: FdArticleFrontmatter;
  content: string;
  readTime: string;
};

export type FdArticleListItem = {
  slug: string;
  title: string;
  summary: string;
  section: FdSectionSlug;
  stopId: string;
  order: number;
  kind: FdStopKind;
  tags: string[];
  intersections: string[];
};

export type FdMetroMapData = {
  sections: FdSection[];
  stops: FdStop[];
  intersections: FdIntersection[];
};

export type FdProgress = {
  completedStops: string[];
};
