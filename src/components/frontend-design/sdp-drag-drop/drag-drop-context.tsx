"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";
export {
  TOTAL_STEPS,
  SCOPE_ITEMS,
} from "./engine/drag-helpers";
import {
  FEATURE_UNLOCK,
  getPhase,
  createInitialZones,
  computeReorder,
  computeKeyboardMove,
  computeUndo,
  type UndoOp,
} from "./engine/drag-helpers";

// ── Types ───────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";

export type DragItem = {
  id: string;
  label: string;
  color: string;
  order: number;
};

export type DropZone = {
  id: string;
  label: string;
  items: DragItem[];
};

export type DragState =
  | { status: "idle" }
  | { status: "dragging"; itemId: string; sourceZoneId: string; pointerX: number; pointerY: number; offsetX: number; offsetY: number }
  | { status: "animating"; itemId: string; targetZoneId: string };

export type HitTestStrategy = "center" | "overlap" | "closest";
export type PreviewStrategy = "clone" | "snapshot" | "custom";

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

// ── API Endpoints ───────────────────────────────────────────────

export type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/boards/:id",
    description: "Get board with all columns and items",
    usedBy: "Board → ColumnList",
    params: [
      { name: "id", type: "string", note: "board identifier" },
    ],
    responseType: "BoardResponse",
  },
  {
    method: "PATCH",
    path: "/api/boards/:id/reorder",
    description: "Reorder items within or across columns",
    usedBy: "DragEnd handler → API",
    params: [
      { name: "itemId", type: "string", note: "dragged item" },
      { name: "sourceColumnId", type: "string", note: "origin column" },
      { name: "targetColumnId", type: "string", note: "destination column" },
      { name: "newIndex", type: "number", note: "position in target" },
    ],
    responseType: "ReorderResponse",
  },
  {
    method: "PATCH",
    path: "/api/boards/:id/batch-reorder",
    description: "Move multiple items in one request",
    usedBy: "Multi-select drag → API",
    params: [
      { name: "operations", type: "ReorderOp[]", note: "batch moves" },
    ],
    responseType: "BatchReorderResponse",
  },
  {
    method: "POST",
    path: "/api/boards/:id/undo",
    description: "Undo the last reorder operation",
    usedBy: "Undo handler → API",
    params: [
      { name: "operationId", type: "string", note: "operation to reverse" },
    ],
    responseType: "UndoResponse",
  },
];

// ── Data Models ─────────────────────────────────────────────────

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  extends?: string;
  fields: TypeField[];
};

export const DATA_MODELS: TypeDef[] = [
  {
    name: "DragItem",
    category: "api",
    fields: [
      { name: "id", type: "string" },
      { name: "content", type: "string", note: "display text" },
      { name: "order", type: "number", note: "sort index" },
      { name: "columnId", type: "string", note: "parent column" },
    ],
  },
  {
    name: "Column",
    category: "api",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "items", type: "DragItem[]", note: "ordered list" },
      { name: "maxItems", type: "number?", note: "capacity limit" },
    ],
  },
  {
    name: "DragState",
    category: "state",
    fields: [
      { name: "status", type: "'idle' | 'dragging' | 'animating'" },
      { name: "activeId", type: "string | null", note: "dragged item" },
      { name: "sourceZoneId", type: "string | null" },
      { name: "pointer", type: "{ x, y }", note: "screen coords" },
      { name: "offset", type: "{ x, y }", note: "grab offset" },
    ],
  },
  {
    name: "DropIndicator",
    category: "state",
    fields: [
      { name: "zoneId", type: "string" },
      { name: "index", type: "number", note: "insertion point" },
      { name: "rect", type: "DOMRect", note: "visual position" },
    ],
  },
  {
    name: "DragCallbacks",
    category: "props",
    fields: [
      { name: "onDragStart", type: "(item, source) => void" },
      { name: "onDragOver", type: "(item, target, index) => void" },
      { name: "onDragEnd", type: "(item, source, target, index) => void" },
      { name: "onDragCancel", type: "() => void" },
    ],
  },
];

// ── Features & Initial Items Imported from engine ─────────────────

// ── Context ─────────────────────────────────────────────────────

