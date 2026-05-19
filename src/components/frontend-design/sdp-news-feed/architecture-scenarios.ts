import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "sse",
    label: "SSE / WebSocket",
    sublabel: "real-time new posts",
    x: 158,
    y: 6,
    w: 164,
    h: 22,
  },
  {
    id: "feed",
    label: "Feed — state owner",
    sublabel: "posts · cursor · feedMode · reactions",
    x: 40,
    y: 46,
    w: 400,
    h: 28,
  },
  {
    id: "banner",
    label: "NewPostBanner",
    sublabel: "pending count · onClick",
    x: 36,
    y: 96,
    w: 130,
    h: 24,
  },
  {
    id: "virtuallist",
    label: "VirtualList",
    sublabel: "windowed · onNearEnd",
    x: 180,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "sentinel",
    label: "Sentinel",
    sublabel: "IntersectionObserver",
    x: 324,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "postcard",
    label: "PostCard",
    sublabel: "polymorphic · onReact",
    x: 180,
    y: 138,
    w: 120,
    h: 22,
  },
];

const EDGES: FlowEdge[] = [
  { from: "sse", to: "feed", verb: "pushes new posts" },
  { from: "feed", to: "banner", verb: "passes pending count" },
  { from: "feed", to: "virtuallist", verb: "passes visible posts" },
  { from: "feed", to: "sentinel", verb: "passes onNearEnd" },
  { from: "virtuallist", to: "postcard", verb: "renders" },
  {
    from: "postcard",
    to: "feed",
    dashed: true,
    verb: "fires onReact",
    pathOverride: "M 180,149 C 6,149 6,60 40,60",
    midpointOverride: { x: 6, y: 105 },
  },
  {
    from: "banner",
    to: "feed",
    dashed: true,
    verb: "fires insertPosts",
    pathOverride: "M 36,108 C 10,108 10,60 40,60",
    midpointOverride: { x: 10, y: 84 },
  },
  {
    from: "sentinel",
    to: "feed",
    dashed: true,
    verb: "fires onNearEnd",
    pathOverride: "M 444,108 C 474,108 474,60 440,60",
    midpointOverride: { x: 474, y: 84 },
  },
];

// ── Weight assumptions ─────────────────────────────────────────────

const WEIGHT = {
  feedItem: 2,
  postDetail: 15,
  imageAttachment: 150,
} as const;

// ── Type definitions ───────────────────────────────────────────────

const T_FeedResponse: ArchTypeDef = {
  name: "FeedResponse",
  kind: "API response",
  fields: [
    { name: "items", type: "FeedItem[]", note: "page of feed items" },
    { name: "nextCursor", type: "string | null", note: "pagination" },
  ],
};

const T_FeedItem: ArchTypeDef = {
  name: "FeedItem",
  kind: "API response",
  fields: [
    { name: "id", type: "string" },
    { name: "author", type: "UserSummary" },
    { name: "content", type: "string" },
    { name: "type", type: "PostType", note: "text | image | link | poll" },
    { name: "reactions", type: "ReactionCounts" },
    { name: "createdAt", type: "number" },
  ],
};

const T_PostCardProps: ArchTypeDef = {
  name: "PostCardProps",
  kind: "props",
  fields: [
    { name: "post", type: "FeedItem" },
    { name: "onReact", type: "(id, type) => void" },
    { name: "variant", type: "PostType", note: "determines card shape" },
  ],
};

const T_OnReact: ArchTypeDef = {
  name: "onReact(id, type)",
  kind: "callback",
  fields: [
    { name: "postId", type: "string" },
    { name: "reactionType", type: "string", note: "like | celebrate" },
  ],
};

const T_ReactResponse: ArchTypeDef = {
  name: "ReactionResponse",
  kind: "API response",
  fields: [
    { name: "success", type: "boolean" },
    { name: "newCount", type: "number", note: "server-authoritative count" },
  ],
};

const T_NewPostEvent: ArchTypeDef = {
  name: "NewPostEvent",
  kind: "SSE event",
  fields: [
    { name: "post", type: "FeedItem", note: "the new post" },
    { name: "timestamp", type: "number" },
  ],
};

const T_OnNearEnd: ArchTypeDef = {
  name: "onNearEnd()",
  kind: "callback",
  fields: [{ name: "—", type: "() => void", note: "no payload" }],
};

const T_BannerProps: ArchTypeDef = {
  name: "NewPostBannerProps",
  kind: "props",
  fields: [
    { name: "count", type: "number", note: "pending new posts" },
    { name: "onClick", type: "() => void", note: "insert into feed" },
  ],
};

// ── Heavy variants (no type split) ────────────────────────────────

const T_FeedResponse_Heavy: ArchTypeDef = {
  name: "FeedResponse",
  kind: "API response",
  fields: [
    { name: "items", type: "PostDetail[]", note: "full detail per item — comments, images inline" },
    { name: "nextCursor", type: "string | null" },
  ],
};

