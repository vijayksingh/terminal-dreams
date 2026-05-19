import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

// Uniform 130×32 cards (88 for the bottom-row trio) on a regular grid,
// confined to the left ~325 viewBox units. The right ~215 units are
// reserved for the floating detail card in the anchored layout.
const NODES: FlowNode[] = [
  {
    id: "ws",
    label: "WebSocket",
    sublabel: "bidirectional · frames",
    x: 105,
    y: 10,
    w: 130,
    h: 32,
  },
  {
    id: "chatpane",
    label: "ChatPane",
    sublabel: "state owner · queue",
    x: 105,
    y: 60,
    w: 130,
    h: 32,
  },
  {
    id: "messagelist",
    label: "MessageList",
    sublabel: "virtual scroll",
    x: 10,
    y: 110,
    w: 88,
    h: 32,
  },
  {
    id: "composebar",
    label: "ComposeBar",
    sublabel: "input · send",
    x: 113,
    y: 110,
    w: 88,
    h: 32,
  },
  {
    id: "statusbar",
    label: "StatusBar",
    sublabel: "connection",
    x: 216,
    y: 110,
    w: 88,
    h: 32,
  },
  {
    id: "messagebubble",
    label: "MessageBubble",
    sublabel: "status · reactions",
    x: 85,
    y: 160,
    w: 130,
    h: 32,
  },
];

const EDGES: FlowEdge[] = [
  { from: "ws", to: "chatpane", verb: "pushes frames" },
  { from: "chatpane", to: "messagelist", verb: "passes messages[]" },
  { from: "chatpane", to: "composebar", verb: "passes sendMessage" },
  { from: "chatpane", to: "statusbar", verb: "passes connectionState" },
  { from: "messagelist", to: "messagebubble", verb: "renders" },
  {
    from: "composebar",
    to: "chatpane",
    dashed: true,
    verb: "fires sendMessage",
    pathOverride: "M 113,110 C 95,108 95,92 105,92",
    midpointOverride: { x: 95, y: 100 },
  },
  {
    from: "messagebubble",
    to: "chatpane",
    dashed: true,
    verb: "fires toggleReaction",
    pathOverride: "M 85,160 C 4,158 4,92 105,92",
    midpointOverride: { x: 4, y: 126 },
  },
  {
    from: "statusbar",
    to: "chatpane",
    dashed: true,
    verb: "fires reconnect",
    pathOverride: "M 304,110 C 320,108 320,92 235,92",
    midpointOverride: { x: 320, y: 100 },
  },
];

// ── Type definitions ───────────────────────────────────────────────

const T_WsFrame: ArchTypeDef = {
  name: "WebSocketFrame",
  kind: "protocol",
  fields: [
    { name: "type", type: "string", note: "message | typing | status | ack" },
    { name: "payload", type: "unknown", note: "frame-type-specific" },
    { name: "seq", type: "number", note: "sequence for ordering" },
  ],
};

const T_Message: ArchTypeDef = {
  name: "Message",
  kind: "API response",
  fields: [
    { name: "id", type: "string", note: "server-assigned" },
    { name: "clientId", type: "string", note: "idempotency key" },
    { name: "author", type: "UserSummary" },
    { name: "content", type: "string" },
    { name: "status", type: "MessageStatus" },
    { name: "createdAt", type: "number" },
  ],
};

const T_SendPayload: ArchTypeDef = {
  name: "sendMessage(content)",
  kind: "callback",
  fields: [
    { name: "content", type: "string" },
    { name: "clientId", type: "string", note: "UUID for idempotency" },
    { name: "replyTo", type: "string?", note: "parent message ID" },
  ],
};

const T_AckPayload: ArchTypeDef = {
  name: "ServerAck",
  kind: "protocol",
  fields: [
    { name: "clientId", type: "string", note: "matches client's UUID" },
    { name: "serverId", type: "string", note: "canonical message ID" },
    { name: "status", type: '"sent"', note: "server received" },
  ],
};

const T_TypingEvent: ArchTypeDef = {
  name: "TypingEvent",
  kind: "protocol",
  fields: [
    { name: "userId", type: "string" },
    { name: "typing", type: "boolean", note: "start or stop" },
  ],
};

const T_ReconnectState: ArchTypeDef = {
  name: "ReconnectionState",
  kind: "state",
  fields: [
    { name: "attempt", type: "number", note: "1, 2, 3..." },
    { name: "delay", type: "number", note: "exponential: 1s, 2s, 4s" },
    { name: "state", type: "ConnectionState", note: "connecting | connected" },
  ],
};

