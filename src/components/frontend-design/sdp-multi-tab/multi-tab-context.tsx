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

import {
  type Phase,
  type TabInfo,
  type Message,
  type MessageType,
  type ConflictStrategy,
  type ScopeItem,
  type ApiEndpoint,
  type TypeDef,
  TOTAL_STEPS,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  SyncCoordinator,
} from "./engine/sync-coordinator";

export type {
  Phase,
  TabInfo,
  Message,
  MessageType,
  ConflictStrategy,
  ScopeItem,
  ApiEndpoint,
  TypeDef,
};

export {
  TOTAL_STEPS,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
};

// ── Helpers ─────────────────────────────────────────────────────────

let _tabIdCounter = 2;
let _msgIdCounter = 0;


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
    const { id, nextCounter } = SyncCoordinator.genTabId(_tabIdCounter);
    _tabIdCounter = nextCounter;
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
    setTabs(prev => SyncCoordinator.removeTab(prev, id));
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
    const { id, nextCounter } = SyncCoordinator.genMsgId(_msgIdCounter);
    _msgIdCounter = nextCounter;
    setMessages(prev => [...prev.slice(-49), {
      ...msg,
      id,
      timestamp: Date.now(),
    }]);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  // Leader election (Bully algorithm: highest ID wins)
  const leaderId = useMemo(() => tabs.find(t => t.isLeader)?.id ?? null, [tabs]);

  const runElection = useCallback((): string | null => {
    let winnerId: string | null = null;
    setTabs(prev => {
      const result = SyncCoordinator.runBullyElection(prev);
      winnerId = result.winnerId;
      return result.updatedTabs;
    });
    return winnerId;
  }, []);

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
