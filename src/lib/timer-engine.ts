// Timer state machine and engine
// Manages timer lifecycle: idle → running → warning → done → dismissed

export type TimerState = "idle" | "running" | "paused" | "warning" | "done" | "dismissed";

export type Timer = {
  id: string;
  label: string;
  duration: number; // total duration in seconds
  remainingTime: number; // remaining time in seconds
  state: TimerState;
  type: "active" | "passive";
  alert?: string;
  startedAt?: number; // timestamp when started
  pausedAt?: number; // timestamp when paused
};

const WARNING_THRESHOLD = 0.2; // Last 20% triggers warning state

/**
 * Create a new timer
 */
export function createTimer(
  label: string,
  duration: number,
  type: "active" | "passive" = "active",
  alert?: string
): Timer {
  return {
    id: generateTimerId(),
    label,
    duration,
    remainingTime: duration,
    state: "idle",
    type,
    alert,
  };
}

/**
 * Start a timer
 */
export function startTimer(timer: Timer): Timer {
  if (timer.state === "idle" || timer.state === "paused") {
    return {
      ...timer,
      state: "running",
      startedAt: Date.now(),
      pausedAt: undefined,
    };
  }
  return timer;
}

/**
 * Pause a timer
 */
export function pauseTimer(timer: Timer): Timer {
  if (timer.state === "running" || timer.state === "warning") {
    return {
      ...timer,
      state: "paused",
      pausedAt: Date.now(),
    };
  }
  return timer;
}

/**
 * Resume a paused timer
 */
export function resumeTimer(timer: Timer): Timer {
  if (timer.state === "paused") {
    return {
      ...timer,
      state: timer.remainingTime <= timer.duration * WARNING_THRESHOLD ? "warning" : "running",
      startedAt: Date.now(),
      pausedAt: undefined,
    };
  }
  return timer;
}

/**
 * Reset a timer to its initial state
 */
export function resetTimer(timer: Timer): Timer {
  return {
    ...timer,
    remainingTime: timer.duration,
    state: "idle",
    startedAt: undefined,
    pausedAt: undefined,
  };
}

/**
 * Adjust timer by adding or removing seconds
 */
export function adjustTimer(timer: Timer, deltaSeconds: number): Timer {
  const newRemaining = Math.max(0, timer.remainingTime + deltaSeconds);
  const newDuration = Math.max(newRemaining, timer.duration);

  return {
    ...timer,
    remainingTime: newRemaining,
    duration: newDuration,
  };
}

/**
 * Update timer state based on elapsed time
 * Returns updated timer and whether state changed
 */
export function tickTimer(timer: Timer): { timer: Timer; stateChanged: boolean } {
  if (timer.state !== "running" && timer.state !== "warning") {
    return { timer, stateChanged: false };
  }

  const now = Date.now();
  const elapsed = timer.startedAt ? (now - timer.startedAt) / 1000 : 0;
  const newRemaining = Math.max(0, timer.remainingTime - elapsed);

  let newState: TimerState = timer.state;
  let stateChanged = false;

  // Check if timer completed
  if (newRemaining === 0) {
    newState = "done";
    stateChanged = true; // Always true since we start from running/warning
  }
  // Check if entering warning state
  else if (newRemaining <= timer.duration * WARNING_THRESHOLD && timer.state === "running") {
    newState = "warning";
    stateChanged = true;
  }

  const updatedTimer: Timer = {
    ...timer,
    remainingTime: newRemaining,
    state: newState,
    startedAt: now, // Reset start time for next tick
  };

  return { timer: updatedTimer, stateChanged };
}

/**
 * Dismiss a completed timer
 */
export function dismissTimer(timer: Timer): Timer {
  if (timer.state === "done") {
    return {
      ...timer,
      state: "dismissed",
    };
  }
  return timer;
}

/**
 * Format time as MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate a unique timer ID
 */
function generateTimerId(): string {
  return `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate progress percentage (0-100)
 */
export function getTimerProgress(timer: Timer): number {
  if (timer.duration === 0) return 100;
  return ((timer.duration - timer.remainingTime) / timer.duration) * 100;
}

/**
 * Check if timer is in warning zone
 */
export function isTimerWarning(timer: Timer): boolean {
  return timer.remainingTime <= timer.duration * WARNING_THRESHOLD;
}

/**
 * Serialize timer for localStorage
 */
export function serializeTimer(timer: Timer): string {
  return JSON.stringify(timer);
}

/**
 * Deserialize timer from localStorage
 */
export function deserializeTimer(data: string): Timer | null {
  try {
    const timer = JSON.parse(data) as Timer;
    // Validate required fields
    if (!timer.id || !timer.label || typeof timer.duration !== "number") {
      return null;
    }
    return timer;
  } catch {
    return null;
  }
}
