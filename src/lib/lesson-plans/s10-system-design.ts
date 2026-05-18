import type { LessonMeta } from "./types";

// All system design problems follow a 3-phase ACTIVE structure:
//
// Phase 1 — ARCHITECTURE CHALLENGE (active):
//   Reader sees requirements and PREDICTS/SELECTS the architecture.
//   Reader drags component blocks into a diagram. THEN scrollytelling
//   reveals the answer, confirming or correcting their prediction.
//   ERROR MODEL: Wrong placements get specific feedback —
//   "LazyLoader needs a scroll ancestor — it can't work as a root component"
//   or "You're missing a data source — how does VirtualList know what to render?"
//   Placing a component in the wrong position shows a red connection with
//   a tooltip explaining WHY that connection fails. Active ratio: ~60%.
//
// Phase 2 — WORKING DEMO (active):
//   The core mechanic as a real interactive. Unchanged — always strong.
//   Active ratio: 100%.
//
// Phase 3 — ARCHITECT THE FIX (active, replaces MCQ):
//   Present a scaling/failure scenario. Reader must MODIFY their Phase 1
//   diagram to handle it — add a component, rewire a connection, or remove
//   something that breaks at scale. "You have 10M users. Your architecture
//   breaks here [highlighted]. Fix it." The reader edits the diagram, not
//   picks from multiple choice. This is higher-order than MCQ and won't
//   feel patronizing to senior engineers. Active ratio: ~80%.
//
// Reordered from familiar → novel for progressive difficulty.
// Cut from 12 to 10 stops (whiteboard and microfrontend deferred).
// Added synthesis capstone as final stop.
//
// SHARED PRIMITIVE: ArchitectureChallenge (drag blocks, validate connections,
// show error feedback) is reused by all 10 stops for Phase 1. Build once,
// configure per-stop with different component blocks and validation rules.
// All stops list it in reuses.

