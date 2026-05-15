import type { FlowNode, FlowEdge, FlowGroup, EdgeRoute } from "./types";

// ── Defaults ─────────────────────────────────────────────

export const DEFAULTS = {
  node: { w: 80, h: 28, r: 3 },
  font: { label: 8.5, sublabel: 6.5, edge: 7, annotation: 6.5 },
  stroke: { edge: 1, edgeLit: 1.5, node: 1 },
  marker: { w: 5, h: 4 },
  dash: { normal: "3 3", dashed: "4 3", problem: "4 2" },
  edgeGap: 5,
  parallelGap: 8,
  group: { pad: 16, r: 6, labelSize: 7 },
  touchTarget: 44,
  role: {
    protagonist: { scale: 1.15, strokeMultiplier: 1.8, fontMultiplier: 1.12 },
    supporting:  { scale: 1.0,  strokeMultiplier: 1.0, fontMultiplier: 1.0 },
    context:     { scale: 0.9,  strokeMultiplier: 0.8, fontMultiplier: 0.9 },
  },
  arcIndicator: { r: 5.5, fontSize: 6.5, offsetX: 0, offsetY: -2 },
} as const;

export const ARROW_LEN = 4;

// ── Helpers ──────────────────────────────────────────────

type Point = { x: number; y: number };

export function resolveW(n: FlowNode, fallback?: number): number {
  return n.w ?? fallback ?? DEFAULTS.node.w;
}

export function resolveH(n: FlowNode, fallback?: number): number {
  return n.h ?? fallback ?? DEFAULTS.node.h;
}

// ── Arrowhead geometry ──────────────────────────────────
//
// Filled triangle aligned to `dir`. The caller places `tip`
// where the arrowhead should point; the base extends
// backwards by `size` units.

export function arrowheadPath(
  tip: Point,
  dir: Point,
  size = ARROW_LEN,
): string {
  const d = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  if (d < 0.01) return "";
  const nx = dir.x / d;
  const ny = dir.y / d;
  const px = -ny;
  const py = nx;
  const bx = tip.x - nx * size;
  const by = tip.y - ny * size;
  const hw = size * 0.4;
  return `M${tip.x} ${tip.y}L${bx + px * hw} ${by + py * hw}L${bx - px * hw} ${by - py * hw}Z`;
}

// ── Boundary exit points per shape ───────────────────────

function rectExit(
  cx: number, cy: number,
  hw: number, hh: number,
  tx: number, ty: number,
  gap: number,
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  const d = Math.sqrt(dx * dx + dy * dy);
  return { x: cx + dx * s + (dx / d) * gap, y: cy + dy * s + (dy / d) * gap };
}

function diamondExit(
  cx: number, cy: number,
  hw: number, hh: number,
  tx: number, ty: number,
  gap: number,
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const s = 1 / (adx / hw + ady / hh);
  const d = Math.sqrt(dx * dx + dy * dy);
  return {
    x: cx + (dx / d) * s + (dx / d) * gap,
    y: cy + (dy / d) * s + (dy / d) * gap,
  };
}

function circleExit(
  cx: number, cy: number,
  r: number,
  tx: number, ty: number,
  gap: number,
) {
  const dx = tx - cx;
  const dy = ty - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return { x: cx, y: cy };
  return { x: cx + (dx / d) * (r + gap), y: cy + (dy / d) * (r + gap) };
}

function hexagonExit(
  cx: number, cy: number,
  hw: number, hh: number,
  tx: number, ty: number,
  gap: number,
) {
  const r = Math.min(hw, hh) * 0.96;
  return circleExit(cx, cy, r, tx, ty, gap);
}

export function nodeExit(
  n: FlowNode,
  tx: number, ty: number,
  gap: number,
  wOverride?: number, hOverride?: number,
) {
  const w = wOverride ?? resolveW(n);
  const h = hOverride ?? resolveH(n);
  const shape = n.shape ?? "rect";
  switch (shape) {
    case "diamond":
      return diamondExit(n.x, n.y, w / 2, h / 2, tx, ty, gap);
    case "circle":
      return circleExit(n.x, n.y, Math.min(w, h) / 2, tx, ty, gap);
    case "hexagon":
      return hexagonExit(n.x, n.y, w / 2, h / 2, tx, ty, gap);
    case "cylinder":
    case "pill":
    case "rect":
    default:
      return rectExit(n.x, n.y, w / 2, h / 2, tx, ty, gap);
  }
}

// ── Path builders (point-based, no node dependency) ─────
//
// Each curved builder also returns its control points so
// callers can compute tangents and midpoints on the curve.

