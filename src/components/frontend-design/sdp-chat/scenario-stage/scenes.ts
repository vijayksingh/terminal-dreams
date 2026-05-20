import type { Scenario, SceneMessage } from "./types";

// Base conversation that's always visible (3 messages). The "send"
// scenario adds a 4th. Other scenarios may add/remove messages or
// change visibility (typing dots, etc).
const BASE: SceneMessage[] = [
  { id: "m1", author: "alice", text: "hey, you free for a quick chat?", time: "09:32" },
  { id: "m2", author: "you", text: "yes! what's up?", time: "09:33" },
  { id: "m3", author: "alice", text: "just wanted to check on the demo", time: "09:33" },
];

// ── Scenario 1: Optimistic message send ─────────────────────────────

const SEND_OPTIMISTIC: Scenario["scenes"] = [
  {
    id: "type",
    caption: "User types 'Hello!' in the ComposeBar and hits Send.",
    state: {
      composeText: "Hello!",
      composeFocused: true,
      sendButtonGlow: true,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
  {
    id: "fire",
    caption:
      "ComposeBar fires the sendMessage callback. ChatPane immediately appends the message with status 'sending' (optimistic update).",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "m4", author: "you", text: "Hello!", time: "09:34", status: "sending" },
      ],
      activeMessageId: "m4",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: ["c-xyz"],
        connection: "connected",
        mode: "sending",
      },
      status: "connected",
      ws: "idle",
      flyingChips: [
        {
          id: "fire-1",
          label: "sendMessage({content:'Hello!'})",
          kind: "callback",
          from: "composebar",
          to: "chatpane",
        },
      ],
    },
  },
  {
    id: "transmit",
    caption:
      "ChatPane wraps it in a WebSocketFrame with a clientId, then crosses the WebSocket boundary up into the Network.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "m4", author: "you", text: "Hello!", time: "09:34", status: "sending" },
      ],
      activeMessageId: "m4",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: ["c-xyz"],
        connection: "connected",
        mode: "sending",
      },
      status: "connected",
      ws: "transmitting-up",
      flyingChips: [
        {
          id: "frame-1",
          label: "WebSocketFrame",
          kind: "frame",
          from: "chatpane",
          to: "network",
          weightKB: 0.3,
        },
      ],
    },
  },
  {
    id: "ack",
    caption:
      "Server ACKs with a serverId. The ack travels down through the WebSocket and lands on ChatPane; pending is cleared.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "m4", author: "you", text: "Hello!", time: "09:34", status: "sending" },
      ],
      activeMessageId: "m4",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: [],
        connection: "connected",
        mode: "idle",
      },
      status: "connected",
      ws: "transmitting-down",
      flyingChips: [
        {
          id: "ack-1",
          label: 'ServerAck · "s-123"',
          kind: "ack",
          from: "network",
          to: "chatpane",
        },
      ],
    },
  },
  {
    id: "morph",
    caption:
      "MessageBubble re-renders: the sending spinner morphs into a ✓ sent check. No flicker — just an icon swap.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "m4", author: "you", text: "Hello!", time: "09:34", status: "sent" },
      ],
      activeMessageId: "m4",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: [],
        connection: "connected",
        mode: "idle",
      },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
];

// ── Scenario 1b: Blocking send (counterfactual) ─────────────────────

const SEND_BLOCKING: Scenario["scenes"] = [
  {
    id: "type-b",
    caption: "User types 'Hello!' and hits Send. ComposeBar disables input.",
    state: {
      composeText: "Hello!",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
  {
    id: "fire-b",
    caption:
      "Callback fires, but ChatPane holds. No message appears yet — the input is just disabled, the screen looks frozen.",
    state: {
      composeText: "Hello!",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "sending" },
      status: "connected",
      ws: "idle",
      flyingChips: [
        {
          id: "fire-b1",
          label: "sendMessage({content:'Hello!'})",
          kind: "callback",
          from: "composebar",
          to: "chatpane",
        },
      ],
    },
  },
  {
    id: "wait-b",
    caption:
      "Frame goes out across the WebSocket. We wait. 300–800ms of dead air. The user stares at an unchanged screen.",
    state: {
      composeText: "Hello!",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "sending" },
      status: "connected",
      ws: "transmitting-up",
      flyingChips: [
        {
          id: "frame-b1",
          label: "WebSocketFrame (waiting)",
          kind: "frame",
          from: "chatpane",
          to: "network",
          weightKB: 0.3,
        },
      ],
    },
  },
  {
    id: "arrive-b",
    caption:
      "Server responds. NOW the message finally appears. The 500ms gap felt like an eternity.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "m4", author: "you", text: "Hello!", time: "09:34", status: "sent" },
      ],
      activeMessageId: "m4",
      typingUsers: [],
      chatpane: { messageCount: 4, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "transmitting-down",
      flyingChips: [
        {
          id: "ack-b1",
          label: "Message (finally)",
          kind: "ack",
          from: "network",
          to: "chatpane",
        },
      ],
    },
  },
];

// ── Scenario 2: WebSocket reconnection ───────────────────────────────

