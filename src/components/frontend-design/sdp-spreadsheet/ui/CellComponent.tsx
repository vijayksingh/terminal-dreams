"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "../SpreadsheetLab.module.css";

type CellComponentProps = {
  cellId: string;
  raw: string;
  computed: string | number | null;
  formula: boolean;
  error: string | null;
  isEditing: boolean;
  isAffected: boolean;
  isHighlighted: boolean;
  bold: boolean;
  onDoubleClick: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

export function CellComponent({
  cellId,
  raw,
  computed,
  formula,
  error,
  isEditing,
  isAffected,
  isHighlighted,
  bold,
  onDoubleClick,
  onCommit,
  onCancel,
}: CellComponentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const seedRef = useRef<string | null>(null);
  const [editValue, setEditValue] = useState(raw);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const seed = seedRef.current;
      seedRef.current = null;
      setEditValue(seed ?? raw);
      inputRef.current.focus();
      if (seed) {
        inputRef.current.setSelectionRange(seed.length, seed.length);
      } else {
        inputRef.current.select();
      }
    }
  }, [isEditing, raw]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onCommit(editValue);
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [editValue, onCommit, onCancel]
  );

  const display = error ? error : computed !== null ? String(computed) : "";

  return (
    <div
      className={styles.cell}
      data-formula={formula ? "true" : undefined}
      data-error={error ? "true" : undefined}
      data-affected={isAffected ? "true" : undefined}
      data-editing={isEditing ? "true" : undefined}
      data-highlighted={isHighlighted ? "true" : undefined}
      data-bold={bold ? "true" : undefined}
      role="gridcell"
      aria-label={`${cellId}: ${display || "empty"}`}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          onDoubleClick();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          seedRef.current = e.key;
          onDoubleClick();
        }
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className={styles.cellInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(editValue)}
          aria-label={`Edit ${cellId}`}
        />
      ) : (
        <span className={styles.cellValue}>{display}</span>
      )}
    </div>
  );
}
