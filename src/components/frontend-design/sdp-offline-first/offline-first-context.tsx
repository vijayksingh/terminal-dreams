"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building";

export type CacheStrategy = "cache-first" | "network-first" | "stale-while-revalidate";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export type QueueEntry = {
  id: string;
  operation: string;
  payload: string;
  timestamp: number;
  retries: number;
  status: SyncStatus;
};

export type ConflictStrategy = "lww" | "merge" | "manual";

export type SWState = "installing" | "waiting" | "active" | "redundant";

export type StorageEntry = {
  key: string;
  value: string;
  size: number;
  lastAccessed: number;
  version: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeDef = {
  name: string;
  category: string;
  extends?: string;
  fields: { name: string; type: string; note?: string }[];
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "serviceWorker", label: "Service Worker caching?", description: "Cache API intercept, offline shell, asset versioning" },
  { id: "indexedDB", label: "IndexedDB storage?", description: "Structured local storage for documents, queues, metadata" },
  { id: "backgroundSync", label: "Background Sync?", description: "Retry failed mutations when connectivity returns" },
  { id: "conflictResolution", label: "Conflict resolution?", description: "Vector clocks, LWW, 3-way merge for diverged state" },
  { id: "optimisticUI", label: "Optimistic UI?", description: "Apply changes immediately, rollback on server rejection" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/sync/push",
    description: "Push a batch of queued local mutations to the server",
    usedBy: "SyncManager → Server",
    params: [
      { name: "entries", type: "SyncEntry[]", note: "queued mutations" },
      { name: "clientId", type: "string", note: "device identifier" },
    ],
    responseType: "{ accepted: string[], conflicts: ConflictRecord[] }",
  },
  {
    method: "GET",
    path: "/api/sync/pull/:since",
    description: "Pull all changes from server since a given timestamp",
    usedBy: "SyncManager → LocalStore",
    params: [
      { name: "since", type: "number", note: "last sync timestamp" },
      { name: "limit", type: "number?", note: "max entries to return" },
    ],
    responseType: "{ changes: ChangeRecord[], serverTime: number }",
  },
  {
    method: "PUT",
    path: "/api/sync/resolve/:conflictId",
    description: "Submit a conflict resolution decision",
    usedBy: "ConflictResolver → Server",
    params: [
      { name: "conflictId", type: "string", note: "conflict identifier" },
      { name: "resolution", type: "'local'|'remote'|'merged'", note: "chosen strategy" },
      { name: "mergedValue", type: "unknown?", note: "custom merged value if applicable" },
    ],
    responseType: "{ resolved: boolean, version: number }",
  },
  {
    method: "GET",
    path: "/api/cache/manifest",
    description: "Fetch the current cache manifest for version checking",
    usedBy: "ServiceWorker → CacheManager",
    params: [
      { name: "currentVersion", type: "string", note: "locally cached version hash" },
    ],
    responseType: "{ version: string, assets: string[], stale: string[] }",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "SyncQueueEntry",
    category: "state",
    fields: [
      { name: "id", type: "string", note: "unique queue ID" },
      { name: "operation", type: "'create'|'update'|'delete'" },
      { name: "payload", type: "unknown", note: "mutation data" },
      { name: "timestamp", type: "number", note: "ms since epoch" },
      { name: "retries", type: "number" },
      { name: "status", type: "SyncStatus" },
    ],
  },
  {
    name: "CacheEntry",
    category: "state",
    fields: [
      { name: "url", type: "string" },
      { name: "response", type: "Response" },
      { name: "version", type: "number" },
      { name: "staleAt", type: "number", note: "TTL expiration" },
    ],
  },
  {
    name: "ConflictRecord",
    category: "api",
    fields: [
      { name: "localVersion", type: "DocumentVersion" },
      { name: "remoteVersion", type: "DocumentVersion" },
      { name: "vectorClock", type: "Record<string, number>" },
      { name: "resolution", type: "'pending'|'resolved'" },
    ],
  },
  {
    name: "StorageQuota",
    category: "props",
    fields: [
      { name: "usage", type: "number", note: "bytes used" },
      { name: "quota", type: "number", note: "bytes available" },
      { name: "persistent", type: "boolean" },
    ],
  },
];

// ── Context ─────────────────────────────────────────────────────────

type OfflineFirstContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  // Online / Offline
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  // Sync queue
  syncQueue: QueueEntry[];
  addToQueue: (entry: Omit<QueueEntry, "id" | "timestamp" | "retries" | "status">) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  drainQueue: () => void;
  // Cache
  cacheStrategy: CacheStrategy;
  setCacheStrategy: (s: CacheStrategy) => void;
  // SW lifecycle
  swState: SWState;
  setSWState: (s: SWState) => void;
  // Conflict
  conflictStrategy: ConflictStrategy;
  setConflictStrategy: (s: ConflictStrategy) => void;
  // Storage
  storageEntries: StorageEntry[];
  addStorageEntry: (entry: Omit<StorageEntry, "lastAccessed">) => void;
  removeStorageEntry: (key: string) => void;
  storageUsed: number;
  storageQuota: number;
  // Step completion
  stepCompleted: Record<number, boolean>;
  markStepComplete: (step: number) => void;
  // Metrics
  totalSyncs: number;
  conflictsDetected: number;
  incrementConflicts: () => void;
  incrementSyncs: () => void;
  // State inspector
  stateEntries: StateEntry[];
};

