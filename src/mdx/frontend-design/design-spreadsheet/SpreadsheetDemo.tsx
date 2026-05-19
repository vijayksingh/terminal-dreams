"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";

type CellValue = string | number | null;

type Cell = {
  raw: string;
  computed: CellValue;
  formula: boolean;
  deps: string[];
  error?: string;
};

const COLS = 4;
const ROWS = 5;
const COL_LETTERS = ["A", "B", "C", "D"];

function cellId(row: number, col: number) {
  return `${COL_LETTERS[col]}${row + 1}`;
}

function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-D])(\d+)$/);
  if (!m) return null;
  const col = COL_LETTERS.indexOf(m[1]!);
  const row = parseInt(m[2]!, 10) - 1;
  if (col < 0 || row < 0 || row >= ROWS) return null;
  return { row, col };
}

function evaluate(
  raw: string,
  cells: Map<string, Cell>
): { computed: CellValue; deps: string[]; error?: string } {
  if (!raw.startsWith("="))
    return {
      computed: raw === "" ? null : isNaN(Number(raw)) ? raw : Number(raw),
      deps: [],
    };

  const expr = raw.slice(1).trim().toUpperCase();
  const deps: string[] = [];

  const sumMatch = expr.match(/^SUM\(([A-D]\d+):([A-D]\d+)\)$/);
  if (sumMatch) {
    const start = parseCellRef(sumMatch[1]!);
    const end = parseCellRef(sumMatch[2]!);
    if (!start || !end)
      return { computed: null, deps: [], error: "#REF!" };
    let sum = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const id = cellId(r, c);
        deps.push(id);
        const v = cells.get(id)?.computed;
        if (typeof v === "number") sum += v;
      }
    }
    return { computed: sum, deps };
  }

  const parts = expr.split(/([+\-*/])/);
  if (parts.length === 3) {
    const resolveVal = (token: string): number | null => {
      const ref = parseCellRef(token.trim());
      if (ref) {
        deps.push(cellId(ref.row, ref.col));
        const v = cells.get(cellId(ref.row, ref.col))?.computed;
        return typeof v === "number" ? v : null;
      }
      const n = Number(token.trim());
      return isNaN(n) ? null : n;
    };
    const a = resolveVal(parts[0]!);
    const b = resolveVal(parts[2]!);
    const op = parts[1]!;
    if (a === null || b === null)
      return { computed: null, deps, error: "#VALUE!" };
    const result =
      op === "+"
        ? a + b
        : op === "-"
          ? a - b
          : op === "*"
            ? a * b
            : op === "/"
              ? b !== 0
                ? a / b
                : null
              : null;
    if (result === null) return { computed: null, deps, error: "#DIV/0!" };
    return { computed: Math.round(result * 100) / 100, deps };
  }

  const singleRef = parseCellRef(expr);
  if (singleRef) {
    const id = cellId(singleRef.row, singleRef.col);
    deps.push(id);
    return { computed: cells.get(id)?.computed ?? null, deps };
  }

  return { computed: null, deps: [], error: "#ERROR!" };
}

const INITIAL_DATA: [string, string][] = [
  ["A1", "Product"],
  ["B1", "Price"],
  ["C1", "Qty"],
  ["D1", "Total"],
  ["A2", "Widget"],
  ["B2", "29.99"],
  ["C2", "5"],
  ["D2", "=B2*C2"],
  ["A3", "Gadget"],
  ["B3", "49.99"],
  ["C3", "3"],
  ["D3", "=B3*C3"],
  ["A4", "Doohickey"],
  ["B4", "19.99"],
  ["C4", "10"],
  ["D4", "=B4*C4"],
  ["A5", ""],
  ["B5", ""],
  ["C5", ""],
  ["D5", "=SUM(D2:D4)"],
];

function buildCells(): Map<string, Cell> {
  const cells = new Map<string, Cell>();
  for (const [id, raw] of INITIAL_DATA) {
    cells.set(id, { raw, computed: null, formula: raw.startsWith("="), deps: [] });
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const [id] of INITIAL_DATA) {
      const cell = cells.get(id)!;
      const result = evaluate(cell.raw, cells);
      cell.computed = result.computed;
      cell.deps = result.deps;
      cell.error = result.error;
    }
  }
  return cells;
}

