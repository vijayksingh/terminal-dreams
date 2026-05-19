"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import styles from "./TreeGridExplorer.module.css";

// ── Tree data ────────────────────────────────────

type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

const TREE: TreeNode = {
  id: "root",
  name: "project",
  children: [
    {
      id: "src", name: "src", children: [
        {
          id: "components", name: "components", children: [
            { id: "btn", name: "Button.tsx" },
            { id: "card", name: "Card.tsx" },
            { id: "input", name: "Input.tsx" },
            { id: "modal", name: "Modal.tsx" },
            { id: "tabs", name: "Tabs.tsx" },
            { id: "tooltip", name: "Tooltip.tsx" },
          ],
        },
        {
          id: "hooks", name: "hooks", children: [
            { id: "useAuth", name: "useAuth.ts" },
            { id: "useTheme", name: "useTheme.ts" },
            { id: "useDebounce", name: "useDebounce.ts" },
            { id: "useResize", name: "useResize.ts" },
          ],
        },
        {
          id: "utils", name: "utils", children: [
            { id: "format", name: "format.ts" },
            { id: "validate", name: "validate.ts" },
            { id: "cn", name: "cn.ts" },
          ],
        },
        { id: "app", name: "App.tsx" },
        { id: "main", name: "main.tsx" },
      ],
    },
    {
      id: "lib", name: "lib", children: [
        { id: "motion", name: "motion.ts" },
        { id: "api", name: "api.ts" },
        { id: "db", name: "db.ts" },
        { id: "auth", name: "auth.ts" },
      ],
    },
    {
      id: "tests", name: "tests", children: [
        {
          id: "unit", name: "unit", children: [
            { id: "btn-test", name: "Button.test.tsx" },
            { id: "card-test", name: "Card.test.tsx" },
            { id: "hooks-test", name: "hooks.test.ts" },
          ],
        },
        {
          id: "e2e", name: "e2e", children: [
            { id: "login", name: "login.spec.ts" },
            { id: "dashboard", name: "dashboard.spec.ts" },
          ],
        },
      ],
    },
    { id: "pkg", name: "package.json" },
    { id: "tsconfig", name: "tsconfig.json" },
    { id: "readme", name: "README.md" },
  ],
};

type FlatNode = {
  id: string;
  name: string;
  depth: number;
  isFolder: boolean;
  expanded: boolean;
};

function flattenTree(
  node: TreeNode,
  expanded: Set<string>,
  depth: number = 0,
): FlatNode[] {
  const isFolder = !!node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const result: FlatNode[] = [
    { id: node.id, name: node.name, depth, isFolder, expanded: isExpanded },
  ];
  if (isFolder && isExpanded) {
    for (const child of node.children!) {
      result.push(...flattenTree(child, expanded, depth + 1));
    }
  }
  return result;
}

// ── Grid constants ───────────────────────────────

const GRID_ROWS = 100;
const GRID_COLS = 26;
const CELL_W = 72;
const CELL_H = 28;
const GRID_VIEWPORT_W = 400;
const GRID_VIEWPORT_H = 320;

function colLabel(c: number): string {
  return String.fromCharCode(65 + c);
}

// ── Tab type ─────────────────────────────────────

type TabId = "tree" | "grid";

