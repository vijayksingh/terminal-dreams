// ── Public API ───────────────────────────────────────────
//
// Layer 0: Types
export type {
  FlowNode,
  FlowEdge,
  FlowGroup,
  FlowAnnotation,
  FlowStep,
  FlowScenario,
  FlowTimeline,
  FlowDiagramDef,
  FlowConfig,
  NodeShape,
  NodeRole,
  EdgeRoute,
  EdgeAnimate,
  GroupStyle,
  NodeVariant,
  EdgeVariant,
  ResolvedNode,
  ResolvedEdge,
  ResolvedGroup,
  NodeRenderProps,
  UseFlowDiagramOptions,
} from "./types";

// Layer 1: Headless hooks
export { useFlowDiagram } from "./use-flow-diagram";
export type { UseFlowDiagramReturn } from "./use-flow-diagram";
export { useFlowTimeline } from "./use-flow-timeline";
export type { UseFlowTimelineReturn } from "./use-flow-timeline";

// Layer 1.5: Geometry utilities
export { arrowheadPath, ARROW_LEN } from "./geometry";
export type { EdgeWithArrow } from "./geometry";

// Layer 2: Rendering primitives
export {
  FlowMarkerDefs,
  FlowNodeShape,
  FlowNodeLabel,
  FlowNodeHitArea,
  FlowArcIndicator,
  FlowEdgePath,
  FlowGroupBox,
  FlowAnnotationText,
  FlowToken,
  FlowDetailPanel,
  FlowTimelineControls,
  FlowAnimationStyles,
} from "./primitives";

// Layer 3: Composed component
export { FlowDiagram } from "./FlowDiagram";
