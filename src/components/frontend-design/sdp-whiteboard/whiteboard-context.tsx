"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing";

export type Point = { x: number; y: number };

export type ShapeKind = "freehand" | "rect" | "ellipse" | "text" | "arrow";

export type Shape = {
  id: string;
  kind: ShapeKind;
  points: Point[];
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  selected: boolean;
  locked: boolean;
  zIndex: number;
};

export type DrawTool = "select" | "pen" | "rect" | "ellipse" | "text" | "arrow" | "eraser";

export type CursorPosition = {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

export type SyncStrategy = "lww" | "ot" | "crdt";

export type CanvasLayer = "grid" | "shapes" | "selection" | "cursors";

export type UndoOp = {
  type: "add" | "remove" | "modify";
  shapeId: string;
  before?: Partial<Shape>;
  after?: Partial<Shape>;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeDef = {
  name: string;
  category: string;
  extends?: string;
  fields: { name: string; type: string; note?: string }[];
};

// ── Feature unlock map ──────────────────────────────────────────────

const FEATURE_UNLOCK: Record<string, number> = {
  canvasRender: 4,
  pointerCapture: 5,
  shapeModel: 6,
  hitTesting: 7,
  selectionHandles: 8,
  layerSeparation: 9,
  coalescedEvents: 10,
  undoRedo: 11,
  crdtSync: 12,
  cursorPresence: 13,
  spatialIndex: 14,
  accessibleCanvas: 15,
};

// ── Scope items ────────────────────────────────────────────────────

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "freehand", label: "Freehand Drawing", description: "Pen tool with smooth path interpolation" },
  { id: "shapes", label: "Shape Primitives", description: "Rectangles, ellipses, arrows, text" },
  { id: "multiUser", label: "Multi-User Sync", description: "Real-time CRDT-based collaboration" },
  { id: "transforms", label: "Transform Handles", description: "Resize, rotate, and move shapes" },
  { id: "spatialIndex", label: "Spatial Indexing", description: "R-tree for O(log n) hit testing at scale" },
];

// ── API endpoints ──────────────────────────────────────────────────

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/board/:id",
    description: "Load board state — all shapes, viewport, and metadata",
    usedBy: "Initial page load",
    params: [{ name: "id", type: "string", note: "Board UUID" }],
    responseType: "BoardState",
  },
  {
    method: "POST",
    path: "/api/board/:id/shapes",
    description: "Create a new shape — returns the shape with server-assigned ID",
    usedBy: "Drawing tools",
    params: [
      { name: "kind", type: "ShapeKind", note: "freehand | rect | ellipse | text | arrow" },
      { name: "points", type: "Point[]", note: "Path points for freehand, bounds for shapes" },
    ],
    responseType: "Shape",
  },
  {
    method: "PUT",
    path: "/api/board/:id/shapes/:shapeId",
    description: "Update shape properties (position, size, rotation, style)",
    usedBy: "Transform handles, style panel",
    params: [{ name: "patch", type: "Partial<Shape>", note: "Only changed fields" }],
    responseType: "Shape",
  },
  {
    method: "WS",
    path: "/ws/board/:id",
    description: "Real-time sync channel — CRDT ops, cursor positions, presence",
    usedBy: "Collaboration layer",
    params: [
      { name: "op", type: "CRDTOp", note: "add | remove | update shape operations" },
      { name: "cursor", type: "CursorPosition", note: "Throttled to 60fps" },
    ],
    responseType: "stream<BoardEvent>",
  },
];

// ── Data models ────────────────────────────────────────────────────