export function TreeGridExplorer() {
  const [tab, setTab] = useState<TabId>("tree");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["root", "src"]),
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Grid scroll state
  const [gridScrollTop, setGridScrollTop] = useState(0);
  const [gridScrollLeft, setGridScrollLeft] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const flatListRef = useRef<HTMLDivElement>(null);

  // ── Tree flattening ──
  const flatList = useMemo(
    () => flattenTree(TREE, expanded),
    [expanded],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    const walk = (node: TreeNode) => {
      if (node.children) {
        all.add(node.id);
        node.children.forEach(walk);
      }
    };
    walk(TREE);
    setExpanded(all);
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(new Set(["root"]));
  }, []);

  // Auto-scroll flat list to highlighted item
  useEffect(() => {
    if (!highlightId || !flatListRef.current) return;
    const idx = flatList.findIndex((n) => n.id === highlightId);
    if (idx < 0) return;
    const child = flatListRef.current.children[idx] as HTMLElement | undefined;
    if (child) {
      child.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightId, flatList]);

  // ── Grid windowed range ──
  const gridRowStart = Math.floor(gridScrollTop / CELL_H);
  const gridRowEnd = Math.min(
    GRID_ROWS - 1,
    gridRowStart + Math.ceil(GRID_VIEWPORT_H / CELL_H),
  );
  const gridColStart = Math.floor(gridScrollLeft / CELL_W);
  const gridColEnd = Math.min(
    GRID_COLS - 1,
    gridColStart + Math.ceil(GRID_VIEWPORT_W / CELL_W),
  );
  const gridCellCount =
    (gridRowEnd - gridRowStart + 1) * (gridColEnd - gridColStart + 1);

  const handleGridScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setGridScrollTop(Math.round(e.currentTarget.scrollTop));
      setGridScrollLeft(Math.round(e.currentTarget.scrollLeft));
    },
    [],
  );

  // ── Grid cells ──
  const gridCells = useMemo(() => {
    const cells: Array<{
      row: number;
      col: number;
      x: number;
      y: number;
      label: string;
    }> = [];
    for (let r = gridRowStart; r <= gridRowEnd; r++) {
      for (let c = gridColStart; c <= gridColEnd; c++) {
        cells.push({
          row: r,
          col: c,
          x: c * CELL_W,
          y: r * CELL_H,
          label: `${colLabel(c)}${r + 1}`,
        });
      }
    }
    return cells;
  }, [gridRowStart, gridRowEnd, gridColStart, gridColEnd]);

  return (
    <div className={styles.root}>
      <DemoSandbox title="Tree & Grid Virtualization">
        <DemoSandbox.Tabs
          options={["tree", "grid"] as const}
          value={tab}
          onChange={(v) => setTab(v as TabId)}
          formatOption={(v) =>
            v === "tree" ? "Tree Flattening" : "2D Grid Window"
          }
        />

        {tab === "tree" ? (
          <>
            {/* ── Tree tab ── */}
            <div className={styles.split}>
              {/* Left: interactive tree */}
              <div className={styles.splitPane}>
                <div className={styles.paneHeader}>
                  <span>Tree View</span>
                  <span>
                    <button
                      onClick={expandAll}
                      type="button"
                      className={styles.treeAction}
                    >
                      expand all
                    </button>
                    <button
                      onClick={collapseAll}
                      type="button"
                      className={styles.treeAction}
                    >
                      collapse all
                    </button>
                  </span>
                </div>
                <div
                  className={styles.paneBody}
                  role="tree"
                  aria-label="File tree"
                >
                  {flatList.map((node) => {
                    const isHighlight = highlightId === node.id;
                    const cls = node.isFolder
                      ? styles.treeNodeFolder
                      : styles.treeNodeFile;
                    return (
                      <div
                        key={node.id}
                        role="treeitem"
                        aria-expanded={
                          node.isFolder ? node.expanded : undefined
                        }
                        className={`${cls} ${isHighlight ? styles.treeNodeHighlight : ""}`}
                        onClick={
                          node.isFolder
                            ? () => toggleExpand(node.id)
                            : undefined
                        }
                        onMouseEnter={() => setHighlightId(node.id)}
                        onMouseLeave={() => setHighlightId(null)}
                        style={{
                          paddingLeft: `${12 + node.depth * 16}px`,
                        }}
                      >
                        <span className={styles.treeChevron}>
                          {node.isFolder
                            ? node.expanded
                              ? "▾"
                              : "▸"
                            : ""}
                        </span>
                        <span className={styles.treeIcon}>
                          {node.isFolder ? "📁" : "📄"}
                        </span>
                        <span className={styles.treeName}>
                          {node.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: flat list */}
              <div className={styles.splitPane}>
                <div className={styles.paneHeader}>
                  <span>Flat List (virtualizer input)</span>
                  <span className={styles.paneCount}>
                    {flatList.length} items
                  </span>
                </div>
                <div
                  ref={flatListRef}
                  className={styles.paneBody}
                  role="list"
                  aria-label="Flattened tree list"
                >
                  {flatList.map((node, i) => {
                    const isHighlight = highlightId === node.id;
                    return (
                      <div
                        key={node.id}
                        role="listitem"
                        className={
                          isHighlight
                            ? styles.flatItemVisible
                            : styles.flatItem
                        }
                        onMouseEnter={() => setHighlightId(node.id)}
                        onMouseLeave={() => setHighlightId(null)}
                      >
                        <span className={styles.flatIdx}>{i}</span>
                        <span>
                          {"─".repeat(node.depth)}
                          {node.depth > 0 ? " " : ""}
                          {node.name}
                        </span>
                        <span className={styles.flatDepth}>
                          d={node.depth}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.statsBar} role="region" aria-label="Tree stats" aria-live="polite">
              <div className={styles.stat}>
                <span className={styles.statLabel}>DOM nodes</span>
                <span className={styles.statHighlight}>
                  {flatList.length}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>expanded</span>
                <span className={styles.statVal}>
                  {expanded.size}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>folders</span>
                <span className={styles.statVal}>
                  {flatList.filter((n) => n.isFolder).length}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>files</span>
                <span className={styles.statVal}>
                  {flatList.filter((n) => !n.isFolder).length}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── Grid tab ── */}
            <div className={styles.gridContainer}>
              <div
                ref={gridRef}
                className={styles.gridWrap}
                onScroll={handleGridScroll}
                role="grid"
                aria-label={`${GRID_ROWS} × ${GRID_COLS} virtual grid`}
                aria-rowcount={GRID_ROWS}
                aria-colcount={GRID_COLS}
              >
                <div
                  className={styles.gridInner}
                  style={{
                    width: GRID_COLS * CELL_W,
                    height: GRID_ROWS * CELL_H,
                  }}
                >
                  {gridCells.map((cell) => (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      className={styles.gridCellVisible}
                      role="gridcell"
                      style={{
                        transform: `translate(${cell.x}px, ${cell.y}px)`,
                        width: CELL_W,
                        height: CELL_H,
                      }}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.statsBar} role="region" aria-label="Grid stats" aria-live="polite">
              <div className={styles.stat}>
                <span className={styles.statLabel}>total cells</span>
                <span className={styles.statVal}>
                  {(GRID_ROWS * GRID_COLS).toLocaleString()}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>rendered</span>
                <span className={styles.statHighlight}>
                  {gridCellCount} ({Math.round((gridCellCount / (GRID_ROWS * GRID_COLS)) * 100)}%)
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>row window</span>
                <span className={styles.statVal}>
                  {gridRowStart}–{gridRowEnd}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>col window</span>
                <span className={styles.statVal}>
                  {colLabel(gridColStart)}–{colLabel(gridColEnd)}
                </span>
              </div>
            </div>
          </>
        )}

        <DemoSandbox.Caption>
          {tab === "tree"
            ? "Click folders to expand or collapse. The flat list grows and shrinks — this is what the virtualizer actually renders."
            : "Scroll in both directions. Only cells inside the 2D viewport window are mounted — the rest of the 2,600-cell grid is empty space."}
        </DemoSandbox.Caption>
      </DemoSandbox>
    </div>
  );
}