const T_PostCardProps_Heavy: ArchTypeDef = {
  name: "PostCardProps",
  kind: "props",
  fields: [
    { name: "post", type: "PostDetail", note: "heavyweight — includes comments, full images" },
    { name: "onReact", type: "(id, type) => void" },
  ],
};

// ── Scenario 1: Initial feed load ──────────────────────────────────

const SCENARIO_LOAD_WITH_SPLIT: ArchStep[] = [
  {
    nodeId: "feed",
    caption: "Feed mounts and requests the first page.",
    stateAfter: [
      { key: "posts", value: "[]" },
      { key: "cursor", value: "null" },
      { key: "loading", value: "true" },
    ],
  },
  {
    nodeId: "feed",
    caption: "Server responds with 20 lightweight FeedItems.",
    payload: { type: T_FeedResponse, weightKB: 20 * WEIGHT.feedItem },
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
  {
    nodeId: "virtuallist",
    caption: "Feed passes visible posts to VirtualList.",
    payload: { type: T_FeedItem },
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
  {
    nodeId: "postcard",
    caption: "VirtualList renders PostCard per item — card shape adapts to post type.",
    payload: { type: T_PostCardProps },
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
];

const SCENARIO_LOAD_NO_SPLIT: ArchStep[] = [
  {
    nodeId: "feed",
    caption: "Feed mounts and requests the first page.",
    stateAfter: [
      { key: "posts", value: "[]" },
      { key: "cursor", value: "null" },
      { key: "loading", value: "true" },
    ],
  },
  {
    nodeId: "feed",
    caption: "Server returns 20 full PostDetail records — comments, images, everything.",
    payload: { type: T_FeedResponse_Heavy, weightKB: 20 * WEIGHT.postDetail },
    stateAfter: [
      { key: "posts", value: "PostDetail[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
  {
    nodeId: "virtuallist",
    caption: "Feed passes heavy PostDetail[] down to VirtualList.",
    payload: { type: T_PostCardProps_Heavy },
    stateAfter: [
      { key: "posts", value: "PostDetail[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
  {
    nodeId: "postcard",
    caption: "Every PostCard now carries comments, full images, and edit history.",
    payload: { type: T_PostCardProps_Heavy },
    stateAfter: [
      { key: "posts", value: "PostDetail[20]" },
      { key: "cursor", value: '"eyJpZCI6MjB9"' },
      { key: "loading", value: "false" },
    ],
  },
];

// ── Scenario 2: Optimistic like ────────────────────────────────────

const SCENARIO_LIKE_WITH_SPLIT: ArchStep[] = [
  {
    nodeId: "postcard",
    caption: "User taps the heart on post #3.",
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "pendingReactions", value: "new Set()" },
    ],
  },
  {
    nodeId: "feed",
    caption: "PostCard fires onReact — Feed immediately increments the count (optimistic).",
    payload: { type: T_OnReact },
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #3: likes 42→43)' },
      { key: "pendingReactions", value: 'Set { "p3" }' },
    ],
  },
  {
    nodeId: "feed",
    caption: "Feed sends POST /api/posts/p3/react to the server. Only the reaction count changes — 0.1 KB.",
    payload: { type: T_OnReact, weightKB: 0.1 },
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #3: likes 43)' },
      { key: "pendingReactions", value: 'Set { "p3" }' },
    ],
  },
  {
    nodeId: "feed",
    caption: "Server confirms. Pending reaction clears. UI stays as-is — it was already correct.",
    payload: { type: T_ReactResponse },
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #3: likes 43)' },
      { key: "pendingReactions", value: "Set { }" },
    ],
  },
];

const SCENARIO_LIKE_NO_SPLIT: ArchStep[] = [
  {
    nodeId: "postcard",
    caption: "User taps the heart on post #3.",
    stateAfter: [
      { key: "posts", value: "PostDetail[20]" },
      { key: "pendingReactions", value: "new Set()" },
    ],
  },
  {
    nodeId: "feed",
    caption: "PostCard fires onReact — Feed must clone the entire PostDetail to update one field.",
    payload: { type: T_OnReact },
    stateAfter: [
      { key: "posts", value: 'PostDetail[20] (cloned 15 KB to flip one boolean)' },
      { key: "pendingReactions", value: 'Set { "p3" }' },
    ],
  },
  {
    nodeId: "feed",
    caption: "Feed sends POST and re-fetches the full PostDetail to reconcile (15 KB round-trip).",
    payload: { type: T_PostCardProps_Heavy, weightKB: WEIGHT.postDetail },
    stateAfter: [
      { key: "posts", value: 'PostDetail[20] (post #3 re-fetched)' },
      { key: "pendingReactions", value: 'Set { "p3" }' },
    ],
  },
  {
    nodeId: "feed",
    caption: "Server confirms. But the full re-fetch was 150× heavier than updating a FeedItem count.",
    payload: { type: T_ReactResponse },
    stateAfter: [
      { key: "posts", value: 'PostDetail[20]' },
      { key: "pendingReactions", value: "Set { }" },
    ],
  },
];

const SCENARIO_LIKE_ROLLBACK: ArchStep[] = [
  {
    nodeId: "postcard",
    caption: "User taps the heart on post #7.",
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "pendingReactions", value: "new Set()" },
    ],
  },
  {
    nodeId: "feed",
    caption: "PostCard fires onReact — Feed optimistically increments (same as success path).",
    payload: { type: T_OnReact },
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #7: likes 18→19)' },
      { key: "pendingReactions", value: 'Set { "p7" }' },
    ],
  },
  {
    nodeId: "feed",
    caption: "Server returns 409 — user already reacted (stale client state).",
    payload: { type: T_ReactResponse },
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #7: likes 19→18, ROLLED BACK)' },
      { key: "pendingReactions", value: "Set { }" },
      { key: "failedReactions", value: 'Set { "p7" }' },
    ],
  },
  {
    nodeId: "postcard",
    caption: "PostCard receives rolled-back state. Heart shakes to signal the revert.",
    stateAfter: [
      { key: "posts", value: 'FeedItem[20] (post #7: likes 18)' },
      { key: "pendingReactions", value: "Set { }" },
      { key: "failedReactions", value: "Set { } (cleared after 2s)" },
    ],
  },
];

