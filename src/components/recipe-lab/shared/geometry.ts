import type { NodeRole } from "./graph-data";
import { ROLE_SCALE } from "./graph-data";

export { ARROW_LEN, arrowheadPath } from "@/mdx/shared/flow-diagram/geometry";
import { ARROW_LEN } from "@/mdx/shared/flow-diagram/geometry";

type RectNode = {
  x: number;
  y: number;
  w: number;
  h: number;
  role: NodeRole;
};

export function rectExit(n: RectNode, tx: number, ty: number, gap: number, scaleOverride?: number) {
  const scale = scaleOverride ?? ROLE_SCALE[n.role];
  const hw = (n.w * scale) / 2;
  const hh = (n.h * scale) / 2;
  const dx = tx - n.x;
  const dy = ty - n.y;
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  const d = Math.sqrt(dx * dx + dy * dy);
  return { x: n.x + dx * s + (dx / d) * gap, y: n.y + dy * s + (dy / d) * gap };
}

export type EdgeGeometry = {
  path: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  endDir: { x: number; y: number };
};

export function cubicEdge(from: RectNode, to: RectNode, fromScale?: number, toScale?: number): EdgeGeometry {
  const p1 = rectExit(from, to.x, to.y, 2, fromScale);
  const p2 = rectExit(to, from.x, from.y, 2, toScale);
  const strokeEnd = rectExit(to, from.x, from.y, 2 + ARROW_LEN, toScale);
  const midY = (p1.y + strokeEnd.y) / 2;
  const path = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${strokeEnd.x} ${midY}, ${strokeEnd.x} ${strokeEnd.y}`;
  return { path, p1, p2, endDir: { x: p2.x - strokeEnd.x, y: p2.y - strokeEnd.y } };
}
