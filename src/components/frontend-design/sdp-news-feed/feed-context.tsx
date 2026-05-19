"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";

export type PostType = "text" | "image" | "link" | "poll";
export type FeedMode = "chronological" | "ranked";

export type LinkPreview = {
  title: string;
  domain: string;
  description: string;
  color: string;
};

export type PollOption = {
  label: string;
  votes: number;
};

export type FeedPost = {
  id: string;
  author: string;
  handle: string;
  avatarHue: number;
  content: string;
  type: PostType;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  imageHue?: number;
  imageAspect?: number;
  linkPreview?: LinkPreview;
  poll?: { question: string; options: PollOption[]; totalVotes: number };
  engagementScore: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;
const DEFAULT_POST_COUNT = 200;
const BASELINE_POST_COUNT = 8;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "content-types", label: "Multiple content types?", description: "Text, images, links, polls — each needs different rendering logic" },
  { id: "engagement", label: "Reactions and comments?", description: "Likes, shares, comments — requires optimistic UI patterns" },
  { id: "realtime", label: "Real-time updates?", description: "New posts appear while scrolling — WebSocket vs polling" },
  { id: "algorithm", label: "Algorithmic feed?", description: "Engagement-ranked vs chronological — affects sort + caching" },
  { id: "scale", label: "Scale: 1K vs 1M posts?", description: "Virtualization, pagination, CDN strategy" },
];

export type AlgorithmWeights = {
  likes: number;
  comments: number;
  shares: number;
};

// ── API Endpoints ──────────────────────────────────────────────────

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/feed",
    description: "Paginated feed for the main timeline",
    usedBy: "Feed → VirtualList",
    params: [
      { name: "cursor", type: "string?", note: "opaque pagination token" },
      { name: "limit", type: "number", note: "default 20, max 50" },
      { name: "mode", type: "string?", note: "chronological | ranked" },
    ],
    responseType: "FeedResponse",
  },
  {
    method: "GET",
    path: "/api/posts/:id",
    description: "Full post detail with comments",
    usedBy: "Feed → PostDetail",
    params: [
      { name: "id", type: "string", note: "post identifier" },
    ],
    responseType: "PostDetail",
  },
  {
    method: "POST",
    path: "/api/posts/:id/react",
    description: "Toggle a reaction on a post",
    usedBy: "PostCard → ReactionBar",
    params: [
      { name: "id", type: "string", note: "post identifier" },
      { name: "type", type: "string", note: "like | celebrate | insightful" },
    ],
    responseType: "ReactionResponse",
  },
  {
    method: "GET",
    path: "/api/feed/updates",
    description: "SSE stream of new posts since cursor",
    usedBy: "Feed → NewPostBanner",
    params: [
      { name: "since", type: "string", note: "cursor of last seen post" },
    ],
    responseType: "EventStream<NewPostEvent>",
  },
];

// ── Data Models ────────────────────────────────────────────────────

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  extends?: string;
  fields: TypeField[];
};

export const DATA_MODELS: TypeDef[] = [
  {
    name: "FeedItem",
    category: "api",
    fields: [
      { name: "id", type: "string" },
      { name: "author", type: "UserSummary" },
      { name: "content", type: "string", note: "plain text body" },
      { name: "type", type: "PostType", note: "text | image | link | poll" },
      { name: "media", type: "MediaAttachment?", note: "image URL + dims" },
      { name: "linkPreview", type: "OGData?", note: "Open Graph metadata" },
      { name: "poll", type: "PollData?", note: "question + options" },
      { name: "reactions", type: "ReactionCounts", note: "{ like: 42, ... }" },
      { name: "commentCount", type: "number" },
      { name: "createdAt", type: "number", note: "unix ms" },
    ],
  },
  {
    name: "PostDetail",
    category: "api",
    extends: "FeedItem",
    fields: [
      { name: "comments", type: "Comment[]", note: "paginated, first 10" },
      { name: "shareCount", type: "number" },
      { name: "editHistory", type: "EditEntry[]?" },
    ],
  },
  {
    name: "FeedResponse",
    category: "api",
    fields: [
      { name: "items", type: "FeedItem[]", note: "page of feed items" },
      { name: "nextCursor", type: "string | null", note: "for infinite scroll" },
      { name: "algorithm", type: "string", note: "which ranking was applied" },
    ],
  },
];

