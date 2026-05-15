"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  FlowDiagramDef,
  FlowNode,
  FlowEdge,
  UseFlowDiagramOptions,
  NodeVariant,
  NodeRole,
  EdgeVariant,
  ResolvedNode,
  ResolvedEdge,
  ResolvedGroup,
} from "./types";
import {
  DEFAULTS,
  resolveW,
  resolveH,
  computeEdgeWithArrow,
  computeEdgeMidpoint,
  computeEdgeDirection,
  computeParallelOffsets,
  computeGroupBounds,
} from "./geometry";
import { useFlowTimeline } from "./use-flow-timeline";
import type { UseFlowTimelineReturn } from "./use-flow-timeline";

// ── Variant resolution ───────────────────────────────────
//
// Maps raw interaction state into visual variants. The
// renderer never decides opacity or cursor — the hook does.

const VARIANT_OPACITY: Record<NodeVariant, number> = {
  idle: 1,
  selected: 1,
  hovered: 1,
  dimmed: 0.75,
  active: 1,
  visited: 0.7,
  future: 0.28,
  disabled: 0.2,
  error: 1,
};

const EDGE_VARIANT_OPACITY: Record<EdgeVariant, number> = {
  idle: 0.8,
  lit: 1,
  dimmed: 0.4,
  active: 1,
  visited: 0.7,
  problem: 0.85,
};

function resolveNodeVariant(
  nodeId: string,
  selectedId: string | null,
  hoveredId: string | null,
  externalStates?: Record<string, NodeVariant>,
): NodeVariant {
  if (externalStates?.[nodeId]) return externalStates[nodeId];
  if (nodeId === selectedId) return "selected";
  if (nodeId === hoveredId) return "hovered";
  if (selectedId !== null) return "dimmed";
  return "idle";
}

function resolveEdgeVariant(
  edge: FlowEdge,
  selectedId: string | null,
  externalStates?: Record<string, NodeVariant>,
): EdgeVariant {
  if (edge.problem) return "problem";

  if (externalStates) {
    const fromState = externalStates[edge.from];
    const toState = externalStates[edge.to];
    if (fromState === "active" || toState === "active") return "active";
    if (fromState === "visited" && toState === "visited") return "visited";
    if (fromState === "future" || toState === "future") return "idle";
    if (fromState === "dimmed" && toState === "dimmed") return "dimmed";
    if (fromState === "disabled" || toState === "disabled") return "dimmed";
  }

  if (selectedId === null) return "idle";
  if (selectedId === edge.from || selectedId === edge.to) return "lit";
  return "dimmed";
}

// ── Hook ─────────────────────────────────────────────────

export type SceneContext = {
  protagonistId: string | null;
  arcMap: Map<string, number>;
  roleMap: Map<string, NodeRole>;
  staggerMap: Map<string, number>;
};

export type UseFlowDiagramReturn = {
  selectedId: string | null;
  hoveredId: string | null;

  select: (id: string) => void;
  hover: (id: string | null) => void;
  clearSelection: () => void;

  resolvedNodes: ResolvedNode[];
  resolvedEdges: ResolvedEdge[];
  resolvedGroups: ResolvedGroup[];

  nodeMap: Record<string, FlowNode>;
  sceneContext: SceneContext;

  timeline: UseFlowTimelineReturn | null;
};