// ── Scenario 3: Real-time new post ─────────────────────────────────

const SCENARIO_REALTIME: ArchStep[] = [
  {
    nodeId: "sse",
    caption: "SSE stream pushes a new post event while user is scrolled mid-feed.",
    payload: { type: T_NewPostEvent, weightKB: WEIGHT.feedItem },
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "newPostQueue", value: "[]" },
    ],
  },
  {
    nodeId: "feed",
    caption: "Feed receives the event. It does NOT insert yet — that would shift the scroll position.",
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "newPostQueue", value: "FeedItem[1]" },
    ],
  },
  {
    nodeId: "banner",
    caption: "Feed passes the pending count to NewPostBanner. '1 new post' appears.",
    payload: { type: T_BannerProps },
    stateAfter: [
      { key: "posts", value: "FeedItem[20]" },
      { key: "newPostQueue", value: "FeedItem[1]" },
    ],
  },
  {
    nodeId: "feed",
    caption: "User clicks the banner. Feed prepends queued posts and clears the queue.",
    stateAfter: [
      { key: "posts", value: "FeedItem[21] (new post at top)" },
      { key: "newPostQueue", value: "[]" },
    ],
  },
  {
    nodeId: "virtuallist",
    caption: "VirtualList re-renders with the new post at index 0. Smooth scroll to top.",
    payload: { type: T_FeedItem },
    stateAfter: [
      { key: "posts", value: "FeedItem[21]" },
      { key: "newPostQueue", value: "[]" },
    ],
  },
];

// ── Config ──────────────────────────────────────────────────────────

export const NEWS_FEED_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "FeedItem (lightweight) vs PostDetail (heavyweight) — the same split pattern, different reason: feed items scroll fast, detail loads on demand.",
  viewBox: "0 0 480 168",
  nodes: NODES,
  edges: EDGES,
  protagonist: "feed",
  scenarios: [
    {
      id: "initial-load",
      label: "Feed load",
      blurb:
        "Mount → fetch → render. Toggle the split to compare 40 KB of FeedItems vs 300 KB of PostDetails for the same 20 posts.",
      steps: SCENARIO_LOAD_WITH_SPLIT,
      stepsWithoutSplit: SCENARIO_LOAD_NO_SPLIT,
    },
    {
      id: "optimistic-like",
      label: "Like (success)",
      blurb:
        "The optimistic path: UI updates instantly, server confirms later. Toggle the split to compare 0.1 KB reaction update vs 15 KB full PostDetail re-fetch.",
      steps: SCENARIO_LIKE_WITH_SPLIT,
      stepsWithoutSplit: SCENARIO_LIKE_NO_SPLIT,
    },
    {
      id: "like-rollback",
      label: "Like (failure)",
      blurb:
        "When the server rejects: the UI rolls back the count and shakes the heart. Same optimistic start, different ending.",
      steps: SCENARIO_LIKE_ROLLBACK,
    },
    {
      id: "realtime-post",
      label: "New post arrives",
      blurb:
        "A new post arrives via SSE while the user is scrolled. Queue it, show a banner, insert on click — never shift scroll position without consent.",
      steps: SCENARIO_REALTIME,
    },
  ],
};
