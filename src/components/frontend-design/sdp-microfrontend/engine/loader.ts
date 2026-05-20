import type { SharedDep, MfeLoadState } from "../microfrontend-context";

export const DEFAULT_SHARED_DEPS: SharedDep[] = [
  { name: "react", version: "18.3.1", size: 42, loadedBy: ["header", "products", "cart"] },
  { name: "react-dom", version: "18.3.1", size: 130, loadedBy: ["header", "products", "cart"] },
  { name: "design-tokens", version: "2.1.0", size: 8, loadedBy: ["header", "products", "cart"] },
  { name: "event-bus", version: "1.0.0", size: 4, loadedBy: ["header", "products", "cart"] },
  { name: "router", version: "6.20.0", size: 28, loadedBy: ["header", "products"] },
];

export function calculateBundleSize(sharingEnabled: Set<string>, deps = DEFAULT_SHARED_DEPS): number {
  const totalRaw = deps.reduce((sum, d) => sum + d.size * d.loadedBy.length, 0);
  const shared = deps.filter(d => sharingEnabled.has(d.name));
  const savedPerDep = shared.reduce((sum, d) => sum + d.size * (d.loadedBy.length - 1), 0);
  return totalRaw - savedPerDep;
}

export function calculateTotalLoadTime(loadStates: Record<string, MfeLoadState>): number {
  const readyCount = Object.values(loadStates).filter(s => s === "ready").length;
  return readyCount * 120 + (3 - readyCount) * 320;
}

export interface LoaderSimulateOptions {
  teamId: string;
  latency: number;
  steps?: number;
  onProgress: (progress: number) => void;
  onComplete: () => void;
}

export function simulateMfeLoading({
  latency,
  steps = 20,
  onProgress,
  onComplete,
}: LoaderSimulateOptions): () => void {
  const interval = latency / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const pct = Math.min(100, Math.round((step / steps) * 100));
    onProgress(pct);

    if (step >= steps) {
      clearInterval(timer);
      onComplete();
    }
  }, interval);

  return () => clearInterval(timer);
}