export function useFlowDiagram(
  def: FlowDiagramDef,
  options?: UseFlowDiagramOptions,
): UseFlowDiagramReturn {
  const isControlled = options?.selectedId !== undefined;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    options?.defaultSelectedId ?? null,
  );
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);

  const selectedId = isControlled ? (options.selectedId ?? null) : internalSelectedId;
  const hoveredId = options?.hoveredId !== undefined ? options.hoveredId : internalHoveredId;
  const nodeStates = options?.nodeStates;

  const select = useCallback(
    (id: string) => {
      const next = selectedId === id ? null : id;
      if (!isControlled) setInternalSelectedId(next);
      options?.onSelect?.(next);
    },
    [selectedId, isControlled, options],
  );

  const hover = useCallback(
    (id: string | null) => {
      if (options?.onHover) options.onHover(id);
      else setInternalHoveredId(id);
    },
    [options],
  );

  const clearSelection = useCallback(() => {
    if (!isControlled) setInternalSelectedId(null);
    options?.onSelect?.(null);
  }, [isControlled, options]);

  // Timeline
  const timeline = useFlowTimeline(def.timeline ?? null);

  // Merge timeline state into nodeStates
  const mergedNodeStates = useMemo(() => {
    if (!timeline || !timeline.isActive) return nodeStates;
    const states: Record<string, NodeVariant> = { ...nodeStates };
    const scenario = timeline.currentScenario;
    if (!scenario) return states;

    const path = scenario.path;
    for (const n of def.nodes) {
      if (!(n.id in states)) states[n.id] = "disabled";
    }
    for (let i = 0; i < path.length; i++) {
      const nid = path[i].nodeId;
      if (i === timeline.currentStepIdx) {
        states[nid] = "active";
      } else if (i < timeline.currentStepIdx) {
        if (states[nid] !== "active") states[nid] = "visited";
      } else {
        if (states[nid] === "disabled") states[nid] = "future";
      }
    }
    return states;
  }, [timeline, nodeStates, def.nodes]);

  // Node map
  const nodeMap = useMemo(
    () => Object.fromEntries(def.nodes.map((n) => [n.id, n])),
    [def.nodes],
  );

  // Scene context: semantic analysis across all dimensions
  const sceneContext = useMemo((): SceneContext => {
    const protagonistId = def.protagonist
      ?? def.nodes.find((n) => n.role === "protagonist")?.id
      ?? null;

    const arcMap = new Map<string, number>();
    if (def.arc) {
      def.arc.forEach((nodeId, idx) => arcMap.set(nodeId, idx));
    }

    const roleMap = new Map<string, NodeRole>();
    for (const n of def.nodes) {
      if (n.role) {
        roleMap.set(n.id, n.role);
      } else if (n.id === protagonistId) {
        roleMap.set(n.id, "protagonist");
      } else {
        roleMap.set(n.id, "supporting");
      }
    }

    const arcNodes = def.arc ?? [];
    const nonArcNodes = def.nodes
      .filter((n) => !arcMap.has(n.id))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((n) => n.id);
    const staggerOrder = [...arcNodes, ...nonArcNodes];
    const staggerMap = new Map<string, number>();
    staggerOrder.forEach((id, idx) => staggerMap.set(id, idx));

    if (process.env.NODE_ENV === "development") {
      if (!protagonistId && def.nodes.length > 2) {
        console.warn(`[FlowDiagram "${def.id}"] No protagonist declared.`);
      }
      const bare = def.edges.filter((e) => !e.description && !e.verb);
      if (bare.length > 0) {
        console.warn(`[FlowDiagram "${def.id}"] ${bare.length}/${def.edges.length} edges lack verb/description.`);
      }
      for (const n of def.nodes) {
        const role = roleMap.get(n.id) ?? "supporting";
        const scale = DEFAULTS.role[role].scale;
        const nw = resolveW(n, def.config?.nodeDefaults?.w) * scale;
        const charW = DEFAULTS.font.label * DEFAULTS.role[role].fontMultiplier * 0.62;
        const minW = n.label.length * charW + 8;
        if (minW > nw) {
          console.warn(`[FlowDiagram "${def.id}"] Node "${n.id}" label "${n.label}" needs ~${Math.ceil(minW)}px but node is ${Math.round(nw)}px wide.`);
        }
      }
    }

    return { protagonistId, arcMap, roleMap, staggerMap };
  }, [def.nodes, def.edges, def.protagonist, def.arc, def.id]);

  // Edge offsets
  const edgeOffsets = useMemo(
    () => computeParallelOffsets(def.edges),
    [def.edges],
  );

  // Defaults from config
  const defaultW = def.config?.nodeDefaults?.w;
  const defaultH = def.config?.nodeDefaults?.h;

  // Resolved nodes
  const resolvedNodes: ResolvedNode[] = useMemo(
    () =>
      def.nodes.map((n) => {
        const variant = resolveNodeVariant(n.id, selectedId, hoveredId, mergedNodeStates);
        const effectiveRole = sceneContext.roleMap.get(n.id) ?? "supporting";
        const isProtagonist = n.id === sceneContext.protagonistId;
        const roleScale = DEFAULTS.role[effectiveRole].scale;
        return {
          ...n,
          accent: n.accent ?? isProtagonist,
          variant,
          opacity: VARIANT_OPACITY[variant],
          interactive: variant !== "disabled" && !timeline?.isActive,
          resolvedW: resolveW(n, defaultW) * roleScale,
          resolvedH: resolveH(n, defaultH) * roleScale,
          arcIndex: sceneContext.arcMap.get(n.id) ?? null,
          isProtagonist,
          effectiveRole,
        };
      }),
    [def.nodes, selectedId, hoveredId, mergedNodeStates, defaultW, defaultH, sceneContext, timeline?.isActive],
  );

  // Resolved edges
  const resolvedEdges: ResolvedEdge[] = useMemo(
    () =>
      def.edges.map((e, i) => {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        if (!from || !to) {
          return {
            ...e,
            key: `${e.from}-${e.to}-${i}`,
            path: "",
            midpoint: { x: 0, y: 0 },
            direction: { dx: 1, dy: 0 },
            variant: "idle" as EdgeVariant,
            opacity: 0,
            arrowTip: { x: 0, y: 0 },
            arrowDir: { x: 0, y: 0 },
            startArrowTip: null,
            startArrowDir: null,
          };
        }

        const route = e.route ?? def.config?.edgeDefaults?.route ?? "straight";
        const variant = resolveEdgeVariant(e, selectedId, mergedNodeStates);
        const arrow = computeEdgeWithArrow(from, to, route, e.bidirectional);

        return {
          ...e,
          key: `${e.from}-${e.to}-${i}`,
          path: e.pathOverride ?? arrow.path,
          midpoint: e.midpointOverride ?? computeEdgeMidpoint(from, to, route),
          direction: computeEdgeDirection(from, to, route),
          variant,
          opacity: EDGE_VARIANT_OPACITY[variant],
          arrowTip: arrow.arrowTip,
          arrowDir: arrow.arrowDir,
          startArrowTip: arrow.startArrowTip,
          startArrowDir: arrow.startArrowDir,
        };
      }),
    [def.edges, nodeMap, selectedId, mergedNodeStates, def.config?.edgeDefaults?.route],
  );

  // Resolved groups
  const resolvedGroups: ResolvedGroup[] = useMemo(
    () =>
      (def.groups ?? []).map((g) => {
        const bounds = computeGroupBounds(g, nodeMap);
        const anySelected =
          selectedId !== null && g.nodeIds.includes(selectedId);
        return {
          ...g,
          bounds,
          opacity: selectedId && !anySelected ? 0.15 : 1,
        };
      }),
    [def.groups, nodeMap, selectedId],
  );

  return {
    selectedId,
    hoveredId,
    select,
    hover,
    clearSelection,
    resolvedNodes,
    resolvedEdges,
    resolvedGroups,
    nodeMap,
    sceneContext,
    timeline,
  };
}