// ── Deterministic post generation ──────────────────────────────────

const AUTHOR_POOL = [
  { name: "Ada Lovelace", handle: "@ada" },
  { name: "Grace Hopper", handle: "@grace" },
  { name: "Alan Turing", handle: "@turing" },
  { name: "Margaret Hamilton", handle: "@margaret" },
  { name: "Dennis Ritchie", handle: "@dmr" },
  { name: "Linus Torvalds", handle: "@linus" },
  { name: "Barbara Liskov", handle: "@liskov" },
  { name: "Ken Thompson", handle: "@ken" },
];

const TEXT_POSTS = [
  "Just refactored a 2000-line component into 12 composable hooks. The render count dropped 40%.",
  "TIL: Chrome DevTools has a \"Coverage\" tab that shows exactly which CSS lines are unused. We had 63% dead CSS.",
  "Hot take: useEffect is not the new componentDidMount. If you're using it that way, you're creating bugs.",
  "Been profiling our app and IntersectionObserver is doing the heavy lifting. Scroll handlers were killing FPS.",
  "Three months into using React Server Components in production. The mental model shift is real but worth it.",
  "The difference between junior and senior: junior asks 'does it work?' — senior asks 'does it fail gracefully?'",
  "Our CI pipeline went from 14 minutes to 3 minutes by parallelizing Jest test suites. Should have done this years ago.",
  "Migrated our entire design system from styled-components to CSS Modules. Bundle size dropped 28KB gzipped.",
];

const LINK_PREVIEWS: LinkPreview[] = [
  { title: "Web Performance Calendar — LCP Optimizations That Actually Work", domain: "perfcalendar.dev", description: "A data-driven analysis of 50 real LCP improvements and the patterns behind them.", color: "oklch(55% 0.15 230)" },
  { title: "The Cost of JavaScript in 2026", domain: "v8.dev", description: "Updated benchmarks on parse, compile, and execute costs across device tiers.", color: "oklch(55% 0.15 150)" },
  { title: "Building Resilient UIs with Optimistic Updates", domain: "overreacted.io", description: "Why your mutation should update the UI before the server responds.", color: "oklch(55% 0.15 30)" },
  { title: "CSS Container Queries Are Changing Everything", domain: "web.dev", description: "Component-level responsive design is finally production-ready.", color: "oklch(55% 0.15 290)" },
];

const POLL_QUESTIONS = [
  { question: "What's your primary state management?", options: [{ label: "useState/useReducer", votes: 340 }, { label: "Zustand", votes: 285 }, { label: "Redux Toolkit", votes: 195 }, { label: "Jotai/Recoil", votes: 130 }] },
  { question: "CSS approach for new projects?", options: [{ label: "Tailwind CSS", votes: 420 }, { label: "CSS Modules", votes: 310 }, { label: "Styled Components", votes: 85 }, { label: "Vanilla CSS", votes: 145 }] },
];