const T_OfflineMsg: ArchTypeDef = {
  name: "OfflineMessage",
  kind: "state",
  fields: [
    { name: "clientId", type: "string", note: "idempotency key" },
    { name: "content", type: "string" },
    { name: "queuedAt", type: "number", note: "when message was sent offline" },
  ],
};

// ── Heavy variants (no optimistic send) ──────────────────────────

const T_Message_Heavy: ArchTypeDef = {
  name: "Message (wait-for-server)",
  kind: "API response",
  fields: [
    { name: "id", type: "string", note: "must wait for server" },
    { name: "content", type: "string" },
    { name: "status", type: '"sent"', note: "only appears after round-trip" },
  ],
};

// ── Scenario 1: Optimistic message send ──────────────────────────

const SCENARIO_SEND_OPTIMISTIC: ArchStep[] = [
  {
    nodeId: "composebar",
    caption: "User types 'Hello!' and hits send.",
    stateAfter: [
      { key: "messages", value: "Message[40]" },
      { key: "pendingQueue", value: "[]" },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "ComposeBar fires sendMessage. ChatPane immediately appends with status: 'sending' and a spinner.",
    payload: { type: T_SendPayload, weightKB: 0.2 },
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="sending")' },
      { key: "pendingQueue", value: '[{ clientId: "c-xyz" }]' },
    ],
  },
  {
    nodeId: "ws",
    caption: "ChatPane sends the message as a WebSocket frame with clientId for idempotency.",
    payload: { type: T_WsFrame, weightKB: 0.3 },
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="sending")' },
      { key: "pendingQueue", value: '[{ clientId: "c-xyz" }]' },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "Server ACKs with serverId. Spinner → single check. Message is now canonical.",
    payload: { type: T_AckPayload },
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="sent", id="s-123")' },
      { key: "pendingQueue", value: "[]" },
    ],
  },
  {
    nodeId: "messagebubble",
    caption: "MessageBubble updates: sending spinner → ✓ sent check. No flicker — just an icon swap.",
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="sent")' },
      { key: "pendingQueue", value: "[]" },
    ],
  },
];