type CubicPoints = { p0: Point; cp1: Point; cp2: Point; p3: Point };

const CURVATURE = 0.4;
const CURVATURE_SCALE = 25;

function curvedControlPoints(p1: Point, p2: Point): CubicPoints {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const primaryIsVertical = Math.abs(dy) > Math.abs(dx);

  // Backtracking detection: when the edge needs to loop back,
  // push control points perpendicular to create a visible arc
  // instead of a collapsed or crossed-over S-curve.
  const isBacktrackingH = !primaryIsVertical && Math.abs(dx) < 20;
  const isBacktrackingV = primaryIsVertical && Math.abs(dy) < 20;

  if (isBacktrackingH || isBacktrackingV) {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const loopOffset = Math.max(30, dist * 0.8);
    if (primaryIsVertical) {
      const sign = dx >= 0 ? 1 : -1;
      return {
        p0: p1,
        cp1: { x: p1.x + sign * loopOffset, y: p1.y },
        cp2: { x: p2.x + sign * loopOffset, y: p2.y },
        p3: p2,
      };
    }
    const sign = dy >= 0 ? -1 : 1;
    return {
      p0: p1,
      cp1: { x: p1.x, y: p1.y + sign * loopOffset },
      cp2: { x: p2.x, y: p2.y + sign * loopOffset },
      p3: p2,
    };
  }

  if (primaryIsVertical) {
    const offset = CURVATURE * CURVATURE_SCALE * Math.sqrt(Math.abs(dy)) * Math.sign(dy || 1);
    return {
      p0: p1,
      cp1: { x: p1.x, y: p1.y + offset },
      cp2: { x: p2.x, y: p2.y - offset },
      p3: p2,
    };
  }
  const offset = CURVATURE * CURVATURE_SCALE * Math.sqrt(Math.abs(dx)) * Math.sign(dx || 1);
  return {
    p0: p1,
    cp1: { x: p1.x + offset, y: p1.y },
    cp2: { x: p2.x - offset, y: p2.y },
    p3: p2,
  };
}

function buildStraightPath(p1: Point, p2: Point): string {
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
}

