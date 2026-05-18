import type {
  FdIntersection,
  FdMetroMapData,
  FdSectionSlug,
  FdStop,
} from "@/lib/frontend-design-types";

export type Point = { x: number; y: number };

export type PositionedStop = {
  id: string;
  sectionSlug: FdSectionSlug;
  label: string;
  slug: string;
  kind: FdStop["kind"];
  x: number;
  y: number;
  labelY: number;
  direction: "right" | "left";
  hasIntersections: boolean;
};

export type SerpentineSection = {
  sectionSlug: FdSectionSlug;
  colorToken: string;
  direction: "right" | "left";
  y: number;
  startX: number;
  endX: number;
  sectionPath: string;
  titlePos: Point;
  titleAnchor: "start" | "end";
  order: number;
};

export type UTurnBadge = {
  x: number;
  y: number;
  order: number;
  colorToken: string;
  sectionSlug: FdSectionSlug;
};

export type PositionedIntersection = {
  stopIds: string[];
  sectionSlugs: FdSectionSlug[];
  fromPoint: Point;
  toPoint: Point;
  fromColor: string;
  toColor: string;
  path: string;
};

export type PositionedMapData = {
  sections: SerpentineSection[];
  badges: UTurnBadge[];
  stops: PositionedStop[];
  intersections: PositionedIntersection[];
  width: number;
  height: number;
};

// ── Layout constants ────────────────────────────────────────────
export const MAP_W = 1800;
export const MAP_H = 4200;
export const TRACK_BORDER_W = 58;
export const TRACK_FILL_W = 44;
export const TRACK_GLOW_W = 80;
export const STOP_R = 10;
export const BADGE_R = 34;
export const TICK_H = TRACK_FILL_W / 2;
export const LABEL_NEAR = 40;
export const LABEL_FAR = 56;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;

const LEFT_X = 300;
const RIGHT_X = MAP_W - LEFT_X;
const TOP_Y = 240;
const ROW_GAP = 380;
const ARC_R = ROW_GAP / 2;
const STOP_PAD = 70;

function rowY(i: number): number {
  return TOP_Y + i * ROW_GAP;
}

