import type {
  ArchScenarioPlayerConfig,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "canvas",
    label: "CanvasRenderer",
    sublabel: "static + interactive layers · viewport",
    x: 40,
    y: 6,
    w: 400,
    h: 28,
  },
  {
    id: "pointer",
    label: "PointerTracker",
    sublabel: "capture · coalesce · gestures",
    x: 40,
    y: 50,
    w: 170,
    h: 22,
  },
  {
    id: "hittest",
    label: "HitTester",
    sublabel: "R-tree · bounding box · shapes",
    x: 230,
    y: 50,
    w: 170,
    h: 22,
  },
  {
    id: "scene",
    label: "SceneGraph",
    sublabel: "shapes · z-order · selection",
    x: 40,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "sync",
    label: "SyncEngine",
    sublabel: "CRDT ops · cursor broadcast",
    x: 240,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "commands",
    label: "CommandStack",
    sublabel: "undo · redo · inverse ops",
    x: 140,
    y: 136,
    w: 200,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "canvas", to: "pointer", verb: "pointer events" },
  { from: "pointer", to: "hittest", verb: "coalesced points" },
  { from: "hittest", to: "scene", verb: "hit shape or empty" },
  { from: "scene", to: "sync", verb: "shape CRDT ops" },
  { from: "scene", to: "commands", verb: "push command" },
  { from: "sync", to: "scene", verb: "remote ops merge" },
  {
    from: "commands",
    to: "canvas",
    dashed: true,
    verb: "invalidate + redraw",
    pathOverride: "M 140,148 C 6,148 6,20 40,20",
    midpointOverride: { x: 6, y: 84 },
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const drawFreehandScenario: ArchStep[] = [
  {
    nodeId: "canvas",
    caption: "User presses pen on canvas — pointerdown fires, setPointerCapture locks events to canvas",
  },
  {
    nodeId: "pointer",
    caption: "PointerTracker calls getCoalescedEvents() — recovers 2-6 sub-pixel positions per frame",
    stateAfter: [{ key: "captured", value: "true" }, { key: "points", value: "1" }],
  },
  {
    nodeId: "scene",
    caption: "SceneGraph creates a new freehand Shape with the initial point array",
    stateAfter: [{ key: "newShape.kind", value: "freehand" }, { key: "newShape.points", value: "[{x,y}...]" }],
  },
  {
    nodeId: "pointer",
    caption: "Each pointermove appends coalesced points — 60+ samples/sec from hardware",
    stateAfter: [{ key: "points", value: "48" }],
  },
  {
    nodeId: "canvas",
    caption: "Interactive layer redraws only the new stroke segment — static layer stays cached",
  },
  {
    nodeId: "commands",
    caption: "On pointerup: push AddShape command to undo stack, finalize path",
    stateAfter: [{ key: "undoStack", value: "[AddShape]" }],
  },
];

const selectAndMoveScenario: ArchStep[] = [
  {
    nodeId: "canvas",
    caption: "User clicks on canvas in select mode — pointerdown at (150, 120)",
  },
  {
    nodeId: "hittest",
    caption: "R-tree query: which shapes contain (150, 120)? Returns rectangle (z-index 2)",
    stateAfter: [{ key: "hitResult", value: "rect-1" }, { key: "queryTime", value: "0.1ms" }],
  },
  {
    nodeId: "scene",
    caption: "Selection updated: rect-1 selected, 8 resize handles + rotation handle rendered",
    stateAfter: [{ key: "selected", value: "[rect-1]" }, { key: "handles", value: "9" }],
  },
  {
    nodeId: "pointer",
    caption: "User drags — pointer delta applied as transform to shape position",
    stateAfter: [{ key: "dragDelta", value: "{dx: 40, dy: 25}" }],
  },
  {
    nodeId: "commands",
    caption: "On pointerup: push MoveShape command with before/after positions",
    stateAfter: [{ key: "command", value: "MoveShape(rect-1, {40,25})" }],
  },
  {
    nodeId: "sync",
    caption: "CRDT op broadcast: update rect-1 position — LWW per-property merge",
    stateAfter: [{ key: "op", value: "update(rect-1, {x,y})" }, { key: "lamport", value: "42" }],
  },
];

const collaborativeEditScenario: ArchStep[] = [
  {
    nodeId: "sync",
    caption: "Remote user Alice moves ellipse-2 while local user Bob adds a rectangle",
  },
  {
    nodeId: "sync",
    caption: "Both ops arrive at the server — per-property LWW: no conflict (different shapes)",
    stateAfter: [{ key: "alice.op", value: "move(ellipse-2)" }, { key: "bob.op", value: "add(rect-3)" }],
  },
  {
    nodeId: "scene",
    caption: "SceneGraph merges both ops: ellipse-2 moves, rect-3 appears",
    stateAfter: [{ key: "shapes.count", value: "5" }],
  },
  {
    nodeId: "canvas",
    caption: "Static layer invalidated — full redraw with new positions. Cursors update on interactive layer",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const WHITEBOARD_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "A collaborative whiteboard separates pointer input, hit testing, scene state, and sync — the dual-canvas architecture ensures cursor updates never trigger expensive shape redraws.",
  viewBox: "0 0 480 168",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "draw-freehand",
      label: "Freehand drawing",
      blurb: "Pen stroke from pointerdown through coalesced events to finalized shape",
      steps: drawFreehandScenario,
    },
    {
      id: "select-move",
      label: "Select and move",
      blurb: "Click hit-tests shapes via R-tree, drag applies transform, sync broadcasts",
      steps: selectAndMoveScenario,
    },
    {
      id: "collaborative-edit",
      label: "Concurrent edits",
      blurb: "Two users edit different shapes — per-property LWW merges without conflict",
      steps: collaborativeEditScenario,
    },
  ],
};
