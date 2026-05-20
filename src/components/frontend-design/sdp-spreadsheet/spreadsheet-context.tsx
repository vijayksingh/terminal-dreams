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

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing";

export type CellValue = string | number | null;

export type Cell = {
  id: string; // "A1", "B2", etc
  raw: string; // what the user typed ("=A1+B2", "42", "hello")
  computed: CellValue;
  formula: boolean;
  deps: string[]; // cells this cell depends on
  dependents: string[]; // cells that depend on this cell
  dirty: boolean;
  error: string | null;
  format: CellFormat;
};

export type CellFormat = {
  bold: boolean;
  align: "left" | "center" | "right";
  type: "text" | "number" | "currency" | "percent";
};

export type Selection = {
  start: { row: number; col: number };
  end: { row: number; col: number };
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
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

export type UndoOp = {
  cellId: string;
  prevRaw: string;
  newRaw: string;
};

// ── Feature unlock map ──────────────────────────────────────────────

const FEATURE_UNLOCK: Record<string, number> = {
  gridRender: 4,
  cellEditing: 5,
  formulas: 6,
  depGraph: 7,
  propagation: 8,
  selection: 9,
  virtualGrid: 10,
  formatting: 11,
  undoRedo: 12,
  clipboard: 13,
  performance: 14,
  collaboration: 15,
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;
const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26; // A-Z
const VISIBLE_ROWS = 20;
const VISIBLE_COLS = 10;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "formulas", label: "Formula engine?", description: "=SUM, =IF, cell references — needs a parser and dependency DAG" },
  { id: "multiSelect", label: "Range selection?", description: "Click-drag to select ranges, Shift+Click for extension" },
  { id: "virtualGrid", label: "Virtualized grid?", description: "100K+ rows without DOM explosion — cell recycling" },
  { id: "formatting", label: "Cell formatting?", description: "Bold, alignment, number/currency/percent display" },
  { id: "collaboration", label: "Real-time collaboration?", description: "Multiple cursors, OT/CRDT, conflict resolution" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/sheet/:id",
    description: "Load full sheet data with cell values and metadata",
    usedBy: "Sheet → Grid",
    params: [
      { name: "id", type: "string", note: "sheet identifier" },
      { name: "range", type: "string?", note: "optional A1:Z100 range filter" },
    ],
    responseType: "{ cells: Record<string, CellData>, meta: SheetMeta }",
  },
  {
    method: "PUT",
    path: "/api/sheet/:id/cell/:cellId",
    description: "Update a single cell's raw value",
    usedBy: "Grid → CellEditor",
    params: [
      { name: "cellId", type: "string", note: "e.g. 'A1'" },
      { name: "value", type: "string", note: "raw input value" },
    ],
    responseType: "{ affected: string[], values: Record<string, CellValue> }",
  },
  {
    method: "POST",
    path: "/api/sheet/:id/batch",
    description: "Batch update multiple cells (paste, fill, clear range)",
    usedBy: "Grid → ClipboardHandler",
    params: [
      { name: "updates", type: "CellUpdate[]", note: "array of { cellId, value }" },
    ],
    responseType: "{ affected: string[], values: Record<string, CellValue> }",
  },
  {
    method: "POST",
    path: "/api/sheet/:id/formula/deps",
    description: "Compute dependency graph for a formula",
    usedBy: "FormulaEngine → DepGraph",
    params: [
      { name: "formula", type: "string", note: "e.g. '=A1+SUM(B1:B10)'" },
      { name: "cellId", type: "string", note: "cell containing the formula" },
    ],
    responseType: "{ deps: string[], order: string[] }",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "CellData",
    category: "state",
    fields: [
      { name: "raw", type: "string", note: "user input" },
      { name: "computed", type: "CellValue", note: "evaluated result" },
      { name: "formula", type: "boolean" },
      { name: "deps", type: "string[]", note: "references" },
      { name: "format", type: "CellFormat" },
    ],
  },
  {
    name: "SheetState",
    category: "state",
    fields: [
      { name: "cells", type: "Map<string, CellData>" },
      { name: "selection", type: "Selection | null" },
      { name: "editingCell", type: "string | null" },
      { name: "viewport", type: "ViewportRect" },
      { name: "undoStack", type: "UndoOp[]" },
    ],
  },
  {
    name: "ViewportRect",
    category: "props",
    fields: [
      { name: "startRow", type: "number", note: "first visible row" },
      { name: "endRow", type: "number", note: "last visible row" },
      { name: "startCol", type: "number", note: "first visible col" },
      { name: "endCol", type: "number", note: "last visible col" },
    ],
  },
  {
    name: "FormulaToken",
    category: "api",
    fields: [
      { name: "type", type: "'ref' | 'range' | 'fn' | 'op' | 'lit'" },
      { name: "value", type: "string" },
      { name: "children", type: "FormulaToken[]?" },
    ],
  },
];

