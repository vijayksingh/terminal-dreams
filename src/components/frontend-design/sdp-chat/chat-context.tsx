"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

export const GROUP_THRESHOLD_MS = 120000;

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type ConnectionState = "connected" | "connecting" | "disconnected";
export type TypingUser = { name: string; avatarHue: number };

export type ChatMessage = {
  id: string;
  author: string;
  authorId: string;
  avatarHue: number;
  content: string;
  timestamp: number;
  status: MessageStatus;
  isOwn: boolean;
  replyTo?: string;
  reactions: Record<string, number>;
  editedAt?: number;
  isGrouped?: boolean;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type AlgorithmWeights = {
  likes: number;
  comments: number;
  shares: number;
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "one-on-one", label: "1:1 and group chats?", description: "Group adds member lists, typing indicators for multiple users" },
  { id: "delivery-status", label: "Delivery receipts?", description: "Sent → delivered → read — requires per-message status tracking" },
  { id: "offline", label: "Offline message queue?", description: "Messages sent while disconnected queue locally, sync on reconnect" },
  { id: "typing", label: "Typing indicators?", description: "Real-time presence: 'Alice is typing...' with debounced WebSocket events" },
  { id: "media", label: "Media messages?", description: "Images, files, voice notes — different upload + rendering pipelines" },
];

// ── API Endpoints ──────────────────────────────────────────────────

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/conversations/:id/messages",
    description: "Paginated message history for a conversation",
    usedBy: "ChatPane → MessageList",
    params: [
      { name: "id", type: "string", note: "conversation identifier" },
      { name: "before", type: "string?", note: "cursor for older messages" },
      { name: "limit", type: "number", note: "default 50, max 100" },
    ],
    responseType: "MessagePage",
  },
  {
    method: "POST",
    path: "/api/conversations/:id/messages",
    description: "Send a new message",
    usedBy: "ComposeBanner → MessageInput",
    params: [
      { name: "id", type: "string", note: "conversation identifier" },
      { name: "content", type: "string", note: "message text body" },
      { name: "replyTo", type: "string?", note: "parent message ID" },
      { name: "clientId", type: "string", note: "idempotency key" },
    ],
    responseType: "Message",
  },
  {
    method: "POST",
    path: "/api/conversations/:id/typing",
    description: "Broadcast typing indicator",
    usedBy: "ComposeBanner → debounce(300ms)",
    params: [
      { name: "id", type: "string", note: "conversation identifier" },
      { name: "typing", type: "boolean", note: "start/stop indicator" },
    ],
    responseType: "void",
  },
  {
    method: "POST",
    path: "/api/conversations/:id/read",
    description: "Mark messages as read up to a cursor",
    usedBy: "MessageList → IntersectionObserver",
    params: [
      { name: "id", type: "string", note: "conversation identifier" },
      { name: "upTo", type: "string", note: "last read message ID" },
    ],
    responseType: "ReadReceipt",
  },
];

// ── Data Models ────────────────────────────────────────────────────

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  extends?: string;
  fields: TypeField[];
};

export const DATA_MODELS: TypeDef[] = [
  {
    name: "Message",
    category: "api",
    fields: [
      { name: "id", type: "string", note: "server-assigned" },
      { name: "clientId", type: "string", note: "client idempotency key" },
      { name: "author", type: "UserSummary" },
      { name: "content", type: "string" },
      { name: "status", type: "MessageStatus", note: "sending | sent | delivered | read" },
      { name: "replyTo", type: "string?", note: "parent message ID" },
      { name: "reactions", type: "Record<string, number>" },
      { name: "createdAt", type: "number", note: "unix ms" },
    ],
  },
  {
    name: "WebSocketFrame",
    category: "api",
    fields: [
      { name: "type", type: "string", note: "message | typing | status | ack" },
      { name: "payload", type: "unknown", note: "frame-type-specific" },
      { name: "seq", type: "number", note: "sequence for ordering" },
    ],
  },
  {
    name: "ConversationState",
    category: "state",
    fields: [
      { name: "messages", type: "Message[]", note: "ordered by createdAt" },
      { name: "pendingQueue", type: "Message[]", note: "unsent (offline)" },
      { name: "typingUsers", type: "TypingUser[]" },
      { name: "connection", type: "ConnectionState" },
      { name: "unreadCount", type: "number" },
    ],
  },
];

// ── Deterministic message generation ──────────────────────────────