function generatePosts(count: number): FeedPost[] {
  const posts: FeedPost[] = [];
  const typePattern: PostType[] = ["text", "image", "text", "link", "text", "text", "poll", "image", "text", "link"];

  for (let i = 0; i < count; i++) {
    const author = AUTHOR_POOL[i % AUTHOR_POOL.length];
    const type = typePattern[i % typePattern.length];
    const baseEngagement = 50 + ((i * 37 + 13) % 200);
    const likes = 5 + ((i * 23 + 7) % 180);
    const comments = 1 + ((i * 11 + 3) % 45);
    const shares = ((i * 7 + 2) % 30);
    const minutesAgo = i * 4 + ((i * 13) % 15);

    const base: FeedPost = {
      id: `post-${i}`,
      author: author.name,
      handle: author.handle,
      avatarHue: (i * 47 + 20) % 360,
      content: TEXT_POSTS[i % TEXT_POSTS.length],
      type,
      timestamp: minutesAgo,
      likes,
      comments,
      shares,
      liked: false,
      engagementScore: Math.round(
        (likes * 1.0 + comments * 2.5 + shares * 3.0) / Math.max(1, Math.sqrt(minutesAgo + 1))
      ),
    };

    if (type === "image") {
      base.imageHue = (i * 67 + 30) % 360;
      base.imageAspect = [16 / 9, 4 / 3, 1, 3 / 4][i % 4];
    }

    if (type === "link") {
      base.linkPreview = LINK_PREVIEWS[i % LINK_PREVIEWS.length];
    }

    if (type === "poll") {
      const pollData = POLL_QUESTIONS[i % POLL_QUESTIONS.length];
      base.poll = {
        question: pollData.question,
        options: pollData.options,
        totalVotes: pollData.options.reduce((sum, o) => sum + o.votes, 0),
      };
      base.content = pollData.question;
    }

    posts.push(base);
  }
  return posts;
}

// ── Real-time new post generation ──────────────────────────────────

function generateNewPost(index: number): FeedPost {
  const author = AUTHOR_POOL[(index + 3) % AUTHOR_POOL.length];
  return {
    id: `new-${index}-${Date.now()}`,
    author: author.name,
    handle: author.handle,
    avatarHue: (index * 83 + 120) % 360,
    content: [
      "Just shipped a feature that reduced our bundle by 35%. Tree shaking is magic when you set it up right.",
      "Debugging a race condition in our WebSocket reconnection logic. The browser's backoff is fighting ours.",
      "Our accessibility audit came back clean. Turns out `role='feed'` with `aria-busy` solves most screen reader issues.",
    ][index % 3],
    type: "text",
    timestamp: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    liked: false,
    engagementScore: 0,
  };
}

// ── Phase + feature computation ─────────────────────────────────────

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

const FEATURE_UNLOCK: Record<string, number> = {
  postTypes: 5,
  infiniteScroll: 6,
  optimisticLikes: 7,
  realTimePosts: 8,
  feedAlgorithm: 9,
  virtualization: 10,
  skeletons: 11,
  embedding: 12,
  a11y: 13,
  errorHandling: 14,
};

function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  const unlock = FEATURE_UNLOCK[feature];
  if (!unlock) return false;
  if (step > unlock) return true;
  if (step === unlock) return toggled;
  return false;
}

// ── Context shape ───────────────────────────────────────────────────

type FeedContextValue = {
  activeStep: number;
  phase: Phase;

  // Step 1: Requirements
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  // Feed posts
  posts: FeedPost[];
  postCount: number;
  visiblePosts: FeedPost[];

  // Feature toggles
  featureToggled: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  isActive: (feature: string) => boolean;

  // Step 5: Post type filter
  postTypeFilter: Set<PostType>;
  togglePostType: (t: PostType) => void;

  // Step 7: Optimistic likes
  pendingLikes: Set<string>;
  failedLikes: Set<string>;
  toggleLike: (postId: string) => void;

  // Step 8: Real-time
  newPostQueue: FeedPost[];
  insertNewPosts: () => void;
  autoInsert: boolean;
  setAutoInsert: (v: boolean) => void;

  // Step 9: Feed mode + weights
  feedMode: FeedMode;
  setFeedMode: (m: FeedMode) => void;
  algorithmWeights: AlgorithmWeights;
  setAlgorithmWeights: (w: AlgorithmWeights) => void;

  // Step 10: Virtualization
  virtualWindow: { start: number; end: number };

  // Step 11: Skeleton loading
  isLoadingMore: boolean;

  // Step 14: Errors
  networkError: boolean;
  failedPosts: Set<string>;
  retryPost: (id: string) => void;

  // Step 15: Scale
  scaleLevel: number;
  setScaleLevel: (n: number) => void;

  // Computed metrics
  metrics: {
    domNodes: number;
    networkReqs: number;
    scrollFps: number;
    tti: number;
  };

  // State inspector
  stateEntries: StateEntry[];
};