type DragDropContextValue = {
  activeStep: number;
  phase: Phase;

  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  zones: DropZone[];
  dragState: DragState;
  dropIndicator: { zoneId: string; index: number } | null;
  selectedItems: Set<string>;

  startDrag: (itemId: string, zoneId: string, pointerX: number, pointerY: number, offsetX: number, offsetY: number) => void;
  updateDrag: (pointerX: number, pointerY: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  setDropIndicator: (indicator: { zoneId: string; index: number } | null) => void;

  toggleSelectItem: (itemId: string) => void;
  clearSelection: () => void;
  moveItemKeyboard: (itemId: string, zoneId: string, direction: "up" | "down" | "left" | "right") => void;

  hitTestStrategy: HitTestStrategy;
  setHitTestStrategy: (s: HitTestStrategy) => void;
  previewStrategy: PreviewStrategy;
  setPreviewStrategy: (s: PreviewStrategy) => void;

  undoStack: UndoOp[];
  undo: () => void;

  featureToggles: Record<string, boolean>;
  toggleFeature: (f: string) => void;
  isActive: (feature: string) => boolean;

  eventLog: { time: string; event: string; detail: string }[];
  metrics: { pointerEvents: number; renders: number; rafSkipped: number; dropTime: string };
  stateEntries: StateEntry[];
};

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function useDragDrop() {
  const ctx = useContext(DragDropContext);
  if (!ctx) throw new Error("useDragDrop must be within DragDropProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────

export function DragDropProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const phase = getPhase(activeStep);

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({});
  const toggleFeature = useCallback((f: string) => {
    setFeatureToggles(prev => ({ ...prev, [f]: !prev[f] }));
  }, []);
  const isActive = useCallback((feature: string) => {
    const unlock = FEATURE_UNLOCK[feature];
    if (!unlock) return false;
    if (activeStep > unlock) return true;
    if (activeStep === unlock) return featureToggles[feature] ?? false;
    return false;
  }, [activeStep, featureToggles]);

  const [zones, setZones] = useState<DropZone[]>(createInitialZones);
  const [dragState, setDragState] = useState<DragState>({ status: "idle" });
  const [dropIndicator, setDropIndicator] = useState<{ zoneId: string; index: number } | null>(null);
  const dropIndicatorRef = useRef(dropIndicator);
  dropIndicatorRef.current = dropIndicator;
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hitTestStrategy, setHitTestStrategy] = useState<HitTestStrategy>("center");
  const [previewStrategy, setPreviewStrategy] = useState<PreviewStrategy>("clone");
  const [undoStack, setUndoStack] = useState<UndoOp[]>([]);
  const [eventLog, setEventLog] = useState<{ time: string; event: string; detail: string }[]>([]);
  const pointerCountRef = useRef(0);
  const renderCountRef = useRef(0);
  const rafSkippedRef = useRef(0);
  const startTimeRef = useRef(0);

  const addEvent = useCallback((event: string, detail: string) => {
    const elapsed = startTimeRef.current ? ((Date.now() - startTimeRef.current) / 1000).toFixed(1) : "0.0";
    setEventLog(prev => [{ time: `${elapsed}s`, event, detail }, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setEventLog([]);
    pointerCountRef.current = 0;
    renderCountRef.current = 0;
    rafSkippedRef.current = 0;
    if (activeStep >= 4) {
      setZones(createInitialZones());
    }
  }, [activeStep]);

  const startDrag = useCallback((itemId: string, zoneId: string, pointerX: number, pointerY: number, offsetX: number, offsetY: number) => {
    if (activeStep < 4) return;
    setDragState({ status: "dragging", itemId, sourceZoneId: zoneId, pointerX, pointerY, offsetX, offsetY });
    pointerCountRef.current = 0;
    addEvent("dragstart", `item=${itemId} zone=${zoneId}`);
  }, [activeStep, addEvent]);

  const lastRafRef = useRef(0);
  const updateDrag = useCallback((pointerX: number, pointerY: number) => {
    pointerCountRef.current++;
    if (isActive("rafThrottle")) {
      const now = performance.now();
      if (now - lastRafRef.current < 16) {
        rafSkippedRef.current++;
        return;
      }
      lastRafRef.current = now;
    }
    setDragState(prev => {
      if (prev.status !== "dragging") return prev;
      return { ...prev, pointerX, pointerY };
    });
  }, [isActive]);

  const endDrag = useCallback(() => {
    setDragState(prev => {
      if (prev.status !== "dragging") return prev;
      const { itemId, sourceZoneId } = prev;
      const currentIndicator = dropIndicatorRef.current;
      if (currentIndicator) {
        const { zoneId: targetZoneId, index: targetIndex } = currentIndicator;
        setZones(prevZones => {
          const res = computeReorder(prevZones, itemId, sourceZoneId, targetZoneId, targetIndex);
          if (!res) return prevZones;

          if (isActive("undo")) {
            setUndoStack(s => [...s, {
              itemId, fromZone: sourceZoneId, fromIndex: res.itemIdx, toZone: targetZoneId, toIndex: res.adjustedIndex,
            }].slice(-10));
          }

          return res.newZones;
        });
        addEvent("drop", `${itemId} → ${targetZoneId}[${targetIndex}]`);
      } else {
        addEvent("cancel", "no valid drop target");
      }
      setDropIndicator(null);
      return { status: "idle" };
    });
  }, [isActive, addEvent]);

  const cancelDrag = useCallback(() => {
    setDragState({ status: "idle" });
    setDropIndicator(null);
    addEvent("cancel", "escape pressed");
  }, [addEvent]);

  const toggleSelectItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedItems(new Set()), []);

  const moveItemKeyboard = useCallback((itemId: string, zoneId: string, direction: "up" | "down" | "left" | "right") => {
    setZones(prevZones => {
      const res = computeKeyboardMove(prevZones, itemId, zoneId, direction, isActive("crossContainer"));
      if (!res) return prevZones;
      addEvent("keyboard-move", res.announcement);
      return res.newZones;
    });
  }, [addEvent, isActive]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const op = undoStack[undoStack.length - 1];
    setZones(prevZones => computeUndo(prevZones, op));
    setUndoStack(prev => prev.slice(0, -1));
    addEvent("undo", `reversed: ${op.itemId} back to ${op.fromZone}[${op.fromIndex}]`);
  }, [undoStack, addEvent]);

  useEffect(() => { renderCountRef.current++; });

  const metrics = useMemo(() => ({
    pointerEvents: pointerCountRef.current,
    renders: renderCountRef.current,
    rafSkipped: rafSkippedRef.current,
    dropTime: dragState.status === "idle" ? "—" : `${pointerCountRef.current}ev`,
  }), [dragState.status]);

  const stateEntries: StateEntry[] = useMemo(() => {
    const e: StateEntry[] = [
      { label: "step", value: activeStep },
      { label: "phase", value: phase },
      { label: "dragStatus", value: dragState.status },
    ];
    if (dragState.status === "dragging") {
      e.push({ label: "activeItem", value: dragState.itemId, highlight: true });
      e.push({ label: "source", value: dragState.sourceZoneId });
      e.push({ label: "pointer", value: `${Math.round(dragState.pointerX)},${Math.round(dragState.pointerY)}` });
    }
    if (dropIndicator) {
      e.push({ label: "dropTarget", value: `${dropIndicator.zoneId}[${dropIndicator.index}]`, highlight: true });
    }
    zones.forEach(z => {
      e.push({ label: z.id, value: z.items.map(i => i.label.slice(0, 12)).join(", ") });
    });
    if (selectedItems.size > 0) {
      e.push({ label: "selected", value: selectedItems.size });
    }
    return e;
  }, [activeStep, phase, dragState, dropIndicator, zones, selectedItems]);

  const value = useMemo((): DragDropContextValue => ({
    activeStep, phase,
    scopeEnabled, toggleScope,
    zones, dragState, dropIndicator, selectedItems,
    startDrag, updateDrag, endDrag, cancelDrag, setDropIndicator,
    toggleSelectItem, clearSelection, moveItemKeyboard,
    hitTestStrategy, setHitTestStrategy,
    previewStrategy, setPreviewStrategy,
    undoStack, undo,
    featureToggles, toggleFeature, isActive,
    eventLog, metrics, stateEntries,
  }), [
    activeStep, phase,
    scopeEnabled, toggleScope,
    zones, dragState, dropIndicator, selectedItems,
    startDrag, updateDrag, endDrag, cancelDrag,
    toggleSelectItem, clearSelection, moveItemKeyboard,
    hitTestStrategy, previewStrategy,
    undoStack, undo,
    featureToggles, toggleFeature, isActive,
    eventLog, metrics, stateEntries,
  ]);

  return <DragDropContext.Provider value={value}>{children}</DragDropContext.Provider>;
}
