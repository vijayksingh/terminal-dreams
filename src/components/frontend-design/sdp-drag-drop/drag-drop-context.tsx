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

type UndoOp = {
  itemId: string;
  fromZone: string;
  fromIndex: number;
  toZone: string;
  toIndex: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

// ── Constants ───────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "reorder", label: "Reorder within a list?", description: "Drag to rearrange items in a single container" },
  { id: "cross-container", label: "Cross-container transfer?", description: "Move items between separate drop zones" },
  { id: "multi-select", label: "Multi-select drag?", description: "Select multiple items, drag as a group" },
  { id: "touch", label: "Touch & mobile support?", description: "Long-press to activate, gesture disambiguation" },
  { id: "accessible", label: "Keyboard-only mode?", description: "Arrow keys + space for screen reader users" },
];

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

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

// ── Feature unlock map ──────────────────────────────────────────

export const FEATURE_UNLOCK: Record<string, number> = {
  pointerDrag: 4,
  dragPreview: 5,
  hitTesting: 6,
  reorderState: 7,
  placeholder: 8,
  rafThrottle: 9,
  crossContainer: 10,
  keyboardDrag: 11,
  touchGestures: 12,
  constraints: 13,
  undo: 14,
};

// ── Initial items ───────────────────────────────────────────────

const ITEM_COLORS = [
  "var(--diagram-layer-0)",
  "var(--diagram-layer-1)",
  "var(--diagram-layer-2)",
  "var(--diagram-layer-3)",
  "var(--diagram-layer-4)",
  "var(--diagram-layer-5)",
];

function createInitialZones(): DropZone[] {
  return [
    {
      id: "todo",
      label: "To Do",
      items: [
        { id: "item-1", label: "Design API schema", color: ITEM_COLORS[0], order: 0 },
        { id: "item-2", label: "Set up project", color: ITEM_COLORS[1], order: 1 },
        { id: "item-3", label: "Write unit tests", color: ITEM_COLORS[2], order: 2 },
        { id: "item-4", label: "Code review", color: ITEM_COLORS[3], order: 3 },
      ],
    },
    {
      id: "doing",
      label: "In Progress",
      items: [
        { id: "item-5", label: "Implement drag handler", color: ITEM_COLORS[4], order: 0 },
        { id: "item-6", label: "Build drop zone", color: ITEM_COLORS[5], order: 1 },
      ],
    },
    {
      id: "done",
      label: "Done",
      items: [
        { id: "item-7", label: "Define requirements", color: ITEM_COLORS[0], order: 0 },
      ],
    },
  ];
}

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
          const newZones = prevZones.map(z => ({ ...z, items: z.items.map(it => ({ ...it })) }));
          const sourceZone = newZones.find(z => z.id === sourceZoneId);
          const targetZone = newZones.find(z => z.id === targetZoneId);
          if (!sourceZone || !targetZone) return prevZones;

          const itemIdx = sourceZone.items.findIndex(i => i.id === itemId);
          if (itemIdx === -1) return prevZones;
          const [item] = sourceZone.items.splice(itemIdx, 1);

          const adjustedIndex = sourceZoneId === targetZoneId && itemIdx < targetIndex
            ? targetIndex - 1
            : targetIndex;
          targetZone.items.splice(adjustedIndex, 0, item);
          targetZone.items.forEach((it, i) => { it.order = i; });
          sourceZone.items.forEach((it, i) => { it.order = i; });

          if (isActive("undo")) {
            setUndoStack(s => [...s, {
              itemId, fromZone: sourceZoneId, fromIndex: itemIdx, toZone: targetZoneId, toIndex: adjustedIndex,
            }].slice(-10));
          }

          return newZones;
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
      const newZones = prevZones.map(z => ({ ...z, items: [...z.items] }));
      const zoneIdx = newZones.findIndex(z => z.id === zoneId);
      const zone = newZones[zoneIdx];
      if (!zone) return prevZones;
      const itemIdx = zone.items.findIndex(i => i.id === itemId);
      if (itemIdx === -1) return prevZones;

      if (direction === "up" && itemIdx > 0) {
        [zone.items[itemIdx - 1], zone.items[itemIdx]] = [zone.items[itemIdx], zone.items[itemIdx - 1]];
        zone.items.forEach((it, i) => { it.order = i; });
        addEvent("keyboard-move", `${itemId} ↑ in ${zoneId}`);
      } else if (direction === "down" && itemIdx < zone.items.length - 1) {
        [zone.items[itemIdx], zone.items[itemIdx + 1]] = [zone.items[itemIdx + 1], zone.items[itemIdx]];
        zone.items.forEach((it, i) => { it.order = i; });
        addEvent("keyboard-move", `${itemId} ↓ in ${zoneId}`);
      } else if ((direction === "left" || direction === "right") && isActive("crossContainer")) {
        const targetIdx = direction === "left" ? zoneIdx - 1 : zoneIdx + 1;
        const targetZone = newZones[targetIdx];
        if (!targetZone) return prevZones;
        const [item] = zone.items.splice(itemIdx, 1);
        targetZone.items.push(item);
        zone.items.forEach((it, i) => { it.order = i; });
        targetZone.items.forEach((it, i) => { it.order = i; });
        addEvent("keyboard-move", `${itemId} → ${targetZone.id}`);
      }
      return newZones;
    });
  }, [addEvent, isActive]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const op = undoStack[undoStack.length - 1];
    setZones(prevZones => {
      const newZones = prevZones.map(z => ({ ...z, items: [...z.items] }));
      const currentZone = newZones.find(z => z.id === op.toZone);
      const targetZone = newZones.find(z => z.id === op.fromZone);
      if (!currentZone || !targetZone) return prevZones;
      const itemIdx = currentZone.items.findIndex(i => i.id === op.itemId);
      if (itemIdx === -1) return prevZones;
      const [item] = currentZone.items.splice(itemIdx, 1);
      targetZone.items.splice(op.fromIndex, 0, item);
      currentZone.items.forEach((it, i) => { it.order = i; });
      targetZone.items.forEach((it, i) => { it.order = i; });
      return newZones;
    });
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