const USERS = [
  { name: "Alice", id: "alice", hue: 220 },
  { name: "Bob", id: "bob", hue: 150 },
  { name: "Carol", id: "carol", hue: 340 },
  { name: "Dave", id: "dave", hue: 40 },
];

const MESSAGES = [
  "Hey, have you pushed the WebSocket changes yet?",
  "Just deployed to staging. The reconnection logic is much better now.",
  "Nice! I noticed the typing indicator was lagging — did you fix that?",
  "Yeah, I added a 300ms debounce. Feels much smoother.",
  "The delivery receipts are working too. Grey check → blue double-check.",
  "What about offline messages? If I turn off wifi mid-message...",
  "Those queue locally in IndexedDB and flush on reconnect. FIFO ordering.",
  "Love it. We should add optimistic sending next — show the message instantly.",
  "Already done! The message appears with a spinner, then the check appears when the server ACKs.",
  "That's exactly right. The key insight is the clientId for idempotency.",
  "Speaking of which, what happens if the server receives the same clientId twice?",
  "It dedupes and returns the existing message. No double-sends.",
  "Perfect. What about message ordering? WebSocket frames can arrive out of order.",
  "We use a sequence number on each frame. Client buffers and reorders if needed.",
  "The presence system is really nice too — I can see who's online in real time.",
  "Right, it's a heartbeat every 30s. If we miss 2 heartbeats, mark as offline.",
];

import {
  generateMessages as engineGenerateMessages,
  generateIncoming as engineGenerateIncoming,
  getPhase as engineGetPhase,
  FEATURE_UNLOCK as ENGINE_FEATURE_UNLOCK,
  isFeatureActive as engineIsFeatureActive,
  DEFAULT_MESSAGE_COUNT as ENGINE_DEFAULT_MESSAGE_COUNT,
  BASELINE_MESSAGE_COUNT as ENGINE_BASELINE_MESSAGE_COUNT,
  GROUP_THRESHOLD_MS as ENGINE_GROUP_THRESHOLD_MS
} from "./engine/chat-helpers";

const DEFAULT_MESSAGE_COUNT = ENGINE_DEFAULT_MESSAGE_COUNT;
const BASELINE_MESSAGE_COUNT = ENGINE_BASELINE_MESSAGE_COUNT;

function generateMessages(count: number): ChatMessage[] {
  return engineGenerateMessages(count);
}

function generateIncoming(index: number): ChatMessage {
  return engineGenerateIncoming(index);
}

export function getPhase(step: number): Phase {
  return engineGetPhase(step);
}

const FEATURE_UNLOCK = ENGINE_FEATURE_UNLOCK;

function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  return engineIsFeatureActive(feature, step, toggled);
}

// ── Context shape ───────────────────────────────────────────────────

