import type { ReactNode } from "react";

// ── Node ─────────────────────────────────────────────────
//
// Nodes are the primary interactive elements. They can be
// simple (label + sublabel) or rich (custom React component
// via foreignObject). The `render` prop opts a node into
// full React rendering inside the SVG.

export type NodeShape =
  | "rect"
  | "pill"
  | "diamond"
  | "cylinder"
  | "circle"
  | "hexagon";

export type NodeRole = "protagonist" | "supporting" | "context";

export type FlowNode = {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  shape?: NodeShape;
  accent?: boolean;
  role?: NodeRole;

  label: string;
  sublabel?: string;
  brief?: string;
  icon?: ReactNode;

  /** Replace the default SVG label with a full React component (rendered via foreignObject). */
  render?: (props: NodeRenderProps) => ReactNode;

  description?: string;
  detail?: ReactNode;

  /** Arbitrary consumer data — not used by the renderer. */
  data?: Record<string, unknown>;
};

export type NodeRenderProps = {
  node: FlowNode;
  variant: NodeVariant;
  isSelected: boolean;
  isHovered: boolean;
};

// ── Edge ─────────────────────────────────────────────────
//
// Edges connect nodes. Route controls geometry, animate
// controls motion (stream = continuous dash flow, trace =
// dot along path, pulse = flash on traversal).

export type EdgeRoute = "straight" | "orthogonal" | "curved" | "arc";
export type EdgeAnimate = "none" | "pulse" | "stream" | "trace";

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  route?: EdgeRoute;
  dashed?: boolean;
  bidirectional?: boolean;
  problem?: boolean;
  animate?: EdgeAnimate;
  /** Override the computed SVG path for custom edge routing (e.g., loopbacks). */
  pathOverride?: string;
  /** Override the computed edge midpoint for label placement on custom paths. */
  midpointOverride?: { x: number; y: number };
  data?: Record<string, unknown>;
  verb?: string;
  description?: string;
};

// ── Group ────────────────────────────────────────────────
//
// Visual containment boundaries. For HLD system boundaries,
// architecture layers, package scopes.

export type GroupStyle = "solid" | "dashed" | "filled";

export type FlowGroup = {
  id: string;
  label: string;
  nodeIds: string[];
  style?: GroupStyle;
  color?: string;
  pad?: number;
  description?: string;
};

// ── Annotation ───────────────────────────────────────────

export type FlowAnnotation = {
  x: number;
  y: number;
  text: string;
};

// ── Timeline (process flow animation) ────────────────────
//
// A timeline layers temporal behavior on top of the spatial
// DAG. Scenarios are named paths through the graph. Each
// step lands on a node and can carry its own detail content.

export type FlowStep = {
  nodeId: string;
  duration?: number;
  label?: string;
  detail?: ReactNode;
};

export type FlowScenario = {
  id: string;
  name: string;
  description?: string;
  path: FlowStep[];
};

export type FlowTimeline = {
  scenarios: FlowScenario[];
  autoPlay?: boolean;
  stepDuration?: number;
  loop?: boolean;
};

// ── Config ───────────────────────────────────────────────

export type FlowConfig = {
  nodeDefaults?: Partial<Pick<FlowNode, "w" | "h" | "shape">>;
  edgeDefaults?: Partial<Pick<FlowEdge, "route" | "dashed">>;
  showHeader?: boolean;
  detailPanelHeight?: number | "auto";
  minTouchTarget?: number;
};

// ── Diagram definition ───────────────────────────────────
//
// The complete declarative description of a diagram.
// Thin wrapper components supply this; the renderer consumes it.

export type FlowDiagramDef = {
  id: string;
  title: string;
  subtitle?: string;
  viewBox: string;

  nodes: FlowNode[];
  edges: FlowEdge[];
  groups?: FlowGroup[];
  annotations?: FlowAnnotation[];
  timeline?: FlowTimeline;

  hint?: string;
  config?: FlowConfig;

  thesis: string;
  protagonist?: string;
  tension?: string;
  arc?: string[];
};

// ── Resolved state (output of the hook) ──────────────────
//
// The hook resolves raw data + interaction state into these
// types. Renderers consume resolved state — they never
// compute visibility or variant themselves.

export type NodeVariant =
  | "idle"
  | "selected"
  | "hovered"
  | "dimmed"
  | "active"
  | "visited"
  | "future"
  | "disabled"
  | "error";

export type EdgeVariant =
  | "idle"
  | "lit"
  | "dimmed"
  | "active"
  | "visited"
  | "problem";

export type ResolvedNode = FlowNode & {
  variant: NodeVariant;
  opacity: number;
  interactive: boolean;
  resolvedW: number;
  resolvedH: number;
  arcIndex: number | null;
  isProtagonist: boolean;
  effectiveRole: NodeRole;
};

export type ResolvedEdge = FlowEdge & {
  key: string;
  path: string;
  midpoint: { x: number; y: number };
  direction: { dx: number; dy: number };
  variant: EdgeVariant;
  opacity: number;
  arrowTip: { x: number; y: number };
  arrowDir: { x: number; y: number };
  startArrowTip: { x: number; y: number } | null;
  startArrowDir: { x: number; y: number } | null;
};

export type ResolvedGroup = FlowGroup & {
  bounds: { x: number; y: number; w: number; h: number } | null;
  opacity: number;
};

// ── Hook options ─────────────────────────────────────────

export type UseFlowDiagramOptions = {
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  defaultSelectedId?: string | null;

  hoveredId?: string | null;
  onHover?: (id: string | null) => void;

  nodeStates?: Record<string, NodeVariant>;
  multiSelect?: boolean;
};
