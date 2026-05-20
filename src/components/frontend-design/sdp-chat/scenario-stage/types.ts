// Bespoke "live chat" scenario stage.
//
// Instead of an abstract architecture diagram + caption panel, the stage
// renders an actual mocked chat client (StatusBar, MessageList,
// MessageBubble, ComposeBar — all inside a ChatPane frame with state
// badges). A WebSocket wire runs above the ChatPane. Scenarios are
// scripted as a sequence of *scenes* — each scene is a complete snapshot
// of what the UI shows + what data packets are flying between
// components. The component diffs the previous scene against the
// current one and animates the changes (badges flash, icons morph,
// messages slide in, chips arc between components).

export type ConnectionState = "connected" | "connecting" | "disconnected";

export type StatusBarIndicator = "connected" | "warn" | "disconnected";

export type WsActivity =
  | "idle"
  | "transmitting-up"   // chatpane → ws (outbound)
  | "transmitting-down" // ws → chatpane (inbound)
  | "disconnected"
  | "reconnecting";

export type MessageStatus = "sending" | "sent" | "queued" | "failed";

export type SceneMessage = {
  id: string;
  author: "you" | "alice" | "bob";
  text: string;
  time: string;
  status?: MessageStatus;
};

export type ChatPaneSnapshot = {
  messageCount: number;
  pendingQueue: string[];
  connection: ConnectionState;
  /** A human-readable status word, displayed in the state badges. */
  mode: "idle" | "sending" | "syncing" | "reconnecting" | "queueing";
};

/** Logical anchor points on the stage; FlyingChip routes between these.
 *
 * `network` is the outermost layer (server side, the world beyond the
 * client). `ws` is the WebSocket boundary line — the literal transport
 * separator. Below that, `chatpane` is the React-root component holding
 * all UI; everything else is nested inside it. */
export type StageAnchor =
  | "network"
  | "ws"
  | "chatpane"
  | "statusbar"
  | "messagelist"
  | "messagebubble"
  | "composebar";

export type FlyingChipKind = "callback" | "frame" | "ack" | "render";

export type FlyingChip = {
  id: string;
  /** Compact label shown on the chip (e.g. "sendMessage", "WebSocketFrame"). */
  label: string;
  /** Category — drives chip colour. */
  kind: FlyingChipKind;
  from: StageAnchor;
  to: StageAnchor;
  /** Optional weight (KB) shown after the label. */
  weightKB?: number;
};

export type SceneState = {
  // ComposeBar
  composeText: string;
  composeFocused: boolean;
  sendButtonGlow: boolean;

  // MessageList
  messages: SceneMessage[];
  /** Bubble that is currently in the spotlight (e.g. the one being sent). */
  activeMessageId: string | null;
  typingUsers: string[];

  // ChatPane state badges
  chatpane: ChatPaneSnapshot;

  // StatusBar
  status: StatusBarIndicator;

  // WebSocket wire
  ws: WsActivity;

  // Active data packets in flight during this scene
  flyingChips: FlyingChip[];
};

export type Scene = {
  id: string;
  /** Short narrative shown as the subtitle while this scene is active. */
  caption: string;
  state: SceneState;
};

export type Scenario = {
  id: string;
  /** Tab label. */
  label: string;
  /** Short blurb shown under the tabs. */
  blurb: string;
  scenes: Scene[];
  /** Optional counterfactual scene list (e.g. "blocking send") for split mode. */
  scenesWithoutSplit?: Scene[];
};

export type ChatScenarioStageProps = {
  scenarios: Scenario[];
  /** Initial scenario index (default 0). */
  initialScenarioIdx?: number;
};