const SCENARIO_SEND_BLOCKING: ArchStep[] = [
  {
    nodeId: "composebar",
    caption: "User types 'Hello!' and hits send.",
    stateAfter: [
      { key: "messages", value: "Message[40]" },
      { key: "sending", value: "false" },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "ComposeBar fires sendMessage. ChatPane disables input and waits for server response.",
    payload: { type: T_SendPayload, weightKB: 0.2 },
    stateAfter: [
      { key: "messages", value: "Message[40]" },
      { key: "sending", value: "true" },
      { key: "inputDisabled", value: "true" },
    ],
  },
  {
    nodeId: "ws",
    caption: "Frame sent. User stares at a blank input for 300-800ms. No feedback.",
    payload: { type: T_WsFrame, weightKB: 0.3 },
    stateAfter: [
      { key: "messages", value: "Message[40] (nothing visible yet)" },
      { key: "sending", value: "true" },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "Server responds. NOW the message appears. 500ms of dead air felt like an eternity.",
    payload: { type: T_Message_Heavy },
    stateAfter: [
      { key: "messages", value: "Message[41] (finally visible)" },
      { key: "sending", value: "false" },
      { key: "inputDisabled", value: "false" },
    ],
  },
];

// ── Scenario 2: WebSocket reconnection ──────────────────────────

const SCENARIO_RECONNECT: ArchStep[] = [
  {
    nodeId: "ws",
    caption: "WebSocket connection drops (network change, server restart, etc.).",
    stateAfter: [
      { key: "connection", value: '"disconnected"' },
      { key: "attempt", value: "0" },
    ],
  },
  {
    nodeId: "statusbar",
    caption: "StatusBar shows 'Disconnected' with a yellow warning. User knows immediately.",
    payload: { type: T_ReconnectState },
    stateAfter: [
      { key: "connection", value: '"disconnected"' },
      { key: "statusBar", value: '"⚠ Disconnected"' },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "ChatPane starts exponential backoff: attempt #1 after 1s delay.",
    payload: { type: T_ReconnectState },
    stateAfter: [
      { key: "connection", value: '"connecting"' },
      { key: "attempt", value: "1" },
      { key: "nextDelay", value: '"2s"' },
    ],
  },
  {
    nodeId: "ws",
    caption: "Connection succeeds. ChatPane requests messages since last sequence number to fill gaps.",
    stateAfter: [
      { key: "connection", value: '"connected"' },
      { key: "attempt", value: "0" },
      { key: "missedMessages", value: "fetching..." },
    ],
  },
  {
    nodeId: "statusbar",
    caption: "StatusBar shows 'Connected ✓'. Missed messages are backfilled into the list seamlessly.",
    stateAfter: [
      { key: "connection", value: '"connected"' },
      { key: "statusBar", value: '"Connected ✓"' },
    ],
  },
];

// ── Scenario 3: Typing indicator flow ─────────────────────────────

const SCENARIO_TYPING: ArchStep[] = [
  {
    nodeId: "composebar",
    caption: "User starts typing. ComposeBar debounces (300ms) before sending a typing event.",
    stateAfter: [
      { key: "localTyping", value: "true" },
      { key: "debounceTimer", value: "pending (300ms)" },
    ],
  },
  {
    nodeId: "ws",
    caption: "After 300ms, a typing: true frame is sent. Server broadcasts to other participants.",
    payload: { type: T_TypingEvent, weightKB: 0.05 },
    stateAfter: [
      { key: "localTyping", value: "true" },
      { key: "frameSent", value: "typing: true" },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "Other user's typing event arrives. ChatPane adds them to typingUsers[].",
    payload: { type: T_TypingEvent },
    stateAfter: [
      { key: "typingUsers", value: '["Bob"]' },
      { key: "typingTimeout", value: "5s auto-clear" },
    ],
  },
  {
    nodeId: "messagelist",
    caption: "Typing indicator renders below the last message: 'Bob is typing...' with animated dots.",
    stateAfter: [
      { key: "typingUsers", value: '["Bob"]' },
      { key: "indicator", value: "visible" },
    ],
  },
];

// ── Scenario 4: Offline queue flush ──────────────────────────────

const SCENARIO_OFFLINE_QUEUE: ArchStep[] = [
  {
    nodeId: "composebar",
    caption: "User sends a message while offline. ComposeBar detects disconnected state.",
    stateAfter: [
      { key: "connection", value: '"disconnected"' },
      { key: "offlineQueue", value: "[]" },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "ChatPane queues the message locally with status: 'queued'. Appears in chat with a clock icon.",
    payload: { type: T_OfflineMsg },
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="queued")' },
      { key: "offlineQueue", value: "[1 message]" },
    ],
  },
  {
    nodeId: "ws",
    caption: "Connection restored. ChatPane flushes the queue — sends all pending messages in FIFO order.",
    payload: { type: T_WsFrame, weightKB: 0.3 },
    stateAfter: [
      { key: "connection", value: '"connected"' },
      { key: "offlineQueue", value: "flushing..." },
    ],
  },
  {
    nodeId: "chatpane",
    caption: "Server ACKs each queued message. Clock icons → check marks. Queue empty.",
    payload: { type: T_AckPayload },
    stateAfter: [
      { key: "messages", value: 'Message[41] (last: status="sent")' },
      { key: "offlineQueue", value: "[]" },
    ],
  },
];

// ── Config ──────────────────────────────────────────────────────────

export const CHAT_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "ChatPane owns all state. WebSocket is a transport layer — the UI never depends on connection state for correctness, only for speed.",
  // Expanded viewBox: diagram occupies left ~325 units; right ~215 are
  // reserved for the floating detail card in the anchored layout.
  viewBox: "0 0 560 200",
  nodes: NODES,
  edges: EDGES,
  protagonist: "chatpane",
  layout: "anchored",
  cardArea: { side: "right", widthVB: 210, gapVB: 20 },
  scenarios: [
    {
      id: "send-message",
      label: "Send message",
      blurb:
        "Optimistic send: message appears instantly with a spinner, server ACKs later. Toggle the split to compare with blocking send (500ms dead air).",
      steps: SCENARIO_SEND_OPTIMISTIC,
      stepsWithoutSplit: SCENARIO_SEND_BLOCKING,
    },
    {
      id: "reconnect",
      label: "Reconnection",
      blurb:
        "Connection drops, exponential backoff kicks in, missed messages are backfilled on reconnect. The user never loses context.",
      steps: SCENARIO_RECONNECT,
    },
    {
      id: "typing-indicator",
      label: "Typing indicator",
      blurb:
        "Debounced typing events via WebSocket. 300ms debounce prevents frame spam; 5s auto-clear prevents stale indicators.",
      steps: SCENARIO_TYPING,
    },
    {
      id: "offline-queue",
      label: "Offline queue",
      blurb:
        "Messages sent while offline queue locally, flush in FIFO order on reconnect. clientId ensures no duplicates.",
      steps: SCENARIO_OFFLINE_QUEUE,
    },
  ],
};
