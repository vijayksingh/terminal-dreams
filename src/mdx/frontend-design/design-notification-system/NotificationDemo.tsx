"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./NotificationDemo.module.css";

// ── Types ────────────────────────────────────────────────────────────

type NotificationPriority = 0 | 1 | 2; // 0=error, 1=warning, 2=info

type NotificationType = "error" | "warning" | "info";

interface QueuedNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: number;
}

interface VisibleToast extends QueuedNotification {
  timeRemainingMs: number;
  maxTimeMs: number;
  isPaused: boolean;
  isEntering: boolean;
  isExiting: boolean;
}

type PermissionState = "prompt" | "granted" | "denied";
type TabOption = "Toast Queue" | "Push Permission" | "Queue Inspector";

const TAB_OPTIONS = [
  "Toast Queue",
  "Push Permission",
  "Queue Inspector",
] as const;

const MAX_VISIBLE = 3;

const DURATIONS: Record<NotificationType, number> = {
  info: 5000,
  warning: 8000,
  error: Infinity, // manual dismiss only
};

const PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  error: 0,
  warning: 1,
  info: 2,
};

const MESSAGES: Record<NotificationType, string[]> = {
  info: [
    "Sync completed successfully",
    "New comment on your post",
    "Export finished",
    "Settings saved",
  ],
  warning: [
    "Storage nearly full (92%)",
    "API rate limit approaching",
    "Session expires in 5 minutes",
    "Deprecated endpoint in use",
  ],
  error: [
    "Payment processing failed",
    "Server connection lost",
    "Deploy failed: build error",
    "Database write rejected",
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `notif-${idCounter}`;
}

function createNotification(type: NotificationType): QueuedNotification {
  const msgs = MESSAGES[type];
  const message = msgs[Math.floor(Math.random() * msgs.length)];
  return {
    id: nextId(),
    type,
    priority: PRIORITY_MAP[type],
    title: `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
    message,
    createdAt: Date.now(),
  };
}

/** Insert into a priority-sorted array (lower number = higher priority) */
function insertSorted(
  queue: QueuedNotification[],
  item: QueuedNotification
): QueuedNotification[] {
  const next = [...queue];
  let insertIdx = next.length;
  for (let i = 0; i < next.length; i++) {
    if (item.priority < next[i].priority) {
      insertIdx = i;
      break;
    }
  }
  next.splice(insertIdx, 0, item);
  return next;
}

// ── Toast Component ──────────────────────────────────────────────────

function Toast({
  toast,
  onDismiss,
  onHoverChange,
}: {
  toast: VisibleToast;
  onDismiss: (id: string) => void;
  onHoverChange: (id: string, hovering: boolean) => void;
}) {
  const typeStyle =
    toast.type === "error"
      ? styles.toastError
      : toast.type === "warning"
        ? styles.toastWarning
        : styles.toastInfo;

  const timerBarStyle =
    toast.type === "error"
      ? styles.timerBarFillError
      : toast.type === "warning"
        ? styles.timerBarFillWarning
        : styles.timerBarFill;

  const pct =
    toast.maxTimeMs === Infinity
      ? 100
      : Math.max(0, (toast.timeRemainingMs / toast.maxTimeMs) * 100);

  const hoverClass = toast.isPaused ? ` ${styles.toastHovered}` : "";

  return (
    <div
      className={`${typeStyle}${hoverClass}`}
      role="alert"
      data-entering={toast.isEntering || undefined}
      data-exiting={toast.isExiting || undefined}
      onMouseEnter={() => onHoverChange(toast.id, true)}
      onMouseLeave={() => onHoverChange(toast.id, false)}
    >
      <div className={styles.toastHeader}>
        <p className={styles.toastTitle}>{toast.title}</p>
        <span className={styles.toastPriorityBadge}>
          P{toast.priority}
        </span>
      </div>
      <p className={styles.toastMessage}>{toast.message}</p>
      <button
        className={styles.toastDismiss}
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss ${toast.type} notification`}
      >
        x
      </button>
      <div className={styles.timerBarTrack}>
        <div
          className={`${timerBarStyle}${toast.isPaused ? ` ${styles.timerPaused}` : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Tab 1: Toast Queue ───────────────────────────────────────────────

function ToastQueueTab() {
  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const [visible, setVisible] = useState<VisibleToast[]>([]);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [shownCount, setShownCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enterTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Cleanup enter timers on unmount
  useEffect(() => {
    const timers = enterTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Promote from queue to visible
  useEffect(() => {
    if (visible.length < MAX_VISIBLE && queue.length > 0) {
      const next = queue[0];
      const newToast: VisibleToast = {
        ...next,
        timeRemainingMs: DURATIONS[next.type],
        maxTimeMs: DURATIONS[next.type],
        isPaused: false,
        isEntering: true,
        isExiting: false,
      };
      setQueue((q) => q.slice(1));
      setVisible((v) => [...v, newToast]);
      setShownCount((c) => c + 1);

      // Clear entering state after animation (with cleanup)
      const enterId = newToast.id;
      const enterTimer = setTimeout(() => {
        setVisible((v) =>
          v.map((t) => (t.id === enterId ? { ...t, isEntering: false } : t))
        );
        enterTimers.current.delete(enterId);
      }, 300);
      enterTimers.current.set(enterId, enterTimer);
    }
  }, [queue, visible.length]);

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisible((prev) => {
        const updated: VisibleToast[] = [];
        const toRemove: string[] = [];

        for (const t of prev) {
          if (t.isPaused || t.maxTimeMs === Infinity) {
            updated.push(t);
            continue;
          }
          const remaining = t.timeRemainingMs - 100;
          if (remaining <= 0) {
            toRemove.push(t.id);
          } else {
            updated.push({ ...t, timeRemainingMs: remaining });
          }
        }

        if (toRemove.length > 0) {
          // Start exit animation for expired toasts
          return prev.map((t) =>
            toRemove.includes(t.id) ? { ...t, isExiting: true } : t
          );
        }

        return updated;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle exit animation completion
  useEffect(() => {
    for (const t of visible) {
      if (t.isExiting && !exitTimers.current.has(t.id)) {
        const timer = setTimeout(() => {
          setVisible((v) => v.filter((vt) => vt.id !== t.id));
          setDismissedCount((c) => c + 1);
          exitTimers.current.delete(t.id);
        }, 250);
        exitTimers.current.set(t.id, timer);
      }
    }
  }, [visible]);

  // Cleanup exit timers on unmount
  useEffect(() => {
    const timers = exitTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const enqueue = useCallback((type: NotificationType) => {
    const notif = createNotification(type);
    setQueue((q) => insertSorted(q, notif));
  }, []);

  const dismiss = useCallback((id: string) => {
    setVisible((v) =>
      v.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    // Exit animation will handle removal
    if (!exitTimers.current.has(id)) {
      const timer = setTimeout(() => {
        setVisible((v) => v.filter((t) => t.id !== id));
        setDismissedCount((c) => c + 1);
        exitTimers.current.delete(id);
      }, 250);
      exitTimers.current.set(id, timer);
    }
  }, []);

  const handleHoverChange = useCallback((id: string, hovering: boolean) => {
    setVisible((v) =>
      v.map((t) => (t.id === id ? { ...t, isPaused: hovering } : t))
    );
  }, []);

  const spam = useCallback(() => {
    const types: NotificationType[] = [
      "info",
      "info",
      "info",
      "info",
      "warning",
      "warning",
      "warning",
      "error",
      "error",
      "info",
    ];
    let q = queue;
    for (const type of types) {
      q = insertSorted(q, createNotification(type));
    }
    setQueue(q);
  }, [queue]);

  const activeVisible = visible.filter((t) => !t.isExiting);

  // Escape key dismisses the most recent visible toast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible.length > 0) {
        const mostRecent = visible[visible.length - 1];
        if (!mostRecent.isExiting) {
          dismiss(mostRecent.id);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, dismiss]);

  return (
    <div className={styles.toastQueueLayout}>
      <div className={styles.controlPanel}>
        <button className={styles.spamBtn} onClick={spam} type="button">
          Spam 10 Notifications
        </button>
        <button
          className={styles.infoBtn}
          onClick={() => enqueue("info")}
          type="button"
        >
          Fire Info
        </button>
        <button
          className={styles.warningBtn}
          onClick={() => enqueue("warning")}
          type="button"
        >
          Fire Warning
        </button>
        <button
          className={styles.errorBtn}
          onClick={() => enqueue("error")}
          type="button"
        >
          Fire Error
        </button>

        <div className={styles.statsRow}>
          Shown: <span>{activeVisible.length}</span>
          <br />
          Queued: <span>{queue.length}</span>
          <br />
          Dismissed: <span>{dismissedCount}</span>
          <br />
          Total sent: <span>{shownCount + queue.length}</span>
        </div>
      </div>

      <div className={styles.toastArea}>
        <div
          className={styles.toastStack}
          aria-live="polite"
          tabIndex={0}
          role="region"
          aria-label="Notification toasts"
        >
          {visible.map((t) => (
            <Toast
              key={t.id}
              toast={t}
              onDismiss={dismiss}
              onHoverChange={handleHoverChange}
            />
          ))}
        </div>
        <div aria-live="polite">
          {queue.length > 0 && (
            <div className={styles.queuedBadge}>
              {queue.length} more queued
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Push Permission ───────────────────────────────────────────

function PushPermissionTab() {
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [testPushSent, setTestPushSent] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup push timer on unmount
  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  const handleAllow = useCallback(() => {
    setPermission("granted");
  }, []);

  const handleBlock = useCallback(() => {
    setPermission("denied");
  }, []);

  const handleTestPush = useCallback(() => {
    setTestPushSent(true);
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      setTestPushSent(false);
      pushTimerRef.current = null;
    }, 3000);
  }, []);

  const handleReset = useCallback(() => {
    setPermission("prompt");
    setTestPushSent(false);
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
  }, []);

  return (
    <div className={styles.permissionLayout}>
      {permission === "prompt" && (
        <div
          className={styles.permissionDialog}
          style={
            reducedMotion
              ? undefined
              : { animation: "toastFadeIn 0.3s ease-out" }
          }
        >
          <div className={styles.permissionIcon} aria-hidden="true">
            notifications
          </div>
          <p className={styles.permissionTitle}>
            terminal-dreams.dev wants to send notifications
          </p>
          <p className={styles.permissionSubtitle}>
            Notifications will appear even when you&apos;re not on this
            tab. You can change this later in browser settings.
          </p>
          <div className={styles.permissionActions}>
            <button
              className={styles.allowBtn}
              onClick={handleAllow}
              type="button"
            >
              Allow
            </button>
            <button
              className={styles.blockBtn}
              onClick={handleBlock}
              type="button"
            >
              Block
            </button>
          </div>
        </div>
      )}

      {permission === "granted" && (
        <>
          <div className={styles.permissionGranted}>
            <p className={styles.permissionResultText}>
              <strong>Push subscription active</strong>
              <br />
              The browser registered a PushSubscription with the push
              service. Your server can now send messages to this endpoint
              at any time — even when the tab is closed.
            </p>
          </div>
          <button
            className={styles.testPushBtnActive}
            onClick={handleTestPush}
            type="button"
          >
            {testPushSent ? "Push delivered!" : "Send Test Push"}
          </button>
          <button
            className={styles.resetLink}
            onClick={handleReset}
            type="button"
          >
            Reset demo
          </button>
        </>
      )}

      {permission === "denied" && (
        <>
          <div className={styles.permissionDenied}>
            <p className={styles.permissionResultText}>
              <strong>Permission denied</strong>
              <br />
              Cannot re-request. The Notification permission API returns
              &quot;denied&quot; permanently for this origin. The user
              must manually navigate to browser settings to re-enable
              notifications.
              <br />
              <br />
              This is the critical UX cliff most demos never show — once
              blocked, your push channel is dead. Build a pre-permission
              prompt (soft ask) to avoid this.
            </p>
          </div>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              className={styles.testPushBtnBlocked}
              type="button"
              aria-disabled="true"
              tabIndex={-1}
            >
              Send Test Push
              <span className={styles.tooltip}>Blocked</span>
            </button>
          </div>
          <button
            className={styles.resetLink}
            onClick={handleReset}
            type="button"
          >
            Reset demo
          </button>
        </>
      )}
    </div>
  );
}

// ── Tab 3: Queue Inspector ───────────────────────────────────────────

function QueueInspectorTab() {
  const [items, setItems] = useState<QueuedNotification[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const counters = useRef({ error: 0, warning: 0, info: 0 });
  const newIdTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Cleanup new-id timers on unmount
  useEffect(() => {
    const timers = newIdTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const addItem = useCallback((type: NotificationType) => {
    counters.current[type] += 1;
    const notif: QueuedNotification = {
      id: nextId(),
      type,
      priority: PRIORITY_MAP[type],
      title: `${type.charAt(0).toUpperCase()}${type.slice(1)} #${counters.current[type]}`,
      message: "",
      createdAt: Date.now(),
    };
    setItems((prev) => insertSorted(prev, notif));
    setNewIds((prev) => new Set(prev).add(notif.id));

    // Clear the "new" flag after animation completes
    const timer = setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(notif.id);
        return next;
      });
      newIdTimers.current.delete(notif.id);
    }, 400);
    newIdTimers.current.set(notif.id, timer);
  }, []);

  const dequeue = useCallback(() => {
    setItems((prev) => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setNewIds(new Set());
  }, []);

  const getItemStyle = (
    type: NotificationType
  ): string => {
    if (type === "error") return styles.inspectorItemError;
    if (type === "warning") return styles.inspectorItemWarning;
    return styles.inspectorItemInfo;
  };

  const getBarStyle = (type: NotificationType): string => {
    if (type === "error") return styles.inspectorBarError;
    if (type === "warning") return styles.inspectorBarWarning;
    return styles.inspectorBarInfo;
  };

  return (
    <div className={styles.inspectorLayout}>
      <div className={styles.inspectorControls}>
        <button
          className={styles.errorBtn}
          onClick={() => addItem("error")}
          type="button"
          aria-label="Add error notification to priority queue"
        >
          + Error
        </button>
        <button
          className={styles.warningBtn}
          onClick={() => addItem("warning")}
          type="button"
          aria-label="Add warning notification to priority queue"
        >
          + Warning
        </button>
        <button
          className={styles.infoBtn}
          onClick={() => addItem("info")}
          type="button"
          aria-label="Add info notification to priority queue"
        >
          + Info
        </button>
        <button
          className={styles.controlBtn}
          onClick={dequeue}
          type="button"
        >
          Dequeue next
        </button>
        <button
          className={styles.controlBtn}
          onClick={clear}
          type="button"
        >
          Clear
        </button>
      </div>

      <p className={styles.inspectorHeader} aria-live="polite">
        Priority queue ({items.length} items)
      </p>

      {items.length === 0 ? (
        <div className={styles.inspectorEmpty}>
          Queue empty — add items to see priority ordering
        </div>
      ) : (
        <div className={styles.inspectorQueue}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={getItemStyle(item.type)}
              data-new={newIds.has(item.id) || undefined}
              style={{ transform: `translateY(0)` }}
            >
              {idx === 0 && (
                <span className={styles.nextPointer}>next</span>
              )}
              <div className={styles.inspectorBar}>
                <div className={getBarStyle(item.type)} />
              </div>
              <span className={styles.inspectorLabel}>
                <strong>{item.title}</strong> (priority: {item.priority})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Demo Component ──────────────────────────────────────────────

export function NotificationDemo(): ReactNode {
  const [tab, setTab] = useState<TabOption>("Toast Queue");

  return (
    <DemoSandbox title="Notification System">
      <DemoSandbox.Tabs
        options={TAB_OPTIONS}
        value={tab}
        onChange={(v) => setTab(v as TabOption)}
      />

      <div className={styles.demoBody}>
        {tab === "Toast Queue" && <ToastQueueTab />}
        {tab === "Push Permission" && <PushPermissionTab />}
        {tab === "Queue Inspector" && <QueueInspectorTab />}
      </div>

      <DemoSandbox.Caption>
        {tab === "Toast Queue" &&
          "Spam notifications and watch priority queuing in action. Errors jump ahead. Hover to pause timers."}
        {tab === "Push Permission" &&
          "Try both paths. The Block path is the teaching moment — permission denial is permanent per origin."}
        {tab === "Queue Inspector" &&
          "Add mixed-priority items and watch them sort. Dequeue to see the highest-priority item served first."}
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}
