import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "grid",
    label: "VirtualGrid",
    sublabel: "viewport · cell recycling · scroll",
    x: 40,
    y: 6,
    w: 400,
    h: 28,
  },
  {
    id: "celleditor",
    label: "CellEditor",
    sublabel: "inline input · formula bar",
    x: 40,
    y: 50,
    w: 160,
    h: 22,
  },
  {
    id: "selection",
    label: "SelectionManager",
    sublabel: "range · multi-select · anchor",
    x: 220,
    y: 50,
    w: 180,
    h: 22,
  },
  {
    id: "engine",
    label: "FormulaEngine",
    sublabel: "parse · evaluate · memoize",
    x: 40,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "depgraph",
    label: "DepGraph (DAG)",
    sublabel: "deps · dependents · topoSort",
    x: 240,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "store",
    label: "CellStore",
    sublabel: "sparse map · raw/computed/format",
    x: 140,
    y: 136,
    w: 200,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "grid", to: "celleditor", verb: "opens inline editor" },
  { from: "grid", to: "selection", verb: "click/drag selects" },
  { from: "celleditor", to: "engine", verb: "commits raw value" },
  { from: "engine", to: "depgraph", verb: "registers deps" },
  { from: "depgraph", to: "store", verb: "topoSort → recalc order" },
  { from: "engine", to: "store", verb: "writes computed values" },
  {
    from: "store",
    to: "grid",
    dashed: true,
    verb: "viewport cells re-render",
    pathOverride: "M 140,148 C 6,148 6,20 40,20",
    midpointOverride: { x: 6, y: 84 },
  },
];

// ── Type definitions ──────────────────────────────────────────────

const TYPES: ArchTypeDef[] = [
  {
    name: "CellData",
    kind: "state",
    fields: [
      { name: "raw", type: "string" },
      { name: "computed", type: "CellValue" },
      { name: "formula", type: "boolean" },
      { name: "deps", type: "string[]" },
      { name: "format", type: "CellFormat" },
    ],
  },
  {
    name: "FormulaAST",
    kind: "API response",
    fields: [
      { name: "type", type: "'ref'|'fn'|'op'|'lit'" },
      { name: "value", type: "string" },
      { name: "children", type: "FormulaAST[]?" },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const editCellScenario: ArchStep[] = [
  {
    nodeId: "grid",
    caption: "User double-clicks D2 — grid converts screen coords to cell address, enters edit mode",
  },
  {
    nodeId: "celleditor",
    caption: "User types =B2*C2 and presses Enter — CellEditor commits raw string to FormulaEngine",
  },
  {
    nodeId: "engine",
    caption: "Tokenizer splits '=B2*C2' into [ref(B2), op(*), ref(C2)] — parser builds AST",
    payload: { type: TYPES[1]!, sample: ['{ type: "op", value: "*",', '  children: [ref(B2), ref(C2)] }'] },
  },
  {
    nodeId: "depgraph",
    caption: "D2.deps = [B2, C2] — both cells add D2 to dependents. Cycle check passes",
    stateAfter: [{ key: "D2.deps", value: "[B2, C2]" }, { key: "B2.dependents", value: "[D2]" }],
  },
  {
    nodeId: "store",
    caption: "evaluate(D2): B2 (29.99) × C2 (5) = 149.95 — stored as computed value",
    payload: { type: TYPES[0]!, sample: ['{ raw: "=B2*C2",', '  computed: 149.95 }'] },
  },
  {
    nodeId: "grid",
    caption: "Only D2 needs re-render — grid maps to viewport position and updates single cell",
  },
];

const propagationScenario: ArchStep[] = [
  {
    nodeId: "celleditor",
    caption: "User changes B2 from 29.99 to 39.99 — B2 is referenced by D2 (=B2*C2) transitively by D5",
  },
  {
    nodeId: "depgraph",
    caption: "Walk B2.dependents → [D2] → mark dirty. Walk D2.dependents → [D5] → mark dirty",
    stateAfter: [{ key: "dirty", value: "[D2, D5]" }],
  },
  {
    nodeId: "depgraph",
    caption: "Topological sort ensures correct recalc order: B2 → D2 → D5",
    stateAfter: [{ key: "recalcOrder", value: "[B2, D2, D5]" }],
  },
  {
    nodeId: "engine",
    caption: "Recalculate D2: =B2*C2 → 39.99 × 5 = 199.95",
  },
  {
    nodeId: "engine",
    caption: "Recalculate D5: =SUM(D2:D4) → 199.95 + 149.97 + 199.90 = 549.82",
  },
  {
    nodeId: "grid",
    caption: "Only 2 cells changed — grid re-renders D2 and D5 out of 2,600 total cells",
  },
];

const circularRefScenario: ArchStep[] = [
  {
    nodeId: "celleditor",
    caption: "User enters =D5+1 in cell D5 — a self-referencing formula",
  },
  {
    nodeId: "depgraph",
    caption: "DFS walks deps from D5 — finds D5 again → cycle detected before registration",
    stateAfter: [{ key: "cycleDetected", value: "true" }, { key: "cyclePath", value: "D5 → D5" }],
  },
  {
    nodeId: "store",
    caption: "D5.computed = null, D5.error = '#CIRCULAR!' — dependents also get #REF! errors",
    stateAfter: [{ key: "D5.error", value: "#CIRCULAR!" }, { key: "D5.computed", value: "null" }],
  },
  {
    nodeId: "grid",
    caption: "D5 displays '#CIRCULAR!' in error styling — formula bar shows invalid formula for fixing",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const SPREADSHEET_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "A spreadsheet engine separates editing, formula evaluation, dependency tracking, and rendering — the DAG determines recalculation order while the virtual grid limits DOM updates to visible cells.",
  viewBox: "0 0 480 168",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "edit-cell",
      label: "Edit a formula cell",
      blurb: "User edits D2 with =B2*C2 — trace from grid to store and back",
      steps: editCellScenario,
    },
    {
      id: "propagation",
      label: "Change propagation",
      blurb: "Changing B2 cascades through the dependency graph to D5",
      steps: propagationScenario,
    },
    {
      id: "circular-ref",
      label: "Circular reference",
      blurb: "Self-referencing formula triggers cycle detection and error state",
      steps: circularRefScenario,
    },
  ],
};
