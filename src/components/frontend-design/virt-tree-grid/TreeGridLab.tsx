"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import {
  TreeGridProvider,
  useTreeGridContext,
  STEP_LABELS,
  STEP_TITLES,
  MOCK_TREE,
  flattenTree,
  type TreeNode,
  type FlatNode,
} from "./tree-grid-context";
import styles from "./TreeGridLab.module.css";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

export function TreeGridLab({ activeStep }: { activeStep: number }) {
  return (
    <TreeGridProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={[...STEP_LABELS]} />
        <div className={styles.scrollArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${activeStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION.enterCard}
            >
              <StepWidget />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </TreeGridProvider>
  );
}

function StepWidget() {
  const { activeStep } = useTreeGridContext();
  switch (activeStep) {
    case 1: return <TreeView />;
    case 2: return <DFSView />;
    case 3: return <ExpandCollapseView />;
    case 4: return <GridOverview />;
    case 5: return <RowWindowView />;
    case 6: return <ColumnWindowView />;
    case 7: return <CellIntersectionView />;
    case 8: return <ProductionView />;
    default: return null;
  }
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  highlightId,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  highlightId?: string;
}) {
  const isExpanded = expanded.has(node.id);

  return (
    <>
      <div
        className={styles.treeNode}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        data-highlight={node.id === highlightId ? "true" : undefined}
      >
        {node.isFolder ? (
          <span className={styles.nodeIcon}>{isExpanded ? "▾" : "▸"}</span>
        ) : (
          <span className={styles.nodeIcon} style={{ width: 16 }} />
        )}
        <span className={styles.nodeIcon}>{node.isFolder ? "📁" : "📄"}</span>
        <span className={styles.nodeLabel} data-folder={node.isFolder ? "true" : undefined}>
          {node.label}
        </span>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            highlightId={highlightId}
          />
        ))}
    </>
  );
}

function TreeView() {
  const allExpanded = useMemo(
    () => new Set(["root", "components", "utils", "hooks", "forms"]),
    [],
  );

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[0]}</div>
        <p className={styles.widgetNote}>
          Hierarchical data — files and folders nested arbitrarily deep. To render this in a scrollable list or grid, we need to <em>flatten</em> the tree into a linear array while preserving depth information.
        </p>
      </div>

      <div className={styles.treeContainer}>
        <TreeNodeRow node={MOCK_TREE} depth={0} expanded={allExpanded} />
      </div>

      <div className={styles.formula}>
        <span className={styles.formulaVal}>3</span> levels deep
        <span style={{ margin: "0 var(--space-2)", color: "var(--color-muted)" }}>/</span>
        <span className={styles.formulaVal}>12</span> total nodes
      </div>
    </>
  );
}