export const SYSTEM_DESIGN: Record<string, LessonMeta> = {
  "sdp-image-gallery": {
    stopId: "sdp-image-gallery",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "ImageGalleryDemo",
        description:
          "POSITION 1 (familiar, confidence builder). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees requirements (500 images, responsive grid, " +
          "fast initial load, no layout shift). Given 6 component blocks: VirtualGrid, LazyLoader, " +
          "BlurHashPlaceholder, MasonryLayout, Lightbox, srcset Resolver. Reader drags blocks into " +
          "a diagram to build the architecture. Then scrollytelling reveals the answer. " +
          "PHASE 2 — WORKING DEMO: Gallery with BlurHash → sharp transition, lazy loading via IO, " +
          "responsive masonry, virtual grid for 500+ images. Network panel: 'Loaded 8 of 500 (saving 4.2MB)'. " +
          "Lightbox with focus trap and keyboard nav. Uses CSS patterns at different 'resolutions' " +
          "— dense/detailed for loaded, pixelated for placeholder — so quality difference is VISIBLE. " +
          "PHASE 3 — ARCHITECT THE FIX: 3 scaling/failure scenarios where the reader " +
          "MODIFIES their Phase 1 diagram: " +
          "Scenario 1: 'Gallery is in a modal with its own scroll container — lazy loading breaks.' " +
          "Fix: reader must add a root option to LazyLoader or rewire IO to the modal scroll container. " +
          "Scenario 2 (S07 SYNTHESIS): 'LCP is 4.2s — hero image uses JPEG and is lazy-loaded.' " +
          "Fix: reader switches hero to AVIF + eager loading, keeps lazy for below-fold. " +
          "References perf-images (format choice + lazy loading budget) and perf-cwv (LCP metric) from S07. " +
          "Scenario 3: 'CLS audit fails — images shift layout on load.' " +
          "Fix: reader adds BlurHashPlaceholder before LazyLoader in the pipeline.",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Place architecture blocks and compare to the revealed answer",
        reaction: "Reader's prediction vs actual answer — differences highlighted. Most readers miss the BlurHash placeholder or put it in the wrong position",
        teaches: "Architecture prediction forces you to THINK about component relationships before seeing the solution",
      },
      {
        action: "Check 'bytes saved' counter after scrolling only halfway",
        reaction: "'Loaded 20 of 500 — saving 3.8MB'",
        teaches: "Combining lazy loading with virtualization means you only pay for what the user actually sees",
      },
      {
        action: "Fix the LCP issue in Phase 3 (switch hero to AVIF + eager loading)",
        reaction: "LCP drops from 4.2s to 1.6s. The fix connects image gallery design to Core Web Vitals",
        teaches: "System design extends beyond architecture — performance optimization (format, loading strategy) is part of the design",
      },
    ],
    learningOutcome: "Design an image gallery with lazy loading, virtualization, responsive images, and progressive enhancement",
    agentNotes:
      "POSITION 1: easiest problem, familiar patterns, confidence builder. " +
      "Phase 1 architecture blocks make the passive scrollytelling interactive. " +
      "Phase 3 scenarios test diagram modification skills — reader rewires architecture, not picks MCQ. " +
      "Scenario 2 (LCP synthesis) connects to S07 perf-images and perf-cwv.",
  },

  "sdp-drag-drop": {
    stopId: "sdp-drag-drop",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "DragDropDemo",
        description:
          "POSITION 2 (familiar interaction, moderate complexity). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees requirements (sortable list, " +
          "column-to-column drag, keyboard accessible, animated transitions). " +
          "Component blocks: PointerTracker, HitTester, AnimationOrchestrator, KeyboardAdapter, " +
          "DropZoneManager, GhostRenderer. Reader predicts the wiring. " +
          "PHASE 2 — WORKING DEMO: Trello-style columns with cards. " +
          "Drag within a column (flat sort) AND between columns (2D hit testing). " +
          "Pointer event timeline running alongside showing pointerdown → pointermove → pointerup. " +
          "Drop zones highlight as pointer enters them. " +
          "Keyboard mode: arrow keys + enter for same reordering, fully accessible. " +
          "EXTENDED from flat list to nested sortables per critique — this is the real design challenge. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Nested columns with 500 cards — hit testing is slow.' " +
          "Fix: reader adds a SpatialIndex component between PointerTracker and HitTester. " +
          "Scenario 2: 'User is on a touch device — long press conflicts with scroll.' " +
          "Fix: reader rewires PointerTracker to add a delay threshold, or adds a drag handle. " +
          "Scenario 3 (S07 SYNTHESIS): 'Drag animation causes 15ms layout thrashing per frame — jank.' " +
          "Fix: reader replaces DOM reorder with transform-based positioning (composite-only, no layout). " +
          "References perf-js (main thread) and core-render-cycle (pipeline stages) from S01/S07.",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Drag a card between columns and watch the hit testing visualization",
        reaction: "Drop zones light up as pointer crosses boundaries — 2D hit testing is visible as geometric regions",
        teaches: "Cross-column drag requires 2D hit testing — the drop zone geometry determines where items land",
      },
      {
        action: "Toggle keyboard mode and reorder with arrow keys",
        reaction: "Same smooth reordering animation, no pointer events needed",
        teaches: "Accessible drag-and-drop must have a keyboard alternative — both paths produce the same result",
      },
      {
        action: "Replace DOM reorder with transform-based positioning in Phase 3 Scenario 3",
        reaction: "Frame time drops from 15ms to 2ms. DevTools shows: zero layout recalculations — only composite. Smooth even at 500 cards",
        teaches: "Transform-based drag avoids layout thrashing — composite-only updates are 7x faster than DOM reorder per frame",
      },
    ],
    learningOutcome: "Design drag-and-drop with pointer events, 2D hit testing, keyboard accessibility, and nested sortables",
    agentNotes:
      "EXTENDED to Trello-style columns (nested sortables) per critique — flat list is too simple. " +
      "Pointer event timeline is the teaching device. Keyboard mode is non-negotiable.",
  },

  "sdp-notifications": {
    stopId: "sdp-notifications",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "NotificationDemo",
        description:
          "POSITION 3 (queuing concepts, manageable complexity). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees requirements (multiple types, " +
          "priority ordering, max 3 visible, push integration). Component blocks: " +
          "ToastQueue, PriorityScheduler, ToastRenderer, NotificationCenter, PushSubscriber, " +
          "PermissionManager. Reader wires the architecture. " +
          "PHASE 2 — WORKING DEMO: " +
          "Spam button fires 10 mixed-priority notifications. Priority queue visualization: " +
          "error jumps ahead, info waits, expired auto-dismiss. " +
          "Toast timer pauses on hover. " +
          "Push permission flow: reader can click 'Allow' OR 'Block'. " +
          "'Block' shows consequence: button disabled, message 'Permission denied — user must " +
          "manually re-enable in browser settings.' The FAILURE path teaches more than success. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: '10 errors fire simultaneously — toast stack is overwhelming.' " +
          "Fix: reader adds a BatchAggregator between PriorityScheduler and ToastRenderer. " +
          "Scenario 2: 'User blocked push — notification bell shows stale count.' " +
          "Fix: reader adds a PollingFallback component that bypasses PushSubscriber. " +
          "Scenario 3: 'Notification references a deleted item.' " +
          "Fix: reader adds validation between NotificationCenter and navigation action. " +
          "Scenario 4 (S05 SYNTHESIS): 'Notification queue state is lost on page refresh — " +
          "10 queued notifications vanish.' Fix: reader adds a PersistenceLayer between " +
          "ToastQueue and SessionStorage. References state-storage from S05 (browser storage " +
          "for ephemeral UI state). Also: reader decides if dismissed state lives in memory " +
          "or persists — memory means re-showing on refresh, storage means silent loss. " +
          "MYSTERY BLOCK: Phase 1 gives 5 of 6 blocks. The 6th is blank: '??? — what prevents " +
          "the same notification from showing twice after a page refresh?' Answer: DeduplicationGuard " +
          "(tracks notification IDs in sessionStorage).",
        reuses: ["DemoSandbox", "DialSegment", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Spam notifications and watch error jump the queue",
        reaction: "Error notifications displace info notifications — priority ordering is visible in real-time",
        teaches: "Toast systems need priority queuing — an error should never wait behind 3 info toasts",
      },
      {
        action: "Click 'Block' on the push permission dialog",
        reaction: "Permission denied — request button disabled permanently. Message: 'Cannot re-request. User must go to browser settings.'",
        teaches: "The push permission is a one-shot decision — once blocked, you cannot programmatically re-ask. Design for denial.",
      },
      {
        action: "Add PersistenceLayer in Phase 3 to survive page refresh",
        reaction: "Queued notifications persist across refresh. DeduplicationGuard prevents re-showing dismissed ones",
        teaches: "Ephemeral UI state (notification queue, dismissed IDs) needs explicit persistence — without it, refresh loses context",
      },
    ],
    learningOutcome: "Design a notification system with priority queuing, permission failure handling, and push integration",
    agentNotes:
      "The 'Block' consequence is a new teaching moment — most demos only show the happy path. " +
      "Spam button with priority visualization is the core interaction. " +
      "MYSTERY BLOCK: 5 of 6 blocks given, reader must NAME the DeduplicationGuard. " +
      "S05 SYNTHESIS: Scenario 4 connects queue persistence to state-storage from S05.",
  },

  "sdp-autocomplete": {
    stopId: "sdp-autocomplete",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "AutocompleteDemo",
        description:
          "POSITION 4 (debounce + cache, moderate complexity). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees 'build autocomplete for a search bar " +
          "with 1M possible results.' Component blocks: DebounceController, AbortManager, " +
          "TrieCache, ResultRenderer, KeyboardNavigator, NetworkLayer. Reader builds the pipeline. " +
          "PHASE 2 — WORKING DEMO: " +
          "Network panel with request dots: blue (in-flight), red (aborted), green (completed), " +
          "yellow-green (cache hit). Three-mode comparison: no debounce (10 requests), " +
          "debounce (2 requests), with cache (0 requests on second search). " +
          "TRIE VISUALIZER: as the reader searches, the trie grows. Clicking a trie node shows " +
          "its cached results. The data structure is VISIBLE, not a black box. " +
          "Debounce timer bar resets on each keystroke, fires when full. " +
          "Keyboard nav: up/down/enter. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Cache has 10K entries at 8MB — app is sluggish.' " +
          "Fix: reader adds LRU eviction policy to TrieCache, wires a MemoryMonitor. " +
          "Scenario 2: 'Results arrive out of order — stale results overwrite fresh ones.' " +
          "Fix: reader adds a SequenceGuard between NetworkLayer and ResultRenderer. " +
          "Scenario 3: 'User types and deletes rapidly — 20 in-flight requests.' " +
          "Fix: reader wires AbortManager to cancel on each keystroke, not just debounce. " +
          "Scenario 4 (S02 SYNTHESIS): 'ResultRenderer uses innerHTML to render highlighted matches — " +
          "a search for <img onerror=alert(1)> executes XSS.' Fix: reader switches ResultRenderer " +
          "to use textContent + mark elements for highlighting, or adds a SanitizeLayer between " +
          "TrieCache and ResultRenderer. References dom-refresher from S02 (innerHTML vs textContent) " +
          "and sec-xss from S09 (output encoding).",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Type 'javascript' quickly in no-debounce mode and watch 10 request dots fire",
        reaction: "Network panel fills with blue dots. Most turn red (aborted) as the next keystroke fires. Wasted bandwidth visible",
        teaches: "Without debounce, every keystroke fires a request — most are immediately wasted",
      },
      {
        action: "Search 'java' then search 'javascript' — watch the trie visualizer",
        reaction: "First search: network request, trie grows j→a→v→a branch. Second search: trie walks to j→a→v→a→s, green flash — cache hit, zero requests",
        teaches: "Trie caching means any prefix of a previous search is already cached — the data structure makes this automatic",
      },
      {
        action: "Search for '<img onerror=alert(1)>' in Phase 3 Scenario 4",
        reaction: "innerHTML renders the payload — XSS executes. Switch to textContent + mark elements — payload appears as harmless text",
        teaches: "Search results that render user input via innerHTML are XSS vectors — system design includes output encoding",
      },
    ],
    learningOutcome: "Design autocomplete with debouncing, cancellation, trie caching with visible data structure, and keyboard navigation",
    agentNotes:
      "The TRIE VISUALIZER is new — per critique, the trie was a black box. Now the reader " +
      "sees the tree grow and can click nodes to inspect cached results. " +
      "Network panel with colored request dots is the hero visualization. " +
      "S02+S09 SYNTHESIS: Scenario 4 connects innerHTML XSS risk to dom-refresher and sec-xss.",
  },

  "sdp-news-feed": {
    stopId: "sdp-news-feed",
    format: "system-design",
    effort: "xl",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "NewsFeedDemo",
        description:
          "POSITION 5 (virtualization + real-time, moderate-to-hard). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader gets requirements (infinite scroll, " +
          "real-time new posts, instant likes, no scroll jumps). Component blocks to place: " +
          "VirtualList, PostCard, LikeButton, OptimisticLayer, WebSocketPipe, ???, " +
          "NewPostBanner. Reader predicts which blocks connect to which. " +
          "MYSTERY BLOCK: 6 of 7 blocks given. The 7th is blank: '??? — new posts prepend above " +
          "the viewport but the user's scroll position stays stable. What prevents the jump?' " +
          "Answer: ScrollCompensator (adjusts scrollTop by the height of prepended content). " +
          "DEMO-FIRST HOOK: Before Phase 1 scrollytelling, the DOM counter demo is immediately interactive. " +
          "Reader scrolls a virtualized list freely and notices the counter stays at ~20. No time limit — " +
          "a 'Continue to Architecture' button appears after first scroll. Discovery before explanation. " +
          "PHASE 2 — WORKING DEMO: " +
          "Full social feed: scroll, like (optimistic with 10% server failure → rollback), " +
          "'New posts' banner that prepends without scroll jump. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Feed has variable-height posts — scroll position jumps on new content.' " +
          "Fix: reader adds ScrollCompensator wired between VirtualList and NewPostBanner. " +
          "Scenario 2: 'Like server fails 3x in a row — user sees flickering count.' " +
          "Fix: reader adds RetryWithBackoff before OptimisticLayer's rollback trigger. " +
          "Scenario 3: 'Feed loads 200 posts but user only sees 5 — wasted bandwidth.' " +
          "Fix: reader rewires to paginate (fetch 20, not 200) with VirtualList handling the rest. " +
          "Scenario 4 (REMOVE PATTERN — breaks the 'add a block' formula): 'Requirements change: no more " +
          "real-time updates, posts refresh on pull-to-refresh only.' " +
          "Fix: reader DISCONNECTS and REMOVES WebSocketPipe and NewPostBanner entirely. " +
          "Feed simplifies from 7 components to 5. Architecture gets cleaner, not more complex. " +
          "Teaches: good system design also means knowing what to LEAVE OUT when requirements change. " +
          "Scenario 5 (S08 SYNTHESIS): 'Product wants SEO for public feed + instant for logged-in users.' " +
          "Fix: reader adds a RenderingSwitch node BETWEEN the data-fetching layer and PostCard. " +
          "Wires two output paths: SSR path from RenderingSwitch → ServerRenderer (new block, appears " +
          "when dragged) → PostCard (server-rendered HTML with streamed posts, SEO crawlers see full markup). " +
          "CSR path from RenderingSwitch → existing VirtualList → PostCard (client-rendered, instant after auth). " +
          "The diagram shows a routing fork. Consequence: toggle 'crawler view' — SSR path shows rich " +
          "snippets in mock search results, CSR path shows 'No description available.' " +
          "References render-choose from S08 (strategy composition wireframe pattern).",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Scroll the feed and watch the DOM counter stay at ~20",
        reaction: "Counter stays constant regardless of scroll depth — virtualization at work. Reader notices BEFORE explanation",
        teaches: "Discovery before explanation: noticing the DOM counter first creates the question that the architecture answers",
      },
      {
        action: "Like a post, see instant increment, then watch the rare server rollback",
        reaction: "9 out of 10: silent confirm. 1 in 10: count decrements with a red flash — server rejected",
        teaches: "Optimistic UI must handle rollback gracefully — the rare failure case is the design challenge",
      },
      {
        action: "Wire RenderingSwitch with two output paths — SSR→ServerRenderer and CSR→VirtualList — then toggle 'crawler view'",
        reaction: "SSR path: mock search results show rich snippets with post titles and thumbnails. CSR path: 'No description available' — broken listing. The routing fork in the diagram lights up per path",
        teaches: "Hybrid rendering is a routing decision, not a global choice — public pages need SSR for SEO, authenticated pages prioritize CSR speed",
      },
    ],
    learningOutcome: "Design a news feed with virtualized infinite scroll, real-time updates, optimistic UI, and scroll compensation",
    agentNotes:
      "DEMO-FIRST HOOK: DOM counter is immediately interactive (reader-controlled, no timer). " +
      "Reader discovers the behavior, then Phase 1 explains it. This inverts the passive-first problem. " +
      "MYSTERY BLOCK: ScrollCompensator is the 7th block the reader must name — fills position 5 gap. " +
      "REMOVE PATTERN: Scenario 4 breaks the 'add a block' formula — reader removes components. " +
      "S08 SYNTHESIS: Scenario 5 connects rendering strategy to render-choose from S08.",
  },

  "sdp-chat": {
    stopId: "sdp-chat",
    format: "system-design",
    effort: "xl",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "ChatDemo",
        description:
          "POSITION 6 (WebSocket + offline, moderate-to-hard). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees chat requirements (real-time messages, " +
          "typing indicators, offline queueing, message status). Component blocks: " +
          "WebSocketManager, MessageQueue, PresenceTracker, OptimisticInserter, StatusPipeline, " +
          "ReconnectionHandler. " +
          "PHASE 2 — WORKING DEMO: Two-panel chat (you + Alice). " +
          "BIDIRECTIONAL TYPING: when the reader types in the input (without sending), Alice's " +
          "panel shows 'You are typing...' — makes presence bidirectional, not just one-way. " +
          "Message status pipeline: sent(✓) → delivered(✓✓) → read(✓✓ blue). " +
          "Offline toggle: messages queue (orange), reconnect → ordered flush. " +
          "WebSocket frame log shows protocol reality. " +
          "WHEN-NOT-TO prompt: 'This chat has 2 users. When is WebSocket overkill vs polling?' " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: '10K users in one room — WebSocket fan-out is too slow.' " +
          "Fix: reader adds a PubSubRouter between server and WebSocketManager, or shards rooms. " +
          "Scenario 2: 'WebSocket drops mid-message — message is lost.' " +
          "Fix: reader wires MessageQueue to persist outgoing messages before send, adds ack tracking. " +
          "Scenario 3: 'Alice and you both offline, both send — merge conflict on reconnect.' " +
          "Fix: reader adds timestamp-based ordering to SyncQueue with vector clock. " +
          "Scenario 4 (S09 SYNTHESIS): 'Alice sends a message containing <img onerror=alert(1)>.' " +
          "Fix: reader adds a MessageSanitizer component before MessageRenderer. References sec-xss from S09. " +
          "Also: reader must decide where tokens are stored (HttpOnly cookie for refresh, memory for access). " +
          "References sec-cookies from S09.",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Type in the input without sending and see 'You are typing...' on Alice's panel",
        reaction: "Your own typing indicator is visible from the other side — presence is bidirectional",
        teaches: "Typing events fire before message events — presence is a lightweight real-time signal separate from messages",
      },
      {
        action: "Send messages while offline then reconnect",
        reaction: "Orange queue drains in order, server confirms each, status updates cascade",
        teaches: "Offline resilience requires an ordered message queue with retry on reconnection",
      },
      {
        action: "Add MessageSanitizer to stop Alice's XSS payload in Phase 3",
        reaction: "The <img onerror=alert(1)> renders as harmless text instead of executing. Security cross-section link confirmed",
        teaches: "Chat is an XSS vector — every user-generated message must be sanitized before rendering. System design includes security",
      },
    ],
    learningOutcome: "Design real-time chat with bidirectional presence, offline queueing, and message status pipeline",
    agentNotes:
      "BIDIRECTIONAL TYPING is the new teaching moment — reader sees their own typing indicator " +
      "from Alice's perspective. WHEN-NOT-TO prompt forces the reader to consider if WebSocket " +
      "is even the right tool.",
  },

  "sdp-video-streaming": {
    stopId: "sdp-video-streaming",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "VideoStreamingDemo",
        description:
          "POSITION 7 (ABR algorithms, novel for most). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees streaming requirements (continuous " +
          "playback, bandwidth adaptation, minimal stalls). Component blocks: " +
          "SegmentFetcher, BufferManager, ABRController, QualitySelector, BandwidthEstimator, " +
          "StallDetector. " +
          "PHASE 2 — WORKING DEMO: " +
          "Mock player using CSS PATTERNS at different 'resolutions': dense/detailed patterns for " +
          "high quality, blocky/pixelated patterns for low quality. When ABR drops from 1080p to " +
          "480p, the visual content VISIBLY DEGRADES — reader SEES quality loss, not just a label. " +
          "Buffer bar with colored segments. Bandwidth + quality overlay graph. " +
          "ABR on/off toggle: without ABR → stall spinner. With ABR → quality drops smoothly. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Bandwidth recovers but quality stays low for 30 seconds — viewer complains.' " +
          "Fix: reader adjusts ABRController's ramp-up speed, adds a BandwidthProbe before quality change. " +
          "Scenario 2: 'User seeks to unbuffered position — 5 second stall.' " +
          "Fix: reader adds a SeekOptimizer that drops to lowest quality for instant playback, then ramps. " +
          "Scenario 3: 'Live stream, not VOD — buffer can't be long without falling behind.' " +
          "Fix: reader removes buffer pre-fill, wires BufferManager to maintain max 2-second window. " +
          "Scenario 4 (S07 SYNTHESIS): 'Page load takes 6 seconds — the video player's JavaScript " +
          "bundle is 800KB.' Fix: reader adds CodeSplitLoader that lazy-loads the player only when " +
          "the viewport scrolls to it, or when user clicks 'Play'. The player shell renders instantly " +
          "(poster image + play button) while ABRController + SegmentFetcher load in background. " +
          "References perf-bundle (code splitting) and perf-hints (preconnect to CDN) from S07.",
        reuses: ["DemoSandbox", "DialSegment", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Toggle ABR off and on during the same bandwidth drop — compare stall vs smooth degradation",
        reaction: "ABR off: buffer empties, spinner, freeze. ABR on: pattern shifts from detailed to pixelated but playback continues. Same drop, opposite outcomes",
        teaches: "ABR trades visual quality for continuity — without it, bandwidth drops cause the worst streaming UX (stalls)",
      },
      {
        action: "Seek to an unbuffered position and watch the buffer bar rebuild from scratch",
        reaction: "Buffer bar clears entirely. Playback pauses briefly, then resumes at lowest quality. Quality ramps up over 3-4 seconds as new segments download",
        teaches: "Seek invalidates the entire buffer — the player must refill from zero, starting at low quality for instant playback",
      },
      {
        action: "Lazy-load the player in Phase 3 Scenario 4 and check page load time",
        reaction: "Page load drops from 6s to 1.2s. Player bundle loads on interaction. Preconnect hint warms the CDN connection",
        teaches: "Video players are heavy bundles — code splitting + preconnect turns a 6s page load into a 1.2s shell with on-demand player",
      },
    ],
    learningOutcome: "Design adaptive streaming with visible quality degradation, buffer management, and bandwidth estimation",
    agentNotes:
      "CSS PATTERNS replace abstract 'quality labels' — the reader SEES resolution degrade. " +
      "ABR on/off toggle is the before/after hero interaction. " +
      "S07 SYNTHESIS: Scenario 4 connects player bundle size to code splitting and preconnect. " +
      "3 DISTINCT discoveries: D1 is the ABR comparison (one toggle, two outcomes), D2 is seek " +
      "behavior (buffer invalidation + quality ramp), D3 is bundle lazy-loading (S07 synthesis).",
  },

  "sdp-offline-first": {
    stopId: "sdp-offline-first",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "OfflineFirstDemo",
        description:
          "POSITION 8 (sync + conflict, hard). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees offline requirements (works without " +
          "network, syncs on reconnect, handles conflicts). Component blocks: " +
          "IndexedDBStore, SyncQueue, ConflictResolver, ServiceWorkerCache, VersionVector, " +
          "RetryScheduler. " +
          "PHASE 2 — WORKING DEMO: TWO DEVICE PANELS (not one + simulated server). " +
          "'Device A' and 'Device B' — reader makes changes on A, switches to B, makes " +
          "conflicting changes, then reconciles. The conflict is REAL because the reader created it. " +
          "Sync queue visualization: orange cards fly from device to server. " +
          "Conflict resolution modal: 'Your version' vs 'Other device version' — choose or merge. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Both devices delete the same item — sync queue throws an error.' " +
          "Fix: reader adds idempotent delete handling to ConflictResolver (delete of deleted = no-op). " +
          "Scenario 2: 'Device A edits title, B edits description — full-item conflict resolution loses data.' " +
          "Fix: reader switches from item-level to field-level conflict resolution in ConflictResolver. " +
          "Scenario 3: '200 queued changes after 3 days offline — sync takes 2 minutes.' " +
          "Fix: reader adds batch compression to SyncQueue (merge sequential edits to same item). " +
          "Scenario 4 (S09 SYNTHESIS): 'Sensitive data (health records) stored in IndexedDB — " +
          "another tab or a browser extension can read it.' Fix: reader adds an EncryptionLayer " +
          "between the app and IndexedDBStore. Data encrypted at rest with a key derived from " +
          "user password (Web Crypto API). References sec-xss from S09 (XSS reading IndexedDB) " +
          "and sec-cookies from S09 (HttpOnly for encryption key storage). " +
          "MYSTERY BLOCK: Phase 1 gives 5 of 6 blocks. The 6th is blank: '??? — what prevents " +
          "Device A from syncing a change that Device B already overwrote with newer data?' " +
          "Answer: VersionVector (tracks causal ordering across devices).",
        reuses: ["DemoSandbox", "DialToggle", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Edit on Device A, make conflicting edit on Device B, then sync",
        reaction: "Conflict modal appears with both versions — reader created this conflict themselves",
        teaches: "Conflicts feel real when you create them yourself. The resolution strategy (LWW, merge, user-picks) must be explicit",
      },
      {
        action: "Watch sync queue drain after reconnecting Device A",
        reaction: "Orange cards fly to server one by one — each confirmed, until the conflict card pauses and asks for resolution",
        teaches: "Sync queues process sequentially until they hit a conflict — then the strategy determines what happens",
      },
      {
        action: "Add EncryptionLayer in Phase 3 to protect IndexedDB data at rest",
        reaction: "Data in IndexedDB is now encrypted blobs. Another tab reading raw DB sees gibberish. Decryption requires user-derived key",
        teaches: "IndexedDB is readable by any script on the origin — sensitive offline data needs encryption at rest, not just HTTPS in transit",
      },
    ],
    learningOutcome: "Design an offline-first app with two-device sync, conflict resolution, and progressive queue drainage",
    agentNotes:
      "TWO DEVICE PANELS is the key change — reader creates conflicts themselves instead of " +
      "watching artificial ones. This makes conflict resolution feel earned, not scripted. " +
      "MYSTERY BLOCK: VersionVector is the 6th block the reader must name — it was previously " +
      "an unexplained component, now it is the mystery to solve. " +
      "S09 SYNTHESIS: Scenario 4 connects IndexedDB encryption to sec-xss and sec-cookies.",
  },

  "sdp-multi-tab": {
    stopId: "sdp-multi-tab",
    format: "system-design",
    effort: "large",
    proseTarget: [1200, 1800],
    interactives: [
      {
        component: "MultiTabDemo",
        description:
          "POSITION 9 (leader election, hard). " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees multi-tab requirements (shared state, " +
          "single API caller, tab crash recovery). Component blocks: " +
          "BroadcastChannel, StorageEventBridge, SharedWorkerHub, LeaderElector, StateSerializer, " +
          "HeartbeatMonitor. " +
          "PHASE 2 — WORKING DEMO: 2-3 tab panels. " +
          "LARGE STATE TOGGLE: switch from counter (trivial) to 500-item list. " +
          "With 500 items, localStorage hits serialization overhead and BroadcastChannel's " +
          "message size matters. The mechanism choice STARTS TO MATTER at scale. " +
          "Leader election: crown animation, close leader → election. " +
          "Sync mechanism comparison with visible latency. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'State is 2MB — localStorage sync stutters, UI jank on every update.' " +
          "Fix: reader rewires from StorageEventBridge to BroadcastChannel for large payloads. " +
          "Scenario 2: 'Leader tab crashes mid-write — followers have partial state.' " +
          "Fix: reader adds write-ahead log to LeaderElector so new leader can recover from journal. " +
          "Scenario 3: 'User opens 20 tabs — election storms on every tab open/close.' " +
          "Fix: reader adds debounced election with HeartbeatMonitor threshold (don't re-elect on brief disconnects). " +
          "Scenario 4: 'BroadcastChannel chokes on 2MB state snapshots — postMessage serialization jank.' " +
          "Fix: reader rewires the full-state sync path from BroadcastChannel to SharedWorkerHub. " +
          "SharedWorkerHub holds the canonical state in a single worker — tabs request slices, not full copies. " +
          "BroadcastChannel stays for lightweight delta messages (<60KB). The diagram now shows two sync paths. " +
          "Scenario 5 (S05 SYNTHESIS): 'State includes 500 items with nested objects — " +
          "StorageEventBridge serializes 2MB on every keystroke, causing 200ms UI jank.' " +
          "Fix: reader adds a DeltaSyncLayer that broadcasts only CHANGED fields via " +
          "BroadcastChannel (structured clone, no serialization), falling back to StorageEventBridge " +
          "for full-state sync on tab init. References state-shape from S05 (state normalization " +
          "for efficient updates) and state-storage from S05 (storage API tradeoffs).",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Toggle 'large state' and compare sync mechanisms",
        reaction: "localStorage stutters with 500 items (serialization overhead). BroadcastChannel stays fast. The choice matters at scale",
        teaches: "Sync mechanism choice is irrelevant for trivial state and critical for large state — scale reveals the difference",
      },
      {
        action: "Close the leader tab and watch the election",
        reaction: "Crown animates away → heartbeat timeout → election → new leader crowned. Other tabs continue working",
        teaches: "Leader election ensures one tab owns API calls — prevents duplicate requests and race conditions",
      },
      {
        action: "Add DeltaSyncLayer in Phase 3 to broadcast only changed fields",
        reaction: "UI jank disappears — BroadcastChannel sends 50 bytes (delta) instead of 2MB (full state). Latency drops from 200ms to <1ms",
        teaches: "Delta sync vs full-state sync is the serialization tradeoff — normalized state (flat, keyed) enables efficient deltas",
      },
    ],
    learningOutcome: "Synchronize state across tabs with mechanism selection based on state size, leader election, and crash recovery",
    agentNotes:
      "LARGE STATE TOGGLE is the key addition — at trivial scale all mechanisms work identically. " +
      "At 500 items, the differences become real. Crown animation for leader election is memorable. " +
      "SharedWorkerHub is used in Scenario 4: large state snapshots route through the worker, " +
      "keeping BroadcastChannel for lightweight deltas. This gives SharedWorkerHub a concrete role. " +
      "S05 SYNTHESIS: Scenario 5 connects serialization cost to state normalization from S05.",
  },

  "sdp-spreadsheet": {
    stopId: "sdp-spreadsheet",
    format: "system-design",
    effort: "xl",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "SpreadsheetDemo",
        description:
          "POSITION 10 (dependency DAG, hardest algorithmic problem). " +
          "SCOPE CUT: 10x10 visible grid with NO virtualization (S04 already covers that). " +
          "Formula parser supports simple arithmetic only (=A1+B1, =A1*2, no SUM/functions). " +
          "Focus is entirely on the dependency graph and cascade — the teaching value. " +
          "PHASE 1 — ARCHITECTURE CHALLENGE: Reader sees spreadsheet requirements (formulas, " +
          "dependency tracking, change propagation, cycle detection). Component blocks: " +
          "CellGrid, FormulaParser, DependencyDAG, TopologicalSorter, CycleDetector, " +
          "CascadeAnimator. Reader predicts the data flow. " +
          "PHASE 2 — WORKING DEMO: " +
          "10x10 grid. Click a cell with a formula → see dependency arrows. " +
          "Edit a dependency → watch CASCADE ANIMATION: cells highlight in topological order. " +
          "A1 → B1 (=A1+1) → C1 (=B1*2) → D1 (=C1+A1). " +
          "Create circular dependency → cycle highlighted in red, #CIRCULAR! error. " +
          "DEPENDENCY GRAPH PANEL: live DAG visualization beside the grid showing arrows " +
          "between cells. New edges appear as formulas are typed. " +
          "PHASE 3 — ARCHITECT THE FIX: " +
          "Scenario 1: 'Cell A1 has 500 dependents — cascade takes 2 seconds, UI freezes.' " +
          "Fix: reader adds BatchScheduler between DependencyDAG and CascadeAnimator (async batches of 50). " +
          "Scenario 2: 'User pastes 100 cells — 100 individual cascades fire.' " +
          "Fix: reader adds a TransactionBatcher that collects all changes before triggering one cascade. " +
          "Scenario 3: 'Formula references a deleted cell.' " +
          "Fix: reader adds a DeadRefHandler to DependencyDAG that shows #REF! and removes the edge. " +
          "Scenario 4 (S07+S08 SYNTHESIS): 'Cascade recalculation of 500 cells blocks the main thread " +
          "for 800ms — Long Task, INP spike.' Fix: reader adds a ChunkScheduler that breaks the " +
          "cascade into 50-cell batches using requestIdleCallback, yielding between batches. " +
          "UI stays responsive during recalculation. References perf-js (main thread blocking, " +
          "Long Tasks) from S07. Also: for the 10x10 grid re-render, reader decides between " +
          "re-rendering changed cells only (DOM diffing) vs full grid repaint (simpler, slower). " +
          "References render-rsc (selective re-rendering) from S08. " +
          "MYSTERY BLOCK: Phase 1 gives 5 of 6 blocks. The 6th is blank: '??? — what component " +
          "prevents infinite evaluation loops when A1 depends on B1 and B1 depends on A1?' " +
          "Answer: CycleDetector.",
        reuses: ["DemoSandbox", "ArchitectureChallenge"],
      },
    ],
    discoveries: [
      {
        action: "Edit A1 and watch the cascade animate through dependent cells",
        reaction: "Cells highlight in topological order: A1 → B1 → C1 → D1. Each waits for its dependencies",
        teaches: "Change propagation follows the dependency DAG — topological sort guarantees correct evaluation order",
      },
      {
        action: "Type =B1 in A1 when B1 already references A1",
        reaction: "Cycle detected instantly. Both cells show #CIRCULAR! error. DAG panel highlights the cycle in red",
        teaches: "Cycle detection must run on every formula edit — without it, the cascade would loop infinitely",
      },
      {
        action: "Break cascade into 50-cell batches in Phase 3 Scenario 4",
        reaction: "Long Task badge disappears. Cascade animates in batches — UI stays responsive between chunks. INP drops from 800ms to <50ms",
        teaches: "Large cascades must yield to the main thread — requestIdleCallback + chunking prevents Long Tasks from blocking user input",
      },
    ],
    learningOutcome: "Design a spreadsheet with dependency DAG, topological cascade, and cycle detection (scoped: no virtualization, simple formulas)",
    agentNotes:
      "SCOPED DOWN: 10x10 grid, no virtualization, no SUM/functions. The teaching value is " +
      "100% in the dependency DAG and cascade animation — that's where the time should go. " +
      "The DAG panel beside the grid makes the data structure visible at all times. " +
      "MYSTERY BLOCK: CycleDetector is the 6th block the reader must name. " +
      "S07+S08 SYNTHESIS: Scenario 4 connects cascade cost to main thread blocking and selective re-rendering.",
  },

  "sdp-design-your-own": {
    stopId: "sdp-design-your-own",
    format: "system-design",
    effort: "xl",
    proseTarget: [500, 800],
    interactives: [
      {
        component: "SystemDesignSandbox",
        description:
          "SYNTHESIS CAPSTONE — the capstone of the capstone. " +
          "Reader picks a problem from a curated list (or writes their own) and builds an " +
          "architecture using a COMPONENT LIBRARY drawn from all previous stops: " +
          "- VirtualList (from S04, sdp-news-feed) " +
          "- WebSocketPipe (from S06, sdp-chat) " +
          "- OptimisticLayer (from sdp-news-feed, sdp-chat) " +
          "- SyncQueue (from sdp-offline-first) " +
          "- PriorityQueue (from sdp-notifications) " +
          "- DebounceController (from sdp-autocomplete) " +
          "- LeaderElector (from sdp-multi-tab) " +
          "- DependencyDAG (from sdp-spreadsheet) " +
          "- ABRController (from sdp-video-streaming) " +
          "- LazyLoader (from sdp-image-gallery) " +
          "Reader drags components into a canvas, wires them together with arrows, " +
          "and annotates data flow. No code — pure architecture. " +
          "CURATED PROBLEMS (not covered in previous stops): " +
          "- Design a real-time dashboard (combines WebSocket + VirtualList + Priority) " +
          "- Design a collaborative document editor (combines SyncQueue + DependencyDAG + Optimistic) " +
          "- Design a music streaming player (combines ABR + Lazy + offline caching) " +
          "STRUCTURAL VALIDATOR with TWO FIDELITY LEVELS: " +
          "V1 (graph connectivity — shippable MVP): validates that all components are connected, " +
          "no orphan nodes, every component has at least one input/output wired. Feedback: " +
          "'Your architecture has no data flow between X and Y — how do they communicate?' " +
          "and 'Component X has no input — what feeds it?' " +
          "V2 (interface matching — enhancement): validates that connected components have " +
          "compatible interfaces. WebSocketPipe outputs messages, so the downstream component " +
          "must accept messages. LazyLoader needs a scroll container, so its parent must be " +
          "scrollable. Feedback: 'LazyLoader expects a scroll ancestor but VirtualList outputs " +
          "rendered items, not scroll events — add a ScrollContainer between them.' " +
          "V1 can ship without V2. V2 adds depth but is not blocking.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Wire up a dashboard without a WebSocket pipe",
        reaction: "Validator: 'Your dashboard has no real-time data source — how do the charts update?'",
        teaches: "System design is about CONNECTIONS between components, not just having the right pieces",
      },
      {
        action: "Add every component from the library to a simple problem",
        reaction: "Validator: 'Your architecture has 10 components for a problem that needs 4 — complexity is a cost'",
        teaches: "Over-engineering is as much a design failure as under-engineering",
      },
    ],
    learningOutcome: "Synthesize system design knowledge by composing components from all previous problems into novel architectures",
    agentNotes:
      "This is the SYNTHESIS the section was missing. Reader uses components from all previous " +
      "stops to solve a NEW problem. The structural validator prevents random wiring and " +
      "teaches that architecture is about data flow, not component collection. " +
      "No code — pure architecture composition. The validator is the teaching device. " +
      "V2 FEASIBILITY: V1 (graph connectivity) is the shippable MVP. V2 (interface matching) is a " +
      "POST-SHIP enhancement — requires defining typed interfaces per component, adding significant " +
      "authoring overhead. Ship V1 first, add V2 as a stretch iteration.",
  },
};
