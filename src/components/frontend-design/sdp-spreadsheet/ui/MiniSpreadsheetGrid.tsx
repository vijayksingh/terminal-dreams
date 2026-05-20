"use client";

import React, { useRef, useCallback } from "react";
import { useSpreadsheet } from "../spreadsheet-context";
import { CellComponent } from "./CellComponent";
import styles from "../SpreadsheetLab.module.css";

export const COL_LABELS = ["A", "B", "C", "D"];
export const GRID_ROWS = 6;
export const GRID_COLS = 4;

export function MiniSpreadsheetGrid() {
  const ctx = useSpreadsheet();
  const {
    cells,
    editingCell,
    startEditing,
    commitEdit,
    cancelEdit,
    affectedCells,
    highlightedCell,
  } = ctx;
  const gridRef = useRef<HTMLDivElement>(null);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches('[role="gridcell"]') || editingCell) return;
      const cellId = target.getAttribute("aria-label")?.split(":")[0] ?? "";
      const col = COL_LABELS.indexOf(cellId[0] || "");
      const row = parseInt(cellId.slice(1), 10) - 1;
      if (col < 0 || isNaN(row)) return;

      let nextR = row,
        nextC = col;
      switch (e.key) {
        case "ArrowUp":
          nextR = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          nextR = Math.min(GRID_ROWS - 1, row + 1);
          break;
        case "ArrowLeft":
          nextC = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          nextC = Math.min(GRID_COLS - 1, col + 1);
          break;
        case "Home":
          nextC = 0;
          if (e.ctrlKey) nextR = 0;
          break;
        case "End":
          nextC = GRID_COLS - 1;
          if (e.ctrlKey) nextR = GRID_ROWS - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const nextId = `${COL_LABELS[nextC]}${nextR + 1}`;
      const nextCell = gridRef.current?.querySelector(
        `[aria-label^="${nextId}:"]`
      ) as HTMLElement;
      nextCell?.focus();
    },
    [editingCell]
  );

  return (
    <div
      ref={gridRef}
      className={styles.spreadsheet}
      role="grid"
      aria-label="Mini spreadsheet"
      onKeyDown={handleGridKeyDown}
    >
      <div className={styles.sheetRow} role="row">
        <div className={styles.rowHeader} role="columnheader" aria-label="Row" />
        {COL_LABELS.map((col) => (
          <div key={col} className={styles.colHeader} role="columnheader">
            {col}
          </div>
        ))}
      </div>
      {Array.from({ length: GRID_ROWS }, (_, r) => (
        <div key={r} className={styles.sheetRow} role="row">
          <div className={styles.rowHeader} role="rowheader">
            {r + 1}
          </div>
          {COL_LABELS.map((col, c) => {
            const id = `${col}${r + 1}`;
            const cell = cells.get(id);
            const isEditing = editingCell === id;
            const isAffected = affectedCells.has(id);

            return (
              <CellComponent
                key={id}
                cellId={id}
                raw={cell?.raw ?? ""}
                computed={cell?.computed ?? null}
                formula={cell?.formula ?? false}
                error={cell?.error ?? null}
                isEditing={isEditing}
                isAffected={isAffected}
                isHighlighted={highlightedCell === id}
                bold={cell?.format.bold ?? false}
                onDoubleClick={() => startEditing(id)}
                onCommit={(val) => commitEdit(id, val)}
                onCancel={cancelEdit}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
