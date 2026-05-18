// ── Frontend Design Lesson Plans — Barrel Export ───────────────
//
// Split by section for individual auditing and parallel development.
// Import from here for the unified record + helpers.

export type {
  LessonFormat,
  Effort,
  ScrollStep,
  DiscoveryMechanic,
  InteractiveSpec,
  LessonMeta,
} from "./types";

import { CORE_FUNDAMENTALS } from "./s01-core-fundamentals";
import { DOM_API } from "./s02-dom-api";
import { WEB_APIS } from "./s03-web-apis";
import { VIRTUALISATION } from "./s04-virtualisation";
import { APP_STATE } from "./s05-app-state";
import { NETWORK } from "./s06-network";
import { PERFORMANCE } from "./s07-performance";
import { RENDERING } from "./s08-rendering";
import { SECURITY } from "./s09-security";
import { SYSTEM_DESIGN } from "./s10-system-design";

import type { LessonFormat, Effort, LessonMeta } from "./types";

export {
  CORE_FUNDAMENTALS,
  DOM_API,
  WEB_APIS,
  VIRTUALISATION,
  APP_STATE,
  NETWORK,
  PERFORMANCE,
  RENDERING,
  SECURITY,
  SYSTEM_DESIGN,
};

export const LESSON_PLAN: Record<string, LessonMeta> = {
  ...CORE_FUNDAMENTALS,
  ...DOM_API,
  ...WEB_APIS,
  ...VIRTUALISATION,
  ...APP_STATE,
  ...NETWORK,
  ...PERFORMANCE,
  ...RENDERING,
  ...SECURITY,
  ...SYSTEM_DESIGN,
};

export function getLessonMeta(stopId: string): LessonMeta | undefined {
  return LESSON_PLAN[stopId];
}

export function getLessonsByFormat(format: LessonFormat): LessonMeta[] {
  return Object.values(LESSON_PLAN).filter((l) => l.format === format);
}

export function getLessonsByEffort(effort: Effort): LessonMeta[] {
  return Object.values(LESSON_PLAN).filter((l) => l.effort === effort);
}

export function getLessonPlanStats() {
  const lessons = Object.values(LESSON_PLAN);
  const byFormat = new Map<LessonFormat, number>();
  const byEffort = new Map<Effort, number>();
  let totalComponents = 0;

  for (const l of lessons) {
    byFormat.set(l.format, (byFormat.get(l.format) ?? 0) + 1);
    byEffort.set(l.effort, (byEffort.get(l.effort) ?? 0) + 1);
    totalComponents += l.interactives.length;
  }

  return { total: lessons.length, byFormat, byEffort, totalComponents };
}

export function getLessonsForSection(sectionExport: Record<string, LessonMeta>): LessonMeta[] {
  return Object.values(sectionExport);
}
