export class ChunkScheduler {
  private budgetMs: number;

  constructor(budgetMs: number = 50) {
    this.budgetMs = budgetMs;
  }

  /**
   * Runs recalculation over a list of cell IDs, yielding control to the browser when the time budget is exceeded.
   */
  async runCascade(
    dependentCells: string[],
    evaluateCell: (id: string) => void
  ): Promise<void> {
    if (typeof window === "undefined") {
      // Server-side environment: run synchronously
      for (const cellId of dependentCells) {
        evaluateCell(cellId);
      }
      return;
    }

    let deadline = performance.now() + this.budgetMs;

    for (const cellId of dependentCells) {
      evaluateCell(cellId);

      // Check if we have exceeded the 50ms (or custom budget) deadline
      if (performance.now() >= deadline) {
        if ("scheduler" in window && (window as any).scheduler && "yield" in (window as any).scheduler) {
          await (window as any).scheduler.yield();
        } else {
          // Fallback to setTimeout for older browsers/Safari
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        // Reset budget deadline
        deadline = performance.now() + this.budgetMs;
      }
    }
  }
}
