import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

const NODES: FlowNode[] = [
  {
    id: "app",
    label: "Board (state owner)",
    sublabel: "zones · dragState · dropIndicator · undoStack",
    x: 60,
    y: 10,
    w: 360,
    h: 44,
  },
  {
    id: "dnd-ctx",
    label: "DragDropContext",
    sublabel: "pointer events · hit testing · rAF",
    x: 60,
    y: 80,
    w: 180,
    h: 36,
  },
  {
    id: "a11y",
    label: "A11yLayer",
    sublabel: "aria-live · keyboard handler",
    x: 260,
    y: 80,
    w: 160,
    h: 36,
  },
  {
    id: "column",
    label: "Column",
    sublabel: "drop zone · indicator",
    x: 30,
    y: 150,
    w: 120,
    h: 36,
  },
  {
    id: "item",
    label: "DragItem",
    sublabel: "pointer handlers · preview",
    x: 170,
    y: 150,
    w: 120,
    h: 36,
  },
  {
    id: "preview",
    label: "DragPreview",
    sublabel: "clone / snapshot / custom",
    x: 310,
    y: 150,
    w: 120,
    h: 36,
  },
  {
    id: "indicator",
    label: "DropIndicator",
    sublabel: "animated insertion line",
    x: 30,
    y: 220,
    w: 120,
    h: 36,
  },
  {
    id: "hit-test",
    label: "HitTester",
    sublabel: "center / overlap / closest",
    x: 170,
    y: 220,
    w: 120,
    h: 36,
  },
  {
    id: "undo",
    label: "UndoManager",
    sublabel: "operation stack · restore",
    x: 310,
    y: 220,
    w: 120,
    h: 36,
  },
];

const EDGES: FlowEdge[] = [
  { from: "app", to: "dnd-ctx", label: "zones, callbacks" },
  { from: "app", to: "a11y", label: "dragState" },
  { from: "dnd-ctx", to: "column", label: "drop zone props" },
  { from: "dnd-ctx", to: "item", label: "drag handlers" },
  { from: "dnd-ctx", to: "preview", label: "pointer coords" },
  { from: "item", to: "hit-test", label: "pointer position" },
  { from: "hit-test", to: "indicator", label: "insertion index" },
  { from: "column", to: "indicator", label: "render slot" },
  { from: "dnd-ctx", to: "undo", label: "reorder ops" },
  { from: "a11y", to: "app", label: "keyboard moves" },
];

const DRAG_FLOW: ArchScenarioPlayerConfig["scenarios"][0] = {
  id: "drag-flow",
  label: "Drag item",
  blurb: "Complete lifecycle: pointerdown → pointermove → pointerup",
  steps: [
    {
      nodeId: "item",
      caption: "pointerdown on DragItem — capture offset, start drag",
      payload: {
        type: {
          name: "DragStartEvent",
          fields: [
            { name: "itemId", type: "string" },
            { name: "sourceZoneId", type: "string" },
            { name: "offsetX", type: "number", note: "grab point" },
            { name: "offsetY", type: "number", note: "grab point" },
          ],
        },
      },
    },
    {
      nodeId: "dnd-ctx",
      caption: "DragDropContext captures pointer — setPointerCapture ensures events arrive even if cursor leaves the item",
      payload: {
        type: {
          name: "DragState",
          fields: [
            { name: "status", type: "'dragging'" },
            { name: "activeId", type: "string" },
            { name: "pointer", type: "{ x, y }" },
          ],
        },
      },
    },
    {
      nodeId: "preview",
      caption: "DragPreview renders at pointer position — updated every rAF frame",
    },
    {
      nodeId: "hit-test",
      caption: "HitTester checks which drop zone the pointer is over — strategy determines the algorithm",
      payload: {
        type: {
          name: "HitTestResult",
          fields: [
            { name: "zoneId", type: "string | null" },
            { name: "insertIndex", type: "number" },
            { name: "strategy", type: "'center' | 'overlap' | 'closest'" },
          ],
        },
      },
    },
    {
      nodeId: "indicator",
      caption: "DropIndicator renders at the insertion point — animated line between items",
    },
    {
      nodeId: "app",
      caption: "pointerup → endDrag — state owner splices item from source, inserts at target index",
      payload: {
        type: {
          name: "ReorderOp",
          fields: [
            { name: "itemId", type: "string" },
            { name: "fromZone", type: "string" },
            { name: "toZone", type: "string" },
            { name: "newIndex", type: "number" },
          ],
        },
      },
      stateAfter: [
        { key: "dragStatus", value: "idle" },
        { key: "zones", value: "[updated order]" },
        { key: "undoStack", value: "+1 operation" },
      ],
    },
  ],
};