export const DATA_MODELS: TypeDef[] = [
  {
    name: "Shape",
    category: "state",
    fields: [
      { name: "id", type: "string", note: "UUID v4" },
      { name: "kind", type: "ShapeKind" },
      { name: "points", type: "Point[]", note: "Freehand: path points. Shapes: [topLeft, bottomRight]" },
      { name: "x, y, w, h", type: "number", note: "Bounding box" },
      { name: "rotation", type: "number", note: "Radians" },
      { name: "fill, stroke", type: "string" },
      { name: "zIndex", type: "number" },
    ],
  },
  {
    name: "BoardState",
    category: "state",
    fields: [
      { name: "shapes", type: "Map<string, Shape>", note: "All shapes on canvas" },
      { name: "viewport", type: "ViewportRect", note: "Current pan + zoom" },
      { name: "cursors", type: "CursorPosition[]", note: "Other users' positions" },
      { name: "version", type: "number", note: "Lamport timestamp for CRDT" },
    ],
  },
  {
    name: "CRDTOp",
    category: "api",
    fields: [
      { name: "type", type: "'add' | 'remove' | 'update'" },
      { name: "shapeId", type: "string" },
      { name: "patch", type: "Partial<Shape>", note: "For update ops only" },
      { name: "timestamp", type: "number", note: "Lamport clock" },
      { name: "actorId", type: "string", note: "Tiebreaker for concurrent ops" },
    ],
  },
  {
    name: "RTreeNode",
    category: "api",
    fields: [
      { name: "bbox", type: "BoundingBox", note: "Minimum bounding rectangle" },
      { name: "children", type: "RTreeNode[] | Shape[]" },
      { name: "leaf", type: "boolean" },
      { name: "maxEntries", type: "number", note: "Typically 9-16" },
    ],
  },
];

// ── Sample shapes ──────────────────────────────────────────────────

let nextId = 1;
function makeId() {
  return `shape-${nextId++}`;
}

const INITIAL_SHAPES: Shape[] = [
  {
    id: makeId(),
    kind: "rect",
    points: [],
    x: 60,
    y: 40,
    w: 140,
    h: 90,
    rotation: 0,
    fill: "var(--diagram-layer-1)",
    stroke: "var(--diagram-layer-1)",
    strokeWidth: 2,
    selected: false,
    locked: false,
    zIndex: 1,
  },
  {
    id: makeId(),
    kind: "ellipse",
    points: [],
    x: 260,
    y: 60,
    w: 100,
    h: 100,
    rotation: 0,
    fill: "var(--diagram-layer-2)",
    stroke: "var(--diagram-layer-2)",
    strokeWidth: 2,
    selected: false,
    locked: false,
    zIndex: 2,
  },
  {
    id: makeId(),
    kind: "freehand",
    points: [
      { x: 80, y: 200 },
      { x: 100, y: 190 },
      { x: 130, y: 195 },
      { x: 160, y: 180 },
      { x: 190, y: 185 },
      { x: 220, y: 170 },
      { x: 250, y: 175 },
    ],
    x: 80,
    y: 170,
    w: 170,
    h: 30,
    rotation: 0,
    fill: "transparent",
    stroke: "var(--diagram-layer-4)",
    strokeWidth: 3,
    selected: false,
    locked: false,
    zIndex: 3,
  },
  {
    id: makeId(),
    kind: "arrow",
    points: [
      { x: 200, y: 90 },
      { x: 260, y: 110 },
    ],
    x: 200,
    y: 90,
    w: 60,
    h: 20,
    rotation: 0,
    fill: "transparent",
    stroke: "var(--color-fg)",
    strokeWidth: 2,
    selected: false,
    locked: false,
    zIndex: 4,
  },
];

// ── Prediction challenges ──────────────────────────────────────────