const FeedContext = createContext<FeedContextValue | null>(null);

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used within <FeedProvider>");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function FeedProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase = getPhase(activeStep);

  // Step 1: Scope
  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());

  // Feature toggles
  const [featureToggled, setFeatureToggled] = useState<Record<string, boolean>>({});

  const toggleFeature = useCallback((feature: string) => {
    setFeatureToggled((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  const isActive = useCallback(
    (feature: string) => isFeatureActive(feature, activeStep, !!featureToggled[feature]),
    [activeStep, featureToggled]
  );

  // Feed mode
  const [feedMode, setFeedMode] = useState<FeedMode>("chronological");

  // Step 5: Post type filter
  const [postTypeFilter, setPostTypeFilter] = useState<Set<PostType>>(
    new Set(["text", "image", "link", "poll"])
  );
  const togglePostType = useCallback((t: PostType) => {
    setPostTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) { if (next.size > 1) next.delete(t); } else next.add(t);
      return next;
    });
  }, []);

  // Step 8: Auto-insert mode (bad UX) vs queue-and-banner (good UX)
  const [autoInsert, setAutoInsert] = useState(false);

  // Step 9: Algorithm weights
  const [algorithmWeights, setAlgorithmWeights] = useState<AlgorithmWeights>({
    likes: 1.0, comments: 2.5, shares: 3.0,
  });

  // Scale (step 15) — declared before postCount so useMemo can reference it
  const [scaleLevel, setScaleLevel] = useState(50);

  // Post count depends on step + scale
  const postCount = useMemo(() => {
    if (activeStep <= 3) return 0;
    if (activeStep === 4) return BASELINE_POST_COUNT;
    if (activeStep === 15) return scaleLevel;
    return DEFAULT_POST_COUNT;
  }, [activeStep, scaleLevel]);

  const allPosts = useMemo(() => generatePosts(postCount), [postCount]);

  // Recompute engagement scores when weights change
  const scoredPosts = useMemo(() => {
    return allPosts.map((p) => ({
      ...p,
      engagementScore: Math.round(
        (p.likes * algorithmWeights.likes +
          p.comments * algorithmWeights.comments +
          p.shares * algorithmWeights.shares) /
        Math.max(1, Math.sqrt(p.timestamp + 1))
      ),
    }));
  }, [allPosts, algorithmWeights]);

  // Filter by post type (step 5)
  const filteredPosts = useMemo(() => {
    if (!isActive("postTypes")) return scoredPosts;
    return scoredPosts.filter((p) => postTypeFilter.has(p.type));
  }, [scoredPosts, isActive, postTypeFilter]);

  // Sorted posts based on feed mode
  const sortedPosts = useMemo(() => {
    if (!isActive("feedAlgorithm") || feedMode === "chronological") {
      return [...filteredPosts].sort((a, b) => a.timestamp - b.timestamp);
    }
    return [...filteredPosts].sort((a, b) => b.engagementScore - a.engagementScore);
  }, [filteredPosts, feedMode, isActive]);

  // Optimistic likes
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [failedLikes, setFailedLikes] = useState<Set<string>>(new Set());
  const likeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => { likeTimersRef.current.forEach(clearTimeout); };
  }, []);

  const toggleLike = useCallback((postId: string) => {
    let wasLiked = false;
    setLikedPosts(prev => {
      wasLiked = prev.has(postId);
      const next = new Set(prev);
      if (wasLiked) next.delete(postId); else next.add(postId);
      return next;
    });
    setPendingLikes(prev => new Set(prev).add(postId));
    setFailedLikes(prev => { const next = new Set(prev); next.delete(postId); return next; });

    const willFail = postId.endsWith("3") || postId.endsWith("7");
    const timer = setTimeout(() => {
      likeTimersRef.current.delete(timer);
      setPendingLikes(prev => { const next = new Set(prev); next.delete(postId); return next; });
      if (willFail) {
        setLikedPosts(prev => {
          const next = new Set(prev);
          if (wasLiked) next.add(postId); else next.delete(postId);
          return next;
        });
        setFailedLikes(prev => new Set(prev).add(postId));
        const clearTimer = setTimeout(() => {
          likeTimersRef.current.delete(clearTimer);
          setFailedLikes(prev => { const next = new Set(prev); next.delete(postId); return next; });
        }, 2000);
        likeTimersRef.current.add(clearTimer);
      }
    }, 800 + Math.random() * 600);
    likeTimersRef.current.add(timer);
  }, []);

  // Apply likes to posts
  const postsWithLikes = useMemo(() => {
    return sortedPosts.map(p => ({
      ...p,
      liked: likedPosts.has(p.id),
      likes: p.likes + (likedPosts.has(p.id) ? 1 : 0),
    }));
  }, [sortedPosts, likedPosts]);

  // Real-time new posts
  const [newPostQueue, setNewPostQueue] = useState<FeedPost[]>([]);
  const [insertedPosts, setInsertedPosts] = useState<FeedPost[]>([]);
  const newPostTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const newPostCounterRef = useRef(0);

  const realTimeActive = isActive("realTimePosts");

  useEffect(() => {
    if (!realTimeActive) {
      setNewPostQueue([]);
      setInsertedPosts([]);
      newPostCounterRef.current = 0;
      clearInterval(newPostTimerRef.current);
      return;
    }

    newPostTimerRef.current = setInterval(() => {
      const post = generateNewPost(newPostCounterRef.current++);
      if (autoInsert) {
        setInsertedPosts(prev => [post, ...prev]);
      } else {
        setNewPostQueue(prev => [...prev, post]);
      }
    }, 3500);

    return () => clearInterval(newPostTimerRef.current);
  }, [realTimeActive, autoInsert]);

  const insertNewPosts = useCallback(() => {
    setInsertedPosts(prev => [...newPostQueue, ...prev]);
    setNewPostQueue([]);
  }, [newPostQueue]);

  // Combined posts (inserted + existing)
  const combinedPosts = useMemo(() => {
    return [...insertedPosts, ...postsWithLikes];
  }, [insertedPosts, postsWithLikes]);

  // Virtualization window
  const virtualWindow = useMemo(() => {
    if (!isActive("virtualization")) return { start: 0, end: combinedPosts.length };
    return { start: 0, end: Math.min(12, combinedPosts.length) };
  }, [combinedPosts.length, isActive]);

  const visiblePosts = useMemo(() => {
    return combinedPosts.slice(virtualWindow.start, virtualWindow.end);
  }, [combinedPosts, virtualWindow]);

  // Skeleton loading simulation
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Error states
  const [networkError, setNetworkError] = useState(false);
  const [failedPosts, setFailedPosts] = useState<Set<string>>(new Set());

  const errorHandlingActive = isActive("errorHandling");

  useEffect(() => {
    if (!errorHandlingActive) {
      setNetworkError(false);
      setFailedPosts(new Set());
      return;
    }
    const errors = new Set<string>();
    combinedPosts.forEach((p) => {
      const idx = parseInt(p.id.split("-")[1] || "0");
      if (idx % 11 === 5) errors.add(p.id);
    });
    setFailedPosts(errors);
  }, [combinedPosts, errorHandlingActive]);

  const retryPost = useCallback((id: string) => {
    setFailedPosts(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Reset step-specific state
  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    if (prevStepRef.current !== activeStep) {
      prevStepRef.current = activeStep;
      setLikedPosts(new Set());
      setPendingLikes(new Set());
      setFailedLikes(new Set());
      if (activeStep === 5) setPostTypeFilter(new Set(["text", "image", "link", "poll"]));
      if (activeStep === 8) setAutoInsert(false);
      if (activeStep === 9) {
        setFeedMode("chronological");
        setAlgorithmWeights({ likes: 1.0, comments: 2.5, shares: 3.0 });
      }
      if (activeStep === 15) setScaleLevel(50);
    }
  }, [activeStep]);

  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (postCount === 0) return { domNodes: 0, networkReqs: 0, scrollFps: 60, tti: 0 };

    let domNodes = combinedPosts.length * 4;
    let networkReqs = combinedPosts.filter(p => p.type === "image" || p.type === "link").length;
    let scrollFps = 60;
    let tti = 400;

    if (postCount > 50) {
      domNodes = combinedPosts.length * 4;
      scrollFps = Math.max(24, 60 - Math.floor(combinedPosts.length / 15));
      tti = 400 + combinedPosts.length * 2;
    }

    if (isActive("virtualization")) {
      domNodes = Math.min(48, domNodes);
      scrollFps = 60;
    }

    if (isActive("skeletons")) tti = Math.min(tti, 600);

    return { domNodes, networkReqs, scrollFps, tti };
  }, [postCount, combinedPosts, isActive]);

  // ── State inspector ─────────────────────────────────────────────
  const stateEntries = useMemo((): StateEntry[] => {
    if (activeStep <= 3) return [];
    const e: StateEntry[] = [];
    e.push({ label: "posts", value: combinedPosts.length });
    e.push({ label: "DOM nodes", value: metrics.domNodes, highlight: metrics.domNodes > 100 });
    e.push({ label: "scroll FPS", value: metrics.scrollFps, highlight: metrics.scrollFps < 50 });

    if (activeStep >= 5) e.push({ label: "types shown", value: postTypeFilter.size });
    if (activeStep >= 7) e.push({ label: "pending likes", value: pendingLikes.size });
    if (activeStep >= 8) {
      e.push({ label: "new post queue", value: newPostQueue.length, highlight: newPostQueue.length > 3 });
      e.push({ label: "insert mode", value: autoInsert ? "auto (bad)" : "queue" });
    }
    if (activeStep >= 9) e.push({ label: "feed mode", value: feedMode });
    if (activeStep >= 10) e.push({ label: "virtualized", value: isActive("virtualization") });

    return e;
  }, [activeStep, combinedPosts.length, metrics, postTypeFilter, pendingLikes, newPostQueue, autoInsert, feedMode, isActive]);

  const value = useMemo(
    (): FeedContextValue => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      posts: combinedPosts,
      postCount: combinedPosts.length,
      visiblePosts,
      featureToggled,
      toggleFeature,
      isActive,
      postTypeFilter,
      togglePostType,
      pendingLikes,
      failedLikes,
      toggleLike,
      newPostQueue,
      insertNewPosts,
      autoInsert,
      setAutoInsert,
      feedMode,
      setFeedMode,
      algorithmWeights,
      setAlgorithmWeights,
      virtualWindow,
      isLoadingMore,
      networkError,
      failedPosts,
      retryPost,
      scaleLevel,
      setScaleLevel,
      metrics,
      stateEntries,
    }),
    [
      activeStep, phase,
      scopeEnabled, toggleScope,
      combinedPosts, visiblePosts,
      featureToggled, toggleFeature, isActive,
      postTypeFilter, togglePostType,
      pendingLikes, failedLikes, toggleLike,
      newPostQueue, insertNewPosts, autoInsert,
      feedMode, algorithmWeights, virtualWindow, isLoadingMore,
      networkError, failedPosts, retryPost,
      scaleLevel, metrics, stateEntries,
    ]
  );

  return (
    <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
  );
}
