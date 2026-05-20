import type { DragItem, DropZone, Phase, ScopeItem, ApiEndpoint, TypeDef } from "../drag-drop-context";

export type UndoOp = {
  itemId: string;
  fromZone: string;
  fromIndex: number;
  toZone: string;
  toIndex: number;
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

export const ITEM_COLORS = [
  "var(--diagram-layer-0)",
  "var(--diagram-layer-1)",
  "var(--diagram-layer-2)",
  "var(--diagram-layer-3)",
  "var(--diagram-layer-4)",
  "var(--diagram-layer-5)",
];

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

export function createInitialZones(): DropZone[] {
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

// ── Pure Logic Engines ───────────────────────────────────────────

export function computeReorder(
  prevZones: DropZone[],
  itemId: string,
  sourceZoneId: string,
  targetZoneId: string,
  targetIndex: number
): {
  newZones: DropZone[];
  adjustedIndex: number;
  itemIdx: number;
} | null {
  const newZones = prevZones.map(z => ({
    ...z,
    items: z.items.map(it => ({ ...it }))
  }));
  const sourceZone = newZones.find(z => z.id === sourceZoneId);
  const targetZone = newZones.find(z => z.id === targetZoneId);
  if (!sourceZone || !targetZone) return null;

  const itemIdx = sourceZone.items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) return null;
  const [item] = sourceZone.items.splice(itemIdx, 1);

  const adjustedIndex = sourceZoneId === targetZoneId && itemIdx < targetIndex
    ? targetIndex - 1
    : targetIndex;
  targetZone.items.splice(adjustedIndex, 0, item);
  targetZone.items.forEach((it, i) => { it.order = i; });
  sourceZone.items.forEach((it, i) => { it.order = i; });

  return { newZones, adjustedIndex, itemIdx };
}

export function computeKeyboardMove(
  prevZones: DropZone[],
  itemId: string,
  zoneId: string,
  direction: "up" | "down" | "left" | "right",
  crossContainerEnabled: boolean
): {
  newZones: DropZone[];
  announcement: string;
} | null {
  const newZones = prevZones.map(z => ({ ...z, items: [...z.items] }));
  const zoneIdx = newZones.findIndex(z => z.id === zoneId);
  const zone = newZones[zoneIdx];
  if (!zone) return null;
  const itemIdx = zone.items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) return null;

  const item = zone.items[itemIdx];

  if (direction === "up" && itemIdx > 0) {
    [zone.items[itemIdx - 1], zone.items[itemIdx]] = [zone.items[itemIdx], zone.items[itemIdx - 1]];
    zone.items.forEach((it, i) => { it.order = i; });
    return {
      newZones,
      announcement: `Moved ${item.label} up in ${zoneId}`
    };
  } else if (direction === "down" && itemIdx < zone.items.length - 1) {
    [zone.items[itemIdx], zone.items[itemIdx + 1]] = [zone.items[itemIdx + 1], zone.items[itemIdx]];
    zone.items.forEach((it, i) => { it.order = i; });
    return {
      newZones,
      announcement: `Moved ${item.label} down in ${zoneId}`
    };
  } else if ((direction === "left" || direction === "right") && crossContainerEnabled) {
    const targetIdx = direction === "left" ? zoneIdx - 1 : zoneIdx + 1;
    const targetZone = newZones[targetIdx];
    if (!targetZone) return null;
    const [extractedItem] = zone.items.splice(itemIdx, 1);
    targetZone.items.push(extractedItem);
    zone.items.forEach((it, i) => { it.order = i; });
    targetZone.items.forEach((it, i) => { it.order = i; });
    return {
      newZones,
      announcement: `Moved ${item.label} ${direction === "left" ? "left" : "right"} to ${targetZone.label}`
    };
  }

  return null;
}

export function computeUndo(
  prevZones: DropZone[],
  op: UndoOp
): DropZone[] {
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
}

export function calculateDropIndex(
  pointerY: number,
  rect: DOMRect,
  itemsCount: number
): number {
  const y = pointerY - rect.top;
  const itemHeight = rect.height / Math.max(itemsCount, 1);
  return Math.max(0, Math.min(Math.round(y / itemHeight), itemsCount));
}