function buildOrthogonalPath(p1: Point, p2: Point): string {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  if (dx < 2 || dy < 2) return buildStraightPath(p1, p2);
  if (dy >= dx) {
    const midY = (p1.y + p2.y) / 2;
    return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
  }
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

function buildCurvedPath(p1: Point, p2: Point): string {
  const { cp1, cp2 } = curvedControlPoints(p1, p2);
  return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}

function buildArcPath(p1: Point, p2: Point): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = dist * 0.8;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

function buildPath(route: EdgeRoute, p1: Point, p2: Point): string {
  switch (route) {
    case "orthogonal": return buildOrthogonalPath(p1, p2);
    case "curved":     return buildCurvedPath(p1, p2);
    case "arc":        return buildArcPath(p1, p2);
    case "straight":
    default:           return buildStraightPath(p1, p2);
  }
}

// ── De Casteljau evaluation ─────────────────────────────
//
// Exact point on a cubic bezier at parameter t. Used for
// edge midpoint placement on curved paths.

function deCasteljau(c: CubicPoints, t: number): Point {
  const t1 = 1 - t;
  const a = { x: t1 * c.p0.x + t * c.cp1.x, y: t1 * c.p0.y + t * c.cp1.y };
  const b = { x: t1 * c.cp1.x + t * c.cp2.x, y: t1 * c.cp1.y + t * c.cp2.y };
  const d = { x: t1 * c.cp2.x + t * c.p3.x, y: t1 * c.cp2.y + t * c.p3.y };
  const e = { x: t1 * a.x + t * b.x, y: t1 * a.y + t * b.y };
  const f = { x: t1 * b.x + t * d.x, y: t1 * b.y + t * d.y };
  return { x: t1 * e.x + t * f.x, y: t1 * e.y + t * f.y };
}

// Tangent at parameter t: B'(t) = 3[(1-t)²(P1-P0) + 2(1-t)t(P2-P1) + t²(P3-P2)]
function deCasteljauTangent(c: CubicPoints, t: number): Point {
  const t1 = 1 - t;
  const d0 = { x: c.cp1.x - c.p0.x, y: c.cp1.y - c.p0.y };
  const d1 = { x: c.cp2.x - c.cp1.x, y: c.cp2.y - c.cp1.y };
  const d2 = { x: c.p3.x - c.cp2.x, y: c.p3.y - c.cp2.y };
  return {
    x: 3 * (t1 * t1 * d0.x + 2 * t1 * t * d1.x + t * t * d2.x),
    y: 3 * (t1 * t1 * d0.y + 2 * t1 * t * d1.y + t * t * d2.y),
  };
}

// Tangent direction at end of cubic: derivative B'(1) = 3*(P3 - P2)
function cubicEndTangent(c: CubicPoints): Point {
  return { x: c.p3.x - c.cp2.x, y: c.p3.y - c.cp2.y };
}

// Tangent direction at start of cubic: derivative B'(0) = 3*(P1 - P0)
function cubicStartTangent(c: CubicPoints): Point {
  return { x: c.cp1.x - c.p0.x, y: c.cp1.y - c.p0.y };
}

// Tangent of a circular arc at endpoint. For SVG `A r r 0 0 1 x2 y2`,
// the tangent is perpendicular to the radius at that point.
function arcEndTangent(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return { x: 1, y: 0 };
  const r = dist * 0.8;
  // Half-chord to find arc center offset
  const halfChord = dist / 2;
  const h = Math.sqrt(Math.max(0, r * r - halfChord * halfChord));
  // Sweep flag = 1 means center is to the right of p1→p2
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = mx + nx * h;
  const cy = my + ny * h;
  // Tangent at p2 is perpendicular to (center → p2), in the arc direction
  const rx = p2.x - cx;
  const ry = p2.y - cy;
  return { x: -ry, y: rx };
}

function arcStartTangent(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return { x: 1, y: 0 };
  const r = dist * 0.8;
  const halfChord = dist / 2;
  const h = Math.sqrt(Math.max(0, r * r - halfChord * halfChord));
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = mx + nx * h;
  const cy = my + ny * h;
  const rx = p1.x - cx;
  const ry = p1.y - cy;
  return { x: -ry, y: rx };
}

// Midpoint on a circular arc (point at the arc's apex)
function arcMidpoint(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const r = dist * 0.8;
  const halfChord = dist / 2;
  const h = Math.sqrt(Math.max(0, r * r - halfChord * halfChord));
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = mx + nx * h;
  const cy = my + ny * h;
  // Midpoint angle is the bisector of the arc
  const a1 = Math.atan2(p1.y - cy, p1.x - cx);
  const a2 = Math.atan2(p2.y - cy, p2.x - cx);
  let mid = (a1 + a2) / 2;
  // Ensure we pick the correct arc half (sweep-flag=1 → clockwise)
  if (a2 - a1 > 0 && a2 - a1 < Math.PI) mid += Math.PI;
  if (a1 - a2 > Math.PI) mid += Math.PI;
  return { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid) };
}

// ── Edge path generation ─────────────────────────────────

export function computeEdgePath(from: FlowNode, to: FlowNode, route: EdgeRoute): string {
  const p1 = nodeExit(from, to.x, to.y, DEFAULTS.edgeGap);
  const p2 = nodeExit(to, from.x, from.y, DEFAULTS.edgeGap);
  return buildPath(route, p1, p2);
}

// ── Edge path with inline arrowhead geometry ─────────────
//
// Shortens the edge stroke so it terminates at the arrowhead
// base. Returns the arrow tip (close to node) and direction
// so the renderer can draw a filled triangle that seamlessly
// continues where the stroke left off.

export type EdgeWithArrow = {
  path: string;
  arrowTip: Point;
  arrowDir: Point;
  startArrowTip: Point | null;
  startArrowDir: Point | null;
};

export function computeEdgeWithArrow(
  from: FlowNode, to: FlowNode, route: EdgeRoute, bidirectional?: boolean,
): EdgeWithArrow {
  const gap = DEFAULTS.edgeGap;

  const arrowTip = nodeExit(to, from.x, from.y, gap);
  const endStroke = nodeExit(to, from.x, from.y, gap + ARROW_LEN);

  const startFull = nodeExit(from, to.x, to.y, gap);
  const startArrowTip = bidirectional ? startFull : null;
  const startStroke = bidirectional
    ? nodeExit(from, to.x, to.y, gap + ARROW_LEN)
    : startFull;

  const path = buildPath(route, startStroke, endStroke);

  let endDir: Point;
  let startDir: Point | null = null;

  if (route === "curved") {
    const cp = curvedControlPoints(startStroke, endStroke);
    endDir = cubicEndTangent(cp);
    if (bidirectional) {
      const st = cubicStartTangent(cp);
      startDir = { x: -st.x, y: -st.y };
    }
  } else if (route === "arc") {
    endDir = arcEndTangent(startStroke, endStroke);
    if (bidirectional) {
      const st = arcStartTangent(startStroke, endStroke);
      startDir = { x: -st.x, y: -st.y };
    }
  } else {
    endDir = { x: arrowTip.x - endStroke.x, y: arrowTip.y - endStroke.y };
    if (bidirectional) {
      startDir = { x: startFull.x - startStroke.x, y: startFull.y - startStroke.y };
    }
  }

  return {
    path,
    arrowTip,
    arrowDir: endDir,
    startArrowTip,
    startArrowDir: startDir,
  };
}

