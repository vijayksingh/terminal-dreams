"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type {
  ChatPaneSnapshot,
  SceneMessage,
  StatusBarIndicator,
  WsActivity,
} from "./types";
import type { InspectorSection } from "./derive-state";
import { StateInspector } from "./StateInspector";
import styles from "./stage.module.css";

// ── Component arm ─────────────────────────────────────────────────
//
// The horizontal wire branching off the ChatPane rail to each child.
// Shows: junction dot on the rail, a horizontal wire to the pill, and
// a label above the wire (the prop or event flowing on this wire).
// When the matching chip fires (or the relevant prop changes), the arm
// lights up — events have a *persistent visible wire* instead of just
// fleeting chips.

export type ArmKind = "prop" | "event";

function ComponentArm({
  label,
  kind,
  active,
}: {
  label?: string;
  kind?: ArmKind;
  active?: boolean;
}) {
  return (
    <div className={styles.componentArm} data-active={active ? "true" : undefined}>
      <div className={styles.componentArmDot} />
      <div className={styles.componentArmWire}>
        {/* When the arm activates, a bright "data packet" dot zooms along
         * the wire from junction to pill — sells the "signal arrived"
         * moment more strongly than a static color change. */}
        <AnimatePresence>
          {active && (
            <motion.span
              key="wire-pulse"
              className={styles.componentArmPulse}
              aria-hidden
              initial={{ left: "0%", opacity: 0, scale: 0.4 }}
              animate={{
                left: ["0%", "100%"],
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1, 1, 0.6],
              }}
              transition={{
                duration: 0.65,
                times: [0, 0.2, 0.85, 1],
                ease: "easeOut",
              }}
            />
          )}
        </AnimatePresence>
        {label && (
          <span className={styles.componentArmLabel}>
            {kind && (
              <span className={styles.componentArmKind} data-kind={kind}>
                {kind}
              </span>
            )}
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Network region (outermost architectural layer) ──────────────────
//
// The server side / "the world beyond the client". The client's only
// view of this is through the WebSocket boundary, which is drawn as
// the bottom edge of this region. Frames that go *up* from ChatPane
// must cross this boundary to land here; server-originated frames
// emerge from here and descend through the boundary.

export function NetworkRegion({
  wsActivity,
  reducedMotion,
  inspector,
  wsInspector,
  inspectorKey,
}: {
  wsActivity: WsActivity;
  reducedMotion: boolean;
  inspector?: InspectorSection[];
  wsInspector?: InspectorSection[];
  inspectorKey?: string;
}) {
  const isDisconnected =
    wsActivity === "disconnected" || wsActivity === "reconnecting";

  return (
    <div className={styles.network} data-port="network" data-state={wsActivity}>
      <header className={styles.networkHeader}>
        <span className={styles.networkEyebrow}>NETWORK · server</span>
        <span className={styles.networkRegion}>
          <span className={styles.networkRegionDot} aria-hidden />
          us-east-1
        </span>
      </header>
      <div className={styles.networkBody}>
        {inspector ? (
          <StateInspector
            sections={inspector}
            flashKey={`net-${inspectorKey ?? "0"}`}
            reducedMotion={reducedMotion}
            accent="network"
          />
        ) : (
          <>
            <div className={styles.serverCard}>
              <span className={styles.serverIcon} aria-hidden>
                ◈
              </span>
              <span className={styles.serverLabel}>
                <span className={styles.serverName}>ws.chat.app</span>
                <span className={styles.serverSub}>
                  {isDisconnected ? "unreachable" : "message broker · ACKs · fan-out"}
                </span>
              </span>
              <span className={styles.serverPort}>:443</span>
            </div>
            <div className={styles.networkStat}>
              <span className={styles.networkStatLabel}>clients</span>
              <span className={styles.networkStatValue}>
                {isDisconnected ? "—" : "1,247"}
              </span>
            </div>
            <div className={styles.networkStat}>
              <span className={styles.networkStatLabel}>uptime</span>
              <span className={styles.networkStatValue}>99.97%</span>
            </div>
          </>
        )}
      </div>
      {/* WebSocket boundary — the bottom edge of the Network region.
       * Conceptually this is the literal client/server transport line.
       * Chips crossing it pulse along the wire. */}
      <WebSocketWire
        activity={wsActivity}
        reducedMotion={reducedMotion}
        embedded
        inspector={wsInspector}
        inspectorKey={inspectorKey}
      />
    </div>
  );
}

// ── WebSocket wire ─────────────────────────────────────────────────
//
// A horizontal "wire" — the explicit boundary between Network and
// Client. Pulses when frames cross; goes red-dashed when disconnected.

export function WebSocketWire({
  activity,
  reducedMotion,
  embedded = false,
  inspector,
  inspectorKey,
}: {
  activity: WsActivity;
  reducedMotion: boolean;
  /** When embedded inside NetworkRegion, the wire forms the bottom edge
   *  of that container (no outer border, snug spacing). When standalone,
   *  it renders as a freestanding card. */
  embedded?: boolean;
  inspector?: InspectorSection[];
  inspectorKey?: string;
}) {
  const isDisconnected =
    activity === "disconnected" || activity === "reconnecting";
  const isTransmitting =
    activity === "transmitting-up" || activity === "transmitting-down";

  return (
    <div
      className={styles.wsWire}
      data-state={activity}
      data-embedded={embedded ? "true" : undefined}
      data-port="ws"
    >
      <div className={styles.wsLabel}>
        <span className={styles.wsCaret}>↕</span>
        <span>WebSocket</span>
        <span className={styles.wsSub}>
          {isDisconnected
            ? activity === "reconnecting"
              ? "reconnecting…"
              : "disconnected"
            : "bidirectional · frames · heartbeat"}
        </span>
      </div>
      {inspector ? (
        <StateInspector
          sections={inspector}
          flashKey={`ws-${inspectorKey ?? "0"}`}
          reducedMotion={reducedMotion}
          accent="network"
        />
      ) : (
        <div className={styles.wsTrack} aria-hidden>
          <div className={styles.wsTrackLine} data-state={activity} />
          {isTransmitting && !reducedMotion && (
            <motion.div
              key={activity}
              className={styles.wsTrackPulse}
              initial={{ x: activity === "transmitting-up" ? "-100%" : "100%", opacity: 0 }}
              animate={{ x: activity === "transmitting-up" ? "100%" : "-100%", opacity: [0, 1, 0] }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── ChatPane container with state badges ───────────────────────────

export function ChatPaneFrame({
  snapshot,
  prevSnapshot,
  reducedMotion,
  inspector,
  inspectorKey,
  children,
}: {
  snapshot: ChatPaneSnapshot;
  prevSnapshot?: ChatPaneSnapshot;
  reducedMotion: boolean;
  inspector?: InspectorSection[];
  inspectorKey?: string;
  children: React.ReactNode;
}) {
  const flashKey = `${snapshot.messageCount}-${snapshot.pendingQueue.join(",")}-${snapshot.mode}`;
  const messageCountChanged =
    prevSnapshot && prevSnapshot.messageCount !== snapshot.messageCount;
  const pendingChanged =
    prevSnapshot &&
    prevSnapshot.pendingQueue.join(",") !== snapshot.pendingQueue.join(",");
  const modeChanged = prevSnapshot && prevSnapshot.mode !== snapshot.mode;

  return (
    <div className={styles.chatpane}>
      <header className={styles.chatpaneHeader} data-port="chatpane">
        <span className={styles.chatpaneEyebrow}>ChatPane · state owner</span>
        {inspector ? (
          <StateInspector
            sections={inspector}
            flashKey={`cp-${inspectorKey ?? "0"}`}
            reducedMotion={reducedMotion}
          />
        ) : (
          <div className={styles.chatpaneBadges}>
            <StateBadge
              label="messages"
              value={snapshot.messageCount.toString()}
              flash={!!messageCountChanged}
              flashKey={`mc-${flashKey}`}
              reducedMotion={reducedMotion}
              accent="primary"
            />
            <StateBadge
              label="pendingQ"
              value={
                snapshot.pendingQueue.length === 0
                  ? "[]"
                  : `[${snapshot.pendingQueue.length}]`
              }
              flash={!!pendingChanged}
              flashKey={`pq-${flashKey}`}
              reducedMotion={reducedMotion}
              accent={snapshot.pendingQueue.length > 0 ? "warn" : "muted"}
            />
            <StateBadge
              label="status"
              value={snapshot.mode}
              flash={!!modeChanged}
              flashKey={`md-${flashKey}`}
              reducedMotion={reducedMotion}
              accent={
                snapshot.mode === "sending" ||
                snapshot.mode === "syncing" ||
                snapshot.mode === "queueing"
                  ? "warn"
                  : snapshot.mode === "reconnecting"
                    ? "danger"
                    : "muted"
              }
            />
          </div>
        )}
      </header>
      <div className={styles.chatpaneBody}>{children}</div>
    </div>
  );
}

function StateBadge({
  label,
  value,
  flash,
  flashKey,
  reducedMotion,
  accent,
}: {
  label: string;
  value: string;
  flash: boolean;
  flashKey: string;
  reducedMotion: boolean;
  accent: "primary" | "warn" | "danger" | "muted";
}) {
  return (
    <div className={styles.stateBadge} data-accent={accent}>
      <span className={styles.stateBadgeLabel}>{label}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${flashKey}-${value}`}
          className={styles.stateBadgeValue}
          initial={reducedMotion ? false : { opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
      {flash && !reducedMotion && (
        <motion.span
          key={flashKey + "-flash"}
          aria-hidden
          className={styles.stateBadgeFlash}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

// ── StatusBar (inside chat client) ────────────────────────────────

export function StatusBar({
  indicator,
  reducedMotion,
  inspector,
  inspectorKey,
  armActive,
}: {
  indicator: StatusBarIndicator;
  reducedMotion: boolean;
  inspector?: InspectorSection[];
  inspectorKey?: string;
  armActive?: boolean;
}) {
  const label =
    indicator === "connected"
      ? "Connected"
      : indicator === "warn"
        ? "Disconnected — retrying"
        : "Offline";

  return (
    <div className={styles.componentWrap} data-component="StatusBar">
      <ComponentArm label="connection" kind="prop" active={armActive} />
      <span className={styles.componentTag}>
        <span className={styles.componentTagBracket}>{"<"}</span>
        StatusBar
        <span className={styles.componentTagBracket}>{"/>"}</span>
      </span>
      {inspector ? (
        <div data-port="statusbar">
          <StateInspector
            sections={inspector}
            flashKey={`sb-${inspectorKey ?? "0"}`}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : (
        <div className={styles.statusBar} data-state={indicator} data-port="statusbar">
          <span className={styles.statusDot} aria-hidden>
            {!reducedMotion && indicator !== "connected" && (
              <motion.span
                className={styles.statusDotRing}
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity }}
              />
            )}
          </span>
          <span className={styles.statusLabel}>{label}</span>
        </div>
      )}
    </div>
  );
}

// ── MessageList + MessageBubble ───────────────────────────────────

export function MessageList({
  messages,
  activeMessageId,
  typingUsers,
  reducedMotion,
  inspector,
  bubbleInspector,
  inspectorKey,
  armActive,
}: {
  messages: SceneMessage[];
  activeMessageId: string | null;
  typingUsers: string[];
  reducedMotion: boolean;
  inspector?: InspectorSection[];
  /** Inspector for the active MessageBubble — rendered in-place when present. */
  bubbleInspector?: InspectorSection[];
  inspectorKey?: string;
  armActive?: boolean;
}) {
  if (inspector) {
    return (
      <div className={styles.componentWrap} data-component="MessageList">
        <ComponentArm label="messages[]" kind="prop" active={armActive} />
        <span className={styles.componentTag}>
          <span className={styles.componentTagBracket}>{"<"}</span>
          MessageList
          <span className={styles.componentTagBracket}>{"/>"}</span>
        </span>
        <div data-port="messagelist">
          <StateInspector
            sections={inspector}
            flashKey={`ml-${inspectorKey ?? "0"}`}
            reducedMotion={reducedMotion}
          />
        </div>
        {/* Active MessageBubble's inspector renders below MessageList's,
         * since the bubble is structurally a child. */}
        {bubbleInspector && (
          <div
            className={styles.componentWrap}
            data-component="MessageBubble"
            style={{ marginTop: 8 }}
          >
            <ComponentArm label="status" kind="prop" />
            <span className={styles.componentTag}>
              <span className={styles.componentTagBracket}>{"<"}</span>
              MessageBubble
              <span className={styles.componentTagBracket}>{"/>"}</span>
            </span>
            <div data-port="messagebubble">
              <StateInspector
                sections={bubbleInspector}
                flashKey={`mb-${inspectorKey ?? "0"}`}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.componentWrap} data-component="MessageList">
      <ComponentArm label="messages[]" kind="prop" active={armActive} />
      <span className={styles.componentTag}>
        <span className={styles.componentTagBracket}>{"<"}</span>
        MessageList
        <span className={styles.componentTagBracket}>{"/>"}</span>
      </span>
      <div className={styles.messageList} data-port="messagelist">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              active={m.id === activeMessageId}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            key={typingUsers.join(",")}
            className={styles.typingRow}
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            <span className={styles.typingAuthor}>
              {typingUsers.map((u) => u[0].toUpperCase() + u.slice(1)).join(", ")}
            </span>
            <span className={styles.typingDots} aria-hidden>
              <span /> <span /> <span />
            </span>
            <span className={styles.typingText}>typing…</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  active,
  reducedMotion,
}: {
  message: SceneMessage;
  active: boolean;
  reducedMotion: boolean;
}) {
  const isYou = message.author === "you";
  return (
    <motion.div
      layout
      className={styles.messageRow}
      data-author={message.author}
      data-active={active ? "true" : undefined}
      data-port={active ? "messagebubble" : undefined}
      initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
    >
      <span className={styles.messageAuthor}>
        {isYou ? "You" : message.author[0].toUpperCase() + message.author.slice(1)}
      </span>
      <span className={styles.messageTime}>{message.time}</span>
      <span className={styles.messageText}>{message.text}</span>
      {message.status && (
        <MessageStatusIcon status={message.status} reducedMotion={reducedMotion} />
      )}
      {active && (
        <span className={styles.messageBubbleTag} aria-hidden>
          <span className={styles.componentTagBracket}>{"<"}</span>
          MessageBubble
          <span className={styles.componentTagBracket}>{"/>"}</span>
        </span>
      )}
    </motion.div>
  );
}

function MessageStatusIcon({
  status,
  reducedMotion,
}: {
  status: SceneMessage["status"];
  reducedMotion: boolean;
}) {
  // Cross-fade between status icons. The key change drives AnimatePresence.
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        className={styles.messageStatus}
        data-status={status}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.6, rotate: -15 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 15 }}
        transition={reducedMotion ? { duration: 0 } : { ...SPRING.snappy }}
      >
        {status === "sending" ? (
          <motion.span
            aria-label="sending"
            className={styles.messageStatusSpinner}
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 1.2, ease: "linear", repeat: Infinity }
            }
          >
            ◓
          </motion.span>
        ) : status === "sent" ? (
          <span aria-label="sent">✓</span>
        ) : status === "queued" ? (
          <span aria-label="queued">⏱</span>
        ) : (
          <span aria-label="failed">!</span>
        )}
      </motion.span>
    </AnimatePresence>
  );
}

// ── ComposeBar ────────────────────────────────────────────────────

export function ComposeBar({
  text,
  focused,
  buttonGlow,
  reducedMotion,
  inspector,
  inspectorKey,
  armActive,
}: {
  text: string;
  focused: boolean;
  buttonGlow: boolean;
  reducedMotion: boolean;
  inspector?: InspectorSection[];
  inspectorKey?: string;
  armActive?: boolean;
}) {
  if (inspector) {
    return (
      <div className={styles.componentWrap} data-component="ComposeBar">
        <ComponentArm label="onSend()" kind="event" active={armActive} />
        <span className={styles.componentTag}>
          <span className={styles.componentTagBracket}>{"<"}</span>
          ComposeBar
          <span className={styles.componentTagBracket}>{"/>"}</span>
        </span>
        <div data-port="composebar">
          <StateInspector
            sections={inspector}
            flashKey={`cb-${inspectorKey ?? "0"}`}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.componentWrap} data-component="ComposeBar">
      <ComponentArm label="onSend()" kind="event" active={armActive} />
      <span className={styles.componentTag}>
        <span className={styles.componentTagBracket}>{"<"}</span>
        ComposeBar
        <span className={styles.componentTagBracket}>{"/>"}</span>
      </span>
      <div
        className={styles.composeBar}
        data-focused={focused ? "true" : undefined}
        data-port="composebar"
      >
        <div className={styles.composeInput}>
          <AnimatePresence mode="wait">
            <motion.span
              key={text || "empty"}
              className={styles.composeText}
              data-empty={!text ? "true" : undefined}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.18 }}
            >
              {text || "type a message…"}
            </motion.span>
          </AnimatePresence>
          {focused && !reducedMotion && (
            <motion.span
              aria-hidden
              className={styles.composeCaret}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.0, ease: "linear", repeat: Infinity }}
            />
          )}
        </div>
        <button
          type="button"
          className={styles.composeSend}
          data-glow={buttonGlow ? "true" : undefined}
          tabIndex={-1}
          aria-hidden
        >
          Send
        </button>
      </div>
    </div>
  );
}
