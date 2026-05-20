import type { Cell } from "./formula-parser";

// ── Topological sort for recalculation ──────────────────────────────

export function topoSort(
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

export function detectCycle(
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