// ── Edge midpoint & direction ───────────────────────────

export function computeEdgeMidpoint(
  from: FlowNode, to: FlowNode, route?: EdgeRoute,
): { x: number; y: number } {
  const p1 = nodeExit(from, to.x, to.y, DEFAULTS.edgeGap);
  const p2 = nodeExit(to, from.x, from.y, DEFAULTS.edgeGap);

  if (route === "curved") {
    return deCasteljau(curvedControlPoints(p1, p2), 0.5);
  }

  if (route === "arc") {
    return arcMidpoint(p1, p2);
  }

  if (route === "orthogonal") {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    if (dx >= 2 && dy >= 2) {
      if (dy >= dx) {
        const midY = (p1.y + p2.y) / 2;
        return { x: (p1.x + p2.x) / 2, y: midY };
      }
      const midX = (p1.x + p2.x) / 2;
      return { x: midX, y: (p1.y + p2.y) / 2 };
    }
  }

  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function computeEdgeDirection(from: FlowNode, to: FlowNode, route?: EdgeRoute): { dx: number; dy: number } {
  const p1 = nodeExit(from, to.x, to.y, DEFAULTS.edgeGap);
  const p2 = nodeExit(to, from.x, from.y, DEFAULTS.edgeGap);

  let dx: number;
  let dy: number;

  if (route === "curved") {
    const cp = curvedControlPoints(p1, p2);
    const t = deCasteljauTangent(cp, 0.5);
    dx = t.x;
    dy = t.y;
  } else if (route === "arc") {
    const et = arcEndTangent(p1, p2);
    const st = arcStartTangent(p1, p2);
    dx = (et.x + st.x) / 2;
    dy = (et.y + st.y) / 2;
  } else {
    dx = p2.x - p1.x;
    dy = p2.y - p1.y;
  }

  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

// ── Parallel edge offsets ────────────────────────────────

export function computeParallelOffsets(edges: FlowEdge[]): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const e of edges) {
    const pairKey = [e.from, e.to].sort().join("|");
    if (!groups.has(pairKey)) groups.set(pairKey, []);
    groups.get(pairKey)!.push(`${e.from}-${e.to}`);
  }
  const offsets = new Map<string, number>();
  for (const [, edgeKeys] of groups) {
    if (edgeKeys.length <= 1) {
      offsets.set(edgeKeys[0], 0);
      continue;
    }
    for (let i = 0; i < edgeKeys.length; i++) {
      offsets.set(
        edgeKeys[i],
        (i - (edgeKeys.length - 1) / 2) * DEFAULTS.parallelGap,
      );
    }
  }
  return offsets;
}

// ── Group bounding box ───────────────────────────────────

export function computeGroupBounds(
  group: FlowGroup,
  nodeMap: Record<string, FlowNode>,
): { x: number; y: number; w: number; h: number } | null {
  const pad = group.pad ?? DEFAULTS.group.pad;
  const members = group.nodeIds.map((id) => nodeMap[id]).filter(Boolean);
  if (members.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const n of members) {
    const hw = resolveW(n) / 2;
    const hh = resolveH(n) / 2;
    minX = Math.min(minX, n.x - hw);
    minY = Math.min(minY, n.y - hh);
    maxX = Math.max(maxX, n.x + hw);
    maxY = Math.max(maxY, n.y + hh);
  }

  return {
    x: minX - pad,
    y: minY - pad - 8,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2 + 8,
  };
}

// ── Node shape SVG path data ─────────────────────────────

export function diamondPath(cx: number, cy: number, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  return `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
}

export function hexagonPath(cx: number, cy: number, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const inset = hw * 0.25;
  return [
    `M ${cx - hw + inset} ${cy - hh}`,
    `L ${cx + hw - inset} ${cy - hh}`,
    `L ${cx + hw} ${cy}`,
    `L ${cx + hw - inset} ${cy + hh}`,
    `L ${cx - hw + inset} ${cy + hh}`,
    `L ${cx - hw} ${cy}`,
    "Z",
  ].join(" ");
}