const OfflineFirstContext = createContext<OfflineFirstContextValue | null>(null);

export function useOfflineFirst() {
  const ctx = useContext(OfflineFirstContext);
  if (!ctx) throw new Error("useOfflineFirst must be used within OfflineFirstProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

let queueIdCounter = 0;

export function OfflineFirstProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase: Phase = activeStep <= 3 ? "planning" : "building";

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Online status
  const [isOnline, setIsOnline] = useState(true);

  // Sync queue
  const [syncQueue, setSyncQueue] = useState<QueueEntry[]>([]);

  const addToQueue = useCallback((entry: Omit<QueueEntry, "id" | "timestamp" | "retries" | "status">) => {
    const newEntry: QueueEntry = {
      ...entry,
      id: `q-${++queueIdCounter}`,
      timestamp: Date.now(),
      retries: 0,
      status: "pending",
    };
    setSyncQueue(prev => [...prev, newEntry]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setSyncQueue(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setSyncQueue([]);
  }, []);

  const drainQueue = useCallback(() => {
    setSyncQueue(prev => prev.map(e => ({ ...e, status: "synced" as const })));
  }, []);

  // Cache strategy
  const [cacheStrategy, setCacheStrategy] = useState<CacheStrategy>("stale-while-revalidate");

  // SW lifecycle state
  const [swState, setSWState] = useState<SWState>("installing");

  // Conflict strategy
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("lww");

  // Storage
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const storageQuota = 50 * 1024; // 50KB for demo

  const addStorageEntry = useCallback((entry: Omit<StorageEntry, "lastAccessed">) => {
    setStorageEntries(prev => [...prev, { ...entry, lastAccessed: Date.now() }]);
  }, []);

  const removeStorageEntry = useCallback((key: string) => {
    setStorageEntries(prev => prev.filter(e => e.key !== key));
  }, []);

  const storageUsed = useMemo(() => storageEntries.reduce((sum, e) => sum + e.size, 0), [storageEntries]);

  // Step completion
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const markStepComplete = useCallback((step: number) => {
    setStepCompleted(prev => prev[step] ? prev : { ...prev, [step]: true });
  }, []);

  // Metrics
  const [totalSyncs, setTotalSyncs] = useState(0);
  const [conflictsDetected, setConflictsDetected] = useState(0);
  const incrementSyncs = useCallback(() => setTotalSyncs(c => c + 1), []);
  const incrementConflicts = useCallback(() => setConflictsDetected(c => c + 1), []);

  // State inspector entries
  const stateEntries = useMemo<StateEntry[]>(() => [
    { label: "online", value: isOnline ? "yes" : "no", highlight: !isOnline },
    { label: "queueLength", value: syncQueue.length, highlight: syncQueue.length > 0 },
    { label: "cacheStrategy", value: cacheStrategy },
    { label: "swState", value: swState },
    { label: "conflictStrategy", value: conflictStrategy },
    { label: "storageUsed", value: `${(storageUsed / 1024).toFixed(1)}KB` },
    { label: "totalSyncs", value: totalSyncs },
    { label: "conflicts", value: conflictsDetected, highlight: conflictsDetected > 0 },
  ], [isOnline, syncQueue.length, cacheStrategy, swState, conflictStrategy, storageUsed, totalSyncs, conflictsDetected]);

  const value = useMemo<OfflineFirstContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      isOnline,
      setIsOnline,
      syncQueue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      drainQueue,
      cacheStrategy,
      setCacheStrategy,
      swState,
      setSWState,
      conflictStrategy,
      setConflictStrategy,
      storageEntries,
      addStorageEntry,
      removeStorageEntry,
      storageUsed,
      storageQuota,
      stepCompleted,
      markStepComplete,
      totalSyncs,
      conflictsDetected,
      incrementConflicts,
      incrementSyncs,
      stateEntries,
    }),
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      isOnline,
      syncQueue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      drainQueue,
      cacheStrategy,
      swState,
      conflictStrategy,
      storageEntries,
      addStorageEntry,
      removeStorageEntry,
      storageUsed,
      storageQuota,
      stepCompleted,
      markStepComplete,
      totalSyncs,
      conflictsDetected,
      incrementConflicts,
      incrementSyncs,
      stateEntries,
    ]
  );

  return (
    <OfflineFirstContext.Provider value={value}>
      {children}
    </OfflineFirstContext.Provider>
  );
}