function DFSView() {
  const prefersReduced = usePrefersReducedMotion();
  const allExpanded = useMemo(
    () => new Set(["root", "components", "utils", "hooks", "forms"]),
    [],
  );
  const flat = useMemo(() => flattenTree(MOCK_TREE, allExpanded), [allExpanded]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefersReduced) {
      setHighlightIdx(flat.length - 1);
      return;
    }
    timerRef.current = setTimeout(
      () => setHighlightIdx((p) => (p + 1) % flat.length),
      400,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [highlightIdx, flat.length, prefersReduced]);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[1]}</div>
        <p className={styles.widgetNote}>
          Depth-first traversal visits each node, descending into children before siblings.
          The output is a flat array where each entry carries its <code>depth</code> for indentation.
        </p>
      </div>

      <div className={styles.splitView}>
        <div>
          <div className={styles.widgetPanel} style={{ marginBottom: "var(--space-2)" }}>
            <div className={styles.widgetTitle}>Tree</div>
          </div>
          <div className={styles.treeContainer}>
            <TreeNodeRow
              node={MOCK_TREE}
              depth={0}
              expanded={allExpanded}
              highlightId={flat[highlightIdx]?.id}
            />
          </div>
        </div>

        <div>
          <div className={styles.widgetPanel} style={{ marginBottom: "var(--space-2)" }}>
            <div className={styles.widgetTitle}>Flat Array</div>
          </div>
          <div className={styles.flatListContainer}>
            {flat.map((node, i) => (
              <div
                key={node.id}
                className={styles.flatListItem}
                data-highlight={i === highlightIdx ? "true" : undefined}
              >
                <span className={styles.flatIdx}>{i}</span>
                <span className={styles.nodeIcon}>
                  {node.isFolder ? "📁" : "📄"}
                </span>
                <span className={styles.nodeLabel} data-folder={node.isFolder ? "true" : undefined}>
                  {node.label}
                </span>
                <span className={styles.flatDepthBadge} data-accent={i === highlightIdx ? "true" : undefined}>
                  d={node.depth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ExpandCollapseView() {
  const { expandedNodes, toggleNode, flatNodes } = useTreeGridContext();

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[2]}</div>
        <p className={styles.widgetNote}>
          Click folders to expand or collapse them. The flat list updates in real time — this is the core operation that tree virtualization libraries optimize.
        </p>
      </div>

      <div className={styles.splitView}>
        <div>
          <div className={styles.widgetPanel} style={{ marginBottom: "var(--space-2)" }}>
            <div className={styles.widgetTitle}>Interactive Tree</div>
          </div>
          <div className={styles.treeContainer}>
            <InteractiveTreeNode node={MOCK_TREE} depth={0} />
          </div>
        </div>

        <div>
          <div className={styles.widgetPanel} style={{ marginBottom: "var(--space-2)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div className={styles.widgetTitle}>Flat List</div>
            <span className={styles.countBadge}>{flatNodes.length}</span>
          </div>
          <div className={styles.flatListContainer}>
            {flatNodes.map((node, i) => (
              <div key={node.id} className={styles.flatListItem}>
                <span className={styles.flatIdx}>{i}</span>
                <span className={styles.nodeIcon}>
                  {node.isFolder ? "📁" : "📄"}
                </span>
                <span
                  className={styles.nodeLabel}
                  data-folder={node.isFolder ? "true" : undefined}
                  style={{ paddingLeft: `${node.depth * 8}px` }}
                >
                  {node.label}
                </span>
                <span className={styles.flatDepthBadge}>d={node.depth}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function InteractiveTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const { expandedNodes, toggleNode } = useTreeGridContext();
  const isExpanded = expandedNodes.has(node.id);

  return (
    <>
      <div className={styles.treeNode} style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        {node.isFolder ? (
          <button
            type="button"
            className={styles.nodeToggle}
            onClick={() => toggleNode(node.id)}
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span style={{ width: 16 }} />
        )}
        <span className={styles.nodeIcon}>{node.isFolder ? "📁" : "📄"}</span>
        <span
          className={styles.nodeLabel}
          data-folder={node.isFolder ? "true" : undefined}
          onClick={() => node.isFolder && toggleNode(node.id)}
          style={{ cursor: node.isFolder ? "pointer" : "default" }}
        >
          {node.label}
        </span>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <InteractiveTreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </>
  );
}

function GridOverview() {
  const totalRows = 100;
  const totalCols = 26;
  const visRows = 10;
  const visCols = 6;
  const showRows = 12;
  const showCols = 10;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[3]}</div>
        <p className={styles.widgetNote}>
          A 2D grid virtualizer renders only the cells visible in the viewport.
          Out of <code>{totalRows} x {totalCols} = {totalRows * totalCols}</code> total cells, only the visible rectangle is mounted.
        </p>
      </div>

      <div
        className={styles.gridContainer}
        style={{ gridTemplateColumns: `repeat(${showCols}, 1fr)` }}
      >
        {Array.from({ length: showRows }, (_, r) =>
          Array.from({ length: showCols }, (_, c) => {
            const isVisible = r < visRows && c < visCols;
            return (
              <div
                key={`${r}-${c}`}
                className={styles.gridCell}
                data-visible={isVisible ? "true" : undefined}
              >
                {isVisible ? `${r},${c}` : ""}
              </div>
            );
          }),
        )}
      </div>

      <div className={styles.gridStats}>
        Visible: <span className={styles.gridStatVal}>{visRows * visCols}</span>
        <span style={{ color: "var(--color-muted)" }}>/</span>
        Total: <span className={styles.gridStatVal}>{totalRows * totalCols}</span>
        <span className={styles.formulaBadge}>
          {((visRows * visCols) / (totalRows * totalCols) * 100).toFixed(1)}%
        </span>
      </div>
    </>
  );
}

function RowWindowView() {
  const [scrollRow, setScrollRow] = useState(0);
  const totalRows = 100;
  const totalCols = 10;
  const visRows = 12;
  const showRows = 16;
  const showCols = 10;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[4]}</div>
        <p className={styles.widgetNote}>
          The <strong>row window</strong> determines which rows are in the viewport.
          Drag to scroll — only <code>{visRows}</code> of <code>{totalRows}</code> rows render at a time.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <label className={styles.widgetNote}>
          <strong>Row offset:</strong> {scrollRow}
          <input
            type="range"
            min={0}
            max={totalRows - visRows}
            value={scrollRow}
            onChange={(e) => setScrollRow(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
          />
        </label>
      </div>

      <div
        className={styles.gridContainer}
        style={{ gridTemplateColumns: `repeat(${showCols}, 1fr)` }}
      >
        {Array.from({ length: showRows }, (_, r) =>
          Array.from({ length: showCols }, (_, c) => {
            const globalRow = scrollRow + r;
            const inWindow = r < visRows;
            return (
              <div
                key={`${r}-${c}`}
                className={styles.gridCell}
                data-row={inWindow ? "true" : undefined}
              >
                {inWindow ? globalRow : ""}
              </div>
            );
          }),
        )}
      </div>

      <div className={styles.formula}>
        Rows <span className={styles.formulaVal}>{scrollRow}</span>
        {" – "}
        <span className={styles.formulaVal}>{scrollRow + visRows - 1}</span>
        {" visible"}
        <span className={styles.formulaBadge}>{visRows} / {totalRows}</span>
      </div>
    </>
  );
}

function ColumnWindowView() {
  const [scrollCol, setScrollCol] = useState(0);
  const totalCols = 26;
  const visCols = 6;
  const showRows = 10;
  const showCols = 12;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[5]}</div>
        <p className={styles.widgetNote}>
          The <strong>column window</strong> works the same way horizontally.
          Only <code>{visCols}</code> of <code>{totalCols}</code> columns are rendered.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <label className={styles.widgetNote}>
          <strong>Column offset:</strong> {scrollCol}
          <input
            type="range"
            min={0}
            max={totalCols - visCols}
            value={scrollCol}
            onChange={(e) => setScrollCol(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
          />
        </label>
      </div>

      <div
        className={styles.gridContainer}
        style={{ gridTemplateColumns: `repeat(${showCols}, 1fr)` }}
      >
        <div className={styles.gridHeader} />
        {Array.from({ length: showCols - 1 }, (_, c) => (
          <div key={c} className={styles.gridHeader}>
            {String.fromCharCode(65 + scrollCol + c)}
          </div>
        ))}
        {Array.from({ length: showRows }, (_, r) =>
          Array.from({ length: showCols }, (_, c) => {
            if (c === 0) {
              return (
                <div key={`${r}-${c}`} className={styles.gridHeader}>
                  {r}
                </div>
              );
            }
            const inWindow = c - 1 < visCols;
            return (
              <div
                key={`${r}-${c}`}
                className={styles.gridCell}
                data-col={inWindow ? "true" : undefined}
              >
                {inWindow ? String.fromCharCode(65 + scrollCol + c - 1) : ""}
              </div>
            );
          }),
        )}
      </div>

      <div className={styles.formula}>
        Cols <span className={styles.formulaVal}>{String.fromCharCode(65 + scrollCol)}</span>
        {" – "}
        <span className={styles.formulaVal}>{String.fromCharCode(65 + scrollCol + visCols - 1)}</span>
        {" visible"}
        <span className={styles.formulaBadge}>{visCols} / {totalCols}</span>
      </div>
    </>
  );
}

function CellIntersectionView() {
  const [scrollRow, setScrollRow] = useState(5);
  const [scrollCol, setScrollCol] = useState(3);
  const totalRows = 100;
  const totalCols = 26;
  const visRows = 8;
  const visCols = 6;
  const showRows = 12;
  const showCols = 10;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[6]}</div>
        <p className={styles.widgetNote}>
          The visible cells are the <em>intersection</em> of the row window and column window.
          Only cells in both windows get mounted to the DOM.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className={styles.widgetPanel}>
          <label className={styles.widgetNote}>
            <strong>Row offset:</strong> {scrollRow}
            <input
              type="range"
              min={0}
              max={totalRows - visRows}
              value={scrollRow}
              onChange={(e) => setScrollRow(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
            />
          </label>
        </div>
        <div className={styles.widgetPanel}>
          <label className={styles.widgetNote}>
            <strong>Col offset:</strong> {scrollCol}
            <input
              type="range"
              min={0}
              max={totalCols - visCols}
              value={scrollCol}
              onChange={(e) => setScrollCol(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
            />
          </label>
        </div>
      </div>

      <div
        className={styles.gridContainer}
        style={{ gridTemplateColumns: `repeat(${showCols}, 1fr)` }}
      >
        {Array.from({ length: showRows }, (_, r) =>
          Array.from({ length: showCols }, (_, c) => {
            const inRow = r < visRows;
            const inCol = c < visCols;
            const inBoth = inRow && inCol;
            return (
              <div
                key={`${r}-${c}`}
                className={styles.gridCell}
                data-row={inRow && !inCol ? "true" : undefined}
                data-col={inCol && !inRow ? "true" : undefined}
                data-intersect={inBoth ? "true" : undefined}
              >
                {inBoth ? `${scrollRow + r},${String.fromCharCode(65 + scrollCol + c)}` : ""}
              </div>
            );
          }),
        )}
      </div>

      <div className={styles.formula}>
        <span className={styles.formulaResult}>{visRows * visCols}</span> cells rendered
        <span style={{ color: "var(--color-muted)", fontSize: "0.58rem", display: "block", marginTop: 4 }}>
          {visRows} rows x {visCols} cols = {visRows * visCols} DOM nodes
          <span style={{ margin: "0 var(--space-1)" }}>/</span>
          {totalRows * totalCols} total
        </span>
      </div>
    </>
  );
}

function ProductionView() {
  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[7]}</div>
        <p className={styles.widgetNote}>
          Real-world libraries combine tree flattening with grid virtualization.
          Here is how the major options compare.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <table className={styles.compTable}>
          <thead>
            <tr>
              <th>Library</th>
              <th>Tree</th>
              <th>2D Grid</th>
              <th>Variable Height</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>@tanstack/virtual</td>
              <td>Manual flatten</td>
              <td>Row + Col virtualizers</td>
              <td>measureElement</td>
            </tr>
            <tr>
              <td>react-window</td>
              <td>No built-in</td>
              <td>FixedSizeGrid / VariableSizeGrid</td>
              <td>itemSize callback</td>
            </tr>
            <tr>
              <td>react-virtuoso</td>
              <td>GroupedVirtuoso</td>
              <td>TableVirtuoso only</td>
              <td>Auto-measured</td>
            </tr>
            <tr>
              <td>ag-grid</td>
              <td>Built-in tree data</td>
              <td>Full grid engine</td>
              <td>Auto row height</td>
            </tr>
            <tr>
              <td>react-arborist</td>
              <td>Built-in tree + DnD</td>
              <td>List only</td>
              <td>Fixed row height</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.formula}>
        <div>
          Tree flatten = <span className={styles.formulaVal}>O(visible)</span>
          <span style={{ margin: "0 var(--space-2)", color: "var(--color-muted)" }}>+</span>
          Grid intersect = <span className={styles.formulaVal}>O(rows + cols)</span>
        </div>
        <div style={{ fontSize: "0.58rem", color: "var(--color-muted)", marginTop: 4 }}>
          Combined: only mount what the viewport needs
        </div>
      </div>
    </>
  );
}
