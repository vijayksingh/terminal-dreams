import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "ui",
    label: "UI Layer",
    sublabel: "optimistic updates · network status",
    x: 40,
    y: 6,
    w: 400,
    h: 28,
  },
  {
    id: "syncmanager",
    label: "SyncManager",
    sublabel: "queue · retry · backoff",
    x: 40,
    y: 50,
    w: 160,
    h: 22,
  },
  {
    id: "conflictresolver",
    label: "ConflictResolver",
    sublabel: "LWW · merge · vector clocks",
    x: 220,
    y: 50,
    w: 180,
    h: 22,
  },
  {
    id: "localstore",
    label: "IndexedDB Store",
    sublabel: "object stores · indexes · versioning",
    x: 40,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "sw",
    label: "Service Worker",
    sublabel: "cache API · fetch intercept · lifecycle",
    x: 240,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "remote",
    label: "Remote Server",
    sublabel: "REST API · push notifications · SSE",
    x: 140,
    y: 136,
    w: 200,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "ui", to: "syncmanager", verb: "enqueues mutations" },
  { from: "ui", to: "conflictresolver", verb: "presents conflicts" },
  { from: "syncmanager", to: "localstore", verb: "persists to IndexedDB" },
  { from: "syncmanager", to: "sw", verb: "registers background sync" },
  { from: "sw", to: "remote", verb: "fetches / pushes via network" },
  { from: "conflictresolver", to: "localstore", verb: "writes resolved state" },
  {
    from: "remote",
    to: "ui",
    dashed: true,
    verb: "server push updates UI",
    pathOverride: "M 140,148 C 6,148 6,20 40,20",
    midpointOverride: { x: 6, y: 84 },
  },
];

// ── Type definitions ──────────────────────────────────────────────

const TYPES: ArchTypeDef[] = [
  {
    name: "SyncQueueEntry",
    kind: "state",
    fields: [
      { name: "id", type: "string" },
      { name: "operation", type: "'create'|'update'|'delete'" },
      { name: "payload", type: "Record<string, unknown>" },
      { name: "timestamp", type: "number" },
      { name: "retries", type: "number" },
      { name: "status", type: "'pending'|'syncing'|'failed'" },
    ],
  },
  {
    name: "ConflictRecord",
    kind: "API response",
    fields: [
      { name: "localVersion", type: "DocumentVersion" },
      { name: "remoteVersion", type: "DocumentVersion" },
      { name: "vectorClock", type: "Record<string, number>" },
      { name: "resolution", type: "'pending'|'local'|'remote'|'merged'" },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const offlineMutationScenario: ArchStep[] = [
  {
    nodeId: "ui",
    caption: "User edits a document while offline — UI applies optimistic update immediately",
  },
  {
    nodeId: "syncmanager",
    caption: "SyncManager enqueues the mutation with a timestamp and pending status",
    payload: { type: TYPES[0] as ArchTypeDef, sample: ['{ operation: "update",', '  status: "pending", retries: 0 }'] },
  },
  {
    nodeId: "localstore",
    caption: "IndexedDB persists both the updated document and the queue entry — survives tab close",
    stateAfter: [{ key: "queueLength", value: "1" }, { key: "docVersion", value: "local+1" }],
  },
  {
    nodeId: "sw",
    caption: "Service Worker registers a Background Sync event — will fire when connectivity returns",
    stateAfter: [{ key: "syncTag", value: "doc-sync" }, { key: "networkState", value: "offline" }],
  },
  {
    nodeId: "ui",
    caption: "User sees the change instantly — pending indicator shows unsaved status",
  },
];

const syncOnReconnectScenario: ArchStep[] = [
  {
    nodeId: "sw",
    caption: "Browser fires 'sync' event — Service Worker wakes up, connectivity restored",
  },
  {
    nodeId: "syncmanager",
    caption: "SyncManager reads pending queue from IndexedDB — processes entries in FIFO order",
    stateAfter: [{ key: "queueLength", value: "3" }, { key: "processing", value: "entry #1" }],
  },
  {
    nodeId: "sw",
    caption: "Service Worker pushes mutation to remote API — if it fails, exponential backoff retries",
  },
  {
    nodeId: "remote",
    caption: "Server accepts the mutation, responds with server timestamp and any conflicts detected",
    payload: { type: TYPES[1] as ArchTypeDef, sample: ['{ localVersion: v3,', '  remoteVersion: v5,', '  resolution: "pending" }'] },
  },
  {
    nodeId: "conflictresolver",
    caption: "ConflictResolver compares vector clocks — determines if merge or manual resolution needed",
    stateAfter: [{ key: "conflictsDetected", value: "1" }, { key: "strategy", value: "LWW" }],
  },
  {
    nodeId: "ui",
    caption: "Queue drains, pending indicators disappear — conflicts surface in the UI for review",
  },
];

const cacheStrategyScenario: ArchStep[] = [
  {
    nodeId: "ui",
    caption: "User navigates to a page — fetch event fires for HTML, CSS, JS, and API data",
  },
  {
    nodeId: "sw",
    caption: "Service Worker intercepts fetch — checks Cache API for a cached response",
    stateAfter: [{ key: "strategy", value: "stale-while-revalidate" }, { key: "cacheHit", value: "true" }],
  },
  {
    nodeId: "ui",
    caption: "Stale cached response served immediately — user sees content in <50ms",
  },
  {
    nodeId: "remote",
    caption: "Meanwhile, network request goes to server — fetches fresh data in background",
  },
  {
    nodeId: "sw",
    caption: "Service Worker updates cache with fresh response — next request gets the new version",
    stateAfter: [{ key: "cacheVersion", value: "v2" }, { key: "staleAge", value: "0s" }],
  },
  {
    nodeId: "ui",
    caption: "If data changed, UI re-renders with fresh data — seamless update without loading state",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const OFFLINE_FIRST_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "An offline-first app separates UI updates from network sync — local IndexedDB is the source of truth, a sync queue batches mutations, and the service worker manages caching and background sync to reconcile with the server.",
  viewBox: "0 0 480 168",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "offline-mutation",
      label: "Edit while offline",
      blurb: "User edits a document offline — trace from UI to IndexedDB and background sync registration",
      steps: offlineMutationScenario,
    },
    {
      id: "sync-reconnect",
      label: "Sync on reconnect",
      blurb: "Connectivity returns — queue drains, conflicts detected and resolved",
      steps: syncOnReconnectScenario,
    },
    {
      id: "cache-strategy",
      label: "Cache strategy",
      blurb: "Stale-while-revalidate serves cached content instantly while refreshing in background",
      steps: cacheStrategyScenario,
    },
  ],
};