const RECONNECT: Scenario["scenes"] = [
  {
    id: "drop",
    caption: "WebSocket connection drops (network change, server restart, etc.).",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "disconnected", mode: "reconnecting" },
      status: "disconnected",
      ws: "disconnected",
      flyingChips: [],
    },
  },
  {
    id: "notify",
    caption:
      "StatusBar immediately shows 'Disconnected' with a yellow warning — the user knows what's happening.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "disconnected", mode: "reconnecting" },
      status: "warn",
      ws: "disconnected",
      flyingChips: [],
    },
  },
  {
    id: "backoff",
    caption: "ChatPane starts exponential backoff: attempt #1 after a 1s delay.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: {
        messageCount: 3,
        pendingQueue: [],
        connection: "connecting",
        mode: "reconnecting",
      },
      status: "warn",
      ws: "reconnecting",
      flyingChips: [],
    },
  },
  {
    id: "restored",
    caption:
      "Connection restored. ChatPane requests messages since the last sequence number to fill gaps.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "syncing" },
      status: "connected",
      ws: "transmitting-up",
      flyingChips: [
        {
          id: "sync",
          label: "GET since=<seq>",
          kind: "frame",
          from: "chatpane",
          to: "network",
        },
      ],
    },
  },
  {
    id: "settled",
    caption:
      "StatusBar shows 'Connected ✓'. Any missed messages are backfilled into the list seamlessly.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
];

// ── Scenario 3: Typing indicator ────────────────────────────────────

const TYPING: Scenario["scenes"] = [
  {
    id: "start-type",
    caption: "Alice starts typing on her device.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
  {
    id: "frame",
    caption:
      "After a 300ms debounce, her client emits a 'typing: true' frame. The server broadcasts it.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: [],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "transmitting-down",
      flyingChips: [
        {
          id: "typing-frame",
          label: "TypingEvent · 0.05 KB",
          kind: "frame",
          from: "network",
          to: "chatpane",
          weightKB: 0.05,
        },
      ],
    },
  },
  {
    id: "register",
    caption:
      "ChatPane adds Alice to typingUsers[] with a 5s auto-clear timer.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: ["alice"],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
  {
    id: "render",
    caption:
      "MessageList renders 'Alice is typing…' below the last message with animated dots.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: BASE,
      activeMessageId: null,
      typingUsers: ["alice"],
      chatpane: { messageCount: 3, pendingQueue: [], connection: "connected", mode: "idle" },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
];

// ── Scenario 4: Offline queue flush ─────────────────────────────────

const OFFLINE: Scenario["scenes"] = [
  {
    id: "queue",
    caption:
      "User sends a message while offline. ChatPane queues it locally with status 'queued'.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "q1", author: "you", text: "stuck offline?", time: "09:35", status: "queued" },
      ],
      activeMessageId: "q1",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: ["c-aaa"],
        connection: "disconnected",
        mode: "queueing",
      },
      status: "disconnected",
      ws: "disconnected",
      flyingChips: [],
    },
  },
  {
    id: "restored-off",
    caption: "Connection comes back. ChatPane starts flushing the offline queue in FIFO order.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "q1", author: "you", text: "stuck offline?", time: "09:35", status: "sending" },
      ],
      activeMessageId: "q1",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: ["c-aaa"],
        connection: "connected",
        mode: "syncing",
      },
      status: "connected",
      ws: "transmitting-up",
      flyingChips: [
        {
          id: "flush-1",
          label: "WebSocketFrame · queued",
          kind: "frame",
          from: "chatpane",
          to: "network",
          weightKB: 0.3,
        },
      ],
    },
  },
  {
    id: "ack-off",
    caption:
      "Server ACKs each queued message. Clock icons turn to checks; queue drains to empty.",
    state: {
      composeText: "",
      composeFocused: false,
      sendButtonGlow: false,
      messages: [
        ...BASE,
        { id: "q1", author: "you", text: "stuck offline?", time: "09:35", status: "sent" },
      ],
      activeMessageId: "q1",
      typingUsers: [],
      chatpane: {
        messageCount: 4,
        pendingQueue: [],
        connection: "connected",
        mode: "idle",
      },
      status: "connected",
      ws: "idle",
      flyingChips: [],
    },
  },
];

export const CHAT_SCENARIOS: Scenario[] = [
  {
    id: "send",
    label: "Send message",
    blurb:
      "Optimistic send: message appears instantly with a spinner, server ACKs later. Toggle the split to compare with blocking send (500ms dead air).",
    scenes: SEND_OPTIMISTIC,
    scenesWithoutSplit: SEND_BLOCKING,
  },
  {
    id: "reconnect",
    label: "Reconnection",
    blurb:
      "Connection drops, exponential backoff kicks in, missed messages backfill on reconnect. The user never loses context.",
    scenes: RECONNECT,
  },
  {
    id: "typing",
    label: "Typing indicator",
    blurb:
      "Debounced typing events via WebSocket. 300ms debounce prevents frame spam; 5s auto-clear prevents stale indicators.",
    scenes: TYPING,
  },
  {
    id: "offline",
    label: "Offline queue",
    blurb:
      "Messages sent while offline queue locally, flush in FIFO order on reconnect. clientId ensures no duplicates.",
    scenes: OFFLINE,
  },
];
