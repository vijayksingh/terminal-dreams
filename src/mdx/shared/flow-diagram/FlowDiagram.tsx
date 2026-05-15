"use client";

import type { ReactNode } from "react";
import type { FlowDiagramDef, ResolvedNode, ResolvedEdge, UseFlowDiagramOptions } from "./types";
import { useFlowDiagram } from "./use-flow-diagram";
import {
  FlowMarkerDefs,
  FlowGroupBox,
  FlowAnnotationText,
  FlowEdgePath,
  FlowNodeShape,
  FlowNodeLabel,
  FlowNodeHitArea,
  FlowArcIndicator,
  FlowToken,
  FlowDetailPanel,
  FlowTimelineControls,
  FlowAnimationStyles,
} from "./primitives";

// ── Props ────────────────────────────────────────────────
//
// Level 0: <FlowDiagram {...data} />
// Level 1: <FlowDiagram {...data}>{(node) => <Custom />}</FlowDiagram>
// Level 2: <FlowDiagram {...data} selectedId={id} onSelect={setId} />
// Level 3: Use useFlowDiagram() hook directly for full control.

type FlowDiagramProps = FlowDiagramDef &
  UseFlowDiagramOptions & {
    children?: (node: ResolvedNode) => ReactNode;
  };

export function FlowDiagram({
  children,
  selectedId: controlledSelectedId,
  onSelect,
  defaultSelectedId,
  hoveredId: controlledHoveredId,
  onHover,
  nodeStates,
  multiSelect,
  ...def
}: FlowDiagramProps) {
  const flow = useFlowDiagram(def, {
    selectedId: controlledSelectedId,
    onSelect,
    defaultSelectedId,
    hoveredId: controlledHoveredId,
    onHover,
    nodeStates,
    multiSelect,
  });

  const showHeader = def.config?.showHeader !== false;
  const hasTimeline = !!flow.timeline;
  const hasEdgeAnimations = def.edges.some((e) => e.animate && e.animate !== "none");

  const selectedNode = flow.selectedId
    ? flow.resolvedNodes.find((n) => n.id === flow.selectedId) ?? null
    : null;

  // In timeline mode, show the active node's step detail
  const timelineNode =
    hasTimeline && flow.timeline?.activeNodeId
      ? flow.resolvedNodes.find((n) => n.id === flow.timeline!.activeNodeId) ?? null
      : null;

  const detailNode = hasTimeline ? timelineNode : selectedNode;

  return (
    <div className="my-8">
      {hasEdgeAnimations && <FlowAnimationStyles />}

      {/* Screen-reader announcement for selection changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic
        className="sr-only"
      >
        {selectedNode
          ? `Selected ${selectedNode.label}${selectedNode.description ? `. ${selectedNode.description}` : ""}`
          : ""}
      </div>

      {/* Header */}
      {showHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-accent)",
            }}
          >
            {def.title}
          </span>
          {def.subtitle && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--color-muted)",
              }}
            >
              {def.subtitle}
            </span>
          )}
        </div>
      )}

      {/* Thesis + tension (always visible orientation) */}
      {def.thesis && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.5,
            fontWeight: 500,
            color: "var(--color-text)",
            marginBottom: def.tension ? 3 : 12,
          }}
        >
          {def.thesis}
        </div>
      )}
      {def.tension && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontStyle: "italic",
            color: "var(--color-accent)",
            marginBottom: 12,
          }}
        >
          {def.tension}
        </div>
      )}

      {/* Scenario pills (timeline mode) */}
      {hasTimeline && flow.timeline!.scenarios.length > 1 && (
        <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
          {flow.timeline!.scenarios.map((s, i) => {
            const active = i === flow.timeline!.currentScenarioIdx;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => flow.timeline!.selectScenario(i)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--color-accent)" : "var(--color-muted)",
                  background: "none",
                  border: "none",
                  borderBottom: active
                    ? "1.5px solid var(--color-accent)"
                    : "1.5px solid transparent",
                  paddingBottom: 4,
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* SVG canvas */}
      <svg
        viewBox={def.viewBox}
        width="100%"
        style={{ display: "block" }}
        onClick={() => flow.clearSelection()}
        onKeyDown={(ev) => {
          if (ev.key === "Escape" && flow.selectedId) {
            ev.preventDefault();
            flow.clearSelection();
          }
        }}
        role="img"
        aria-label={`${def.title}: ${def.thesis}`}
        aria-roledescription="interactive diagram"
      >
        <FlowMarkerDefs id={def.id} />

        {/* Groups (behind everything) */}
        {flow.resolvedGroups.map((g) => (
          <FlowGroupBox key={g.id} group={g} />
        ))}

        {/* Annotations */}
        {def.annotations?.map((a, i) => (
          <FlowAnnotationText key={i} annotation={a} />
        ))}

        {/* Edges */}
        {flow.resolvedEdges.map((e) => (
          <FlowEdgePath key={e.key} edge={e} diagramId={def.id} />
        ))}

        {/* Nodes */}
        {flow.resolvedNodes.map((n) => (
          <FlowNodeHitArea
            key={n.id}
            node={n}
            onSelect={flow.select}
            onHover={flow.hover}
            index={flow.sceneContext.staggerMap.get(n.id) ?? 0}
            diagramId={def.id}
            allNodes={flow.resolvedNodes}
          >
            <FlowNodeShape node={n} />
            <FlowNodeLabel node={n} />
          </FlowNodeHitArea>
        ))}

        {/* Arc indicators (numbered dots) */}
        {flow.resolvedNodes.map((n) => (
          <FlowArcIndicator key={`arc-${n.id}`} node={n} />
        ))}

        {/* Token (timeline mode) */}
        {hasTimeline && flow.timeline!.activeNodeId && (() => {
          const activeNode = flow.nodeMap[flow.timeline!.activeNodeId!];
          if (!activeNode) return null;
          return (
            <FlowToken x={activeNode.x} y={activeNode.y} variant="ring" />
          );
        })()}
      </svg>

      {/* Detail panel */}
      <FlowDetailPanel
        selectedNode={detailNode}
        hint={def.hint}
        height={def.config?.detailPanelHeight}
        edges={flow.resolvedEdges}
        nodeMap={flow.nodeMap}
      >
        {children}
      </FlowDetailPanel>

      {/* Timeline controls */}
      {hasTimeline && <FlowTimelineControls timeline={flow.timeline!} />}
    </div>
  );
}

export default FlowDiagram;