// ── Cell ID helpers ─────────────────────────────────────────────────

function colToLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

function cellId(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

function parseCellId(id: string): { row: number; col: number } {
  const col = id.charCodeAt(0) - 65;
  const row = parseInt(id.slice(1), 10) - 1;
  return { row, col };
}

// ── Simple formula parser ───────────────────────────────────────────

function parseFormulaDeps(raw: string): string[] {
  if (!raw.startsWith("=")) return [];
  const refs = raw.match(/[A-Z]\d+/g) || [];
  return [...new Set(refs)];
}

function safeEval(expr: string): number {
  let pos = 0;
  const s = expr.replace(/\s/g, "");

  function parseExpr(): number {
    let result = parseTerm();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos]!;
      pos++;
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
      const op = s[pos]!;
      pos++;
      const right = parseFactor();
      result = op === "*" ? result * right : result / right;
    }
    return result;
  }

  function parseFactor(): number {
    if (s[pos] === "(") {
      pos++;
      const result = parseExpr();
      pos++; // skip )
      return result;
    }
    if (s[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    const start = pos;
    while (pos < s.length && (s[pos]! >= "0" && s[pos]! <= "9" || s[pos] === ".")) pos++;
    return parseFloat(s.slice(start, pos));
  }

  return parseExpr();
}

function evaluateFormula(
  raw: string,
  cells: Map<string, Cell>
): { value: CellValue; error: string | null } {
  if (!raw.startsWith("=")) {
    const num = Number(raw);
    return { value: raw === "" ? null : isNaN(num) ? raw : num, error: null };
  }

  const expr = raw.slice(1);

  // Handle SUM(range)
  const sumMatch = expr.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
  if (sumMatch) {
    const [, c1, r1, c2, r2] = sumMatch;
    const startCol = c1!.charCodeAt(0) - 65;
    const endCol = c2!.charCodeAt(0) - 65;
    const startRow = parseInt(r1!, 10) - 1;
    const endRow = parseInt(r2!, 10) - 1;
    let sum = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = cells.get(cellId(r, c));
        const v = cell?.computed;
        if (typeof v === "number") sum += v;
      }
    }
    return { value: sum, error: null };
  }

  // Handle simple cell references and arithmetic
  let resolved = expr;
  const refs = expr.match(/[A-Z]\d+/g) || [];
  for (const ref of refs) {
    const cell = cells.get(ref);
    const v = cell?.computed;
    if (v === null || v === undefined) {
      resolved = resolved.replace(ref, "0");
    } else if (typeof v === "number") {
      resolved = resolved.replace(ref, String(v));
    } else {
      return { value: null, error: `#REF! ${ref} is not a number` };
    }
  }

  try {
    if (/^[\d\s+\-*/().]+$/.test(resolved)) {
      const result = safeEval(resolved);
      if (typeof result === "number" && isFinite(result)) {
        return { value: result, error: null };
      }
      return { value: null, error: "#VALUE!" };
    }
    return { value: null, error: "#PARSE!" };
  } catch {
    return { value: null, error: "#ERROR!" };
  }
}

// ── Topological sort for recalculation ──────────────────────────────

function topoSort(
  startCells: string[],
  cells: Map<string, Cell>
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const cell = cells.get(id);
    if (cell) {
      for (const dep of cell.dependents) {
        visit(dep);
      }
    }
    result.push(id);
  }

  for (const id of startCells) {
    visit(id);
  }

  return result.reverse();
}

// ── Detect circular references ──────────────────────────────────────

function detectCycle(
  startId: string,
  deps: string[],
  cells: Map<string, Cell>
): boolean {
  const visited = new Set<string>();
  const stack = [...deps];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === startId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const cell = cells.get(current);
    if (cell) {
      stack.push(...cell.deps);
    }
  }
  return false;
}

// ── Context ─────────────────────────────────────────────────────────

type SpreadsheetContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  // Grid state
  cells: Map<string, Cell>;
  totalRows: number;
  totalCols: number;
  visibleRows: number;
  visibleCols: number;
  viewportStart: { row: number; col: number };
  setViewportStart: (v: { row: number; col: number }) => void;
  // Selection
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  editingCell: string | null;
  startEditing: (id: string) => void;
  commitEdit: (id: string, value: string) => void;
  cancelEdit: () => void;
  // Formula dependency
  depGraph: Map<string, string[]>;
  affectedCells: Set<string>;
  recalcOrder: string[];
  // Undo
  undoStack: UndoOp[];
  undo: () => void;
  // Feature system
  isActive: (feature: string) => boolean;
  featureToggled: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  // Metrics
  renderCount: number;
  cellsInDom: number;
  recalcCount: number;
  // State inspector
  stateEntries: StateEntry[];
};

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function useSpreadsheet() {
  const ctx = useContext(SpreadsheetContext);
  if (!ctx) throw new Error("useSpreadsheet must be used within SpreadsheetProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function SpreadsheetProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase: Phase = activeStep <= 3 ? "planning" : activeStep <= 11 ? "building" : "optimizing";

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Feature toggles
  const [featureToggled, setFeatureToggled] = useState<Record<string, boolean>>({});
  const isActive = useCallback(
    (feature: string) => {
      const unlockStep = FEATURE_UNLOCK[feature];
      if (!unlockStep || activeStep < unlockStep) return false;
      if (activeStep > unlockStep) return true;
      return !!featureToggled[feature];
    },
    [activeStep, featureToggled]
  );
  const toggleFeature = useCallback((feature: string) => {
    setFeatureToggled((p) => ({ ...p, [feature]: !p[feature] }));
  }, []);

  // Grid cells
  const [cells, setCells] = useState<Map<string, Cell>>(() => {
    const m = new Map<string, Cell>();
    // Seed with sample data
    const samples: [string, string][] = [
      ["A1", "Product"], ["B1", "Price"], ["C1", "Qty"], ["D1", "Total"],
      ["A2", "Widget A"], ["B2", "29.99"], ["C2", "5"], ["D2", "=B2*C2"],
      ["A3", "Widget B"], ["B3", "49.99"], ["C3", "3"], ["D3", "=B3*C3"],
      ["A4", "Widget C"], ["B4", "19.99"], ["C4", "10"], ["D4", "=B4*C4"],
      ["A5", ""], ["B5", ""], ["C5", ""], ["D5", "=SUM(D2:D4)"],
    ];
    for (const [id, raw] of samples) {
      const deps = parseFormulaDeps(raw);
      m.set(id, {
        id,
        raw,
        computed: null,
        formula: raw.startsWith("="),
        deps,
        dependents: [],
        dirty: true,
        error: null,
        format: { bold: id.endsWith("1"), align: "left", type: "text" },
      });
    }
    // Build dependents
    m.forEach((cell) => {
      for (const depId of cell.deps) {
        const depCell = m.get(depId);
        if (depCell && !depCell.dependents.includes(cell.id)) {
          depCell.dependents.push(cell.id);
        }
      }
    });
    // Initial evaluation
    const order = topoSort(
      [...m.keys()].filter((k) => m.get(k)!.deps.length === 0),
      m
    );
    for (const id of order) {
      const cell = m.get(id);
      if (cell) {
        const { value, error } = evaluateFormula(cell.raw, m);
        cell.computed = value;
        cell.error = error;
        cell.dirty = false;
      }
    }
    return m;
  });

  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [viewportStart, setViewportStart] = useState({ row: 0, col: 0 });
  const [undoStack, setUndoStack] = useState<UndoOp[]>([]);
  const [recalcCount, setRecalcCount] = useState(0);
  const [affectedCells, setAffectedCells] = useState<Set<string>>(new Set());
  const [recalcOrder, setRecalcOrder] = useState<string[]>([]);

  // Derived: dependency graph (for visualization)
  const depGraph = useMemo(() => {
    const graph = new Map<string, string[]>();
    cells.forEach((cell) => {
      if (cell.deps.length > 0) {
        graph.set(cell.id, cell.deps);
      }
    });
    return graph;
  }, [cells]);

  const startEditing = useCallback((id: string) => {
    setEditingCell(id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const [renderCount, setRenderCount] = useState(0);
  const bumpRenderCount = useCallback(() => {
    setRenderCount(c => c + 1);
  }, []);

  const commitEdit = useCallback(
    (id: string, value: string) => {
      setCells((prev) => {
        const next = new Map(prev);
        const oldCell = next.get(id);
        const prevRaw = oldCell?.raw ?? "";

        // Record undo
        if (isActive("undoRedo")) {
          setUndoStack((s) => [...s, { cellId: id, prevRaw, newRaw: value }].slice(-20));
        }

        const newDeps = parseFormulaDeps(value);

        // Check for circular ref
        if (detectCycle(id, newDeps, next)) {
          const cell: Cell = {
            id,
            raw: value,
            computed: null,
            formula: true,
            deps: [],
            dependents: oldCell?.dependents ?? [],
            dirty: false,
            error: "#CIRCULAR!",
            format: oldCell?.format ?? { bold: false, align: "left", type: "text" },
          };
          next.set(id, cell);
          return next;
        }

        // Remove old dependencies
        if (oldCell) {
          for (const depId of oldCell.deps) {
            const depCell = next.get(depId);
            if (depCell) {
              const updated = { ...depCell, dependents: depCell.dependents.filter((d) => d !== id) };
              next.set(depId, updated);
            }
          }
        }

        // Create updated cell
        const cell: Cell = {
          id,
          raw: value,
          computed: null,
          formula: value.startsWith("="),
          deps: newDeps,
          dependents: oldCell?.dependents ?? [],
          dirty: true,
          error: null,
          format: oldCell?.format ?? { bold: false, align: "left", type: "text" },
        };
        next.set(id, cell);

        // Add new dependencies
        for (const depId of newDeps) {
          let depCell = next.get(depId);
          if (!depCell) {
            depCell = {
              id: depId,
              raw: "",
              computed: null,
              formula: false,
              deps: [],
              dependents: [],
              dirty: false,
              error: null,
              format: { bold: false, align: "left", type: "text" },
            };
            next.set(depId, depCell);
          }
          if (!depCell.dependents.includes(id)) {
            next.set(depId, { ...depCell, dependents: [...depCell.dependents, id] });
          }
        }

        // Propagate: evaluate this cell and all dependents in topo order
        const affected = topoSort([id], next);
        const affectedSet = new Set(affected);
        setAffectedCells(affectedSet);
        setRecalcOrder([...affected]);
        setRecalcCount((c) => c + 1);

        for (const affId of affected) {
          const c = next.get(affId);
          if (c) {
            const { value: computed, error } = evaluateFormula(c.raw, next);
            next.set(affId, { ...c, computed, error, dirty: false });
          }
        }

        return next;
      });
      setEditingCell(null);
      bumpRenderCount();
    },
    [isActive, bumpRenderCount]
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const op = prev[prev.length - 1]!;
      commitEdit(op.cellId, op.prevRaw);
      return prev.slice(0, -1);
    });
  }, [commitEdit]);

  const cellsInDom = useMemo(() => {
    if (isActive("virtualGrid")) {
      return VISIBLE_ROWS * VISIBLE_COLS;
    }
    return Math.min(DEFAULT_ROWS * DEFAULT_COLS, cells.size || DEFAULT_ROWS * DEFAULT_COLS);
  }, [isActive, cells.size]);

  // State inspector entries
  const stateEntries = useMemo<StateEntry[]>(() => {
    const entries: StateEntry[] = [
      { label: "cells", value: cells.size },
      { label: "cellsInDOM", value: cellsInDom, highlight: true },
      { label: "viewport", value: `${viewportStart.row},${viewportStart.col}` },
      { label: "editing", value: editingCell ?? "none" },
      { label: "formulas", value: [...cells.values()].filter((c) => c.formula).length },
      { label: "depEdges", value: [...cells.values()].reduce((n, c) => n + c.deps.length, 0) },
      { label: "recalcs", value: recalcCount, highlight: true },
      { label: "undoDepth", value: undoStack.length },
    ];
    if (selection) {
      const rows = Math.abs(selection.end.row - selection.start.row) + 1;
      const cols = Math.abs(selection.end.col - selection.start.col) + 1;
      entries.push({ label: "selection", value: `${rows}×${cols}`, highlight: true });
    }
    return entries;
  }, [cells, cellsInDom, viewportStart, editingCell, recalcCount, undoStack, selection]);

  const value = useMemo<SpreadsheetContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      cells,
      totalRows: DEFAULT_ROWS,
      totalCols: DEFAULT_COLS,
      visibleRows: VISIBLE_ROWS,
      visibleCols: VISIBLE_COLS,
      viewportStart,
      setViewportStart,
      selection,
      setSelection,
      editingCell,
      startEditing,
      commitEdit,
      cancelEdit,
      depGraph,
      affectedCells,
      recalcOrder,
      undoStack,
      undo,
      isActive,
      featureToggled,
      toggleFeature,
      renderCount,
      cellsInDom,
      recalcCount,
      stateEntries,
    }),
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      cells,
      viewportStart,
      selection,
      editingCell,
      startEditing,
      commitEdit,
      cancelEdit,
      depGraph,
      affectedCells,
      recalcOrder,
      undoStack,
      undo,
      isActive,
      featureToggled,
      toggleFeature,
      renderCount,
      cellsInDom,
      recalcCount,
      stateEntries,
    ]
  );

  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
