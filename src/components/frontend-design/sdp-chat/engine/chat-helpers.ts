import type { ChatMessage, Phase } from "../chat-context";

export const GROUP_THRESHOLD_MS = 120000;
export const TOTAL_STEPS = 15;
export const DEFAULT_MESSAGE_COUNT = 80;
export const BASELINE_MESSAGE_COUNT = 6;

export const USERS = [
  { name: "Alice", id: "alice", hue: 220 },
  { name: "Bob", id: "bob", hue: 150 },
  { name: "Carol", id: "carol", hue: 340 },
  { name: "Dave", id: "dave", hue: 40 },
];

export const MESSAGES = [
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

export function generateMessages(count: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    const user = USERS[i % USERS.length];
    const isOwn = user.id === "alice";
    messages.push({
      id: `msg-${i}`,
      author: user.name,
      authorId: user.id,
      avatarHue: user.hue,
      content: MESSAGES[i % MESSAGES.length],
      timestamp: Date.now() - (count - i) * 60000,
      status: "read",
      isOwn,
      reactions: i % 7 === 0 ? { "👍": 2, "❤️": 1 } : {},
      replyTo: i > 2 && i % 11 === 0 ? `msg-${i - 2}` : undefined,
    });
  }
  return messages;
}

export function generateIncoming(index: number): ChatMessage {
  const user = USERS[(index + 1) % USERS.length];
  return {
    id: `incoming-${index}-${Date.now()}`,
    author: user.name,
    authorId: user.id,
    avatarHue: user.hue,
    content: [
      "Just found a race condition in the reconnection handler.",
      "The heartbeat timeout was 30s but the server expects 25s. Mismatched values.",
      "I'm seeing duplicate messages in the offline queue — the dedup key might be wrong.",
    ][index % 3],
    timestamp: Date.now(),
    status: "delivered",
    isOwn: false,
    reactions: {},
  };
}

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

export const FEATURE_UNLOCK: Record<string, number> = {
  messageList: 5,
  sendMessage: 6,
  deliveryStatus: 7,
  typingIndicator: 8,
  reconnection: 9,
  offlineQueue: 10,
  messageGrouping: 11,
  reactions: 12,
  readReceipts: 13,
  encryption: 14,
  scale: 15,
};

export function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  const unlock = FEATURE_UNLOCK[feature];
  if (!unlock) return false;
  if (step > unlock) return true;
  if (step === unlock) return toggled;
  return false;
}

export function avatarColor(hue: number): string {
  return `oklch(55% 0.14 ${hue})`;
}
