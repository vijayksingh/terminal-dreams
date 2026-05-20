export type Phase = "planning" | "building";

export type TabInfo = {
  id: string;
  label: string;
  isLeader: boolean;
  visibility: "visible" | "hidden" | "frozen" | "terminated";
  lastHeartbeat: number;
  state: Record<string, string>;
};

export type Message = {
  id: string;
  type: MessageType;
  from: string;
  to: string | "broadcast";
  payload: string;
  timestamp: number;
};

export type MessageType =
  | "state-sync"
  | "action"
  | "heartbeat"
  | "election"
  | "ack";

export type ConflictStrategy = "lww" | "merge-queue" | "leader-decides";

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

export type LockEntry = {
  name: string;
  mode: "exclusive" | "shared";
  holder: string | null;
  waiters: string[];
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "broadcastChannel", label: "BroadcastChannel?", description: "Cross-tab messaging via BroadcastChannel API -- simple pub/sub" },
  { id: "sharedWorker", label: "SharedWorker?", description: "Single worker process shared across all tabs -- centralized routing" },
  { id: "storageEvents", label: "localStorage events?", description: "Storage event fires in other tabs when localStorage changes" },
  { id: "leaderElection", label: "Leader election?", description: "Bully algorithm to elect one tab as coordinator for writes" },
  { id: "tabLifecycle", label: "Tab lifecycle?", description: "Page Visibility API + Page Lifecycle -- frozen, hidden, terminated states" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/channel/create",
    description: "Create a new BroadcastChannel with a unique name",
    usedBy: "ChannelManager",
    params: [
      { name: "name", type: "string", note: "channel identifier" },
    ],
    responseType: "{ channel: BroadcastChannel }",
  },
  {
    method: "POST",
    path: "/api/channel/send",
    description: "Post a typed message to all subscribers on the channel",
    usedBy: "ChannelManager -> Tabs",
    params: [
      { name: "channel", type: "string", note: "channel name" },
      { name: "message", type: "TabMessage", note: "typed message envelope" },
    ],
    responseType: "{ delivered: number }",
  },
  {
    method: "GET",
    path: "/api/tabs/registry",
    description: "List all currently registered tabs with heartbeat status",
    usedBy: "TabRegistry",
    params: [
      { name: "timeout", type: "number?", note: "ms before tab is considered dead" },
    ],
    responseType: "{ tabs: TabInfo[], leader: string | null }",
  },
  {
    method: "PUT",
    path: "/api/tabs/:tabId/state",
    description: "Sync local state from a tab to the shared state store",
    usedBy: "StateSynchronizer",
    params: [
      { name: "tabId", type: "string", note: "tab identifier" },
      { name: "state", type: "Record<string, unknown>", note: "state patch" },
      { name: "version", type: "number", note: "vector clock or lamport timestamp" },
    ],
    responseType: "{ accepted: boolean, conflicts: ConflictEntry[] }",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "TabMessage",
    category: "api",
    fields: [
      { name: "type", type: "'state-sync' | 'action' | 'heartbeat' | 'election'" },
      { name: "from", type: "string", note: "sender tab ID" },
      { name: "to", type: "string | 'broadcast'", note: "target" },
      { name: "payload", type: "unknown" },
      { name: "timestamp", type: "number" },
    ],
  },
  {
    name: "TabInfo",
    category: "state",
    fields: [
      { name: "id", type: "string", note: "unique tab identifier" },
      { name: "isLeader", type: "boolean" },
      { name: "visibility", type: "VisibilityState" },
      { name: "lastHeartbeat", type: "number" },
      { name: "state", type: "Record<string, unknown>" },
    ],
  },
  {
    name: "SyncState",
    category: "state",
    fields: [
      { name: "version", type: "number", note: "lamport clock" },
      { name: "tabs", type: "Map<string, TabInfo>" },
      { name: "leader", type: "string | null" },
      { name: "pendingOps", type: "Operation[]" },
    ],
  },
  {
    name: "LockHandle",
    category: "api",
    fields: [
      { name: "name", type: "string", note: "lock resource name" },
      { name: "mode", type: "'exclusive' | 'shared'" },
      { name: "holder", type: "string", note: "tab ID holding the lock" },
    ],
  },
];

