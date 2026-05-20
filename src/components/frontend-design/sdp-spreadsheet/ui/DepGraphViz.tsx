"use client";

import React from "react";
import { useSpreadsheet } from "../spreadsheet-context";
import styles from "../SpreadsheetLab.module.css";

export function DepGraphViz() {
  const { depGraph, affectedCells, recalcOrder } = useSpreadsheet();

  if (depGraph.size === 0) return null;

  const nodes = new Set<string>();
  depGraph.forEach((deps, cell) => {
    nodes.add(cell);
    deps.forEach((d) => nodes.add(d));
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
    const level =
      deps.length === 0
        ? 0
        : Math.max(...deps.map((d) => getLevel(d, visited))) + 1;
    levelMap.set(id, level);
    return level;
  }

  nodeArr.forEach((n) => getLevel(n));

  const levels: string[][] = [];
  nodeArr.forEach((n) => {
    const l = levelMap.get(n) ?? 0;
    if (!levels[l]) levels[l] = [];
    levels[l]!.push(n);
  });

  levels.forEach((lvl, li) => {
    lvl.forEach((n, ni) => {
      nodePos[n] = { x: 30 + ni * 60, y: 20 + li * 50 };
    });
  });

  const width = Math.max(
    160,
    levels.reduce((m, l) => Math.max(m, l.length * 60 + 30), 0)
  );
  const height = Math.max(80, levels.length * 50 + 20);

  return (
    <div className={styles.widgetPanel} data-category="formula">
      <div className={styles.widgetTitle}>Dependency DAG</div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.dagSvg}
        role="img"
        aria-label={`Dependency graph: ${nodeArr.length} cells, ${[
          ...depGraph.values(),
        ].reduce((n, d) => n + d.length, 0)} edges`}
      >
        {/* Edges */}
        {nodeArr.map((cell) => {
          const deps = depGraph.get(cell) ?? [];
          return deps.map((dep) => {
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
                data-affected={
                  affectedCells.has(cell) || affectedCells.has(dep)
                    ? "true"
                    : undefined
                }
                markerEnd="url(#dagArrow)"
              />
            );
          });
        })}
        {/* Arrow marker */}
        <defs>
          <marker
            id="dagArrow"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="var(--color-muted)" />
          </marker>
        </defs>
        {/* Nodes */}
        {nodeArr.map((n) => {
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
        <div className={styles.recalcOrder} role="status" aria-live="polite">
          <span className={styles.recalcLabel}>Recalc order:</span>
          {recalcOrder.map((id, i) => (
            <span
              key={id}
              className={styles.recalcStep}
              data-affected={affectedCells.has(id) ? "true" : undefined}
            >
              {i > 0 && " → "}
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