export type PredictionEntry = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const STEP_PREDICTIONS: Record<number, PredictionEntry> = {
  4: {
    question: "Why does Canvas 2D use an immediate-mode rendering model instead of retained-mode like SVG?",
    options: [
      "Canvas forgets drawn pixels — you control exactly what redraws and when",
      "Canvas is always faster than SVG for any number of elements",
      "Canvas automatically batches draw calls for performance",
      "Canvas retains a scene graph internally but hides it from the API",
    ],
    correctIndex: 0,
    explanation: "Canvas is immediate-mode: once you draw, the pixels are baked into the bitmap. To update, you must clear and redraw. This gives full control over rendering but means you manage your own 'scene graph' (the shapes array). SVG retains a DOM tree, which is convenient but expensive at scale (10,000+ elements).",
  },
  5: {
    question: "What happens if you don't call setPointerCapture() during a freehand draw?",
    options: [
      "The stroke breaks when the pointer leaves the canvas bounds",
      "The canvas stops responding to any pointer events",
      "Drawing performance degrades by ~50%",
      "The pointer cursor changes to the default arrow",
    ],
    correctIndex: 0,
    explanation: "Without pointer capture, pointermove events stop firing when the pointer exits the canvas element. The user drags outside the canvas boundary (very common during fast drawing) and the stroke ends abruptly. setPointerCapture() routes ALL subsequent pointer events to the canvas until pointerup, regardless of where the pointer goes.",
  },
  // Step 6 omitted — shape model widget teaches through building
  // Step 7 omitted — hit testing widget shows O(n) cost through interaction
  // Step 8 omitted — selection handles widget teaches through drag interaction
  // Step 9 omitted — layer separation widget visually proves the redraw savings
  // Step 10 omitted — coalesced events split-view makes the difference visceral
  11: {
    question: "In a collaborative whiteboard, should undo reverse YOUR last action or THE last action?",
    options: [
      "Your last action (local undo) — undoing someone else's work is confusing",
      "The last action globally — it's simpler and matches single-user behavior",
      "Both — let the user choose with different keyboard shortcuts",
      "Neither — undo should be disabled in collaborative mode",
    ],
    correctIndex: 0,
    explanation: "Local undo reverses the current user's last operation regardless of what others have done since. If Alice draws a circle, then Bob draws a square, Alice's Ctrl+Z removes her circle — not Bob's square. Global undo in a multi-user context leads to 'who undid my work?' confusion. The command pattern stores operations per-user with actor IDs.",
  },
  // Step 11 kept — undo question is pedagogically valuable (local vs global)
  12: {
    question: "Why are CRDTs preferred over OT for whiteboard sync?",
    options: [
      "CRDTs converge without a central server — peers can sync directly",
      "CRDTs use less bandwidth than OT",
      "CRDTs are simpler to implement than OT",
      "CRDTs support more operation types than OT",
    ],
    correctIndex: 0,
    explanation: "CRDTs (Conflict-free Replicated Data Types) guarantee convergence through mathematical properties — any two replicas that have seen the same set of operations will have the same state, regardless of the order they were applied. This enables peer-to-peer sync (WebRTC data channels) without routing through a server. OT requires a centralized server to determine canonical operation order.",
  },
  // Step 13 omitted — cursor throttle widget shows bandwidth cost through slider interaction
  14: {
    question: "At what shape count does an R-tree become worthwhile over linear scan?",
    options: [
      "~1,000+ shapes — R-tree overhead is amortized by O(log n) queries",
      "Always — R-tree is strictly better than linear scan",
      "~10 shapes — even small collections benefit from spatial indexing",
      "~100,000+ shapes — the constant factor of R-tree is very high",
    ],
    correctIndex: 0,
    explanation: "Below ~500 shapes, linear scan is fast enough (< 1ms per hit test). The R-tree has insertion/deletion overhead and memory cost for internal nodes. At 1,000+ shapes with 60 hit tests/sec (pointermove), linear scan costs ~2-3ms per frame while R-tree stays under 0.1ms. The crossover point depends on shape complexity, but 1,000 is a reasonable rule of thumb.",
  },
  // Step 15 omitted — accessible canvas widget teaches through keyboard navigation
};

// ── Context ────────────────────────────────────────────────────────

type WhiteboardContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Record<string, boolean>;
  toggleScope: (id: string) => void;
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  activeTool: DrawTool;
  setActiveTool: (tool: DrawTool) => void;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  undoStack: UndoOp[];
  redoStack: UndoOp[];
  pushUndo: (op: UndoOp) => void;
  undo: () => void;
  redo: () => void;
  isActive: (feature: string) => boolean;
  stateEntries: StateEntry[];
  syncStrategy: SyncStrategy;
  setSyncStrategy: (s: SyncStrategy) => void;
  remoteCursors: CursorPosition[];
};

const WhiteboardContext = createContext<WhiteboardContextValue | null>(null);