export class SyncCoordinator {
  static genTabId(counter: number): { id: string; nextCounter: number } {
    const next = counter + 1;
    return { id: `tab-${next}`, nextCounter: next };
  }

  static genMsgId(counter: number): { id: string; nextCounter: number } {
    const next = counter + 1;
    return { id: `msg-${next}`, nextCounter: next };
  }

  static runBullyElection(tabs: TabInfo[]): { winnerId: string | null; updatedTabs: TabInfo[] } {
    const alive = tabs.filter(t => t.visibility !== "terminated");
    if (alive.length === 0) {
      return { winnerId: null, updatedTabs: tabs.map(t => ({ ...t, isLeader: false })) };
    }
    const sorted = [...alive].sort((a, b) => {
      const aNum = parseInt(a.id.split("-")[1] ?? "0", 10);
      const bNum = parseInt(b.id.split("-")[1] ?? "0", 10);
      return bNum - aNum;
    });
    const winner = sorted[0];
    if (!winner) {
      return { winnerId: null, updatedTabs: tabs.map(t => ({ ...t, isLeader: false })) };
    }
    const updatedTabs = tabs.map(t => ({ ...t, isLeader: t.id === winner.id }));
    return { winnerId: winner.id, updatedTabs };
  }

  static resolveConflict(
    strategy: ConflictStrategy,
    a: string,
    b: string,
    aTime: number,
    bTime: number
  ): { result: string; winner: "a" | "b" | "merge"; explanation: string } {
    if (a === b) return { result: a, winner: "merge", explanation: "No conflict -- both tabs wrote the same value." };
    switch (strategy) {
      case "lww": {
        const winner = aTime >= bTime ? "a" : "b";
        return {
          result: winner === "a" ? a : b,
          winner,
          explanation: `LWW: Tab ${winner.toUpperCase()}'s timestamp (t=${winner === "a" ? aTime : bTime}) is later. "${winner === "a" ? a : b}" wins, "${winner === "a" ? b : a}" is silently discarded.`,
        };
      }
      case "merge-queue":
        return {
          result: `[${a}, ${b}]`,
          winner: "merge",
          explanation: `Merge queue: both values are queued for manual resolution. No data is lost, but the user must choose. Queue: [${a}, ${b}].`,
        };
      case "leader-decides":
        return {
          result: a,
          winner: "a",
          explanation: `Leader decides: the leader tab (Tab A) always wins conflicts. "${a}" persists, "${b}" is rejected. Simple but authoritarian.`,
        };
    }
  }

  static removeTab(tabs: TabInfo[], id: string): TabInfo[] {
    const next = tabs.filter(t => t.id !== id);
    const first = next[0];
    if (tabs.find(t => t.id === id)?.isLeader && first) {
      next[0] = { ...first, isLeader: true };
    }
    return next;
  }

  static requestLock(locks: LockEntry[], lockName: string, tabId: string, onContention: () => void): LockEntry[] {
    return locks.map(lock => {
      if (lock.name !== lockName) return lock;
      if (lock.mode === "exclusive") {
        if (!lock.holder) {
          return { ...lock, holder: tabId };
        }
        if (lock.holder === tabId) return lock;
        if (!lock.waiters.includes(tabId)) {
          onContention();
          return { ...lock, waiters: [...lock.waiters, tabId] };
        }
        return lock;
      }
      // Shared mode: any tab can hold
      if (!lock.holder) return { ...lock, holder: tabId };
      return lock;
    });
  }

  static releaseLock(locks: LockEntry[], lockName: string, tabId: string): LockEntry[] {
    return locks.map(lock => {
      if (lock.name !== lockName) return lock;
      if (lock.holder === tabId) {
        const nextHolder = lock.waiters[0] ?? null;
        return { ...lock, holder: nextHolder, waiters: lock.waiters.slice(1) };
      }
      return { ...lock, waiters: lock.waiters.filter(w => w !== tabId) };
    });
  }
}