const KEYBOARD_FLOW: ArchScenarioPlayerConfig["scenarios"][0] = {
  id: "keyboard",
  label: "Keyboard reorder",
  blurb: "Arrow keys move items without pointer interaction",
  steps: [
    {
      nodeId: "a11y",
      caption: "Focus lands on DragItem — aria-roledescription='draggable item'",
    },
    {
      nodeId: "a11y",
      caption: "Space activates grab mode — aria-live announces 'Grabbed: Design API schema, position 1 of 4'",
      payload: {
        type: {
          name: "A11yAnnouncement",
          fields: [
            { name: "message", type: "string" },
            { name: "assertive", type: "boolean", note: "true for grabs" },
          ],
        },
      },
    },
    {
      nodeId: "app",
      caption: "Arrow Down swaps item with next sibling — immediate state update, no animation delay",
      stateAfter: [
        { key: "todo[0]", value: "Set up project" },
        { key: "todo[1]", value: "Design API schema ← moved" },
      ],
    },
    {
      nodeId: "a11y",
      caption: "aria-live announces new position: 'Design API schema, position 2 of 4 in To Do'",
    },
    {
      nodeId: "app",
      caption: "Arrow Right moves item to next column — cross-container keyboard move",
      stateAfter: [
        { key: "todo", value: "3 items" },
        { key: "doing", value: "3 items ← +1" },
      ],
    },
    {
      nodeId: "a11y",
      caption: "Space drops — aria-live announces 'Dropped: Design API schema in In Progress, position 3 of 3'",
    },
  ],
};

const UNDO_FLOW: ArchScenarioPlayerConfig["scenarios"][0] = {
  id: "undo",
  label: "Undo",
  blurb: "Reverting the last reorder operation",
  steps: [
    {
      nodeId: "app",
      caption: "User triggers undo (Ctrl+Z or button) — pop last operation from stack",
      stateAfter: [
        { key: "undoStack", value: "[op-1, op-2] → [op-1]" },
      ],
    },
    {
      nodeId: "undo",
      caption: "UndoManager applies inverse operation — restore original zone arrays",
      payload: {
        type: {
          name: "UndoOp",
          fields: [
            { name: "operationId", type: "string" },
            { name: "inverse", type: "ReorderOp", note: "reversed move" },
          ],
        },
      },
    },
    {
      nodeId: "app",
      caption: "Board state restored — zones return to pre-operation state",
      stateAfter: [
        { key: "zones", value: "[previous state]" },
        { key: "dragStatus", value: "idle" },
      ],
    },
    {
      nodeId: "a11y",
      caption: "aria-live announces 'Undo: moved Design API schema back to To Do'",
    },
  ],
};

export const DRAG_DROP_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Drag & Drop Architecture",
  thesis:
    "Pointer events drive the drag lifecycle; hit testing determines drop targets; state is reconciled on drop — not during drag.",
  viewBox: "0 0 480 280",
  nodes: NODES,
  edges: EDGES,
  protagonist: "app",
  scenarios: [DRAG_FLOW, KEYBOARD_FLOW, UNDO_FLOW],
};