type ChatContextValue = {
  activeStep: number;
  phase: Phase;

  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  messages: ChatMessage[];
  visibleMessages: ChatMessage[];
  messageCount: number;

  featureToggled: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  isActive: (feature: string) => boolean;

  // Step 5: Scroll anchor
  autoScrollEnabled: boolean;
  setAutoScrollEnabled: (v: boolean) => void;

  // Step 6: Send message
  sendMessage: (content: string) => void;
  pendingMessages: ChatMessage[];

  // Step 7: Delivery status
  deliveryProgress: Map<string, MessageStatus>;

  // Step 8: Typing indicator
  typingUsers: TypingUser[];
  typingEventCount: number;
  debounceMs: number;
  setDebounceMs: (ms: number) => void;

  // Step 9: Connection
  connectionState: ConnectionState;
  setConnectionState: (s: ConnectionState) => void;
  reconnectAttempts: number;

  // Step 10: Offline queue
  offlineQueue: ChatMessage[];

  // Step 12: Reactions
  activeEmoji: string;
  setActiveEmoji: (e: string) => void;
  toggleReaction: (msgId: string, emoji: string) => void;

  // Step 13: Read receipts
  lastReadIndex: number;
  lastReadMessageId: string | null;
  advanceReadCursor: () => void;

  // Step 14: Encryption
  encryptionOverheadMs: number;
  setEncryptionOverheadMs: (ms: number) => void;

  // Step 15: Scale
  scaleLevel: number;
  setScaleLevel: (n: number) => void;

  metrics: {
    wsLatency: number;
    messageRate: number;
    queueDepth: number;
    reconnects: number;
  };

  stateEntries: StateEntry[];
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function ChatProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase = getPhase(activeStep);

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const [featureToggled, setFeatureToggled] = useState<Record<string, boolean>>({});

  const toggleFeature = useCallback((feature: string) => {
    setFeatureToggled((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  const isActive = useCallback(
    (feature: string) => isFeatureActive(feature, activeStep, !!featureToggled[feature]),
    [activeStep, featureToggled]
  );

  const [scaleLevel, setScaleLevel] = useState(50);

  // Step 5: Scroll anchor (shared between controls + PersistentChat)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Step 12: Active emoji (shared between picker + bubble click)
  const [activeEmoji, setActiveEmoji] = useState("👍");

  // Step 14: Encryption overhead simulation
  const [encryptionOverheadMs, setEncryptionOverheadMs] = useState(5);

  const messageCount = useMemo(() => {
    if (activeStep <= 3) return 0;
    if (activeStep === 4) return BASELINE_MESSAGE_COUNT;
    if (activeStep === 15) return Math.min(scaleLevel, 500);
    return DEFAULT_MESSAGE_COUNT;
  }, [activeStep, scaleLevel]);

  const allMessages = useMemo(() => generateMessages(messageCount), [messageCount]);

  // Step 6: Send message (optimistic)
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const sendTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => { sendTimersRef.current.forEach(clearTimeout); };
  }, []);

  // Step 7: Delivery progress tracking
  const deliveryProgress = useMemo(() => {
    const map = new Map<string, MessageStatus>();
    sentMessages.forEach(m => map.set(m.id, m.status));
    pendingMessages.forEach(m => map.set(m.id, m.status));
    return map;
  }, [sentMessages, pendingMessages]);

  // Step 8: Typing indicator simulation with debounce control
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingEventCount, setTypingEventCount] = useState(0);
  const [debounceMs, setDebounceMs] = useState(300);
  const typingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const typingActive = isActive("typingIndicator");

  useEffect(() => {
    if (!typingActive) {
      setTypingUsers([]);
      setTypingEventCount(0);
      clearInterval(typingTimerRef.current);
      return;
    }

    let tick = 0;
    const rate = Math.max(100, debounceMs);
    typingTimerRef.current = setInterval(() => {
      tick++;
      setTypingEventCount(c => c + 1);
      if (tick % 3 === 1) {
        setTypingUsers([{ name: "Bob", avatarHue: 150 }]);
      } else if (tick % 3 === 2) {
        setTypingUsers([{ name: "Bob", avatarHue: 150 }, { name: "Carol", avatarHue: 340 }]);
      } else {
        setTypingUsers([]);
      }
    }, rate);

    return () => clearInterval(typingTimerRef.current);
  }, [typingActive, debounceMs]);

  // Step 9: Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("connected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reconnectAttemptsRef = useRef(0);

  const reconnectActive = isActive("reconnection");

  useEffect(() => {
    if (connectionState === "disconnected" && reconnectActive) {
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      const DELAYS = [1000, 2000, 4000];
      const MAX_ATTEMPTS = 3;
      const tryConnect = () => {
        const a = reconnectAttemptsRef.current;
        if (a >= MAX_ATTEMPTS) {
          setConnectionState("connected");
          return;
        }
        setConnectionState("connecting");
        reconnectAttemptsRef.current = a + 1;
        setReconnectAttempts(a + 1);
        const jitter = 1 + (Math.random() * 0.4 - 0.2);
        const delay = DELAYS[Math.min(a, DELAYS.length - 1)] * jitter;
        reconnectTimerRef.current = setTimeout(tryConnect, delay);
      };
      reconnectTimerRef.current = setTimeout(tryConnect, 500);
    }
    return () => clearTimeout(reconnectTimerRef.current);
  }, [connectionState, reconnectActive]);

  // sendMessage — defined after connectionState so ref can synchronize
  const connectionStateRef = useRef<ConnectionState>(connectionState);
  connectionStateRef.current = connectionState;

  const sendMessage = useCallback((content: string) => {
    const clientId = `client-${Date.now()}`;
    const msg: ChatMessage = {
      id: clientId,
      author: "Alice",
      authorId: "alice",
      avatarHue: 220,
      content,
      timestamp: Date.now(),
      status: "sending",
      isOwn: true,
      reactions: {},
    };

    if (connectionStateRef.current !== "connected") {
      setOfflineQueue(q => [...q, { ...msg, status: "failed" }]);
      return;
    }

    setPendingMessages(p => [...p, msg]);

    const timer = setTimeout(() => {
      sendTimersRef.current.delete(timer);
      setPendingMessages(p2 => p2.filter(m => m.id !== clientId));
      setSentMessages(s => [...s, { ...msg, status: "sent", id: `sent-${clientId}` }]);

      const deliverTimer = setTimeout(() => {
        sendTimersRef.current.delete(deliverTimer);
        setSentMessages(s2 =>
          s2.map(m => m.id === `sent-${clientId}` ? { ...m, status: "delivered" } : m)
        );
      }, 600);
      sendTimersRef.current.add(deliverTimer);
    }, 400 + Math.random() * 300);
    sendTimersRef.current.add(timer);
  }, []);

  // Step 10: Offline queue
  const [offlineQueue, setOfflineQueue] = useState<ChatMessage[]>([]);
  const offlineQueueActive = isActive("offlineQueue");
  const flushingRef = useRef(false);

  useEffect(() => {
    if (connectionState === "connected" && offlineQueue.length > 0 && offlineQueueActive && !flushingRef.current) {
      flushingRef.current = true;
      const toFlush = [...offlineQueue];
      toFlush.forEach((msg, i) => {
        const timer = setTimeout(() => {
          sendTimersRef.current.delete(timer);
          if (connectionStateRef.current !== "connected") return;
          setOfflineQueue(q => q.filter(m => m.id !== msg.id));
          setSentMessages(prev => [...prev, { ...msg, status: "sent", id: `flushed-${msg.id}` }]);
          if (i === toFlush.length - 1) flushingRef.current = false;
        }, (i + 1) * 300);
        sendTimersRef.current.add(timer);
      });
    }
  }, [connectionState, offlineQueue, offlineQueueActive]);

  // Step 12: Reactions — overlay map so reactions work on ALL messages, not just sent
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, Record<string, number>>>({});

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    setReactionOverrides(prev => {
      const existing = prev[msgId] ?? {};
      const current = existing[emoji] ?? 0;
      const next = current > 0 ? 0 : 1;
      const updated = { ...existing, [emoji]: next };
      if (next === 0) delete updated[emoji];
      return { ...prev, [msgId]: updated };
    });
  }, []);

  // Step 13: Read receipts with cursor advancement
  const [readCursorIndex, setReadCursorIndex] = useState(-1);
  const readReceiptActive = isActive("readReceipts");

  useEffect(() => {
    if (!readReceiptActive) setReadCursorIndex(-1);
    else if (readCursorIndex === -1 && allMessages.length > 0) {
      setReadCursorIndex(Math.max(0, allMessages.length - 4));
    }
  }, [readReceiptActive, allMessages.length, readCursorIndex]);

  const lastReadMessageId = useMemo(() => {
    if (readCursorIndex < 0 || allMessages.length === 0) return null;
    const idx = Math.min(readCursorIndex, allMessages.length - 1);
    return allMessages[idx].id;
  }, [readCursorIndex, allMessages]);

  const advanceReadCursor = useCallback(() => {
    setReadCursorIndex(prev => {
      if (prev < 0) return 0;
      return Math.min(prev + 1, allMessages.length - 1);
    });
  }, [allMessages.length]);

  // Incoming messages (real-time simulation)
  const [incomingMessages, setIncomingMessages] = useState<ChatMessage[]>([]);
  const incomingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const incomingCounterRef = useRef(0);
  const messageListActive = isActive("messageList");

  useEffect(() => {
    if (!messageListActive || activeStep <= 4) {
      setIncomingMessages([]);
      incomingCounterRef.current = 0;
      clearInterval(incomingTimerRef.current);
      return;
    }

    incomingTimerRef.current = setInterval(() => {
      const msg = generateIncoming(incomingCounterRef.current++);
      setIncomingMessages(prev => prev.length >= 30 ? [...prev.slice(-20), msg] : [...prev, msg]);
    }, 5000);

    return () => clearInterval(incomingTimerRef.current);
  }, [messageListActive, activeStep]);

  // Combined messages with reaction overrides applied
  const combinedMessages = useMemo(() => {
    const merged = [...allMessages, ...sentMessages, ...pendingMessages, ...incomingMessages]
      .sort((a, b) => a.timestamp - b.timestamp);
    if (Object.keys(reactionOverrides).length === 0) return merged;
    return merged.map(m => {
      const overrides = reactionOverrides[m.id];
      if (!overrides) return m;
      return { ...m, reactions: { ...m.reactions, ...overrides } };
    });
  }, [allMessages, sentMessages, pendingMessages, incomingMessages, reactionOverrides]);

  const groupingActive = isActive("messageGrouping");

  const visibleMessages = useMemo(() => {
    if (!groupingActive) return combinedMessages;
    return combinedMessages.map((msg, i) => {
      const prev = i > 0 ? combinedMessages[i - 1] : null;
      const isGrouped = prev !== null
        && prev.authorId === msg.authorId
        && msg.timestamp - prev.timestamp < GROUP_THRESHOLD_MS;
      return { ...msg, isGrouped };
    });
  }, [combinedMessages, groupingActive]);

  // Reset step-specific state
  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    if (prevStepRef.current !== activeStep) {
      prevStepRef.current = activeStep;
      setSentMessages([]);
      setPendingMessages([]);
      setIncomingMessages([]);
      setOfflineQueue([]);
      setReactionOverrides({});
      setAutoScrollEnabled(true);
      if (activeStep === 9) setConnectionState("connected");
      if (activeStep === 15) setScaleLevel(50);
    }
  }, [activeStep]);

  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = combinedMessages.length;
    let wsLatency = 45;
    let messageRate = 2;
    let queueDepth = offlineQueue.length;
    let reconnects = reconnectAttempts;

    if (total > 500) {
      wsLatency = 45 + Math.floor(total / 50);
      messageRate = Math.min(20, Math.floor(total / 40));
    }

    if (connectionState === "disconnected") wsLatency = 0;
    if (connectionState === "connecting") wsLatency = 999;

    return { wsLatency, messageRate, queueDepth, reconnects };
  }, [combinedMessages, offlineQueue, connectionState, reconnectAttempts]);

  // ── State inspector ─────────────────────────────────────────────
  const stateEntries = useMemo((): StateEntry[] => {
    if (activeStep <= 3) return [];
    const e: StateEntry[] = [];
    e.push({ label: "messages", value: combinedMessages.length });
    e.push({ label: "WS latency", value: `${metrics.wsLatency}ms`, highlight: metrics.wsLatency > 100 });
    e.push({ label: "connection", value: connectionState, highlight: connectionState !== "connected" });

    if (activeStep >= 6) e.push({ label: "pending sends", value: pendingMessages.length });
    if (activeStep >= 8) e.push({ label: "typing", value: typingUsers.map(u => u.name).join(", ") || "—" });
    if (activeStep >= 10) e.push({ label: "offline queue", value: offlineQueue.length, highlight: offlineQueue.length > 0 });
    if (activeStep >= 13) e.push({ label: "last read", value: lastReadMessageId ?? "—" });
    if (activeStep >= 14) e.push({ label: "encrypt overhead", value: `${encryptionOverheadMs}ms`, highlight: encryptionOverheadMs > 50 });

    return e;
  }, [activeStep, combinedMessages.length, metrics, connectionState, pendingMessages, typingUsers, offlineQueue, lastReadMessageId, encryptionOverheadMs]);

  const value = useMemo(
    (): ChatContextValue => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      messages: combinedMessages,
      visibleMessages,
      messageCount: combinedMessages.length,
      featureToggled,
      toggleFeature,
      isActive,
      autoScrollEnabled,
      setAutoScrollEnabled,
      sendMessage,
      pendingMessages,
      deliveryProgress,
      typingUsers,
      typingEventCount,
      debounceMs,
      setDebounceMs,
      connectionState,
      setConnectionState,
      reconnectAttempts,
      offlineQueue,
      activeEmoji,
      setActiveEmoji,
      toggleReaction,
      lastReadIndex: readCursorIndex,
      lastReadMessageId,
      advanceReadCursor,
      encryptionOverheadMs,
      setEncryptionOverheadMs,
      scaleLevel,
      setScaleLevel,
      metrics,
      stateEntries,
    }),
    [
      activeStep, phase,
      scopeEnabled, toggleScope,
      combinedMessages, visibleMessages,
      featureToggled, toggleFeature, isActive,
      autoScrollEnabled,
      sendMessage, pendingMessages, deliveryProgress,
      typingUsers, typingEventCount, debounceMs,
      connectionState, reconnectAttempts,
      offlineQueue, activeEmoji, toggleReaction,
      readCursorIndex, lastReadMessageId, advanceReadCursor,
      encryptionOverheadMs,
      scaleLevel, metrics, stateEntries,
    ]
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
