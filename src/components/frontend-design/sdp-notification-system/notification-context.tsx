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

export type Priority = "info" | "warning" | "error" | "critical";

export type NotificationType = "toast" | "push" | "in-app" | "badge";

export type ToastEntry = {
  id: string;
  title: string;
  message: string;
  priority: Priority;
  type: NotificationType;
  createdAt: number;
  expiresAt: number;
  read: boolean;
  dismissed: boolean;
  groupId?: string;
};

export type PermissionState = "default" | "prompt" | "granted" | "denied";

export type QueueMetrics = {
  totalQueued: number;
  visible: number;
  pending: number;
  dismissed: number;
  highPriority: number;
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

export const MAX_VISIBLE_TOASTS = 3;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "toastQueue", label: "Toast queue management?", description: "FIFO queue with max-visible limit, auto-dismiss timers, stacking" },
  { id: "priorityOrdering", label: "Priority-based ordering?", description: "Critical > error > warning > info — high priority bumps lower items" },
  { id: "pushApi", label: "Push API integration?", description: "Service Worker registration, VAPID keys, push subscription management" },
  { id: "notificationCenter", label: "Notification center (persistent)?", description: "Inbox-style panel with read/unread state, filtering, bulk actions" },
  { id: "grouping", label: "Notification grouping?", description: "Collapse similar notifications into summary groups with expand/collapse" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/notifications/send",
    description: "Create and dispatch a new notification to the queue",
    usedBy: "NotificationManager → ToastQueue",
    params: [
      { name: "title", type: "string", note: "notification headline" },
      { name: "body", type: "string", note: "notification body text" },
      { name: "priority", type: "Priority", note: "info | warning | error | critical" },
      { name: "type", type: "NotificationType", note: "toast | push | in-app | badge" },
    ],
    responseType: "{ id: string, queued: boolean }",
  },
  {
    method: "GET",
    path: "/notifications/list",
    description: "Fetch all notifications with optional filters",
    usedBy: "NotificationCenter → UI",
    params: [
      { name: "status", type: "'read'|'unread'|'all'", note: "filter by read state" },
      { name: "limit", type: "number?", note: "max results to return" },
    ],
    responseType: "{ notifications: Notification[], total: number }",
  },
  {
    method: "PUT",
    path: "/notifications/:id/read",
    description: "Mark a single notification as read",
    usedBy: "NotificationCenter → Server",
    params: [
      { name: "id", type: "string", note: "notification identifier" },
    ],
    responseType: "{ success: boolean, readAt: number }",
  },
  {
    method: "DELETE",
    path: "/notifications/:id",
    description: "Remove a notification from the center and queue",
    usedBy: "NotificationCenter → Server",
    params: [
      { name: "id", type: "string", note: "notification identifier" },
    ],
    responseType: "{ deleted: boolean }",
  },
  {
    method: "POST",
    path: "/push/subscribe",
    description: "Register a push subscription with the server",
    usedBy: "Client → Push Server",
    params: [
      { name: "subscription", type: "PushSubscription", note: "browser push subscription object" },
      { name: "userId", type: "string", note: "authenticated user ID" },
    ],
    responseType: "{ subscribed: boolean, endpoint: string }",
  },
  {
    method: "GET",
    path: "/notifications/preferences",
    description: "Fetch user notification preference settings",
    usedBy: "PreferencesPanel → Server",
    params: [
      { name: "userId", type: "string", note: "authenticated user ID" },
    ],
    responseType: "{ preferences: NotificationPreference }",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "Notification",
    category: "state",
    fields: [
      { name: "id", type: "string", note: "unique notification ID" },
      { name: "title", type: "string", note: "headline text" },
      { name: "body", type: "string", note: "body content" },
      { name: "priority", type: "Priority", note: "info | warning | error | critical" },
      { name: "type", type: "NotificationType", note: "delivery channel" },
      { name: "createdAt", type: "number", note: "ms since epoch" },
      { name: "read", type: "boolean" },
      { name: "groupId", type: "string?", note: "grouping key" },
    ],
  },
  {
    name: "PushSubscription",
    category: "api",
    fields: [
      { name: "endpoint", type: "string", note: "push service URL" },
      { name: "keys.p256dh", type: "string", note: "encryption key" },
      { name: "keys.auth", type: "string", note: "auth secret" },
      { name: "expirationTime", type: "number?", note: "subscription TTL" },
    ],
  },
  {
    name: "NotificationPreference",
    category: "props",
    fields: [
      { name: "enabled", type: "boolean", note: "master toggle" },
      { name: "categories", type: "Record<string, boolean>", note: "per-category toggles" },
      { name: "quietHoursStart", type: "number?", note: "hour (0-23)" },
      { name: "quietHoursEnd", type: "number?", note: "hour (0-23)" },
    ],
  },
  {
    name: "ToastQueueState",
    category: "state",
    fields: [
      { name: "visible", type: "ToastEntry[]", note: "currently displayed toasts" },
      { name: "pending", type: "ToastEntry[]", note: "waiting in queue" },
      { name: "maxVisible", type: "number", note: "display limit" },
      { name: "totalDismissed", type: "number" },
    ],
  },
];

// ── Context ─────────────────────────────────────────────────────────

type NotificationContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  // Toast queue
  toastQueue: ToastEntry[];
  addToast: (entry: Omit<ToastEntry, "id" | "createdAt" | "expiresAt" | "read" | "dismissed">) => void;
  dismissToast: (id: string) => void;
  clearQueue: () => void;
  visibleToasts: ToastEntry[];
  // Max visible
  maxVisible: number;
  setMaxVisible: (n: number) => void;
  // Permission
  permissionState: PermissionState;
  setPermissionState: (s: PermissionState) => void;
  // Notification center
  notificationCenter: ToastEntry[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  // Metrics
  totalSent: number;
  totalDismissed: number;
  highPriorityCount: number;
  // Step completion
  stepCompleted: Record<number, boolean>;
  markStepComplete: (step: number) => void;
  // State inspector
  stateEntries: StateEntry[];
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

// ── Priority weight for sorting ──────────────────────────────────────

const PRIORITY_WEIGHT: Record<Priority, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

// ── Provider ────────────────────────────────────────────────────────

let toastIdCounter = 0;

export function NotificationProvider({
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

  // Toast queue
  const [toastQueue, setToastQueue] = useState<ToastEntry[]>([]);
  const [maxVisible, setMaxVisible] = useState(MAX_VISIBLE_TOASTS);
  const [totalSent, setTotalSent] = useState(0);
  const [totalDismissed, setTotalDismissed] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);

  const addToast = useCallback((entry: Omit<ToastEntry, "id" | "createdAt" | "expiresAt" | "read" | "dismissed">) => {
    const now = Date.now();
    const newEntry: ToastEntry = {
      ...entry,
      id: `toast-${++toastIdCounter}`,
      createdAt: now,
      expiresAt: now + 10000,
      read: false,
      dismissed: false,
    };
    setToastQueue(prev => {
      const active = prev.filter(t => !t.dismissed);
      const sorted = [...active, newEntry].sort(
        (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.createdAt - b.createdAt
      );
      return sorted;
    });
    setTotalSent(c => c + 1);
    if (entry.priority === "error" || entry.priority === "critical") {
      setHighPriorityCount(c => c + 1);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastQueue(prev => prev.map(t => t.id === id ? { ...t, dismissed: true } : t));
    setTotalDismissed(c => c + 1);
  }, []);

  const clearQueue = useCallback(() => {
    setToastQueue([]);
  }, []);

  // Visible toasts — top N non-dismissed, priority-sorted
  const visibleToasts = useMemo(() => {
    return toastQueue.filter(t => !t.dismissed).slice(0, maxVisible);
  }, [toastQueue, maxVisible]);

  // Permission
  const [permissionState, setPermissionState] = useState<PermissionState>("default");

  // Notification center (persistent list)
  const [notificationCenter, setNotificationCenter] = useState<ToastEntry[]>([]);

  // Sync toasts to notification center
  const addToNotificationCenter = useCallback((entry: ToastEntry) => {
    setNotificationCenter(prev => {
      if (prev.some(n => n.id === entry.id)) return prev;
      return [entry, ...prev];
    });
  }, []);

  // Wrap addToast to also add to notification center
  const addToastAndCenter = useCallback((entry: Omit<ToastEntry, "id" | "createdAt" | "expiresAt" | "read" | "dismissed">) => {
    const now = Date.now();
    const newEntry: ToastEntry = {
      ...entry,
      id: `toast-${++toastIdCounter}`,
      createdAt: now,
      expiresAt: now + 10000,
      read: false,
      dismissed: false,
    };
    setToastQueue(prev => {
      const active = prev.filter(t => !t.dismissed);
      const sorted = [...active, newEntry].sort(
        (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.createdAt - b.createdAt
      );
      return sorted;
    });
    setTotalSent(c => c + 1);
    if (newEntry.priority === "error" || newEntry.priority === "critical") {
      setHighPriorityCount(c => c + 1);
    }
    addToNotificationCenter(newEntry);
  }, [addToNotificationCenter]);

  const markRead = useCallback((id: string) => {
    setNotificationCenter(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotificationCenter(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Step completion
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const markStepComplete = useCallback((step: number) => {
    setStepCompleted(prev => prev[step] ? prev : { ...prev, [step]: true });
  }, []);

  // State inspector entries
  const pendingCount = toastQueue.filter(t => !t.dismissed).length - visibleToasts.length;
  const unreadCount = notificationCenter.filter(n => !n.read).length;

  const stateEntries = useMemo<StateEntry[]>(() => [
    { label: "queueSize", value: toastQueue.filter(t => !t.dismissed).length, highlight: toastQueue.filter(t => !t.dismissed).length > maxVisible },
    { label: "visible", value: visibleToasts.length },
    { label: "pending", value: Math.max(0, pendingCount), highlight: pendingCount > 0 },
    { label: "maxVisible", value: maxVisible },
    { label: "permission", value: permissionState, highlight: permissionState === "denied" },
    { label: "unread", value: unreadCount, highlight: unreadCount > 0 },
    { label: "totalSent", value: totalSent },
    { label: "dismissed", value: totalDismissed },
    { label: "highPriority", value: highPriorityCount, highlight: highPriorityCount > 0 },
  ], [toastQueue, visibleToasts.length, pendingCount, maxVisible, permissionState, unreadCount, totalSent, totalDismissed, highPriorityCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      toastQueue,
      addToast: addToastAndCenter,
      dismissToast,
      clearQueue,
      visibleToasts,
      maxVisible,
      setMaxVisible,
      permissionState,
      setPermissionState,
      notificationCenter,
      markRead,
      markAllRead,
      totalSent,
      totalDismissed,
      highPriorityCount,
      stepCompleted,
      markStepComplete,
      stateEntries,
    }),
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      toastQueue,
      addToastAndCenter,
      dismissToast,
      clearQueue,
      visibleToasts,
      maxVisible,
      permissionState,
      notificationCenter,
      markRead,
      markAllRead,
      totalSent,
      totalDismissed,
      highPriorityCount,
      stepCompleted,
      markStepComplete,
      stateEntries,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
