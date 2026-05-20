"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  SpreadsheetProvider,
  useSpreadsheet,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type ApiEndpoint,
  type TypeDef,
} from "./spreadsheet-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { SPREADSHEET_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./SpreadsheetLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function SpreadsheetLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <SpreadsheetProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`planning-${activeStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION.enterCard}
              >
                <PlanningView activeStep={activeStep} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <SheetEvolution />
          )}
        </div>
      </div>
    </SpreadsheetProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "Grid", "Edit", "Fx", "DAG",
  "Prop", "Sel", "Virt",
  "Fmt", "Undo", "Clip",
  "Perf", "Collab",
];

const STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "Grid Rendering", "Cell Editing", "Formula Engine", "Dependency DAG",
  "Change Propagation", "Selection Model", "Virtual Grid",
  "Formatting", "Undo/Redo", "Clipboard",
  "Performance", "Collaboration",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <nav className={styles.stepBar} aria-label="Build steps">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${STEP_TITLES[i]}${i + 1 < activeStep ? " (complete)" : ""}`}
        >
          {label}
        </span>
      ))}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <RequirementsView />;
  if (activeStep === 2) return <ApiDesignView />;
  return <ComponentTreeView />;
}

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useSpreadsheet();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter((s) => scopeEnabled.has(s.id))
      .map((s) => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Scope checklist</h3>
      <div className={styles.checklist}>
        {SCOPE_ITEMS.map((item) => (
          <button
            key={item.id}
            className={styles.checkItem}
            data-checked={scopeEnabled.has(item.id) ? "true" : undefined}
            onClick={() => toggleScope(item.id)}
            type="button"
            aria-pressed={scopeEnabled.has(item.id)}
          >
            <span className={styles.checkToggle}>
              {scopeEnabled.has(item.id) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className={styles.checkLabel}>{item.label}</span>
              <p className={styles.checkDesc}>{item.description}</p>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.scopeSummary}>
        <div className={styles.scopeLabel}>Scope</div>
        <div className={styles.scopeValue}>{summary}</div>
      </div>
    </div>
  );
}

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");
  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs}>
        <button type="button" className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      {tab === "endpoints" ? <EndpointCards /> : <TypeCards />}
    </div>
  );
}

function EndpointCards() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        const isOpen = expanded === key;
        return (
          <button key={key} type="button" className={styles.endpointCard} data-expanded={isOpen ? "true" : undefined} onClick={() => setExpanded(isOpen ? null : key)} aria-expanded={isOpen}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </div>
            <div className={styles.endpointDesc}>{ep.description}</div>
            {isOpen && (
              <div className={styles.endpointDetail}>
                {ep.params.length > 0 && (
                  <>
                    <div className={styles.endpointDetailLabel}>Parameters</div>
                    <div className={styles.paramGrid}>
                      {ep.params.map((p) => (
                        <div key={p.name} className={styles.paramRow}>
                          <span className={styles.paramName}>{p.name}</span>
                          <span className={styles.paramType}>{p.type}</span>
                          <span className={styles.paramNote}>{p.note}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className={styles.endpointDetailLabel}>Response</div>
                <div className={styles.responseType}>{ep.responseType}</div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
};

function TypeCards() {
  return (
    <div className={styles.typeCardGrid}>
      {DATA_MODELS.map((t) => (
        <TypeCard key={t.name} typeDef={t} />
      ))}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>{typeDef.category}</span>
      </div>
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f, i) => (
          <div key={i} className={styles.typeFieldRow}>
            {f.name && <span className={styles.typeFieldName}>{f.name}</span>}
            <span className={styles.typeFieldType}>{f.type}</span>
            {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={SPREADSHEET_ARCH_CONFIG} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sheet evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function SheetEvolution() {
  const ctx = useSpreadsheet();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionLayout}>
      <MetricsBar />
      <StepControls />
      <MiniSpreadsheet />
      {ctx.isActive("depGraph") && <DepGraphViz />}
      <AnimatePresence mode="wait">
        <motion.div
          key={`widget-${ctx.activeStep}`}
          initial={noMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={noMotion ? { duration: 0 } : TRANSITION.crossfade}
        >
          <StepWidget step={ctx.activeStep} />
        </motion.div>
      </AnimatePresence>
      <StateInspector entries={ctx.stateEntries} title="SheetState" />
    </div>
  );
}

// ── Metrics bar ────────────────────────────────────────────────────

function MetricsBar() {
  const { cells, cellsInDom, recalcCount, renderCount } = useSpreadsheet();
  const formulaCount = useMemo(() => [...cells.values()].filter(c => c.formula).length, [cells]);

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Spreadsheet metrics">
      <div className={styles.metric}>
        <span className={styles.metricValue}>{cells.size}</span>
        <span className={styles.metricLabel}>Cells</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status="good">{formulaCount}</span>
        <span className={styles.metricLabel}>Formulas</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>{cellsInDom}</span>
        <span className={styles.metricLabel}>DOM nodes</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={recalcCount > 0 ? "warning" : undefined}>{recalcCount}</span>
        <span className={styles.metricLabel}>Recalcs</span>
      </div>
    </div>
  );
}

// ── Prediction challenge ──────────────────────────────────────────

function PredictionChallenge({ question, options, correctIndex, explanation }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>{question}</div>
      <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            data-correct={revealed && i === correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
            onClick={() => !revealed && setSelected(i)}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
          {selected === correctIndex ? "✓ " : "✗ "}{explanation}
        </div>
      )}
    </div>
  );
}

function PredictionToggle({ feature, label, question, options, correctIndex, explanation }: {
  feature: string;
  label: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const { isActive, toggleFeature } = useSpreadsheet();
  const [selected, setSelected] = useState<number | null>(null);
  const on = isActive(feature);
  const revealed = selected !== null;
  const id = useId();

  return (
    <div className={styles.toggleStrip}>
      <div className={styles.toggleRow}>
        <span id={id} className={styles.toggleLabel}>{label}</span>
        <button type="button" className={styles.toggleButton} data-on={on ? "true" : undefined} onClick={() => toggleFeature(feature)} aria-pressed={on} aria-labelledby={id}>
          <span className={styles.toggleKnob} />
        </button>
      </div>
      {!on && (
        <div className={styles.prediction}>
          <div className={styles.predictionQ}>{question}</div>
          <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
            {options.map((opt, i) => (
              <button key={i} type="button" className={styles.predictionOption}
                data-correct={revealed && i === correctIndex ? "true" : undefined}
                data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
                onClick={() => !revealed && setSelected(i)} disabled={revealed}
                role="radio" aria-checked={selected === i}>
                {opt}
              </button>
            ))}
          </div>
          {revealed && (
            <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
              {selected === correctIndex ? "✓ " : "✗ "}{explanation} Toggle the feature to verify.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step controls ─────────────────────────────────────────────────

function StepControls() {
  const { activeStep } = useSpreadsheet();

  switch (activeStep) {
    case 4: return <PredictionChallenge question="A spreadsheet has 100K rows × 26 columns (2.6M cells). How many DOM elements should the grid render?" options={["2,600,000 — one per cell", "~200 — only cells visible in the viewport plus buffer", "26 — one per column, rows are virtual"]} correctIndex={1} explanation="The grid renders only the ~20 visible rows × 10 visible columns = 200 cells. Cell positions are computed from scroll offset. This is the same windowing technique used in virtual lists, extended to two dimensions." />;
    case 5: return <PredictionChallenge question="A user types '01/02' into a cell. What should the spreadsheet store as the raw input?" options={["The string '01/02' — store exactly what was typed", "A Date object for January 2nd", "The number 0.5 (1 divided by 2)"]} correctIndex={0} explanation="The raw input is always the literal string the user typed. Interpretation (date vs fraction vs string) happens in a separate parsing layer. If you eagerly convert on input, you destroy information — the user can never recover what they originally typed." />;
    case 6: return <PredictionChallenge question="For the formula =A1+B2*C3, what is the root node of the AST?" options={["A1 — the first operand", "+ (addition) — last operation applied", "* (multiply) — highest precedence"]} correctIndex={1} explanation="The root is the addition operator. Due to operator precedence, B2*C3 evaluates first (as a subtree), then is added to A1. The root is always the last operation to execute — the lowest-precedence operator at the top level." />;
    case 7: return <PredictionToggle feature="depGraph" label="Dependency DAG" question="Cell D1=C1+1, C1=B1+1, B1=A1+1, A1=5. In what order must cells be recalculated?" options={["D1, C1, B1, A1 — reverse alphabetical", "A1, B1, C1, D1 — topological order", "Any order — all values are independent"]} correctIndex={1} explanation="Topological sort on the dependency DAG yields A1 first (no dependencies), then B1 (depends only on A1), then C1, then D1. This is the only order that guarantees each cell's dependencies are resolved before it's evaluated." />;
    case 8: return <PredictionChallenge question="A spreadsheet has 10K cells. Cell A1 changes. 15 cells transitively depend on A1. How many cells should be recalculated?" options={["10,000 — recalculate everything to be safe", "15 — only the transitive dependents", "16 — A1 itself plus its 15 dependents"]} correctIndex={2} explanation="A1 itself is re-evaluated, plus its 15 transitive dependents. The dirty-marking traversal is O(affected), not O(total). Without the DAG, you'd have to recalculate all 10K cells on every edit." />;
    case 9: return <PredictionChallenge question="A user clicks B2, then Shift+clicks D5. What data structure represents this selection?" options={["{cell: 'D5'} — shift-click replaces", "{start: 'B2', end: 'D5'} — rectangular range", "{anchor: 'B2', cursor: 'D5'} — anchor stays fixed, cursor moves"]} correctIndex={2} explanation="The selection needs an anchor (where the user first clicked) and a cursor (the shift-click target). The range is computed from anchor → cursor. If the user shift-clicks elsewhere, the range recomputes from the same anchor to the new cursor." />;
    case 10: return <PredictionToggle feature="virtualGrid" label="Virtual Grid" question="When the user scrolls down 50 rows in a virtual grid, what happens to the DOM?" options={["50 new rows are created, 50 old rows are destroyed", "The same DOM elements are recycled with new cell data", "All 100K rows are in the DOM but only 20 are visible"]} correctIndex={1} explanation="Cell recycling: the existing DOM elements are repositioned (via CSS transform) and their content is swapped to reflect the new scroll position. No createElement or removeChild needed — just data swaps. This keeps the DOM node count constant regardless of scroll position." />;
    case 11: return <PredictionChallenge question="Two cells both store 0.5. A1 is 'Percentage', B1 is 'Fraction'. What do they display?" options={["Both show '0.5'", "A1 shows '50%', B1 shows '1/2'", "A1 shows '0.50', B1 shows '50%'"]} correctIndex={1} explanation="The stored value is identical (0.5). The format layer transforms it for display: percentage multiplies by 100 and appends %, fraction finds the nearest rational representation. Storage and display are completely decoupled." />;
    case 12: return <PredictionToggle feature="undoRedo" label="Undo (Ctrl+Z)" question="A user pastes a 3×3 block (9 cell edits). They press Ctrl+Z once. What should undo?" options={["The last single cell edit", "All 9 cell edits — the entire paste operation", "Nothing — paste can't be undone"]} correctIndex={1} explanation="The paste is a single user action, even though it modifies 9 cells internally. The Command pattern groups them into one compound command. Undoing cell-by-cell would require 9 Ctrl+Z presses for one logical action." />;
    case 13: return <PredictionChallenge question="Cell C1 contains '=A1+$B$1'. You copy C1 to C3 (two rows down). What does the pasted formula become?" options={["=A1+$B$1 — everything stays", "=A3+$B$3 — everything shifts", "=A3+$B$1 — relative shifts, absolute stays"]} correctIndex={2} explanation="A1 is a relative reference — shifts by the paste offset (2 rows) to A3. $B$1 is absolute (both column and row locked) — stays fixed. This dual behavior is why spreadsheets are powerful: formulas reference both sliding context and fixed constants." />;
    case 14: return <PredictionChallenge question="Cell A1 is referenced by B1, C1, D1. All three are referenced by E1. A1 changes. Without batching, how many times is E1 evaluated?" options={["1 — E1 is only evaluated once", "3 — once for each dependency triggering it", "0 — E1 isn't dirty"]} correctIndex={1} explanation="Without batching, each dependency propagation triggers E1 independently: B1→E1, C1→E1, D1→E1 = 3 evaluations. With batch recalculation, dirty-mark the entire subgraph first, then evaluate in topo order — E1 runs once after B1, C1, D1 are all resolved." />;
    case 15: return <PredictionChallenge question="Two users simultaneously edit cell A1 — one sets 10, the other sets 20. With last-writer-wins, what is A1?" options={["10 — first edit wins", "15 — system averages concurrent edits", "Depends on server timestamp — non-deterministic from clients"]} correctIndex={2} explanation="Last-writer-wins uses server-side timestamps. The result depends on which edit the server processes last, which is non-deterministic from either client's perspective. One edit is silently discarded — LWW is simple but lossy." />;
    default: return null;
  }
}

// ── Mini spreadsheet grid ─────────────────────────────────────────

function MiniSpreadsheet() {
  const ctx = useSpreadsheet();
  const { cells, editingCell, startEditing, commitEdit, cancelEdit, selection, setSelection, affectedCells, isActive } = ctx;

  const ROWS = 6;
  const COLS = 4;
  const COL_LABELS = ["A", "B", "C", "D"];

  return (
    <div className={styles.spreadsheet} role="grid" aria-label="Mini spreadsheet">
      {/* Column headers */}
      <div className={styles.sheetRow} role="row">
        <div className={styles.rowHeader} role="columnheader" />
        {COL_LABELS.map(col => (
          <div key={col} className={styles.colHeader} role="columnheader">{col}</div>
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: ROWS }, (_, r) => (
        <div key={r} className={styles.sheetRow} role="row">
          <div className={styles.rowHeader} role="rowheader">{r + 1}</div>
          {COL_LABELS.map((col, c) => {
            const id = `${col}${r + 1}`;
            const cell = cells.get(id);
            const isEditing = editingCell === id;
            const isAffected = affectedCells.has(id);
            const hasError = !!cell?.error;

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

function CellComponent({ cellId, raw, computed, formula, error, isEditing, isAffected, bold, onDoubleClick, onCommit, onCancel }: {
  cellId: string;
  raw: string;
  computed: string | number | null;
  formula: boolean;
  error: string | null;
  isEditing: boolean;
  isAffected: boolean;
  bold: boolean;
  onDoubleClick: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState(raw);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      setEditValue(raw);
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, raw]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onCommit(editValue);
    } else if (e.key === "Escape") {
      onCancel();
    }
  }, [editValue, onCommit, onCancel]);

  const display = error ? error : computed !== null ? String(computed) : "";

  return (
    <div
      className={styles.cell}
      data-formula={formula ? "true" : undefined}
      data-error={error ? "true" : undefined}
      data-affected={isAffected ? "true" : undefined}
      data-editing={isEditing ? "true" : undefined}
      data-bold={bold ? "true" : undefined}
      role="gridcell"
      aria-label={`${cellId}: ${display || "empty"}`}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "F2") onDoubleClick(); }}
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

// ── Dependency graph visualization ────────────────────────────────

function DepGraphViz() {
  const { depGraph, affectedCells, recalcOrder } = useSpreadsheet();

  if (depGraph.size === 0) return null;

  const nodes = new Set<string>();
  depGraph.forEach((deps, cell) => {
    nodes.add(cell);
    deps.forEach(d => nodes.add(d));
  });

  const nodeArr = [...nodes];
  const nodePos: Record<string, { x: number; y: number }> = {};
  const levelMap = new Map<string, number>();

  // Simple level assignment
  function getLevel(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    if (levelMap.has(id)) return levelMap.get(id)!;
    const deps = depGraph.get(id) ?? [];
    const level = deps.length === 0 ? 0 : Math.max(...deps.map(d => getLevel(d, visited))) + 1;
    levelMap.set(id, level);
    return level;
  }

  nodeArr.forEach(n => getLevel(n));

  const levels: string[][] = [];
  nodeArr.forEach(n => {
    const l = levelMap.get(n) ?? 0;
    if (!levels[l]) levels[l] = [];
    levels[l]!.push(n);
  });

  levels.forEach((lvl, li) => {
    lvl.forEach((n, ni) => {
      nodePos[n] = { x: 30 + ni * 60, y: 20 + li * 50 };
    });
  });

  const width = Math.max(160, levels.reduce((m, l) => Math.max(m, l.length * 60 + 30), 0));
  const height = Math.max(80, levels.length * 50 + 20);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Dependency DAG</div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.dagSvg}>
        {/* Edges */}
        {nodeArr.map(cell => {
          const deps = depGraph.get(cell) ?? [];
          return deps.map(dep => {
            const from = nodePos[dep];
            const to = nodePos[cell];
            if (!from || !to) return null;
            return (
              <line
                key={`${dep}-${cell}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={styles.dagEdge}
                data-affected={affectedCells.has(cell) || affectedCells.has(dep) ? "true" : undefined}
                markerEnd="url(#dagArrow)"
              />
            );
          });
        })}
        {/* Arrow marker */}
        <defs>
          <marker id="dagArrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--color-muted)" />
          </marker>
        </defs>
        {/* Nodes */}
        {nodeArr.map(n => {
          const pos = nodePos[n];
          if (!pos) return null;
          return (
            <g key={n}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={16}
                className={styles.dagNode}
                data-affected={affectedCells.has(n) ? "true" : undefined}
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                className={styles.dagLabel}
                textAnchor="middle"
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>
      {recalcOrder.length > 0 && (
        <div className={styles.recalcOrder}>
          <span className={styles.recalcLabel}>Recalc order:</span>
          {recalcOrder.map((id, i) => (
            <span key={id} className={styles.recalcStep} data-affected={affectedCells.has(id) ? "true" : undefined}>
              {i > 0 && " → "}{id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step widgets ──────────────────────────────────────────────────

function StepWidget({ step }: { step: number }) {
  switch (step) {
    case 4: return <GridWidget />;
    case 5: return <CellEditWidget />;
    case 6: return <FormulaWidget />;
    case 7: return <DepGraphWidget />;
    case 8: return <PropagationWidget />;
    case 9: return <SelectionWidget />;
    case 10: return <VirtualGridWidget />;
    case 11: return <FormatWidget />;
    case 12: return <UndoWidget />;
    case 13: return <ClipboardWidget />;
    case 14: return <PerformanceWidget />;
    case 15: return <CollaborationWidget />;
    default: return null;
  }
}

function GridWidget() {
  const [cellCount, setCellCount] = useState(100);
  const visibleCount = Math.min(cellCount, 200);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Grid rendering — the viewport illusion</div>
      <div className={styles.viewportDemo}>
        <div className={styles.viewportMinimap}>
          <div className={styles.minimapGrid} style={{ height: Math.min(80, cellCount / 100 * 80) }} />
          <div className={styles.minimapViewport} style={{ height: Math.min(20, 20 * (200 / cellCount)), top: 0 }} />
        </div>
        <div className={styles.viewportStats}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total cells</span>
            <span className={styles.statValue}>{(cellCount * 26).toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>DOM nodes</span>
            <span className={styles.statValue} data-status="good">{visibleCount}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Rows visible</span>
            <span className={styles.statValue}>~20</span>
          </div>
        </div>
      </div>
      <label className={styles.widgetSliderLabel} htmlFor="grid-rows">Rows: {cellCount}</label>
      <input
        id="grid-rows"
        type="range" min={10} max={100000} step={100}
        value={cellCount}
        onChange={e => setCellCount(Number(e.target.value))}
        className={styles.widgetSlider}
        aria-valuetext={`${cellCount} rows`}
      />
      <div className={styles.widgetNote}>
        Slide to see: DOM node count stays constant while total cells grow. The grid is a viewport window over virtual coordinate space.
      </div>
    </div>
  );
}

function CellEditWidget() {
  const { cells, editingCell } = useSpreadsheet();
  const activeId = editingCell;
  const watchIds = activeId
    ? [activeId, ...Array.from(cells.values()).filter(c => c.deps.includes(activeId)).map(c => c.id).slice(0, 3)]
    : ["A1", "B2", "C2", "D2"];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>
        {activeId ? `Editing ${activeId}` : "Cell anatomy — raw vs computed"}
      </div>
      <div className={styles.cellInspector}>
        {watchIds.map(id => {
          const cell = cells.get(id);
          const isEditing = id === activeId;
          return (
            <div key={id} className={styles.cellInspectRow} data-active={isEditing ? "true" : undefined}>
              <span className={styles.cellInspectId}>{id}</span>
              <span className={styles.cellInspectRaw}>{cell?.raw || "(empty)"}</span>
              <span className={styles.cellInspectComputed}>
                {cell?.error ? <span style={{ color: "var(--color-error)" }}>ERR</span> : cell?.computed != null ? String(cell.computed) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{activeId ? "EDITING" : "IDLE"}</div>
          <div className={styles.metricLabel}>State</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{cells.get(activeId ?? "")?.formula ? "FORMULA" : cells.get(activeId ?? "")?.raw ? "VALUE" : "—"}</div>
          <div className={styles.metricLabel}>Type</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{cells.get(activeId ?? "")?.deps.length ?? 0}</div>
          <div className={styles.metricLabel}>Deps</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Double-click any cell above to edit. This panel tracks the active cell in real time — watch raw input, parsing, and computed value update as you type.
      </div>
    </div>
  );
}

function FormulaWidget() {
  const [formula, setFormula] = useState("=A1+B2*C3");
  const tokens = useMemo(() => {
    if (!formula.startsWith("=")) return [];
    const expr = formula.slice(1);
    const result: { type: string; value: string }[] = [];
    let i = 0;
    while (i < expr.length) {
      if (/[A-Z]/.test(expr[i]!) && /\d/.test(expr[i + 1] ?? "")) {
        let ref = expr[i]!;
        i++;
        while (i < expr.length && /\d/.test(expr[i]!)) { ref += expr[i]; i++; }
        result.push({ type: "ref", value: ref });
      } else if (/[+\-*/]/.test(expr[i]!)) {
        result.push({ type: "op", value: expr[i]! });
        i++;
      } else if (/\d/.test(expr[i]!)) {
        let num = "";
        while (i < expr.length && /[\d.]/.test(expr[i]!)) { num += expr[i]; i++; }
        result.push({ type: "lit", value: num });
      } else {
        i++;
      }
    }
    return result;
  }, [formula]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Formula parsing — tokens</div>
      <input
        className={styles.formulaInput}
        value={formula}
        onChange={e => setFormula(e.target.value)}
        aria-label="Enter a formula"
        placeholder="=A1+B2*C3"
      />
      <div className={styles.tokenList}>
        {tokens.map((t, i) => (
          <span key={i} className={styles.token} data-type={t.type}>
            <span className={styles.tokenType}>{t.type}</span>
            <span className={styles.tokenValue}>{t.value}</span>
          </span>
        ))}
      </div>
      <div className={styles.widgetNote}>
        Edit the formula to see tokens update live. References (A1, B2) become dependency edges in the DAG. Operators define the AST structure.
      </div>
    </div>
  );
}

function DepGraphWidget() {
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Dependency tracking</div>
      <div className={styles.widgetNote}>
        The DAG visualization above updates as you edit formulas. Enter =B2*C2 in D2, then =SUM(D2:D4) in D5 to see the dependency chain form. Each arrow means &quot;this cell reads from that cell.&quot;
      </div>
    </div>
  );
}

function PropagationWidget() {
  const { affectedCells, recalcOrder, recalcCount, cells } = useSpreadsheet();
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const replayPropagation = useCallback(() => {
    if (recalcOrder.length === 0) return;
    if (reducedMotion) { setHighlightIdx(recalcOrder.length - 1); return; }
    setHighlightIdx(0);
    for (let i = 1; i < recalcOrder.length; i++) {
      setTimeout(() => setHighlightIdx(i), i * 300);
    }
    setTimeout(() => setHighlightIdx(null), recalcOrder.length * 300 + 600);
  }, [recalcOrder, reducedMotion]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Change propagation</div>
      {recalcOrder.length > 0 ? (
        <>
          <div className={styles.propagationStats}>
            {recalcOrder.map((id, i) => {
              const cell = cells.get(id);
              return (
                <div key={id} className={styles.statRow} data-active={highlightIdx === i ? "true" : undefined} style={highlightIdx === i ? { background: "color-mix(in srgb, var(--color-accent) 14%, transparent)", borderRadius: "var(--radius-1)", padding: "2px 4px", margin: "-2px -4px" } : undefined}>
                  <span className={styles.statLabel} style={{ fontWeight: 800, color: "var(--color-accent)", minWidth: 28 }}>{i + 1}.</span>
                  <span className={styles.statLabel}>{id}</span>
                  <span className={styles.statValue}>{cell?.raw ?? "—"}</span>
                  <span className={styles.statValue} style={{ color: "var(--color-accent)" }}>→ {cell?.computed != null ? String(cell.computed) : "—"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <button type="button" className={styles.actionButton} onClick={replayPropagation}>▶ Replay cascade</button>
            <span style={{ fontSize: "0.625rem", color: "var(--color-muted)" }}>{recalcOrder.length} cells in topo order</span>
          </div>
        </>
      ) : (
        <div className={styles.widgetNote}>
          Edit a cell that other cells depend on — try changing A1 or B2. The cascade path will appear here showing which cells recalculate and in what order.
        </div>
      )}
      <div className={styles.metricsBar}>
        <div className={styles.metric}>
          <div className={styles.metricValue} data-status={affectedCells.size > 0 ? "warning" : undefined}>{affectedCells.size}</div>
          <div className={styles.metricLabel}>Affected</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{recalcCount}</div>
          <div className={styles.metricLabel}>Total recalcs</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue} data-status="good">{cells.size}</div>
          <div className={styles.metricLabel}>Total cells</div>
        </div>
      </div>
    </div>
  );
}

function SelectionWidget() {
  const [mode, setMode] = useState<"single" | "range" | "multi">("single");
  const GRID_ROWS = 5;
  const GRID_COLS = 4;
  const [anchor, setAnchor] = useState<{r: number; c: number} | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cellKey = (r: number, c: number) => `${r}-${c}`;

  const handleClick = (r: number, c: number, e: React.MouseEvent) => {
    const key = cellKey(r, c);
    if (mode === "single") {
      setSelected(new Set([key]));
      setAnchor({ r, c });
    } else if (mode === "range") {
      if (!anchor || !e.shiftKey) {
        setSelected(new Set([key]));
        setAnchor({ r, c });
      } else {
        const newSet = new Set<string>();
        const minR = Math.min(anchor.r, r);
        const maxR = Math.max(anchor.r, r);
        const minC = Math.min(anchor.c, c);
        const maxC = Math.max(anchor.c, c);
        for (let ri = minR; ri <= maxR; ri++) {
          for (let ci = minC; ci <= maxC; ci++) {
            newSet.add(cellKey(ri, ci));
          }
        }
        setSelected(newSet);
      }
    } else {
      const newSet = new Set(selected);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setSelected(newSet);
    }
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Selection model</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Selection mode">
        {(["single", "range", "multi"] as const).map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            className={styles.strategyOption} data-active={mode === m ? "true" : undefined}
            onClick={() => { setMode(m); setSelected(new Set()); setAnchor(null); }}>
            <span className={styles.strategyName}>{m}</span>
            <span className={styles.strategyDesc}>
              {m === "single" ? "Click to select one cell" : m === "range" ? "Click + Shift-click for range" : "Cmd/Ctrl-click to toggle cells"}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.selectionGrid} role="grid" aria-label="Selection demo grid">
        {Array.from({ length: GRID_ROWS }, (_, r) => (
          <div key={r} className={styles.selectionRow} role="row">
            {Array.from({ length: GRID_COLS }, (_, c) => {
              const key = cellKey(r, c);
              const isSelected = selected.has(key);
              const isAnchor = anchor?.r === r && anchor?.c === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  className={styles.selectionCell}
                  data-selected={isSelected ? "true" : undefined}
                  data-anchor={isAnchor ? "true" : undefined}
                  onClick={(e) => handleClick(r, c, e)}
                  aria-label={`${String.fromCharCode(65 + c)}${r + 1}${isSelected ? " selected" : ""}`}
                >
                  {String.fromCharCode(65 + c)}{r + 1}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Selected</div>
          <div className={styles.metricValue}>{selected.size}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Mode</div>
          <div className={styles.metricValue}>{mode}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Anchor</div>
          <div className={styles.metricValue}>{anchor ? `${String.fromCharCode(65 + anchor.c)}${anchor.r + 1}` : "—"}</div>
        </div>
      </div>
    </div>
  );
}

function VirtualGridWidget() {
  const { isActive, cellsInDom, totalRows, totalCols } = useSpreadsheet();
  const on = isActive("virtualGrid");
  const [viewportTop, setViewportTop] = useState(0);
  const VISIBLE = 20;
  const minimapH = 80;
  const viewH = (VISIBLE / totalRows) * minimapH;
  const maxScroll = totalRows - VISIBLE;
  const dragging = useRef(false);

  const handleMinimapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setViewportTop(Math.round(ratio * maxScroll));
  };

  const handleMinimapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromPointer(e);
  };

  const handleMinimapPointerUp = () => { dragging.current = false; };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Virtual grid viewport</div>
      <div className={styles.viewportDemo}>
        <div
          className={styles.viewportMinimap}
          onPointerDown={handleMinimapPointerDown}
          onPointerMove={handleMinimapPointerMove}
          onPointerUp={handleMinimapPointerUp}
          style={{ cursor: "ns-resize", touchAction: "none" }}
          role="slider"
          aria-label="Scroll viewport"
          aria-valuemin={0}
          aria-valuemax={maxScroll}
          aria-valuenow={viewportTop}
        >
          <div className={styles.minimapGrid} style={{ height: minimapH }} />
          <div className={styles.minimapViewport} style={{ top: (viewportTop / totalRows) * minimapH, height: viewH }} />
        </div>
        <div className={styles.viewportStats}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Showing rows</span>
            <span className={styles.statValue}>{viewportTop + 1}–{Math.min(viewportTop + VISIBLE, totalRows)}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>DOM nodes</span>
            <span className={styles.statValue} data-status={on ? "good" : "warning"}>{on ? cellsInDom : (totalRows * totalCols).toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Recycled</span>
            <span className={styles.statValue} data-status="good">{on ? "Yes" : "No"}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>translateY</span>
            <span className={styles.statValue}>{viewportTop * 28}px</span>
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        {on ? "Drag the minimap viewport — DOM count stays constant at ~200 regardless of scroll position. Cells are repositioned via CSS transform." : "Enable virtual grid above. Then drag the minimap to scroll."}
      </div>
    </div>
  );
}

function FormatWidget() {
  const { cells, selection } = useSpreadsheet();
  const [format, setFormat] = useState<"text" | "number" | "percent" | "currency">("text");

  const COL_LABELS = ["A", "B", "C", "D"];
  const targetId = selection ? `${COL_LABELS[selection.start.col] ?? "A"}${selection.start.row + 1}` : "A1";
  const cell = cells.get(targetId);
  const rawVal = cell?.computed ?? cell?.raw ?? "";
  const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
  const isNum = !isNaN(numVal);

  const display = !isNum ? String(rawVal)
    : format === "percent" ? `${(numVal * 100).toFixed(0)}%`
    : format === "currency" ? `$${numVal.toFixed(2)}`
    : format === "number" ? numVal.toFixed(2)
    : String(rawVal);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Format pipeline — {targetId}</div>
      <div className={styles.formatPipeline}>
        <div className={styles.pipelineStage}>
          <span className={styles.pipelineLabel}>stored</span>
          <span className={styles.pipelineValue}>{cell?.raw || "(empty)"}</span>
        </div>
        <span className={styles.pipelineArrow}>→</span>
        <div className={styles.pipelineStage}>
          <span className={styles.pipelineLabel}>computed</span>
          <span className={styles.pipelineValue}>{isNum ? numVal : String(rawVal)}</span>
        </div>
        <span className={styles.pipelineArrow}>→</span>
        <div className={styles.pipelineStage} data-active="true">
          <span className={styles.pipelineLabel}>format</span>
          <div className={styles.formatOptions} role="radiogroup" aria-label="Number format">
            {(["text", "number", "percent", "currency"] as const).map(f => (
              <button key={f} type="button" role="radio" aria-checked={format === f}
                className={styles.formatOption} data-active={format === f ? "true" : undefined}
                onClick={() => setFormat(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <span className={styles.pipelineArrow}>→</span>
        <div className={styles.pipelineStage}>
          <span className={styles.pipelineLabel}>display</span>
          <span className={styles.pipelineValue} data-result="true">{display}</span>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Click a cell in the grid above to select it. The pipeline shows how the stored value transforms through formatting — the raw data never changes.
        {!isNum && cell?.raw ? " (Enter a number to see format options work)" : ""}
      </div>
    </div>
  );
}

function UndoWidget() {
  const { undoStack, undo, isActive } = useSpreadsheet();
  const on = isActive("undoRedo");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Undo stack</div>
      {on && (
        <>
          <div className={styles.undoStack}>
            {undoStack.length === 0 ? (
              <div className={styles.undoEmpty}>No operations yet — edit a cell to add to the stack</div>
            ) : (
              undoStack.map((op, i) => (
                <div key={`${op.cellId}-${i}`} className={styles.undoEntry}>
                  <span className={styles.undoIndex}>{i + 1}</span>
                  <span className={styles.undoOp}>{op.cellId}: &quot;{op.prevRaw}&quot; → &quot;{op.newRaw}&quot;</span>
                </div>
              ))
            )}
          </div>
          {undoStack.length > 0 && (
            <button type="button" className={styles.undoButton} onClick={undo} aria-label="Undo last operation">
              ↩ Undo
            </button>
          )}
        </>
      )}
      <div className={styles.widgetNote}>
        Each edit pushes a command. Undo restores the previous raw value and triggers re-evaluation of the dependency chain.
      </div>
    </div>
  );
}

function adjustFormula(formula: string, rowOffset: number, colOffset: number): string {
  if (!formula.startsWith("=")) return formula;
  return "=" + formula.slice(1).replace(/(\$?)([A-Z])(\$?)(\d+)/g, (_match, colLock, col, rowLock, row) => {
    const newCol = colLock === "$" ? col : String.fromCharCode(col.charCodeAt(0) + colOffset);
    const newRow = rowLock === "$" ? row : String(parseInt(row) + rowOffset);
    return `${colLock}${newCol}${rowLock}${newRow}`;
  });
}

function ClipboardWidget() {
  const [sourceFormula, setSourceFormula] = useState("=A1+$B$1");
  const [rowOffset, setRowOffset] = useState(2);
  const [colOffset, setColOffset] = useState(0);

  const pasted = adjustFormula(sourceFormula, rowOffset, colOffset);
  const sourceCell = `C1`;
  const destRow = 1 + rowOffset;
  const destCol = String.fromCharCode("C".charCodeAt(0) + colOffset);
  const destCell = `${destCol}${destRow}`;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Copy/paste formula adjustment</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Source formula</span>
          <input
            type="text"
            value={sourceFormula}
            onChange={(e) => setSourceFormula(e.target.value)}
            className={styles.formulaInput}
            style={{ flex: 1, minHeight: 44 }}
            aria-label="Source formula"
            placeholder="=A1+$B$1"
          />
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Row offset</span>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {[0, 1, 2, 3, 5].map(n => (
              <button key={n} type="button" className={styles.toolButton} data-active={rowOffset === n ? "true" : undefined} onClick={() => setRowOffset(n)}>
                +{n}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Col offset</span>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {[0, 1, 2].map(n => (
              <button key={n} type="button" className={styles.toolButton} data-active={colOffset === n ? "true" : undefined} onClick={() => setColOffset(n)}>
                +{n}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.clipboardDemo}>
        <div className={styles.clipboardRow}>
          <span className={styles.clipboardLabel}>{sourceCell} (source)</span>
          <span className={styles.clipboardFormula}>{sourceFormula}</span>
        </div>
        <div className={styles.clipboardArrow}>↓ paste to {destCell} ({rowOffset > 0 ? `${rowOffset} row${rowOffset > 1 ? "s" : ""} down` : "same row"}{colOffset > 0 ? `, ${colOffset} col${colOffset > 1 ? "s" : ""} right` : ""})</div>
        <div className={styles.clipboardRow}>
          <span className={styles.clipboardLabel}>{destCell} (pasted)</span>
          <span className={styles.clipboardFormula} data-result="true">{pasted}</span>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Type any formula with $ locks. Relative refs (A1) shift by the paste offset. $ locks a column ($A) or row ($1). Try =A1+$B$1 vs =$A$1+$B$1.
      </div>
    </div>
  );
}

function PerformanceWidget() {
  const [mode, setMode] = useState<"naive" | "batched">("naive");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const naiveSteps = [
    { active: ["A1"], evalCount: { A1: 1, B1: 0, C1: 0, D1: 0, E1: 0 }, label: "A1 changed" },
    { active: ["B1"], evalCount: { A1: 1, B1: 1, C1: 0, D1: 0, E1: 0 }, label: "B1 recalcs (dep of A1)" },
    { active: ["E1"], evalCount: { A1: 1, B1: 1, C1: 0, D1: 0, E1: 1 }, label: "E1 recalcs (dep of B1) — eval #1" },
    { active: ["C1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 0, E1: 1 }, label: "C1 recalcs (dep of A1)" },
    { active: ["E1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 0, E1: 2 }, label: "E1 recalcs AGAIN (dep of C1) — eval #2" },
    { active: ["D1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 1, E1: 2 }, label: "D1 recalcs (dep of A1)" },
    { active: ["E1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 1, E1: 3 }, label: "E1 recalcs AGAIN (dep of D1) — eval #3!" },
  ];

  const batchedSteps = [
    { active: ["A1"], evalCount: { A1: 1, B1: 0, C1: 0, D1: 0, E1: 0 }, label: "A1 changed → dirty-mark subgraph" },
    { active: ["B1", "C1", "D1", "E1"], evalCount: { A1: 1, B1: 0, C1: 0, D1: 0, E1: 0 }, label: "All dependents marked dirty" },
    { active: ["B1"], evalCount: { A1: 1, B1: 1, C1: 0, D1: 0, E1: 0 }, label: "Topo order: eval B1" },
    { active: ["C1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 0, E1: 0 }, label: "Topo order: eval C1" },
    { active: ["D1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 1, E1: 0 }, label: "Topo order: eval D1" },
    { active: ["E1"], evalCount: { A1: 1, B1: 1, C1: 1, D1: 1, E1: 1 }, label: "Topo order: eval E1 — just once!" },
  ];

  const steps = mode === "naive" ? naiveSteps : batchedSteps;
  const currentStep = steps[Math.min(step, steps.length - 1)]!;

  const runAnimation = useCallback(() => {
    setStep(0);
    setRunning(true);
    let s = 0;
    const tick = () => {
      s++;
      if (s < steps.length) {
        setStep(s);
        timerRef.current = setTimeout(tick, 600);
      } else {
        setRunning(false);
      }
    };
    timerRef.current = setTimeout(tick, 600);
  }, [steps.length]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const cells = ["A1", "B1", "C1", "D1", "E1"];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Batch recalculation</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Propagation mode">
        {(["naive", "batched"] as const).map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            className={styles.strategyOption} data-active={mode === m ? "true" : undefined}
            onClick={() => { setMode(m); setStep(0); setRunning(false); if (timerRef.current) clearTimeout(timerRef.current); }}>
            <span className={styles.strategyName}>{m}</span>
            <span className={styles.strategyDesc}>
              {m === "naive" ? "Propagate on each dep change" : "Dirty-mark, then topo-sort eval"}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "var(--space-1)", padding: "var(--space-2) 0" }}>
        {cells.map(cell => {
          const isActive = currentStep.active.includes(cell);
          const evals = currentStep.evalCount[cell as keyof typeof currentStep.evalCount] ?? 0;
          return (
            <div key={cell} style={{
              flex: 1,
              textAlign: "center",
              padding: "var(--space-2)",
              borderRadius: "var(--radius-1)",
              background: isActive
                ? "color-mix(in srgb, var(--color-accent) 25%, transparent)"
                : evals > 0
                  ? "var(--color-surface)"
                  : "transparent",
              transition: "background 300ms ease",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800 }}>{cell}</div>
              <div style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                color: evals > 1 ? "var(--color-error)" : evals > 0 ? "var(--color-success)" : "var(--color-muted)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {evals > 0 ? `×${evals}` : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.stepMessage}>{currentStep.label}</div>
      <button
        type="button"
        className={styles.undoButton}
        onClick={runAnimation}
        disabled={running}
        style={{ width: "100%" }}
      >
        {running ? "Running..." : "▶ Run propagation"}
      </button>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>E1 evals</div>
          <div className={styles.metricValue} data-status={(currentStep.evalCount.E1 ?? 0) > 1 ? "bad" : "good"}>
            {currentStep.evalCount.E1 ?? 0}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total evals</div>
          <div className={styles.metricValue}>
            {Object.values(currentStep.evalCount).reduce((a, b) => a + b, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CollaborationWidget() {
  const [strategy, setStrategy] = useState<"lww" | "ot" | "crdt">("lww");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type TimelineStep = { alice: string; bob: string; server: string; result: string; lost?: boolean };

  const timelines: Record<string, TimelineStep[]> = {
    lww: [
      { alice: "types 10", bob: "types 20", server: "—", result: "?" },
      { alice: "sends A1=10 (t=1)", bob: "—", server: "A1=10", result: "10" },
      { alice: "—", bob: "sends A1=20 (t=2)", server: "A1=20", result: "20" },
      { alice: "receives A1=20", bob: "✓", server: "A1=20", result: "20", lost: true },
    ],
    ot: [
      { alice: "types 10", bob: "types 20", server: "—", result: "?" },
      { alice: "sends op(A1, 10)", bob: "sends op(A1, 20)", server: "queue", result: "?" },
      { alice: "—", bob: "—", server: "transforms: 10 → 20", result: "20" },
      { alice: "receives transform", bob: "receives transform", server: "canonical", result: "20" },
    ],
    crdt: [
      { alice: "types 10", bob: "types 20", server: "—", result: "?" },
      { alice: "lww(A1, 10, t=1, alice)", bob: "lww(A1, 20, t=2, bob)", server: "—", result: "?" },
      { alice: "merges bob's op", bob: "merges alice's op", server: "no server needed", result: "?" },
      { alice: "A1=20 (t=2 wins)", bob: "A1=20 (t=2 wins)", server: "converged", result: "20" },
    ],
  };

  const timeline = timelines[strategy]!;
  const currentStep = timeline[Math.min(step, timeline.length - 1)]!;

  const runAnimation = useCallback(() => {
    setStep(0);
    setRunning(true);
    let s = 0;
    const tick = () => {
      s++;
      if (s < timeline.length) {
        setStep(s);
        timerRef.current = setTimeout(tick, 900);
      } else {
        setRunning(false);
      }
    };
    timerRef.current = setTimeout(tick, 900);
  }, [timeline.length]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Conflict resolution</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Sync strategy">
        {(["lww", "ot", "crdt"] as const).map(s => (
          <button key={s} type="button" role="radio" aria-checked={strategy === s}
            className={styles.strategyOption} data-active={strategy === s ? "true" : undefined}
            onClick={() => { setStrategy(s); setStep(0); setRunning(false); if (timerRef.current) clearTimeout(timerRef.current); }}>
            <span className={styles.strategyName}>{s === "lww" ? "LWW" : s.toUpperCase()}</span>
            <span className={styles.strategyDesc}>
              {s === "lww" ? "Last writer wins" : s === "ot" ? "Server transforms" : "Convergent replicas"}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", padding: "var(--space-2) 0" }}>
        {["alice", "bob", "server", "result"].map(row => (
          <div key={row} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "0.65rem" }}>
            <span style={{
              minWidth: 48,
              fontWeight: 800,
              textTransform: "uppercase",
              color: row === "alice" ? "var(--diagram-layer-1)" : row === "bob" ? "var(--diagram-layer-4)" : row === "server" ? "var(--color-muted)" : "var(--color-accent)",
            }}>{row}</span>
            <span style={{
              flex: 1,
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius-1)",
              background: currentStep[row as keyof TimelineStep] !== "—" && currentStep[row as keyof TimelineStep] !== "?" ? "var(--color-surface)" : "transparent",
              color: row === "result" && currentStep.lost ? "var(--color-error)" : "var(--color-text)",
              fontWeight: 600,
              transition: "background 300ms ease",
            }}>
              {currentStep[row as keyof TimelineStep]}
              {row === "result" && currentStep.lost && " (alice's edit lost)"}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.undoButton}
        onClick={runAnimation}
        disabled={running}
        style={{ width: "100%" }}
      >
        {running ? "Simulating..." : "▶ Simulate conflict"}
      </button>
    </div>
  );
}