export function useWhiteboard() {
  const ctx = useContext(WhiteboardContext);
  if (!ctx) throw new Error("useWhiteboard must be used within WhiteboardProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────

export function WhiteboardProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase: Phase = activeStep <= 3 ? "planning" : "building";

  const isActive = useCallback(
    (feature: string) => {
      const unlock = FEATURE_UNLOCK[feature];
      return unlock !== undefined && activeStep >= unlock;
    },
    [activeStep]
  );

  // Scope toggles
  const [scopeEnabled, setScopeEnabled] = useState<Record<string, boolean>>({
    freehand: true,
    shapes: true,
    multiUser: false,
    transforms: false,
    spatialIndex: false,
  });

  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Shapes
  const [shapes, setShapes] = useState<Shape[]>(() => [...INITIAL_SHAPES]);
  const [activeTool, setActiveTool] = useState<DrawTool>("select");
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("lww");

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<UndoOp[]>([]);
  const [redoStack, setRedoStack] = useState<UndoOp[]>([]);

  const pushUndo = useCallback((op: UndoOp) => {
    setUndoStack((prev) => [...prev.slice(-99), op]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const op = prev[prev.length - 1]!;
      setRedoStack((r) => [...r, op]);

      setShapes((shapes) => {
        if (op.type === "add") {
          return shapes.filter((s) => s.id !== op.shapeId);
        }
        if (op.type === "remove" && op.before) {
          return [...shapes, op.before as Shape];
        }
        if (op.type === "modify" && op.before) {
          return shapes.map((s) =>
            s.id === op.shapeId ? { ...s, ...op.before } : s
          );
        }
        return shapes;
      });

      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const op = prev[prev.length - 1]!;
      setUndoStack((u) => [...u, op]);

      setShapes((shapes) => {
        if (op.type === "add" && op.after) {
          return [...shapes, op.after as Shape];
        }
        if (op.type === "remove") {
          return shapes.filter((s) => s.id !== op.shapeId);
        }
        if (op.type === "modify" && op.after) {
          return shapes.map((s) =>
            s.id === op.shapeId ? { ...s, ...op.after } : s
          );
        }
        return shapes;
      });

      return prev.slice(0, -1);
    });
  }, []);

  // Simulated remote cursors
  const remoteCursors = useMemo<CursorPosition[]>(() => {
    if (!isActive("cursorPresence")) return [];
    return [
      { userId: "user-2", name: "Alice", color: "var(--diagram-layer-4)", x: 150, y: 120 },
      { userId: "user-3", name: "Bob", color: "var(--diagram-layer-6)", x: 300, y: 200 },
    ];
  }, [isActive]);

  // State entries
  const stateEntries = useMemo<StateEntry[]>(() => {
    const entries: StateEntry[] = [
      { label: "shapes", value: shapes.length },
      { label: "tool", value: activeTool },
      { label: "selected", value: selectedShapeId ?? "none" },
      { label: "undoDepth", value: undoStack.length, highlight: true },
      { label: "sync", value: syncStrategy },
    ];
    if (isActive("cursorPresence")) {
      entries.push({ label: "cursors", value: remoteCursors.length });
    }
    if (isActive("spatialIndex")) {
      entries.push({ label: "rtreeNodes", value: Math.ceil(shapes.length / 4), highlight: true });
    }
    return entries;
  }, [shapes, activeTool, selectedShapeId, undoStack, syncStrategy, isActive, remoteCursors]);

  const value = useMemo<WhiteboardContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      shapes,
      setShapes,
      activeTool,
      setActiveTool,
      selectedShapeId,
      setSelectedShapeId,
      undoStack,
      redoStack,
      pushUndo,
      undo,
      redo,
      isActive,
      stateEntries,
      syncStrategy,
      setSyncStrategy,
      remoteCursors,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setShapes, setActiveTool, setSelectedShapeId, setSyncStrategy are stable React setters
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      shapes,
      activeTool,
      selectedShapeId,
      undoStack,
      redoStack,
      pushUndo,
      undo,
      redo,
      isActive,
      stateEntries,
      syncStrategy,
      remoteCursors,
    ]
  );

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
}
