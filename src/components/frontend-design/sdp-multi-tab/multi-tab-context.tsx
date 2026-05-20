"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────

let _tabIdCounter = 0;
function genTabId(): string {
  _tabIdCounter += 1;
  return `tab-${_tabIdCounter}`;
}

let _msgIdCounter = 0;
function genMsgId(): string {
  _msgIdCounter += 1;
  return `msg-${_msgIdCounter}`;
}

// ── Context ─────────────────────────────────────────────────────────

type MultiTabContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  // Tabs
  tabs: TabInfo[];
  addTab: (label: string) => string;
  removeTab: (id: string) => void;
  setTabVisibility: (id: string, v: TabInfo["visibility"]) => void;
  setTabLeader: (id: string) => void;
  updateTabHeartbeat: (id: string) => void;
  updateTabState: (id: string, key: string, value: string) => void;
  // Messages
  messages: Message[];
  sendMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  clearMessages: () => void;
  // Leader
  leaderId: string | null;
  runElection: () => string | null;
  // Conflict
  conflictStrategy: ConflictStrategy;
  setConflictStrategy: (s: ConflictStrategy) => void;
  // Step completion
  stepCompleted: Record<number, boolean>;
  markStepComplete: (step: number) => void;
  // Metrics
  messageCount: number;
  activeTabCount: number;
  // State inspector
  stateEntries: StateEntry[];
};

const MultiTabContext = createContext<MultiTabContextValue | null>(null);

export function useMultiTab() {
  const ctx = useContext(MultiTabContext);
  if (!ctx) throw new Error("useMultiTab must be used within MultiTabProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function MultiTabProvider({
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

  // Step completion
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const markStepComplete = useCallback((step: number) => {
    setStepCompleted(prev => prev[step] ? prev : { ...prev, [step]: true });
  }, []);

  // Tabs
  const [tabs, setTabs] = useState<TabInfo[]>(() => [
    { id: "tab-1", label: "Tab A", isLeader: true, visibility: "visible", lastHeartbeat: Date.now(), state: {} },
    { id: "tab-2", label: "Tab B", isLeader: false, visibility: "visible", lastHeartbeat: Date.now(), state: {} },
  ]);
  // Reset counter to match initial state
  useEffect(() => { _tabIdCounter = 2; _msgIdCounter = 0; }, []);

  const addTab = useCallback((label: string): string => {
    const id = genTabId();
    setTabs(prev => [...prev, {
      id,
      label,
      isLeader: false,
      visibility: "visible",
      lastHeartbeat: Date.now(),
      state: {},
    }]);
    return id;
  }, []);

  const removeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      // If removed tab was leader, clear leadership
      const first = next[0];
      if (prev.find(t => t.id === id)?.isLeader && first) {
        next[0] = { ...first, isLeader: true };
      }
      return next;
    });
  }, []);

  const setTabVisibility = useCallback((id: string, v: TabInfo["visibility"]) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, visibility: v } : t));
  }, []);

  const setTabLeader = useCallback((id: string) => {
    setTabs(prev => prev.map(t => ({ ...t, isLeader: t.id === id })));
  }, []);

  const updateTabHeartbeat = useCallback((id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, lastHeartbeat: Date.now() } : t));
  }, []);

  const updateTabState = useCallback((id: string, key: string, value: string) => {
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...t, state: { ...t.state, [key]: value } } : t
    ));
  }, []);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const sendMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    setMessages(prev => [...prev.slice(-49), {
      ...msg,
      id: genMsgId(),
      timestamp: Date.now(),
    }]);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  // Leader election (Bully algorithm: highest ID wins)
  const leaderId = useMemo(() => tabs.find(t => t.isLeader)?.id ?? null, [tabs]);

  const runElection = useCallback((): string | null => {
    const alive = tabs.filter(t => t.visibility !== "terminated");
    if (alive.length === 0) return null;
    // Bully: sort by numeric portion of ID descending, highest wins
    const sorted = [...alive].sort((a, b) => {
      const aNum = parseInt(a.id.split("-")[1] ?? "0", 10);
      const bNum = parseInt(b.id.split("-")[1] ?? "0", 10);
      return bNum - aNum;
    });
    const winner = sorted[0];
    if (!winner) return null;
    setTabs(prev => prev.map(t => ({ ...t, isLeader: t.id === winner.id })));
    return winner.id;
  }, [tabs]);

  // Conflict strategy
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("lww");

  // Derived metrics
  const messageCount = messages.length;
  const activeTabCount = useMemo(() => tabs.filter(t => t.visibility !== "terminated").length, [tabs]);

  // State inspector entries
  const stateEntries = useMemo<StateEntry[]>(() => [
    { label: "tabs", value: tabs.length },
    { label: "activeTabs", value: activeTabCount, highlight: true },
    { label: "leader", value: leaderId ?? "none" },
    { label: "messages", value: messageCount, highlight: true },
    { label: "strategy", value: conflictStrategy },
    { label: "visibility", value: tabs.map(t => t.visibility[0]).join(",") },
  ], [tabs, activeTabCount, leaderId, messageCount, conflictStrategy]);

  const value = useMemo<MultiTabContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      tabs,
      addTab,
      removeTab,
      setTabVisibility,
      setTabLeader,
      updateTabHeartbeat,
      updateTabState,
      messages,
      sendMessage,
      clearMessages,
      leaderId,
      runElection,
      conflictStrategy,
      setConflictStrategy,
      stepCompleted,
      markStepComplete,
      messageCount,
      activeTabCount,
      stateEntries,
    }),
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      tabs,
      addTab,
      removeTab,
      setTabVisibility,
      setTabLeader,
      updateTabHeartbeat,
      updateTabState,
      messages,
      sendMessage,
      clearMessages,
      leaderId,
      runElection,
      conflictStrategy,
      setConflictStrategy,
      stepCompleted,
      markStepComplete,
      messageCount,
      activeTabCount,
      stateEntries,
    ]
  );

  return (
    <MultiTabContext.Provider value={value}>
      {children}
    </MultiTabContext.Provider>
  );
}