export function computeMapLayout(data: FdMetroMapData): PositionedMapData {
  const sorted = [...data.sections].sort((a, b) => a.order - b.order);
  const stops: PositionedStop[] = [];
  const sections: SerpentineSection[] = [];
  const badges: UTurnBadge[] = [];
  const stopPos = new Map<string, Point>();

  const stopsWithIntersections = new Set<string>();
  for (const ix of data.intersections) {
    stopsWithIntersections.add(ix.stopA);
    stopsWithIntersections.add(ix.stopB);
  }

  for (let i = 0; i < sorted.length; i++) {
    const sec = sorted[i];
    const y = rowY(i);
    const right = i % 2 === 0;
    const sx = right ? LEFT_X : RIGHT_X;
    const ex = right ? RIGHT_X : LEFT_X;

    // Build per-section path with half-arcs at each end
    let sectionPath = "";

    // Incoming half-arc (from previous U-turn apex to this section's start)
    if (i > 0) {
      const prevRight = (i - 1) % 2 === 0;
      const midY = (rowY(i - 1) + y) / 2;
      if (prevRight) {
        sectionPath = `M ${RIGHT_X + ARC_R} ${midY} A ${ARC_R} ${ARC_R} 0 0 1 ${sx} ${y}`;
      } else {
        sectionPath = `M ${LEFT_X - ARC_R} ${midY} A ${ARC_R} ${ARC_R} 0 0 0 ${sx} ${y}`;
      }
      sectionPath += ` L ${ex} ${y}`;
    } else {
      sectionPath = `M ${sx} ${y} L ${ex} ${y}`;
    }

    // Outgoing half-arc (from this section's end to next U-turn apex)
    if (i < sorted.length - 1) {
      const nextMidY = (y + rowY(i + 1)) / 2;
      if (right) {
        sectionPath += ` A ${ARC_R} ${ARC_R} 0 0 1 ${RIGHT_X + ARC_R} ${nextMidY}`;
      } else {
        sectionPath += ` A ${ARC_R} ${ARC_R} 0 0 0 ${LEFT_X - ARC_R} ${nextMidY}`;
      }
    }

    const titleX = right ? sx + 14 : sx - 14;

    sections.push({
      sectionSlug: sec.slug,
      colorToken: sec.colorToken,
      direction: right ? "right" : "left",
      y,
      startX: sx,
      endX: ex,
      sectionPath,
      titlePos: { x: titleX, y: y - TRACK_BORDER_W / 2 - 24 },
      titleAnchor: right ? "start" : "end",
      order: sec.order,
    });

    // Badge at U-turn apex
    if (i < sorted.length - 1) {
      const curveX = right ? RIGHT_X + ARC_R : LEFT_X - ARC_R;
      const curveY = (rowY(i) + rowY(i + 1)) / 2;
      badges.push({
        x: curveX,
        y: curveY,
        order: sec.order,
        colorToken: sec.colorToken,
        sectionSlug: sec.slug,
      });
    }

    // Distribute stops
    const dir = right ? 1 : -1;
    const padStart = sx + dir * STOP_PAD;
    const padEnd = ex - dir * STOP_PAD;
    const sectionStops = data.stops
      .filter((s) => s.sectionSlug === sec.slug)
      .sort((a, b) => a.order - b.order);

    for (let j = 0; j < sectionStops.length; j++) {
      const t = sectionStops.length === 1 ? 0.5 : j / (sectionStops.length - 1);
      const x = padStart + t * (padEnd - padStart);
      const stop = sectionStops[j];
      stopPos.set(stop.id, { x, y });
      stops.push({
        id: stop.id,
        sectionSlug: stop.sectionSlug,
        label: stop.label,
        slug: stop.slug,
        kind: stop.kind,
        x,
        y,
        labelY: right
          ? y + (j % 2 === 0 ? LABEL_NEAR : LABEL_FAR)
          : y - (j % 2 === 0 ? LABEL_NEAR : LABEL_FAR),
        direction: right ? "right" : "left",
        hasIntersections: stopsWithIntersections.has(stop.id),
      });
    }
  }

  // Start badge
  if (sorted.length > 0) {
    const first = sorted[0];
    badges.unshift({
      x: LEFT_X - BADGE_R - 24,
      y: rowY(0),
      order: first.order,
      colorToken: first.colorToken,
      sectionSlug: first.slug,
    });
  }

  // End badge
  if (sorted.length > 1) {
    const last = sorted[sorted.length - 1];
    const lastRight = (sorted.length - 1) % 2 === 0;
    const endX = lastRight ? RIGHT_X : LEFT_X;
    badges.push({
      x: endX + (lastRight ? BADGE_R + 24 : -BADGE_R - 24),
      y: rowY(sorted.length - 1),
      order: last.order,
      colorToken: last.colorToken,
      sectionSlug: last.slug,
    });
  }

  return {
    sections,
    badges,
    stops,
    intersections: computeConnectors(data.intersections, stopPos, data),
    width: MAP_W,
    height: MAP_H,
  };
}

function computeConnectors(
  intersections: FdIntersection[],
  stopPositions: Map<string, Point>,
  data: FdMetroMapData,
): PositionedIntersection[] {
  const seen = new Set<string>();
  const result: PositionedIntersection[] = [];

  for (const ix of intersections) {
    const from = stopPositions.get(ix.stopA);
    const to = stopPositions.get(ix.stopB);
    if (!from || !to) continue;

    const key = [ix.stopA, ix.stopB].sort().join("--");
    if (seen.has(key)) continue;
    seen.add(key);

    const secA = data.sections.find((s) => s.slug === ix.sectionA);
    const secB = data.sections.find((s) => s.slug === ix.sectionB);

    const avgX = (from.x + to.x) / 2;
    const bowDir = avgX > MAP_W / 2 ? -1 : 1;
    const dy = Math.abs(to.y - from.y);
    const bow = 50 + dy * 0.12;
    const cx = avgX + bowDir * bow;
    const cy = (from.y + to.y) / 2;

    result.push({
      stopIds: [ix.stopA, ix.stopB],
      sectionSlugs: [ix.sectionA, ix.sectionB],
      fromPoint: from,
      toPoint: to,
      fromColor: secA?.colorToken ?? "--color-muted",
      toColor: secB?.colorToken ?? "--color-muted",
      path: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    });
  }

  return result;
}
