import type { ReactNode } from "react";
import type {
  FlowDiagramDef,
  FlowNode,
  FlowEdge,
} from "@/mdx/shared/flow-diagram";

// ── Type definition for the popout type-preview card ────────────────
//
// Each scenario step can declare what payload is being carried along
// the edge that lands at the active node. The card surfaces both the
// type contract and a concrete sample value so the learner sees
// shape and instance at the same time.

export type ArchTypeField = {
  name: string;
  type: string;
  note?: string;
};

export type ArchTypeDef = {
  name: string;
  extends?: string;
  fields: ArchTypeField[];
  /** Optional kind tag (e.g., "API response", "callback", "props") */
  kind?: string;
};

export type ArchPayload = {
  /** The TypeScript contract being passed. */
  type: ArchTypeDef;
  /** A short JSON-ish sample value, displayed line by line. */
  sample?: string[];
};

// ── State diff entries ──────────────────────────────────────────────
//
// Each step carries a snapshot of the "interesting" state on the
// stateful node (e.g. Gallery). We diff consecutive snapshots to
// highlight what changed.

export type ArchStateEntry = {
  key: string;
  value: string;
};

// ── Scenario step ───────────────────────────────────────────────────

export type ArchStep = {
  /** Node id from the diagram that is active during this step. */
  nodeId: string;
  /** Optional duration override (ms). Defaults to the scenario step duration. */
  duration?: number;
  /** Headline shown above the diagram while this step is active. */
  caption: string;
  /**
   * Payload riding the edge that lands at this node. The edge is
   * inferred from the previous step's nodeId → this step's nodeId.
   * Omit for the first step (origin) or steps that don't carry data.
   */
  payload?: ArchPayload;
  /**
   * Snapshot of the stateful node's relevant state after this step.
   * Consecutive snapshots are diffed to highlight changes.
   */
  stateAfter?: ArchStateEntry[];
};

// ── Scenario ────────────────────────────────────────────────────────

export type ArchScenario = {
  id: string;
  /** Short label for the scenario tab (e.g., "Click image"). */
  label: string;
  /** One-line description shown below the tab strip. */
  blurb: string;
  steps: ArchStep[];
};

// ── Widget config ───────────────────────────────────────────────────
//
// What a lesson author hands to <ArchitectureScenarioPlayer>.
// The diagram shape itself uses the upstream FlowDiagram types, so
// lessons can pass their existing nodes/edges and add scenarios on top.

export type ArchScenarioPlayerConfig = {
  /** Headline for the widget. Defaults to "Architecture". */
  title?: string;
  /** Thesis statement shown above the diagram. */
  thesis: string;
  /** SVG viewBox for the diagram canvas. */
  viewBox: string;
  /** Diagram nodes (positioned in viewBox space). */
  nodes: FlowNode[];
  /** Diagram edges. */
  edges: FlowEdge[];
  /** Optional protagonist (highlighted node) — usually the stateful container. */
  protagonist?: string;
  /** Scenarios the player can cycle through. */
  scenarios: ArchScenario[];
  /** Optional caption rendered below the player. */
  footnote?: ReactNode;
  /** Optional FlowDiagram passthrough config. */
  flowConfig?: FlowDiagramDef["config"];
};

// ── Props ───────────────────────────────────────────────────────────

export type ArchitectureScenarioPlayerProps = {
  config: ArchScenarioPlayerConfig;
};