export function SpreadsheetDemo() {
  const [cells, setCells] = useState(() => buildCells());
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [lastChanged, setLastChanged] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const recalcAll = useCallback((newCells: Map<string, Cell>) => {
    const changed = new Set<string>();
    for (let pass = 0; pass < 3; pass++) {
      for (const [id, cell] of newCells) {
        const prev = cell.computed;
        const result = evaluate(cell.raw, newCells);
        cell.computed = result.computed;
        cell.deps = result.deps;
        cell.error = result.error;
        cell.formula = cell.raw.startsWith("=");
        if (prev !== cell.computed) changed.add(id);
      }
    }
    return changed;
  }, []);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    setCells((prev) => {
      const next = new Map(prev);
      const cell = { ...(next.get(editing) || { raw: "", computed: null, formula: false, deps: [] }) };
      cell.raw = editValue;
      next.set(editing, cell);
      const changed = recalcAll(next);
      changed.add(editing);
      setLastChanged(changed);
      return next;
    });
    setEditing(null);
  }, [editing, editValue, recalcAll]);

  const depCount = useMemo(
    () => [...cells.values()].reduce((n, c) => n + c.deps.length, 0),
    [cells]
  );

  const formulaCount = useMemo(
    () => [...cells.values()].filter((c) => c.formula).length,
    [cells]
  );

  return (
    <DemoSandbox title="Mini Spreadsheet — double-click to edit, try changing B2">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `56px repeat(${COLS}, 1fr)`,
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
              borderBottom: "1px solid var(--color-border)",
              padding: "6px 4px",
              textAlign: "center",
              fontWeight: 700,
              color: "var(--color-muted)",
            }}
          />
          {COL_LETTERS.map((letter) => (
            <div
              key={letter}
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
                borderBottom: "1px solid var(--color-border)",
                borderLeft: "1px solid var(--color-border)",
                padding: "6px 4px",
                textAlign: "center",
                fontWeight: 700,
                color: "var(--color-muted)",
              }}
            >
              {letter}
            </div>
          ))}

          {Array.from({ length: ROWS }, (_, r) => (
            <>
              <div
                key={`row-${r}`}
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
                  borderBottom: r < ROWS - 1 ? "1px solid var(--color-border)" : undefined,
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: 700,
                  color: "var(--color-muted)",
                }}
              >
                {r + 1}
              </div>
              {Array.from({ length: COLS }, (_, c) => {
                const id = cellId(r, c);
                const cell = cells.get(id);
                const isEditing = editing === id;
                const wasChanged = lastChanged.has(id);
                const isFormula = cell?.formula;

                return (
                  <div
                    key={id}
                    style={{
                      borderLeft: "1px solid var(--color-border)",
                      borderBottom: r < ROWS - 1 ? "1px solid var(--color-border)" : undefined,
                      padding: isEditing ? 0 : "6px 8px",
                      cursor: "text",
                      minHeight: 32,
                      backgroundColor: wasChanged
                        ? "color-mix(in srgb, var(--color-app-accent) 12%, transparent)"
                        : isFormula
                          ? "color-mix(in srgb, var(--diagram-layer-2) 6%, transparent)"
                          : "transparent",
                      transition: "background-color 0.6s ease-out",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onDoubleClick={() => {
                      setEditing(id);
                      setEditValue(cell?.raw ?? "");
                    }}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "2px solid var(--color-app-accent)",
                          borderRadius: 0,
                          padding: "4px 6px",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          backgroundColor: "var(--color-bg)",
                          color: "var(--color-fg)",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          color: cell?.error
                            ? "var(--diagram-layer-8)"
                            : isFormula
                              ? "var(--color-app-accent)"
                              : r === 0
                                ? "var(--color-fg)"
                                : "var(--color-fg)",
                          fontWeight: r === 0 ? 700 : 400,
                          textAlign: c >= 1 && r > 0 ? "right" : "left",
                          width: "100%",
                        }}
                      >
                        {cell?.error
                          ? cell.error
                          : cell?.computed != null
                            ? String(cell.computed)
                            : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            padding: "6px 0",
            color: "var(--color-muted)",
            fontSize: 11,
          }}
        >
          <span>Formulas: {formulaCount}</span>
          <span>Dependency edges: {depCount}</span>
          <span>
            {editing
              ? `Editing: ${editing} — "${cells.get(editing)?.raw ?? ""}"`
              : "Double-click to edit"}
          </span>
        </div>
      </div>
    </DemoSandbox>
  );
}
