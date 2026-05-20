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

export type GroupedNotifications = {
  groupId: string;
  items: ToastEntry[];
  collapsed: boolean;
};

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

/**
 * Sorts active/non-dismissed toasts by priority weight (highest first) and createdAt (oldest first).
 */
export function sortToasts(toasts: ToastEntry[]): ToastEntry[] {
  return [...toasts].sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (weightDiff !== 0) {
      return weightDiff;
    }
    return a.createdAt - b.createdAt;
  });
}

/**
 * Checks if a burst of notifications exceeds the rate limit.
 * Returns { allowed: ToastEntry[], suppressed: ToastEntry[] }
 */
export function applyRateLimiting(
  notifications: ToastEntry[],
  rateLimitEnabled: boolean,
  throttleRate: number
): { allowed: ToastEntry[]; suppressed: ToastEntry[] } {
  if (!rateLimitEnabled) {
    return { allowed: notifications, suppressed: [] };
  }
  const allowed = notifications.slice(0, throttleRate);
  const suppressed = notifications.slice(throttleRate);
  return { allowed, suppressed };
}

/**
 * Groups similar notifications collapsing them into summary groups if they exceed the threshold.
 */
export function groupNotifications(
  notifications: ToastEntry[],
  threshold: number,
  expandedGroups: Set<string>
): (GroupedNotifications | ToastEntry)[] {
  const byGroup: Record<string, ToastEntry[]> = {};
  const ungrouped: ToastEntry[] = [];

  for (const n of notifications) {
    if (n.groupId) {
      if (!byGroup[n.groupId]) {
        byGroup[n.groupId] = [];
      }
      byGroup[n.groupId].push(n);
    } else {
      ungrouped.push(n);
    }
  }

  const result: (GroupedNotifications | ToastEntry)[] = [];
  for (const [gid, items] of Object.entries(byGroup)) {
    if (items.length >= threshold) {
      result.push({
        groupId: gid,
        items,
        collapsed: !expandedGroups.has(gid),
      });
    } else {
      result.push(...items);
    }
  }

  result.push(...ungrouped);
  return result;
}
