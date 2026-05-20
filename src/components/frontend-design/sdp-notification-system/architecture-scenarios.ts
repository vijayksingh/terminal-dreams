import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "app-ui",
    label: "App UI",
    sublabel: "toast container · notification bell · badge count",
    x: 140,
    y: 6,
    w: 200,
    h: 28,
  },
  {
    id: "notification-manager",
    label: "NotificationManager",
    sublabel: "create · schedule · route",
    x: 40,
    y: 52,
    w: 180,
    h: 22,
  },
  {
    id: "toast-queue",
    label: "Toast Queue",
    sublabel: "priority heap · max-visible · auto-dismiss",
    x: 260,
    y: 52,
    w: 180,
    h: 22,
  },
  {
    id: "sw",
    label: "Service Worker",
    sublabel: "push handler · click handler · badge API",
    x: 40,
    y: 100,
    w: 180,
    h: 24,
  },
  {
    id: "push-server",
    label: "Push Server",
    sublabel: "subscription store · send endpoint · VAPID",
    x: 140,
    y: 146,
    w: 200,
    h: 24,
  },
  {
    id: "notification-center",
    label: "Notification Center",
    sublabel: "inbox · read/unread · grouping",
    x: 260,
    y: 100,
    w: 180,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "app-ui", to: "notification-manager", verb: "creates notification" },
  { from: "notification-manager", to: "toast-queue", verb: "enqueues" },
  { from: "toast-queue", to: "app-ui", verb: "renders visible toasts" },
  { from: "notification-manager", to: "notification-center", verb: "persists" },
  { from: "sw", to: "notification-manager", verb: "push received" },
  { from: "push-server", to: "sw", verb: "push message", dashed: true },
];

// ── Type definitions ──────────────────────────────────────────────

const TYPES: ArchTypeDef[] = [
  {
    name: "NotificationPayload",
    kind: "API payload",
    fields: [
      { name: "title", type: "string" },
      { name: "body", type: "string" },
      { name: "priority", type: "'info'|'warning'|'error'|'critical'" },
      { name: "type", type: "'toast'|'push'|'in-app'|'badge'" },
      { name: "groupId", type: "string?" },
      { name: "actions", type: "Action[]" },
      { name: "ttl", type: "number" },
      { name: "icon", type: "string?" },
    ],
  },
  {
    name: "PushSubscription",
    kind: "API response",
    fields: [
      { name: "endpoint", type: "string" },
      { name: "keys.p256dh", type: "string" },
      { name: "keys.auth", type: "string" },
      { name: "expirationTime", type: "number?" },
      { name: "userId", type: "string" },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const priorityQueueScenario: ArchStep[] = [
  {
    nodeId: "app-ui",
    caption: "High-priority notification arrives when the toast queue is already full (3 visible toasts)",
  },
  {
    nodeId: "notification-manager",
    caption: "NotificationManager creates the notification and assigns priority weight: critical=3, error=2, warning=1, info=0",
    payload: { type: TYPES[0] as ArchTypeDef, sample: ['{ title: "Server Down",', '  priority: "critical",', '  type: "toast" }'] },
  },
  {
    nodeId: "toast-queue",
    caption: "Toast Queue re-sorts by priority — the critical toast jumps ahead of all info/warning toasts in the queue",
    stateAfter: [{ key: "queueLength", value: "4" }, { key: "bumped", value: "info toast #1" }],
  },
  {
    nodeId: "app-ui",
    caption: "Lowest-priority visible toast is dismissed to make room — critical toast appears immediately at the top of the stack",
    stateAfter: [{ key: "visible", value: "3" }, { key: "topPriority", value: "critical" }],
  },
  {
    nodeId: "notification-center",
    caption: "All notifications (including the bumped one) persist in the notification center — nothing is lost",
  },
];

const pushFlowScenario: ArchStep[] = [
  {
    nodeId: "push-server",
    caption: "Push server sends an encrypted payload to the browser's push service endpoint via VAPID-authenticated request",
    payload: { type: TYPES[1] as ArchTypeDef, sample: ['{ endpoint: "https://fcm...",', '  keys: { p256dh, auth } }'] },
  },
  {
    nodeId: "sw",
    caption: "Service Worker wakes up on push event — decrypts payload, creates a Notification via showNotification()",
    stateAfter: [{ key: "event", value: "push" }, { key: "swState", value: "active" }],
  },
  {
    nodeId: "notification-manager",
    caption: "Click handler fires notificationclick event — SW posts message to client, NotificationManager routes to app",
    stateAfter: [{ key: "action", value: "notificationclick" }, { key: "deepLink", value: "/messages/42" }],
  },
  {
    nodeId: "app-ui",
    caption: "App opens with deep link — navigates to the relevant view and displays the notification content inline",
  },
];

const spamProtectionScenario: ArchStep[] = [
  {
    nodeId: "app-ui",
    caption: "Rapid-fire: 10 notifications arrive in under 1 second — without protection, UI is overwhelmed",
  },
  {
    nodeId: "notification-manager",
    caption: "Rate limiter detects burst — throttle threshold exceeded (max 3/second). Remaining notifications are held",
    stateAfter: [{ key: "throttled", value: "7" }, { key: "allowed", value: "3" }],
  },
  {
    nodeId: "toast-queue",
    caption: "Held notifications are batched by groupId — similar notifications collapse into a single group entry",
    stateAfter: [{ key: "groups", value: "2" }, { key: "collapsed", value: "7 → 2" }],
  },
  {
    nodeId: "app-ui",
    caption: "User sees a summary toast: '5 new messages from Alice' instead of 5 separate toasts — clean and scannable",
  },
  {
    nodeId: "notification-center",
    caption: "Full notification list is available in the center — user can expand groups to see every individual notification",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const NOTIFICATION_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "A notification system separates creation from display — a NotificationManager routes to a priority-sorted toast queue for transient alerts, a persistent notification center for inbox-style history, and a Service Worker for push delivery when the app is in the background.",
  viewBox: "0 0 480 178",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "priority-queue",
      label: "Priority queue",
      blurb: "High-priority notification arrives when queue is full — bumps lowest priority toast, inserts ahead in queue",
      steps: priorityQueueScenario,
    },
    {
      id: "push-flow",
      label: "Push end-to-end",
      blurb: "Push notification end-to-end: server sends, SW receives, click handler opens app with deep link",
      steps: pushFlowScenario,
    },
    {
      id: "spam-protection",
      label: "Spam protection",
      blurb: "Rate limiting: rapid-fire notifications trigger throttle, batch into group, single summary toast",
      steps: spamProtectionScenario,
    },
  ],
};
