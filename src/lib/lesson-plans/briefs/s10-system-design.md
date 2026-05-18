# Section 10: System Design Problems -- Implementation Briefs

> Every stop below follows the same 3-phase structure:
> Phase 1 (Architecture Scrollytelling) builds up the system diagram.
> Phase 2 (Working Demo) is a functional mini-app the reader uses.
> Phase 3 (Tradeoff Scrollytelling) reveals constraints and alternatives.
>
> Each stop is a self-contained blueprint. An agent reading a single stop
> should have enough detail to build the component without asking design questions.

---

## sdp-news-feed -- News Feed
**Format**: system-design | **Effort**: xl
**Cross-section refs**: S04 `virt-windowing` (virtualization), S04 `virt-fixed-vs-variable` (variable-height rows), S06 `net-long-polling` (WebSocket for real-time push), S07 `perf-js` (main-thread budget), S05 `state-search` (data structure for post lookup)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: blank canvas. A product spec card fades in: "Infinite scroll feed. Real-time new post notifications. Instant like feedback."
- Three requirement pills appear in a row: `INFINITE SCROLL`, `REAL-TIME`, `OPTIMISTIC UI`.

**Scroll step 2 -- Feed component**:
- Visual: a `<Feed>` box appears center-left. Label: "Feed (container)". Inside it, a vertical stack of grey placeholder rectangles representing posts.
- Narrative: "The feed is a scrollable container holding post cards. But rendering thousands of posts destroys performance."

**Scroll step 3 -- VirtualList layer**:
- Visual: a `<VirtualList>` box wraps the post stack. The grey rectangles outside a highlighted "viewport" zone fade to dashed outlines (ghost items). A DOM counter appears: "DOM nodes: ~20".
- Arrow from VirtualList to Feed with label "renders only visible posts".
- Narrative: "Virtualization renders only the visible posts. Scrolling recycles DOM nodes -- the counter stays constant."

**Scroll step 4 -- PostCard component**:
- Visual: one post rectangle expands into a detailed `<PostCard>` wireframe: avatar circle, name text, body lines, like button, timestamp. Below it: `<LikeButton>` sub-component highlighted.
- Arrow from Feed down to PostCard.

**Scroll step 5 -- Optimistic update layer**:
- Visual: a horizontal layer labeled `Optimistic Update Layer` appears between PostCard and a `Server` box on the right. Two arrows: "instant UI update" going up to PostCard, "async confirm/rollback" going right to Server.
- Narrative: "Likes update the UI instantly. The server confirms asynchronously. On failure, the UI rolls back."

**Scroll step 6 -- WebSocket for notifications**:
- Visual: a `WebSocket` pipe connects the Server box to a `<NewPostsBanner>` component above the Feed. Animated dots flow through the pipe. The banner reads "3 new posts".
- Arrow from WebSocket to NewPostsBanner with label "push notification".
- Narrative: "New posts arrive via WebSocket. A banner appears at the top -- clicking it prepends posts without scroll jump."

**Scroll step 7 -- Full architecture**:
- Visual: all components visible with all arrows. A final label: "Complete architecture". Components dim slightly except for the one the reader hovers.
- Narrative: "Six components, three patterns: virtualization, optimistic UI, real-time push. Now try it."

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 480px`, centered. `height: 600px`. `border: 1px solid var(--color-border)`, `border-radius: var(--radius-3)`, `background: var(--color-bg)`.
- **Header bar**: `height: 48px`, `background: var(--color-surface)`, `border-bottom: 1px solid var(--color-border)`. Left: app name "FeedDemo" in `var(--font-sans)`, `font-weight: 600`. Right: DOM counter badge.
- **New Posts Banner**: slides down from below the header when new posts arrive. `height: 40px`, `background: var(--diagram-layer-0)` at 90% opacity, `color: white`, `font-size: var(--text-sm)`, `cursor: pointer`. Text: "{n} new posts -- tap to see". Transition: `translateY(-100%) -> translateY(0)` with `SPRING.snappy`.
- **Feed area**: remaining height below header. `overflow-y: auto`. Virtualized list of PostCards.
- **DOM counter**: top-right badge. `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-pill)`, `padding: var(--space-1) var(--space-2)`, `font-family: var(--font-mono)`, `font-size: var(--text-xs)`. Shows "{n} DOM nodes". Color: green if <= 25, yellow if <= 40, red if > 40.
- **PostCard**: `padding: var(--space-3)`, `border-bottom: 1px solid var(--color-border)`. Row 1: 32px avatar circle (colored by author hash) + author name (`font-weight: 600`, `font-size: var(--text-sm)`) + timestamp (`var(--color-muted)`, `font-size: var(--text-xs)`). Row 2: post body text, 2-4 lines, `font-size: var(--text-sm)`, `line-height: 1.5`. Row 3: like button.
- **LikeButton**: `display: inline-flex`, `align-items: center`, `gap: var(--space-1)`. Heart icon (outlined when not liked, filled red when liked). Count number. On click: heart fills instantly, count increments instantly. After 500ms simulated server delay: a tiny green checkmark badge appears next to the count for 1.5s then fades. On simulated failure (10% chance): heart unfills, count decrements, a red X badge appears for 1.5s.

#### Interaction State Machine

```
              +------------------------+
              |    phase1-scrolly      |
              | (architecture builds   |
              |  up, steps 1-7)        |
              +-----------+------------+
                          |
               scroll past step 7
                          |
                          v
              +------------------------+
              |    phase2-demo-idle    |
              | (feed visible, 20      |
              |  posts loaded, DOM     |
              |  counter reads ~20)    |
              +-----------+------------+
                          |
               reader scrolls feed
                          |
                          v
              +------------------------+
              |  phase2-demo-scrolling |
              | (new posts lazy-load   |
              |  at bottom, DOM stays  |
              |  ~20, items recycle)   |
              +-----------+------------+
                          |
               WS pushes new posts (every 8-12s)
                          |
                          v
              +------------------------+
              |  phase2-banner-visible |
              | (blue banner slides    |
              |  down: "3 new posts")  |
              +-----------+------------+
                          |
               reader taps banner
                          |
                          v
              +------------------------+
              |  phase2-prepend        |
              | (new posts prepend     |
              |  WITHOUT scroll jump.  |
              |  Banner hides.)        |
              +-----------+------------+
                          |
               reader likes a post
                          |
                          v
              +------------------------+
              |  phase2-optimistic     |
              | (heart fills, count++  |
              |  instantly. 500ms      |
              |  later: confirm/roll.) |
              +-----------+------------+
                          |
               scroll past demo
                          |
                          v
              +------------------------+
              |    phase3-scrolly      |
              | (tradeoffs revealed)   |
              +-----------+------------+
                          |
               scroll past last step
                          |
                          v
              +------------------------+
              |       complete         |
              +------------------------+
```

**Persisted across phases**: `posts: Post[]`, `pendingNewPosts: Post[]`, `likeStates: Map<string, LikeState>`. Phase 3 scrollytelling references the demo state (e.g., "you liked {n} posts -- each used optimistic UI").

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader enters Phase 2. A social feed appears with 20 posts, each with an avatar, author name, body text, and a like button. The DOM counter in the top-right reads "20 nodes" in green. The feed looks and feels like a real social app.

2. **(5-15s)** Reader scrolls down. New posts load seamlessly at the bottom as they scroll. The DOM counter stays at ~20 -- items at the top unmount as items at the bottom mount. No stutter, no blank flashes (5-item overscan). After scrolling past ~50 posts, the reader glances at the DOM counter: still "20 nodes".

3. **(15-25s)** While the reader is mid-scroll (say at post #35), a "New Posts" banner slides down from below the header. Blue background, white text: "3 new posts -- tap to see". The banner does NOT push the current content down -- it overlays the top of the feed area.

4. **(25-32s)** Reader taps the banner. Three new posts prepend at the top of the feed. The scroll position adjusts so the post the reader was looking at stays in exactly the same viewport position. No jump. The banner slides back up and disappears. DOM counter briefly reads "23" during the transition, then settles back to "20" as posts below the viewport unmount.

5. **(32-45s)** Reader scrolls back to the top and sees the 3 new posts. They tap the heart on one. The heart icon fills red instantly and the like count increments from 12 to 13. After a 500ms pause, a tiny green checkmark appears next to "13" -- the server confirmed. The checkmark fades after 1.5s.

6. **(45-55s)** Reader likes another post. Same instant fill. But this time (10% failure simulation), after 500ms a red X appears, the heart unfills, and the count drops back to its original value. A subtle shake animation on the like button communicates the rollback.

7. **(55-60s)** Reader continues scrolling. The cycle repeats: constant DOM count, occasional new-post banners, instant likes. The three patterns (virtualization, real-time push, optimistic UI) are all working simultaneously, experienced naturally, not as isolated demos.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Scroll position maintenance**:
- Visual: the architecture diagram returns. The NewPostsBanner-to-Feed arrow highlights. A code snippet appears: `scrollTop += newPostsHeight`.
- Narrative: "Prepending posts requires scroll compensation. Without it, the content the reader is looking at jumps by the height of the new posts. Every major feed implements this -- and gets it wrong sometimes."

**Scroll step 2 -- Optimistic rollback complexity**:
- Visual: the Optimistic Update Layer highlights. A sequence diagram shows: UI update -> server reject -> rollback -> retry? A branching path shows: "What if the user already scrolled away? What if they liked 3 more posts during the roundtrip?"
- Narrative: "Optimistic UI is simple for single actions. It gets complex when the user takes multiple actions before the first one confirms. Each action needs an independent rollback path."

**Scroll step 3 -- Virtualization edge cases**:
- Visual: the VirtualList highlights. Two sub-diagrams: (a) a post with an embedded image that hasn't loaded yet (height unknown), (b) a post expanding to show replies (height changes after render).
- Narrative: "Variable-height virtualization breaks when heights are unknown at render time. Images loading, replies expanding, and content reflow all change item heights after the virtual list calculated positions."

**Scroll step 4 -- Alternative: cursor-based pagination**:
- Visual: a new "Alternative Architecture" box appears. Instead of WebSocket + banner, it shows: "Pull-to-refresh + cursor pagination". Simpler architecture diagram with fewer components.
- Narrative: "Not every feed needs real-time push. Twitter uses pull-to-refresh. Reddit uses cursor pagination. The WebSocket approach adds complexity -- use it only when real-time matters."

**Scroll step 5 -- Scale considerations**:
- Visual: a scale diagram. Left: "100 users" with a single server. Right: "10M users" with load balancers, CDN, edge caching, fan-out service. The simple architecture grows many new boxes.
- Narrative: "At scale, the feed isn't just a component -- it's a distributed system. Fan-out on write vs read, edge caching, personalization ranking. The frontend architecture stays similar, but the backend changes entirely."

### Data & State Shape

```typescript
// --- Post data ---
type Post = {
  id: string;                     // unique identifier
  authorId: string;               // used for avatar color hash
  authorName: string;             // display name
  body: string;                   // 2-4 sentences
  timestamp: number;              // ms since epoch
  likeCount: number;              // server-confirmed count
  isLikedByMe: boolean;           // server-confirmed state
};

type LikeState =
  | { status: "idle" }
  | { status: "optimistic"; previousCount: number; previousIsLiked: boolean }
  | { status: "confirmed" }
  | { status: "rolling-back"; previousCount: number; previousIsLiked: boolean }
  | { status: "failed" };

// --- Feed state ---
type NewsFeedState = {
  // Phase tracking
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;              // current scrollytelling step (phase 1 or 3)

  // Feed data
  posts: Post[];                    // all loaded posts, newest first
  pendingNewPosts: Post[];          // arrived via WS, not yet shown
  nextCursor: string | null;        // for infinite scroll pagination
  isLoadingMore: boolean;           // true while fetching next page

  // Virtualization
  scrollTop: number;                // current scroll position
  viewportHeight: number;           // feed container height
  itemHeights: Map<string, number>; // measured heights per post ID
  estimatedItemHeight: number;      // default 120px, updated as average

  // Optimistic UI
  likeStates: Map<string, LikeState>; // per-post like state machine

  // WebSocket simulation
  wsConnected: boolean;             // simulated connection state
  newPostInterval: number;          // ms between simulated new posts (8000-12000)

  // Metrics
  domNodeCount: number;             // updated via MutationObserver or manual count
};

// --- Derived ---
// visibleRange: computed from scrollTop, viewportHeight, itemHeights
// displayLikeCount(postId): likeStates[id].status === "optimistic"
//   ? likeStates[id].previousCount + 1
//   : post.likeCount
// bannerVisible: pendingNewPosts.length > 0
// bannerText: `${pendingNewPosts.length} new posts -- tap to see`
```

### Primitives & Props

**ScrollytellingShell** (phases 1 and 3):
```tsx
<ScrollytellingShell
  steps={PHASE_1_STEPS}  // 7 steps
  renderVisual={(stepIndex) => (
    <ArchitectureDiagram step={stepIndex} />
  )}
  visualPosition="left"
  onStepChange={setScrollyStep}
/>
```

**DemoSandbox** (phase 2):
```tsx
<DemoSandbox title="News Feed" fullWidth>
  <FeedContainer>
    <FeedHeader domCount={domNodeCount} />
    {bannerVisible && (
      <NewPostsBanner count={pendingNewPosts.length} onTap={prependPosts} />
    )}
    <VirtualFeed
      posts={posts}
      likeStates={likeStates}
      onLike={handleLike}
      onLoadMore={loadNextPage}
      onScroll={handleScroll}
    />
  </FeedContainer>
</DemoSandbox>
```

**Internal components**:
- `ArchitectureDiagram`: SVG-based architecture visualization. Accepts `step: number`, progressively reveals components and arrows. Each component is a rounded rect with label. Arrows use `<path>` with `marker-end` arrowheads. Animation: new elements fade in with `TRANSITION.enter` (300ms).
- `FeedHeader`: fixed header bar with app name and DOM counter badge.
- `NewPostsBanner`: the slide-down banner for new posts. Uses `motion.div` with `SPRING.snappy` for enter/exit.
- `VirtualFeed`: virtualized list rendering PostCards. Uses `position: absolute` + `transform: translateY()` for item positioning. Overscan: 5 items. Uses ResizeObserver per item for measured heights.
- `PostCard`: individual post with avatar, name, body, like button. Avatar color derived from `authorId` hash.
- `LikeButton`: heart icon + count. Manages optimistic animation states.
- `DOMCounter`: the green/yellow/red badge. Uses `MutationObserver` on the feed container to count child nodes, or manual tracking from the virtual list's rendered item count.

### Edge Cases

**Reader interacts with demo before completing Phase 1**:
- Phase 2 is not rendered until Phase 1 scrollytelling completes. The demo container shows a locked state with text: "Complete the architecture walkthrough above to unlock the demo." Scrolling past the final Phase 1 step triggers Phase 2 mount.

**Reader skips to Phase 3**:
- If the reader scrolls fast through Phase 2 without interacting, Phase 3 still works -- it references generic examples rather than personalized state. If the reader DID interact, Phase 3 uses their stats (e.g., "You liked 4 posts -- each used optimistic UI").

**Rapid-fire likes**:
- Each like gets its own independent `LikeState`. If the reader likes 5 posts in 2 seconds, all 5 update optimistically. Server confirmations arrive independently. A rollback on post #3 does not affect posts #1, #2, #4, #5.

**New posts while banner is already visible**:
- Additional new posts increment the banner counter. "3 new posts" becomes "5 new posts". Tapping the banner prepends ALL pending posts at once.

**Variable-height posts in virtual list**:
- Posts have different body lengths (2-4 sentences) resulting in different heights. Use `estimatedItemHeight: 120` for initial layout, then `ResizeObserver` to measure actual heights. Position cache updates cascade to subsequent items. Since post count is moderate (~50-100 loaded at a time), the cascade cost is negligible.

**Mobile scroll momentum**:
- Feed container uses `overscroll-behavior: contain`, `-webkit-overflow-scrolling: touch`, passive scroll listener. The new posts banner uses `position: sticky` relative to the feed container top.

---

## sdp-autocomplete -- Autocomplete Search
**Format**: system-design | **Effort**: xl
**Cross-section refs**: S05 `state-search` (trie data structure, prefix search), S06 `net-intro` (request lifecycle, latency), S07 `perf-js` (debounce and main-thread budget), S01 `core-event-loop` (timer scheduling for debounce)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a search input field with a blinking cursor. Below: three requirement pills: `FAST RESULTS`, `MINIMAL REQUESTS`, `KEYBOARD NAV`.
- Narrative: "The user types a query. Results must appear within 100ms of their last keystroke. Every millisecond of latency erodes trust."

**Scroll step 2 -- Naive approach**:
- Visual: a "Network Panel" appears below the input. The user types "javascript" one letter at a time. 10 request dots fly out: j, ja, jav, java, javas, javasc, javascr, javascri, javascrip, javascript. Each request dot is a small circle that flies from the input to a server icon and back.
- Narrative: "Without optimization: 10 keystrokes = 10 requests. Most are wasted -- the user was still typing."

**Scroll step 3 -- Debounce layer**:
- Visual: a `Debounce` box appears between the input and the network panel. Inside it, a timer bar fills from left to right. When the user types, the bar resets. It only fires when the bar reaches full. Now only 2 requests fire: "java" (paused) and "javascript" (finished typing).
- Arrow from Input to Debounce: "every keystroke". Arrow from Debounce to Network: "only after 300ms pause".

**Scroll step 4 -- AbortController**:
- Visual: an `AbortController` box appears next to the network panel. A request dot for "java" is mid-flight. A new request for "javascript" fires. The "java" dot turns red and fades (aborted). The "javascript" dot continues.
- Narrative: "If a new request fires while the old one is in-flight, abort it. No stale results clobbering fresh ones."

**Scroll step 5 -- Trie cache**:
- Visual: a `Trie Cache` tree structure appears. Nodes: j -> a -> v -> a (with results attached at "java"). The "javascript" lookup traces the path: j -> a -> v -> a -> s -> c -> r -> i -> p -> t. A "CACHE HIT" flash at the "java" prefix.
- Arrow from Input to Trie Cache: "check cache first". Arrow from Trie Cache to Network: "miss: fetch from server". Arrow from Network to Trie Cache: "store result".

**Scroll step 6 -- Results dropdown + keyboard nav**:
- Visual: a `<ResultsDropdown>` box appears below the input. Inside: 5 result rows. Arrow keys highlight rows (active item has accent border). Enter selects. Escape closes.
- Full architecture visible: Input -> Debounce -> Trie Cache -> (miss) -> AbortController -> Network -> Results -> Dropdown.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 560px`, centered. Two panels stacked vertically.
- **Top panel -- Search UI** (`height: auto`, grows with dropdown):
  - Search input: `width: 100%`, `height: 44px`, `padding: 0 var(--space-3)`, `border: 2px solid var(--color-border)`, `border-radius: var(--radius-2)`, `font-size: var(--text-base)`. Focus state: `border-color: var(--color-accent)`. Placeholder: "Search programming languages...".
  - Debounce timer bar: directly below the input. `height: 4px`, `width: 100%`, `background: var(--color-border)`. Fill bar: `background: var(--diagram-layer-0)`, width transitions from 0% to 100% over 300ms. Resets to 0% on each keystroke. When it reaches 100%, it flashes green briefly (request fires).
  - Results dropdown: appears below the debounce bar when results exist. `max-height: 240px`, `overflow-y: auto`, `border: 1px solid var(--color-border)`, `border-radius: 0 0 var(--radius-2) var(--radius-2)`, `background: var(--color-bg)`, `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`. Each result row: `height: 40px`, `padding: 0 var(--space-3)`, `display: flex`, `align-items: center`. Active row (keyboard): `background: var(--color-surface)`, `border-left: 3px solid var(--color-accent)`.
- **Bottom panel -- Network Visualization** (`height: 280px`, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`, `padding: var(--space-3)`):
  - Title: "Network Panel" in `var(--font-mono)`, `font-size: var(--text-xs)`, `color: var(--color-muted)`.
  - Request timeline: horizontal lanes. Each request is a dot that travels from left (client) to right (server) and back. Colors: blue = in-flight, green = completed, red = aborted, yellow-green = cache hit (no travel, instant flash).
  - Stats row at bottom of network panel:
    - "Requests made: {n}" (counts actual network requests)
    - "Requests saved: {n}" (cache hits + aborted)
    - "Cache entries: {n}" (trie node count)
  - Mode toggle: three buttons `WITHOUT DEBOUNCE | WITH DEBOUNCE | WITH CACHE`. Default: `WITH CACHE`. Switching mode resets the stats and replay.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (empty input, no       |
              |  results, network      |
              |  panel empty)          |
              +-----------+------------+
                          |
               reader types a character
                          |
                          v
              +------------------------+
              |    debounce-filling    |
              | (timer bar filling,    |
              |  no request yet)       |
              +-----------+------------+
                 |                  |
    reader types again       timer reaches 100%
    (reset timer)            (fire request)
                 |                  |
                 v                  v
              (back to           +------------------------+
               debounce-filling) |    request-in-flight   |
                                 | (dot traveling, old    |
                                 |  request aborted if    |
                                 |  any)                  |
                                 +-----------+------------+
                                             |
                                  response arrives (200ms simulated)
                                             |
                                             v
                                 +------------------------+
                                 |    results-visible     |
                                 | (dropdown open, arrow  |
                                 |  keys navigate)        |
                                 +-----------+------------+
                                    |              |
                         reader types more    reader presses Enter
                         (back to debounce)   or clicks result
                                    |              |
                                    v              v
                              (debounce-     +------------+
                               filling)      | selected   |
                                             | (input     |
                                             |  fills,    |
                                             |  dropdown  |
                                             |  closes)   |
                                             +------------+
```

Cache branch: before `request-in-flight`, check trie. If prefix has cached results, skip directly to `results-visible` with a green "CACHE HIT" flash in the network panel (no request dot travels).

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a search input ("Search programming languages...") with an empty network panel below. Mode is set to "WITH CACHE" (default). The network panel is clean -- no dots, stats all at 0.

2. **(5-15s)** Reader types "j". The debounce timer bar begins filling. Before it reaches full, reader types "a" -- the bar resets and starts again. Reader types "v", "a" -- bar resets each time. Reader pauses after "java". The bar fills to 100%, flashes green. A blue dot appears in the network panel, travels right to the server icon, and returns. The dropdown opens with results: "Java", "JavaScript", "JavaFX". Stats: "Requests made: 1, Requests saved: 3, Cache entries: 1".

3. **(15-25s)** Reader continues typing: "s", "c", "r", "i", "p", "t". The debounce bar resets on each keystroke. After the reader stops at "javascript", the bar fills. But before a request fires, the trie checks its cache: the prefix "java" has cached results that can be filtered client-side for "javascript". A yellow-green flash in the network panel: "CACHE HIT". Results update instantly to just "JavaScript". Stats update: "Requests saved: 4". No new network dot.

4. **(25-35s)** Reader clears the input and switches mode to "WITHOUT DEBOUNCE". Types "javascript" again at normal speed. This time: a dot fires for EVERY keystroke. 10 blue dots appear in rapid succession. Each new dot causes the previous in-flight dot to turn red (aborted via AbortController). Only the last dot ("javascript") completes green. Stats: "Requests made: 10, Requests saved: 0". The visual difference from the debounced version is dramatic.

5. **(35-45s)** Reader switches back to "WITH CACHE". Types "java" -- one request fires, results appear. Types "jav" (backspace) -- cache hit from the "java" entry, which covers "jav" prefix. Types "jar" -- cache miss (different branch), one request fires. The trie now has two branches: "java*" and "jar*". Stats show cache growing.

6. **(45-55s)** Reader uses keyboard navigation. Types "python", results appear. Presses ArrowDown -- first result highlights with accent border. ArrowDown again -- second result. Enter -- input fills with the selected result, dropdown closes.

7. **(55-60s)** Reader experiments freely: trying different queries, switching modes, watching cache grow. The network panel accumulates a history of all requests -- a visual record of the optimization story.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Debounce vs throttle**:
- Visual: two timeline lanes. Top: debounce (fires once after pause). Bottom: throttle (fires at intervals during typing). For fast typists, debounce shows fewer requests but higher latency to first result.
- Narrative: "Debounce waits for silence. Throttle fires at intervals. For slow typists, debounce feels snappier. For fast typists, throttle gives intermediate results sooner."

**Scroll step 2 -- Cache invalidation**:
- Visual: the trie cache with a "stale" label on some nodes. A timer shows entries aging. A new server result conflicts with a cached entry (highlighted diff).
- Narrative: "The trie cache grows forever if unchecked. Stale results poison the UX. TTL-based eviction, LRU limits, and cache-busting on data changes are all necessary."

**Scroll step 3 -- Accessibility of dropdowns**:
- Visual: the results dropdown with ARIA annotations visible: `role="listbox"`, `aria-activedescendant`, `aria-expanded`. A screen reader output panel shows what's announced.
- Narrative: "Autocomplete is one of the hardest ARIA patterns. The input must announce result count, active option, and selection. Most implementations fail accessibility audits."

**Scroll step 4 -- Server-side ranking vs client filtering**:
- Visual: two approaches side-by-side. Left: server returns top 10 ranked results (relevance, popularity, recency). Right: client filters cached results alphabetically. The server results are more useful.
- Narrative: "Client-side trie filtering returns exact prefix matches. Server-side ranking considers popularity, recency, personalization. At scale, the server should rank -- the cache should only prevent duplicate requests, not replace server intelligence."

### Data & State Shape

```typescript
// --- Trie cache ---
type TrieNode = {
  children: Map<string, TrieNode>;
  results: string[] | null;       // null = no cached results for this prefix
  timestamp: number;              // when results were cached (for TTL)
};

// --- Request tracking ---
type RequestState =
  | { status: "idle" }
  | { status: "in-flight"; query: string; abortController: AbortController }
  | { status: "completed"; query: string; results: string[] }
  | { status: "aborted"; query: string };

type NetworkDot = {
  id: string;
  query: string;
  status: "in-flight" | "completed" | "aborted" | "cache-hit";
  startTime: number;
  endTime: number | null;
};

// --- Component state ---
type AutocompleteState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Input
  inputValue: string;
  cursorPosition: number;

  // Debounce
  debounceTimerProgress: number;     // 0-1, for the visual bar
  debounceTimerId: number | null;    // setTimeout reference

  // Cache
  trieRoot: TrieNode;
  cacheEntryCount: number;

  // Network
  currentRequest: RequestState;
  networkHistory: NetworkDot[];      // all requests for the network panel
  requestsMade: number;
  requestsSaved: number;             // cache hits + aborts

  // Results
  results: string[];
  activeResultIndex: number;         // -1 = none, 0+ = keyboard-selected
  dropdownOpen: boolean;

  // Mode
  mode: "no-debounce" | "debounce" | "cache";  // default "cache"
};

// --- Simulated dataset ---
// 200+ programming language names stored in a module-scope array.
// Server simulation: setTimeout(300ms) returns filtered results.
// Trie stores results keyed by prefix. Lookup: walk the trie
// character by character. If a node has results, return them
// filtered to the current full query.
```

### Primitives & Props

**ScrollytellingShell**: phases 1 and 3 (6 steps and 4 steps respectively).

**DemoSandbox**: phase 2, wrapping the search UI + network panel.

**Internal components**:
- `SearchInput`: controlled input with debounce timer bar. Handles keyboard events for dropdown navigation.
- `DebounceBar`: the 4px visual timer. `width` animated via CSS transition (300ms linear). Resets to 0 on keystroke.
- `ResultsDropdown`: listbox with keyboard navigation. Each row shows the result text with the matching prefix bolded.
- `NetworkPanel`: the visualization of request dots. Each dot is a `motion.circle` that travels horizontally. Colors by status. Uses `SPRING.snappy` for entry, opacity fade for exit.
- `TrieVisualizer`: used in Phase 1 and Phase 3 scrollytelling to show the trie structure. Nodes as circles connected by lines, with the current traversal path highlighted.
- `ModeToggle`: three-button segmented control for switching optimization modes.

### Edge Cases

**Rapid typing that outpaces the simulated server**:
- AbortController cancels in-flight requests. Only the most recent request's results are displayed. The network panel shows cancelled requests as red dots -- this is a teaching feature, not a bug.

**Empty query**:
- Clearing the input closes the dropdown and resets to `demo-idle`. No request fires for empty string. Debounce timer does not start.

**Cache hit for longer query from shorter cached prefix**:
- If "java" is cached with ["Java", "JavaScript", "JavaFX"], and the user types "javascript", the trie walks to the "java" node, finds cached results, and client-side filters to ["JavaScript"]. This is correct and expected -- the cache stores at the prefix level, not exact match.

**Keyboard navigation with no results**:
- If the query returns no results, the dropdown shows "No results for '{query}'" in `var(--color-muted)`. Arrow keys do nothing. Enter does nothing.

**Mode switching mid-query**:
- Switching modes resets: clears network history, resets stats, clears cache (for "no-debounce" and "debounce" modes). The input value and results persist so the reader can re-type the same query to see the difference.

---

## sdp-spreadsheet -- Spreadsheet Engine
**Format**: system-design | **Effort**: xl
**Cross-section refs**: S04 `virt-tree-grid` (2D grid virtualization), S04 `virt-windowing` (windowing fundamentals), S05 `state-search` (data structure for cell lookup), S01 `core-event-loop` (scheduling recalculation without blocking UI)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a mini spreadsheet grid (4x4) with cells containing numbers and formulas. Requirement pills: `FORMULAS`, `DEPENDENCY TRACKING`, `FAST RECALC`, `HUGE GRIDS`.
- Narrative: "A spreadsheet is a reactive computation graph disguised as a grid. Change one cell and dozens may need to recalculate."

**Scroll step 2 -- Cell grid (virtualized)**:
- Visual: a `<VirtualGrid>` box appears. Inside: a 20x50 visible window overlaid on a faded 1000x1000 grid. A minimap in the corner shows the viewport as a tiny colored rectangle on the full grid.
- Narrative: "1,000,000 cells but only ~1,000 visible. 2D virtualization renders rows AND columns within the viewport."

**Scroll step 3 -- Formula parser**:
- Visual: a `FormulaParser` box appears. Input: "=A1+B1". Output: an AST tree: `BinaryExpr(CellRef(A1), +, CellRef(B1))`. Another example: "=SUM(A1:A10)" -> `FuncCall(SUM, Range(A1, A10))`.
- Arrow from cell grid to parser: "cell content starts with =".

**Scroll step 4 -- Dependency DAG**:
- Visual: a graph appears. Nodes are cells (A1, B1, C1, D1). Directed edges: A1 -> B1 (B1 depends on A1), A1 -> C1, B1 -> D1, C1 -> D1. Label: "Dependency DAG".
- Narrative: "Each formula creates edges in a directed acyclic graph. Cell B1 depends on A1. Cell D1 depends on B1 and C1."

**Scroll step 5 -- Topological sort**:
- Visual: the DAG animates a topological sort. Nodes light up in order: A1 (no deps) -> B1 and C1 (A1 satisfied) -> D1 (B1, C1 satisfied). Numbers appear showing the sort order: 1, 2, 2, 3.
- Narrative: "Topological sort determines the recalculation order. Every cell is updated only after ALL its dependencies have been recalculated."

**Scroll step 6 -- Change propagation**:
- Visual: A1 flashes (edited). A pulse ripples through the DAG edges in topological order. B1 recalculates, then C1, then D1. Each cell briefly shows its old value crossing out and new value appearing.
- Narrative: "Edit A1 and the cascade follows the DAG. Only cells that transitively depend on A1 recalculate. Cells that don't depend on A1 are untouched."

**Scroll step 7 -- Full architecture**:
- Visual: complete pipeline: VirtualGrid -> CellEditor -> FormulaParser -> DependencyDAG -> TopologicalSort -> ChangePropagation -> VirtualGrid (loop back for re-render).

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `height: 500px`. Two regions: grid (top, 400px) and dependency panel (bottom, 100px).
- **Grid area**: virtualized spreadsheet grid. Column headers: A-Z (first 26 visible). Row headers: 1-50 (first 50 visible). Cell size: `width: 80px`, `height: 28px`. Selected cell: `border: 2px solid var(--color-accent)`. Editing cell: input fills the cell with `background: white`, `font-family: var(--font-mono)`, `font-size: var(--text-sm)`. Formula bar above the grid: `height: 32px`, shows the raw formula of the selected cell.
- **Dependency panel**: below the grid. When a formula cell is selected, shows an SVG overlay on the grid drawing arrows from dependency cells to the selected cell. Arrows: `stroke: var(--diagram-layer-0)`, `stroke-width: 2`, with arrowhead markers. Dependent cells get a colored border glow matching the arrow color.
- **Cascade animation**: when a cell value changes, dependent cells highlight in topological order. Each cell gets a brief background flash: `var(--diagram-layer-1)` at 40% opacity, fading over 400ms. Staggered at 150ms per topological level. The cascade is visible -- cells flash one level at a time.
- **Circular dependency indicator**: if a circular dependency is detected, the involved cells get a red pulsing border (`var(--color-error)`) and display "#CIRCULAR!" in red text. The dependency panel shows the cycle as red arrows forming a loop.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (grid visible, pre-    |
              |  populated with sample |
              |  data and formulas)    |
              +-----------+------------+
                          |
               reader clicks a cell
                          |
                          v
              +------------------------+
              |    cell-selected       |
              | (cell highlighted,     |
              |  formula bar shows     |
              |  content, dependency   |
              |  arrows visible if     |
              |  formula cell)         |
              +-----------+------------+
                 |                  |
    double-click or         click different
    press Enter             cell
    (edit mode)             (re-select)
                 |                  |
                 v                  v
              +------------------------+
              |    cell-editing        |
              | (input active in cell, |
              |  formula bar editable, |
              |  typing formula or     |
              |  value)                |
              +-----------+------------+
                          |
               press Enter or Tab
                          |
                          v
              +------------------------+
              |    recalculating       |
              | (parse formula, check  |
              |  for cycles, topo-sort |
              |  dirty cells, cascade  |
              |  animation plays)      |
              +-----------+------------+
                          |
               cascade complete
                          |
                          v
              +------------------------+
              |    cell-selected       |
              | (updated values shown, |
              |  next cell selected    |
              |  if Tab was pressed)   |
              +------------------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a spreadsheet grid pre-populated with sample data. Column A has numbers (10, 20, 30, 40, 50). Column B has formulas: B1=`=A1*2` (showing 20), B2=`=A2*2` (showing 40), etc. Cell C1=`=B1+B2` (showing 60). Cell D1=`=SUM(A1:A5)` (showing 150). A formula bar above the grid shows "Select a cell to see its formula."

2. **(5-12s)** Reader clicks cell B1. The formula bar updates to show "=A1*2". Dependency arrows appear: a blue arrow from A1 to B1. Cell A1 gets a blue border glow -- it's a dependency of the selected cell. The reader understands: B1 depends on A1.

3. **(12-20s)** Reader clicks cell D1. Formula bar: "=SUM(A1:A5)". Five arrows appear: A1->D1, A2->D1, A3->D1, A4->D1, A5->D1. All five source cells glow. The dependency graph for SUM ranges is visually dense.

4. **(20-32s)** Reader double-clicks cell A1 (currently 10). The cell becomes an input. Reader types "100" and presses Enter. THE CASCADE: A1 flashes with a bright highlight. After 150ms, B1 flashes (recalculating: 100*2=200). After another 150ms, C1 flashes (recalculating: 200+40=240). After another 150ms, D1 flashes (recalculating: SUM(100,20,30,40,50)=240). Each cell's old value crosses out and new value fades in. The cascade is visually ordered -- the reader SEES topological sort happening.

5. **(32-42s)** Reader creates a new formula. Clicks empty cell E1, types "=C1+D1", presses Enter. E1 shows 480 (240+240). Reader clicks E1 again -- dependency arrows point to C1 and D1. The dependency graph now has depth: A1 -> B1 -> C1 -> E1, and A1:A5 -> D1 -> E1.

6. **(42-55s)** Reader creates a circular dependency. Clicks A1, types "=B1" (B1 depends on A1, so A1 depending on B1 creates a cycle). Presses Enter. Both A1 and B1 flash red. Both display "#CIRCULAR!". The dependency panel shows a red loop: A1 -> B1 -> A1. The cycle is caught immediately.

7. **(55-60s)** Reader fixes the circular dependency by editing A1 back to "100". The red clears. The cascade re-runs. Normal values restore. The reader has experienced the full lifecycle: edit -> parse -> dependency check -> topological sort -> cascade recalculate.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Recalculation strategies**:
- Visual: three approaches side by side. Eager (recalc everything on every edit), Lazy (recalc only on access), Dirty-flag + topo-sort (the chosen approach).
- Narrative: "Eager recalculation is simple but wasteful -- editing A1 recalculates ALL formulas, even those that don't depend on A1. Lazy avoids wasted work but has unpredictable latency on access. Dirty-flag + topological sort recalculates only what's needed, in the right order."

**Scroll step 2 -- Grid rendering at scale**:
- Visual: the 1000x1000 grid with the viewport rectangle. A scroll happens -- cells outside the viewport are recycled. Memory counter shows: "Allocated cells: 1,200 of 1,000,000".
- Narrative: "At 1M cells, you cannot store cell components in memory. Virtualization allocates component instances only for visible cells. The data (cell values, formulas) lives in a flat Map, not in React state per cell."

**Scroll step 3 -- Collaborative editing**:
- Visual: two cursor icons on the same grid. Both edit cells that feed into the same formula. An OT (Operational Transform) or CRDT layer appears between them and the dependency DAG.
- Narrative: "Google Sheets supports simultaneous editing. Each keystroke is an operation that must be transformed against concurrent operations. The dependency DAG complicates this -- one user's edit can cascade into cells another user is editing."

**Scroll step 4 -- Formula language design**:
- Visual: a comparison of formula languages. Excel-style (`=VLOOKUP(A1, B:C, 2, FALSE)`), functional (`=FILTER(B:C, A:A = A1)`), and SQL-like (`SELECT B WHERE A = A1`). Each with complexity ratings.
- Narrative: "The formula language is a programming language. Excel's is Turing-complete. Designing it means choosing between familiarity and power."

### Data & State Shape

```typescript
// --- Cell data (stored in a Map, not per-component state) ---
type CellId = string;  // "A1", "B2", etc.

type CellValue =
  | { type: "number"; value: number }
  | { type: "text"; value: string }
  | { type: "error"; code: "CIRCULAR" | "REF" | "VALUE" | "NAME" };

type CellData = {
  raw: string;                    // what the user typed ("100" or "=A1+B1")
  value: CellValue;               // computed result
  formula: FormulaAST | null;     // parsed AST if raw starts with "="
  dependsOn: Set<CellId>;         // cells this cell reads from
  dependedBy: Set<CellId>;        // cells that read from this cell
};

// --- Formula AST ---
type FormulaAST =
  | { type: "number"; value: number }
  | { type: "cellRef"; id: CellId }
  | { type: "range"; start: CellId; end: CellId }
  | { type: "binaryOp"; op: "+" | "-" | "*" | "/"; left: FormulaAST; right: FormulaAST }
  | { type: "funcCall"; name: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT"; args: FormulaAST[] };

// --- Spreadsheet state ---
type SpreadsheetState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Grid data
  cells: Map<CellId, CellData>;   // THE source of truth

  // Selection
  selectedCell: CellId | null;
  editingCell: CellId | null;
  editBuffer: string;              // current text in the editing input

  // Virtualization
  scrollTop: number;
  scrollLeft: number;
  viewportRows: number;            // ~15 visible
  viewportCols: number;            // ~8 visible
  colWidth: number;                // 80px
  rowHeight: number;               // 28px

  // Cascade animation
  cascadeQueue: CellId[];          // cells to animate, in topological order
  cascadeIndex: number;            // current animation position (-1 = not animating)

  // Error state
  circularCells: Set<CellId>;      // cells involved in a cycle
};

// --- Derived ---
// visibleRange: { startRow, endRow, startCol, endCol } from scroll + viewport
// dependencyArrows: computed from selectedCell's dependsOn set
// formulaBarContent: cells.get(selectedCell)?.raw ?? ""
// isCascading: cascadeIndex >= 0
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (7 steps) and 3 (4 steps).

**DemoSandbox**: phase 2 wrapping the spreadsheet.

**Internal components**:
- `VirtualGrid`: 2D virtualized grid with column/row headers. Uses `position: absolute` + `transform: translate(x, y)` for cell positioning. Scroll handlers on both axes.
- `CellRenderer`: renders a single cell. Props: `cellId`, `data`, `isSelected`, `isEditing`, `isCascading`, `isCircular`. Editing mode renders an `<input>`. Display mode renders formatted value.
- `FormulaBar`: shows raw content of selected cell above the grid. Editable when cell is in edit mode.
- `DependencyArrows`: SVG overlay positioned over the grid. Draws `<path>` arrows from dependency cells to the selected cell. Uses quadratic bezier curves to avoid overlapping arrows.
- `CascadeHighlight`: overlay that flashes cells during cascade animation. Each cell gets a `motion.div` with `backgroundColor` animating from `var(--diagram-layer-1)` at 40% to transparent over 400ms.
- `FormulaParser`: pure function that parses "=A1+B1" into a FormulaAST. Supports: cell refs, ranges, arithmetic ops, SUM/AVG/MIN/MAX/COUNT.
- `DependencyGraph`: manages the DAG. Methods: `addDependency(from, to)`, `removeDependency(from, to)`, `detectCycle(cellId): boolean`, `topologicalSort(dirtyCells): CellId[]`.
- `CellEvaluator`: walks a FormulaAST and computes a CellValue. Resolves cell refs from the cells Map.

### Edge Cases

**Circular dependency detection**:
- When a formula is entered, the parser extracts dependency cell IDs. Before adding edges to the DAG, run cycle detection (DFS from the edited cell following `dependedBy` edges). If the edited cell is reachable from any of its new dependencies, a cycle exists. Mark all cells in the cycle with `CellValue.error("CIRCULAR")`. Do NOT add the edges to the DAG -- leave the graph acyclic.

**Formula referencing non-existent cells**:
- Valid. A reference to an empty cell resolves to 0 (for numeric contexts) or "" (for text contexts). No error.

**Editing a cell mid-cascade**:
- The cascade animation is non-blocking -- it's purely visual (the actual values are computed synchronously). If the reader edits another cell during a cascade animation, the current animation cancels and a new cascade starts from the newly edited cell.

**Grid scroll during cell editing**:
- If the reader scrolls the grid while editing a cell such that the editing cell leaves the viewport, commit the current edit (same as pressing Enter) and deselect. The cell value updates.

**Very long formula chains (A1->B1->C1->...->Z1, 26 deep)**:
- Topological sort handles arbitrary depth. The cascade animation stagger (150ms per level) means 26 levels = 3.9s total animation. Cap the animation at 2s total by reducing stagger for deep chains: `stagger = Math.min(150, 2000 / chainDepth)`.

**Large range formulas (=SUM(A1:A1000))**:
- The dependency set for this cell has 1000 entries. Arrow visualization is impractical for 1000 arrows. When `dependsOn.size > 20`, show a range highlight (colored background on the range cells) instead of individual arrows, with a label: "Depends on A1:A1000 (1000 cells)".

---

## sdp-chat -- Real-Time Chat
**Format**: system-design | **Effort**: large
**Cross-section refs**: S06 `net-long-polling` (WebSocket vs alternatives, reconnection), S06 `net-intro` (connection lifecycle), S05 `state-storage` (local persistence for offline queue), S01 `core-event-loop` (scheduling message delivery)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: two phone-shaped frames side by side. Requirement pills: `REAL-TIME DELIVERY`, `OFFLINE RESILIENCE`, `PRESENCE`, `MESSAGE STATUS`.

**Scroll step 2 -- Message flow**:
- Visual: User A types a message. Arrow from A's input to a `WebSocket` pipe. Arrow from pipe to `Server`. Arrow from Server through another pipe to User B. Message bubble appears in B's chat.
- Narrative: "A message travels: client -> WebSocket -> server -> WebSocket -> recipient. Round trip: 50-200ms depending on distance."

**Scroll step 3 -- Optimistic insert**:
- Visual: the message appears in A's chat IMMEDIATELY (grey, "sending..." status). 200ms later, the server confirms and the message turns white with a single checkmark.
- Narrative: "The sender sees their message instantly. The server confirms asynchronously. This is optimistic UI applied to messaging."

**Scroll step 4 -- Message status pipeline**:
- Visual: a horizontal pipeline: `sent (tick)` -> `delivered (tick tick)` -> `read (tick tick blue)`. Each status transition is an arrow. Below: the WebSocket events that trigger each: `msg_ack`, `msg_delivered`, `msg_read`.
- Narrative: "Three status states. 'Sent' means the server received it. 'Delivered' means the recipient's device received it. 'Read' means the recipient scrolled to it."

**Scroll step 5 -- Typing indicator**:
- Visual: a separate lightweight `typing` event flowing through the WebSocket, distinct from message events. On B's side, "Alice is typing..." appears with animated dots.
- Narrative: "Typing indicators are separate events -- lightweight, ephemeral, no persistence needed. They debounce (don't send on every keystroke) and timeout after 3 seconds of silence."

**Scroll step 6 -- Offline queue**:
- Visual: the WebSocket pipe turns red (disconnected). Messages from A go into an `Offline Queue` box (orange). When the pipe reconnects (turns green), messages drain from the queue to the server.
- Narrative: "Offline resilience: messages queue locally. On reconnect, the queue drains in order. The server de-duplicates using message IDs."

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 680px`. Two chat panels side by side, each `width: 50%`.
- **Left panel (You)**: `border-right: 1px solid var(--color-border)`. Header: "You" with a green dot (online indicator). Chat area: `height: 400px`, `overflow-y: auto`. Messages right-aligned in colored bubbles (`background: var(--diagram-layer-0)`, `color: white`, `border-radius: 16px 16px 4px 16px`, `padding: var(--space-2) var(--space-3)`, `max-width: 70%`). Status icons below each bubble: single tick (sent), double tick (delivered), double tick blue (read). Input bar: `height: 48px`, text input + send button.
- **Right panel (Alice)**: header "Alice" with green/red dot. Chat area mirrors left. Incoming messages left-aligned in grey bubbles (`background: var(--color-surface)`, `border-radius: 16px 16px 16px 4px`). Alice's responses are simulated (auto-replies after 1-3s).
- **Typing indicator**: below the last message in the recipient's panel. Three animated dots in `var(--color-muted)`, pulsing with `LOOP.breathe`.
- **Network control bar**: between the two panels, `width: 100%`, `height: 36px`. Toggle: "Online / Offline". When offline: both panels get an orange top border. Messages from "You" appear in orange bubbles (queued) instead of the normal color. A badge: "2 queued" appears on the input bar.
- **WebSocket frame log**: small scrollable panel below the chat, `height: 100px`, `background: var(--color-surface)`, `font-family: var(--font-mono)`, `font-size: var(--text-xs)`. Shows WebSocket frames: `>>> {"type":"message","id":"m1","body":"hello"}`, `<<< {"type":"ack","id":"m1"}`, `<<< {"type":"typing","user":"alice"}`.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (empty chat, both      |
              |  panels online)        |
              +-----------+------------+
                          |
               reader types + sends message
                          |
                          v
              +------------------------+
              |    message-sent        |
              | (msg appears in left   |
              |  panel with single     |
              |  tick. WS frame in     |
              |  log. After 200ms:     |
              |  server ack.)          |
              +-----------+------------+
                          |
               Alice's device receives (300ms)
                          |
                          v
              +------------------------+
              |    message-delivered   |
              | (double tick appears.  |
              |  msg appears in right  |
              |  panel.)               |
              +-----------+------------+
                          |
               Alice "reads" (scrolls to msg, 500ms)
                          |
                          v
              +------------------------+
              |    message-read        |
              | (double tick turns     |
              |  blue.)               |
              +-----------+------------+
                          |
               Alice starts typing (1s after read)
                          |
                          v
              +------------------------+
              |    alice-typing        |
              | ("Alice is typing..."  |
              |  in left panel. Dots   |
              |  animate.)             |
              +-----------+------------+
                          |
               Alice's response arrives (1-3s later)
                          |
                          v
              +------------------------+
              |    alice-replied       |
              | (alice's message       |
              |  appears in both       |
              |  panels.)             |
              +-----------+------------+

--- Offline branch ---
              +------------------------+
              |    toggled-offline     |
              | (panels get orange     |
              |  border. WS log:       |
              |  "DISCONNECTED".)      |
              +-----------+------------+
                          |
               reader sends while offline
                          |
                          v
              +------------------------+
              |    messages-queued     |
              | (orange bubbles in     |
              |  left panel. Badge:    |
              |  "N queued".)          |
              +-----------+------------+
                          |
               reader toggles online
                          |
                          v
              +------------------------+
              |    queue-flushing      |
              | (orange bubbles turn   |
              |  normal one by one,    |
              |  each gets ack from    |
              |  server. WS log shows  |
              |  burst of messages.)   |
              +-----------+------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-8s)** Reader sees two chat panels side by side. "You" on the left, "Alice" on the right. Both have green online dots. The WebSocket frame log at the bottom is empty. Reader types "Hello Alice!" in the input and presses Enter (or clicks send).

2. **(8-15s)** The message appears instantly in the left panel in a blue bubble. Status: single grey tick (sent). The WS frame log shows: `>>> {"type":"message","id":"m1","body":"Hello Alice!"}`. After 200ms: `<<< {"type":"ack","id":"m1"}` appears in the log. The tick stays single.

3. **(15-20s)** After 300ms total: the message appears in Alice's panel (right side) as a grey incoming bubble. The left panel's tick changes to double tick (delivered). WS log: `<<< {"type":"delivered","id":"m1"}`.

4. **(20-25s)** After 500ms: double tick turns blue (read). WS log: `<<< {"type":"read","id":"m1"}`. The reader has now seen the full status pipeline.

5. **(25-32s)** "Alice is typing..." appears in the left panel with animated dots. WS log: `<<< {"type":"typing","user":"alice"}`. After 2s, Alice's reply appears: "Hey there! How's it going?" Both panels update. The typing indicator disappears.

6. **(32-42s)** Reader clicks "Offline" toggle. Both panels get an orange top border. WS log shows: "DISCONNECTED" in red. Reader types "I'm doing great!" and sends. The message appears in the left panel as an ORANGE bubble (queued, not sent). Status: clock icon instead of tick. Badge on input bar: "1 queued".

7. **(42-50s)** Reader sends two more messages while offline. Three orange bubbles in the left panel. Badge: "3 queued". Alice's panel has not received anything.

8. **(50-60s)** Reader clicks "Online". WS log: "RECONNECTED" in green. The three orange bubbles turn blue one by one (300ms apart). Each gets a tick as the server acknowledges. WS log shows three message sends and three acks in rapid succession. Alice's panel receives all three messages. The queue flush is the teaching moment.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Message ordering guarantees**:
- Visual: two message arrows crossing in transit (sent in order A then B, but B arrives first due to network). Sequence numbers shown on each message.
- Narrative: "Messages can arrive out of order. Sequence numbers on each message let the client reorder them. Without this, conversations become nonsensical."

**Scroll step 2 -- Presence at scale**:
- Visual: a chat with 200 members. Each typing event broadcasts to 199 others. Arrow count: 199. Multiply by 10 concurrent typers: 1,990 events/second.
- Narrative: "Typing indicators scale quadratically with group size. In large groups, aggregate ('3 people are typing') or sample ('Alice and 2 others are typing') to reduce event volume."

**Scroll step 3 -- End-to-end encryption**:
- Visual: the message flow with a lock icon. Messages are encrypted on the client, server sees ciphertext, decrypted on the recipient's client. The server cannot read message content.
- Narrative: "E2E encryption means the server is a blind relay. This conflicts with server-side search, moderation, and link previews. Every major chat app makes different tradeoffs here."

**Scroll step 4 -- Threads, reactions, edits**:
- Visual: a message with a thread of replies, emoji reactions, and an edit history. Each feature adds edges to the data model.
- Narrative: "Each feature compounds complexity. Threads are nested conversations. Reactions are many-to-many. Edits need history. The simple message model becomes a graph."

### Data & State Shape

```typescript
type MessageId = string;

type MessageStatus = "queued" | "sent" | "delivered" | "read";

type Message = {
  id: MessageId;
  sender: "you" | "alice";
  body: string;
  timestamp: number;
  status: MessageStatus;
  isQueued: boolean;             // true when sent while offline
};

type TypingState = {
  isTyping: boolean;
  timeout: number | null;        // auto-clear after 3s
};

type WSFrame = {
  direction: "outgoing" | "incoming";
  data: string;                  // JSON string for display
  timestamp: number;
};

type ChatState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Messages
  messages: Message[];
  offlineQueue: Message[];        // messages awaiting send

  // Presence
  aliceTyping: TypingState;
  youTyping: TypingState;

  // Connection
  isOnline: boolean;
  isFlushingQueue: boolean;

  // WS frame log
  wsLog: WSFrame[];

  // Alice AI
  aliceReplyTimer: number | null; // simulated response delay
  aliceResponseQueue: string[];   // pre-written responses
};

// Alice's simulated behavior:
// - After receiving a message, wait 1s, then send "typing" event
// - After 1-3s of "typing", send a response from the response queue
// - Response queue: ["Hey there!", "That's interesting!", "Tell me more!",
//   "Ha, nice one!", "I agree!", "What do you think about...",
//   "Sounds good!", "Let me think about that..."]
// - Cycle through the queue, wrapping around
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (4 steps).

**DemoSandbox**: phase 2 wrapping the two-panel chat.

**Internal components**:
- `ChatPanel`: a single chat view (messages + input). Props: `user`, `messages`, `isOnline`, `typingIndicator`, `onSend`. Messages rendered as bubbles with alignment based on sender.
- `MessageBubble`: individual message. Props: `message`, `alignment`. Shows status icons for outgoing messages. Orange background when queued.
- `StatusIcon`: tick/double-tick/blue-double-tick. Animated transitions between states using `TRANSITION.enter`.
- `TypingIndicator`: three dots pulsing. Uses `LOOP.breathe` with staggered delay per dot (0ms, 200ms, 400ms).
- `NetworkToggle`: Online/Offline segmented control. Orange indicator when offline.
- `WSFrameLog`: scrollable monospace log. Auto-scrolls to bottom. Incoming frames in green text, outgoing in blue text, system messages (DISCONNECTED/RECONNECTED) in red/green.
- `QueueBadge`: orange badge on input bar showing queued message count.

### Edge Cases

**Rapid message sending**:
- Each message gets a unique ID (crypto.randomUUID or counter). Server acks reference the ID. If the reader sends 10 messages in 2 seconds, all 10 get individual optimistic inserts and individual acks. No deduplication issues because IDs are unique.

**Offline toggle during queue flush**:
- If the reader toggles offline while the queue is flushing (during the 300ms stagger between sends), the remaining queued messages stay in the queue. Already-flushed messages keep their status. The queue resumes on next reconnect.

**Alice's typing indicator with no follow-up**:
- If the reader toggles offline while Alice is "typing", the typing indicator persists for 3s then auto-clears (timeout). Alice's response does not arrive while offline.

**Very long messages**:
- Messages are capped at 500 characters in the input. Overflow is prevented. Bubbles use `word-break: break-word` to handle long unbroken strings.

**Chat scroll position**:
- New messages auto-scroll to bottom if the reader is already at the bottom (within 50px). If the reader has scrolled up to read history, new messages do NOT auto-scroll -- a "New messages" badge appears at the bottom instead.

---

## sdp-whiteboard -- Collaborative Whiteboard
**Format**: system-design | **Effort**: xl
**Cross-section refs**: S04 `virt-canvas-dom` (Canvas vs DOM rendering tradeoffs), S01 `core-gpu` (GPU composition for canvas), S01 `core-render-cycle` (requestAnimationFrame for render loop), S06 `net-long-polling` (WebSocket/WebRTC for real-time sync), S03 `api-resize` (ResizeObserver for canvas sizing)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a blank canvas with two cursor icons. Requirement pills: `DRAWING`, `REAL-TIME SYNC`, `CONFLICT-FREE`, `PERFORMANT AT SCALE`.

**Scroll step 2 -- Canvas render loop**:
- Visual: a `<Canvas>` element with a `requestAnimationFrame` loop shown as a circular arrow. Inside the loop: `clear() -> draw shapes -> request next frame`. FPS counter: 60.
- Narrative: "Canvas is immediate-mode: every frame redraws everything. A render loop clears the canvas and redraws all shapes at 60fps."

**Scroll step 3 -- Shape state**:
- Visual: a `ShapeStore` box containing shape objects: `{ type: "rect", x: 10, y: 20, w: 100, h: 50, color: "#4A9" }`. Multiple shape entries stacked.
- Narrative: "Shapes are data, not DOM elements. The canvas reads shape data and draws it. Moving a shape means changing its x/y coordinates, not moving a DOM node."

**Scroll step 4 -- CRDT sync layer**:
- Visual: a `CRDT State` box between two User icons. Each user has their own copy. Arrows show operations flowing between them. A merge animation: User A moves shape right, User B moves shape down. Result: shape moves diagonally (both operations applied).
- Narrative: "CRDTs (Conflict-free Replicated Data Types) allow concurrent edits without coordination. Each user applies their changes locally and broadcasts them. Merge is automatic and deterministic."

**Scroll step 5 -- Pointer coalescing**:
- Visual: a freehand stroke being drawn. Left: without coalescing (jagged, few points). Right: with coalescing (smooth, many intermediate points). A magnified view shows the difference in control point density.
- Narrative: "Pointer events fire at screen refresh rate (60Hz). But the pointer moves between frames. getCoalescedEvents() retrieves intermediate positions for smoother strokes."

**Scroll step 6 -- Full architecture**:
- Visual: Input events -> Pointer coalescing -> Shape operations -> CRDT merge -> Canvas render loop. WebRTC data channel connecting two users.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `height: 500px`. Two regions: toolbar (top, 44px) and canvas (remaining).
- **Toolbar**: horizontal bar, `background: var(--color-surface)`, `border-bottom: 1px solid var(--color-border)`. Tools (icon buttons, 32x32px, active state with accent bottom border): Rectangle, Circle, Freehand, Select/Move. Color picker: 6 preset color circles (8px diameter each). Toggle: "Pointer Coalescing" on/off. Toggle: "Canvas / SVG" renderer switch. FPS counter badge on the right.
- **Canvas area**: `<canvas>` element filling remaining space. Background: `var(--color-bg)` with a subtle 20px dot grid pattern (dots at 8% opacity). Cursor: crosshair when drawing tools active, move when select tool active.
- **Simulated "other user" cursor**: a labeled cursor icon ("Alice") in a different color, moving autonomously. Draws shapes and moves existing shapes on a timer.
- **CRDT conflict panel**: appears as a floating tooltip when both users modify the same shape simultaneously. Shows: "You moved shape RIGHT. Alice moved shape DOWN. Merged: shape moves DIAGONALLY." Duration: 3s, then fades.
- **Coalescing comparison**: when coalescing toggle is flipped, the current/next freehand stroke visually shows the difference. Without coalescing: larger gaps between path points (visible as straight segments between dots). With coalescing: dense points, smooth curve.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (canvas visible,       |
              |  toolbar ready,        |
              |  Alice cursor present) |
              +-----------+------------+
                          |
               reader selects a tool
                          |
                          v
              +------------------------+
              |    tool-selected       |
              | (cursor changes,       |
              |  ready to draw)        |
              +-----------+------------+
                          |
               pointerdown on canvas
                          |
                          v
              +------------------------+
              |    drawing             |
              | (shape preview renders |
              |  with each pointermove.|
              |  Coalesced events used |
              |  for freehand.)        |
              +-----------+------------+
                          |
               pointerup
                          |
                          v
              +------------------------+
              |    shape-committed     |
              | (shape added to store. |
              |  CRDT broadcasts op.   |
              |  Canvas re-renders.)   |
              +-----------+------------+
                          |
               Alice modifies same shape concurrently
                          |
                          v
              +------------------------+
              |    crdt-merge          |
              | (both ops apply.       |
              |  Conflict panel shows  |
              |  merge resolution.     |
              |  Canvas re-renders.)   |
              +-----------+------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a drawing canvas with a subtle dot grid background. Toolbar at top with shape tools. A cursor labeled "Alice" (pink) is already on the canvas, slowly moving.

2. **(5-15s)** Reader selects the Rectangle tool. Cursor changes to crosshair. They click and drag on the canvas. A blue rectangle preview appears during drag, following the pointer. On release, the rectangle commits -- solid fill, visible on the canvas. The shape count increments.

3. **(15-22s)** Alice's cursor moves to the reader's rectangle and starts dragging it. The rectangle moves. The reader sees another user interacting with their shape. This is the collaboration moment.

4. **(22-32s)** The reader selects the Select tool and also grabs the same rectangle Alice is moving. The reader drags right while Alice drags down. The CRDT conflict panel appears: "You moved shape RIGHT (+40px x). Alice moved shape DOWN (+30px y). Merged: shape moves DIAGONALLY." Both translations apply. The shape ends up at the vector sum of both movements.

5. **(32-42s)** Reader selects Freehand tool with pointer coalescing ON. They draw a curvy line. The stroke is smooth with dense control points. Then they toggle coalescing OFF and draw another line at similar speed. This stroke is noticeably more jagged -- straight segments connecting fewer points. The visual difference is immediate.

6. **(42-50s)** Reader toggles the renderer from Canvas to SVG. The canvas content converts to SVG elements. FPS counter drops if there are 20+ shapes. They draw 20 more circles rapidly. FPS on SVG drops noticeably (40fps). They switch back to Canvas: 60fps. The performance difference with many shapes is clear.

7. **(50-60s)** Reader continues drawing. Alice continues autonomously adding and moving shapes. The canvas becomes a collaborative artwork. The FPS counter stays green on Canvas mode. The coalescing toggle and renderer toggle remain available for comparison.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Canvas limitations**:
- Visual: a Canvas shape with text on it. Reader tries to select the text (cursor shows no text selection). Below: a DOM element with selectable text.
- Narrative: "Canvas is a pixel buffer. Text in Canvas can't be selected, copied, or read by screen readers. For accessible text and interactive elements, you need DOM overlays on top of Canvas."

**Scroll step 2 -- CRDT overhead**:
- Visual: a shape operation: `{ type: "move", id: "s1", dx: 5, dy: 0 }`. At 60fps with continuous dragging, that's 60 operations/second. Multiply by 10 users: 600 ops/sec. The operation log grows rapidly.
- Narrative: "CRDTs store the full operation history for merge resolution. At high update rates, the operation log grows fast. Compaction strategies (combining sequential moves into one) are essential."

**Scroll step 3 -- Hit testing**:
- Visual: a click on the canvas near overlapping shapes. A for-loop iterates all shapes, checking bounding boxes. The clicked shape is found at iteration 47 of 200. A spatial index (quadtree) alternative finds it in 4 steps.
- Narrative: "Canvas has no built-in click detection. You must iterate shapes and check if the click point is inside each one. At hundreds of shapes, spatial indexing (quadtree) replaces linear scan."

**Scroll step 4 -- Undo/redo with CRDT**:
- Visual: a timeline of operations. User A draws, User B moves, User A draws again. User A hits undo. Question: does it undo User A's last draw only, or does it undo the entire timeline?
- Narrative: "Undo in collaborative editing is fundamentally different from single-user undo. Each user has their own undo stack, operating on THEIR operations only. Undoing interleaved with other users' edits requires operational transformation."

### Data & State Shape

```typescript
type ShapeId = string;

type Shape =
  | { type: "rect"; id: ShapeId; x: number; y: number; w: number; h: number; color: string }
  | { type: "circle"; id: ShapeId; cx: number; cy: number; r: number; color: string }
  | { type: "freehand"; id: ShapeId; points: Array<{ x: number; y: number }>; color: string; strokeWidth: number };

type Tool = "rect" | "circle" | "freehand" | "select";

type CRDTOp =
  | { type: "add"; shape: Shape; userId: string; timestamp: number }
  | { type: "move"; shapeId: ShapeId; dx: number; dy: number; userId: string; timestamp: number }
  | { type: "delete"; shapeId: ShapeId; userId: string; timestamp: number };

type WhiteboardState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Canvas
  shapes: Map<ShapeId, Shape>;
  selectedShapeId: ShapeId | null;

  // Tool
  activeTool: Tool;
  activeColor: string;               // hex, default "#4A90D9"

  // Drawing in progress
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  freehandPoints: Array<{ x: number; y: number }>;

  // Settings
  coalescingEnabled: boolean;         // default true
  renderer: "canvas" | "svg";        // default "canvas"

  // Alice (simulated collaborator)
  aliceCursor: { x: number; y: number };
  aliceAction: "idle" | "drawing" | "moving";
  aliceTarget: ShapeId | null;

  // CRDT
  opLog: CRDTOp[];
  conflictToast: { message: string; visible: boolean; timeout: number | null };

  // Performance
  fps: number;
  shapeCount: number;
};
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (4 steps).

**DemoSandbox**: phase 2 wrapping the canvas + toolbar.

**Internal components**:
- `DrawingCanvas`: `<canvas>` element with render loop. Uses `requestAnimationFrame`. Draws all shapes from the shapes Map plus the in-progress shape preview. Handles pointer events for drawing and selection.
- `SVGRenderer`: alternative renderer using `<svg>` and shape elements (`<rect>`, `<circle>`, `<path>`). Same visual output, different implementation for performance comparison.
- `Toolbar`: tool selection, color picker, toggles. Each tool is an icon button with tooltip.
- `AliceCursor`: a labeled cursor that moves autonomously. Uses pre-scripted paths with bezier interpolation for natural movement. Periodically draws shapes or moves existing ones.
- `CRDTEngine`: manages operation log and merge. Methods: `applyLocal(op)`, `applyRemote(op)`, `merge(localOp, remoteOp)`. For simultaneous moves: vector addition. For add/delete conflicts: last-writer-wins with user ID tiebreak.
- `ConflictToast`: floating panel showing merge resolution. Appears on CRDT conflict, auto-dismisses after 3s.
- `FPSCounter`: same pattern as S04 FPS badge.

### Edge Cases

**Drawing outside canvas bounds**:
- Pointer events are captured via `setPointerCapture` on `pointerdown`. `pointermove` events outside the canvas are clamped to canvas bounds. The shape preview snaps to the edge. On `pointerup` outside the canvas, the shape commits at the clamped coordinates.

**Freehand with 500+ points**:
- Each freehand stroke stores all points. At 60fps with coalescing (3-5 coalesced events per frame), a 3-second stroke = ~900 points. The canvas render loop draws the path using `beginPath/moveTo/lineTo`. Performance remains fine up to ~10,000 total points across all strokes. Beyond that, rasterize completed strokes into an offscreen canvas and only redraw the active stroke live.

**Alice and reader editing simultaneously from the start**:
- Alice begins her autonomous behavior after 3s delay. She does not interact with the canvas during the reader's first drawing action to avoid confusion. After the reader's first shape is committed, Alice becomes active.

**SVG mode with 100+ shapes**:
- FPS will drop visibly. This is intentional -- it teaches the Canvas vs SVG tradeoff (cross-reference S04 `virt-canvas-dom`). No mitigation; the FPS counter turning yellow/red IS the lesson.

**Touch events on mobile**:
- Pointer events handle both mouse and touch. `touch-action: none` on the canvas prevents default touch behaviors (scroll, pinch-zoom of the page). Multi-touch is not supported -- only the first pointer is tracked.

---

## sdp-offline-first -- Offline-First App
**Format**: system-design | **Effort**: large
**Cross-section refs**: S05 `state-storage` (IndexedDB, localStorage), S06 `net-long-polling` (reconnection patterns), S07 `perf-assets` (Service Worker caching), S09 `sec-cookies` (session persistence offline)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a todo app mockup with a red "NO NETWORK" banner. Requirement pills: `WORKS OFFLINE`, `SYNCS ON RECONNECT`, `CONFLICT RESOLUTION`.

**Scroll step 2 -- IndexedDB as primary store**:
- Visual: the app with an `IndexedDB` database icon below it. Arrow: "all reads/writes go to IndexedDB FIRST". A server icon is to the right but dimmed (optional, not primary).
- Narrative: "Offline-first means the local database is the source of truth, not the server. The app works identically with or without a network connection."

**Scroll step 3 -- Sync queue**:
- Visual: a `Sync Queue` box between IndexedDB and the Server. Pending changes stack up as cards in the queue: "ADD: Buy milk", "EDIT: Buy eggs -> Buy 12 eggs", "DELETE: Walk dog". Each card has a sequence number.
- Narrative: "Every local change is also added to a sync queue. These are operations, not snapshots -- the order matters."

**Scroll step 4 -- Queue flush on reconnect**:
- Visual: the network connection turns green. Queue cards fly from the queue to the server one by one. Each gets a green checkmark on return. The queue empties.
- Narrative: "On reconnect, the queue drains in order. The server applies each operation and acknowledges. Failed operations retry with exponential backoff."

**Scroll step 5 -- Conflict detection**:
- Visual: two versions of the same todo. Local: "Buy 12 eggs (edited offline)". Server: "Buy organic eggs (edited by another device)". A conflict icon appears between them.
- Narrative: "Conflicts happen when two devices edit the same item offline. The sync layer must detect this (version vectors or timestamps) and resolve it."

**Scroll step 6 -- Service Worker cache**:
- Visual: a `Service Worker` box between the browser and the network. Two lanes: "Assets (cache-first)" and "API (network-first)". Asset requests go to cache. API requests try network, fall back to IndexedDB.
- Narrative: "The Service Worker caches the app shell (HTML, CSS, JS) so the app loads instantly offline. API requests fall through to IndexedDB when the network is unavailable."

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 440px`, centered. `height: 520px`.
- **Network toggle**: top bar with online/offline toggle and connection status indicator. Online: green dot + "Online". Offline: red dot + "Offline". The toggle is a `DialToggle` component.
- **Todo app**: below the toggle. Header: "My Todos" with add button (+). Todo list: each item is a row with checkbox, text, edit icon, delete icon. Checked items have strikethrough text in `var(--color-muted)`. New item input at bottom.
- **Sync queue visualization**: right sidebar, `width: 180px`. Title: "Sync Queue". Each pending operation is a card: `background: var(--diagram-layer-3)` (orange-gold), `border-radius: var(--radius-2)`, `padding: var(--space-2)`, `font-size: var(--text-xs)`. Card shows operation type (ADD/EDIT/DELETE) and a preview of the data. When flushing: cards animate from the queue to a "Server" icon at the bottom, getting green checkmarks.
- **Conflict resolution modal**: appears when a conflict is detected on reconnect. Shows two versions side by side: "Your version" (left, blue border) and "Server version" (right, green border). Three buttons: "Keep mine", "Keep server's", "Merge" (concatenates texts with " / " separator). After choosing, the resolved version gets a checkmark and the modal closes.
- **Cache strategy diagram**: small diagram below the todo app, `height: 60px`. Two lanes: "Assets: Cache-first" and "API: Network-first, IndexedDB fallback". Active lane highlights based on current requests.

#### Interaction State Machine

```
              +------------------------+
              |    demo-online         |
              | (app works normally.   |
              |  Changes sync to       |
              |  server immediately.   |
              |  Queue always empty.)  |
              +-----------+------------+
                          |
               reader toggles offline
                          |
                          v
              +------------------------+
              |    demo-offline        |
              | (app still works.      |
              |  Changes go to         |
              |  IndexedDB + queue.    |
              |  Orange cards stack.)  |
              +-----------+------------+
                          |
               reader toggles online
                          |
                          v
              +------------------------+
              |    syncing             |
              | (queue flushes. Cards  |
              |  fly to server icon.   |
              |  Checkmarks appear.)   |
              +-----------+------------+
                   |              |
            no conflicts     conflict detected
                   |              |
                   v              v
              +----------+  +--------------+
              | synced   |  | conflict-ui  |
              | (queue   |  | (modal shows |
              |  empty)  |  |  two versions)|
              +----------+  +--------------+
                                  |
                       reader picks resolution
                                  |
                                  v
                            +-----------+
                            |  synced   |
                            +-----------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-8s)** Reader sees a todo app with 3 pre-populated items: "Buy groceries", "Walk the dog", "Read chapter 5". Online status: green. Sync queue sidebar is empty. Reader adds a new todo: "Call dentist". It appears in the list. The sync queue briefly flashes a card ("ADD: Call dentist") that immediately flies to the server and gets a checkmark. Queue returns to empty. Normal online behavior.

2. **(8-15s)** Reader toggles the network to OFFLINE. Status turns red. The todo app looks identical -- no visual degradation, no error state. The app is fully functional offline.

3. **(15-25s)** Reader adds "Fix bike tire". The todo appears in the list. An orange card appears in the sync queue: "ADD: Fix bike tire". Reader edits "Buy groceries" to "Buy organic groceries". Another card: "EDIT: Buy organic groceries". Reader deletes "Walk the dog". Third card: "DELETE: Walk the dog". Queue shows 3 stacked orange cards.

4. **(25-35s)** Reader toggles back ONLINE. The three cards animate one by one from the queue toward the server icon (300ms apart). Each card gets a green checkmark and fades. Queue empties. The todo list is unchanged -- it was already correct locally. The sync was invisible to the user.

5. **(35-48s)** Reader toggles OFFLINE again. Edits "Read chapter 5" to "Read chapter 6". Meanwhile, a simulated server change edits the same item to "Read chapter 5 & 6" (this conflict is injected automatically when the reader edits while offline). Reader toggles ONLINE.

6. **(48-58s)** During sync, the conflict resolution modal appears. Left: "Your version: Read chapter 6". Right: "Server version: Read chapter 5 & 6". Three buttons. Reader clicks "Merge". The resolved text becomes "Read chapter 6 / Read chapter 5 & 6". The conflict card gets a checkmark. The modal closes.

7. **(58-60s)** The sync queue is empty. The todo list shows the merged result. The reader has experienced the full offline-first lifecycle: offline changes, sync queue, conflict detection, resolution.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Last-write-wins vs explicit resolution**:
- Visual: two strategies side by side. LWW: "Server version always wins (simple, data loss possible)". Explicit: "User chooses (complex, no data loss)". A spectrum bar from "Simple" to "Safe".
- Narrative: "Most apps use last-write-wins because users rarely conflict. But when they do, data loss is silent. Explicit resolution prevents loss but adds UX friction."

**Scroll step 2 -- IndexedDB limitations**:
- Visual: an IndexedDB icon with limitation callouts: "Storage quota (~50MB-1GB)", "Async-only API", "No SQL", "No multi-tab transactions".
- Narrative: "IndexedDB is powerful but awkward. The API is callback-based (wrap in Promises). Storage limits vary by browser. For structured queries, you need a library like Dexie.js."

**Scroll step 3 -- Service Worker lifecycle**:
- Visual: a timeline showing SW registration, installation (caching assets), activation (claiming clients), and update (new SW waiting, then taking over). The "waiting" phase is highlighted as problematic.
- Narrative: "Service Worker updates don't take effect immediately -- the new version waits until all tabs close. This means users can run stale code for days. skipWaiting() forces activation but risks breaking in-progress operations."

### Data & State Shape

```typescript
type TodoId = string;

type Todo = {
  id: TodoId;
  text: string;
  completed: boolean;
  version: number;                 // incremented on each edit (for conflict detection)
  lastModified: number;            // timestamp
};

type SyncOp =
  | { type: "add"; todo: Todo; timestamp: number }
  | { type: "edit"; id: TodoId; text: string; completed: boolean; version: number; timestamp: number }
  | { type: "delete"; id: TodoId; timestamp: number };

type SyncCard = {
  op: SyncOp;
  status: "pending" | "syncing" | "synced" | "conflict";
};

type ConflictData = {
  todoId: TodoId;
  localVersion: Todo;
  serverVersion: Todo;
};

type OfflineFirstState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Todo data
  todos: Todo[];

  // Network
  isOnline: boolean;

  // Sync
  syncQueue: SyncCard[];
  isSyncing: boolean;

  // Conflict
  activeConflict: ConflictData | null;

  // Simulated server state (for conflict injection)
  serverTodos: Todo[];              // diverges from local when offline edits happen
  conflictInjected: boolean;        // true once the simulated server edit was applied
};
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 wrapping the todo app + sync queue.

**DialToggle**: online/offline toggle (reused primitive).

**Internal components**:
- `TodoList`: renders the list of todos with CRUD operations.
- `TodoItem`: single todo row with checkbox, text, edit/delete buttons.
- `SyncQueuePanel`: right sidebar showing pending operations as orange cards. Uses `AnimatePresence` for enter/exit of cards.
- `ConflictModal`: modal with two-version comparison and resolution buttons.
- `CacheStrategyDiagram`: small static diagram showing cache-first vs network-first lanes.

### Edge Cases

**Multiple conflicts in a single sync**:
- Conflicts are resolved one at a time. If 3 items conflict, 3 modal appearances happen sequentially. Each resolution commits before showing the next conflict.

**Deleting an item that was edited on the server**:
- The local delete wins (delete is destructive and intentional). No conflict modal -- the item is removed. The server edit is discarded.

**Adding the same item on two devices offline**:
- Both items persist (they have different IDs). No conflict -- parallel adds result in both items in the list.

**Queue with 20+ pending operations**:
- The sync queue sidebar scrolls. Flush animation speed increases: `300 / Math.sqrt(queueLength)` ms per card to keep total animation under 3s.

---

## sdp-multi-tab -- Multi-Tab Synchronization
**Format**: system-design | **Effort**: large
**Cross-section refs**: S05 `state-storage` (localStorage, storage events), S06 `net-long-polling` (WebSocket shared across tabs), S01 `core-event-loop` (BroadcastChannel event handling)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: 3 browser tab icons with a shared state cloud between them. Requirement pills: `SHARED STATE`, `REAL-TIME SYNC`, `LEADER ELECTION`, `NO DUPLICATE API CALLS`.

**Scroll step 2 -- BroadcastChannel**:
- Visual: 3 tab boxes. A `BroadcastChannel` pipe connects all three. Tab 1 sends a message dot through the pipe. Tabs 2 and 3 receive it. Label: "Direct tab-to-tab messaging".
- Narrative: "BroadcastChannel is purpose-built for cross-tab messaging. One tab posts a message, all other tabs on the same origin receive it."

**Scroll step 3 -- localStorage events**:
- Visual: 3 tab boxes with a `localStorage` icon below them. Tab 1 writes to localStorage. A `storage` event ripples to Tabs 2 and 3 (but NOT back to Tab 1). Label: "Write-triggered, not self-notifying".
- Narrative: "localStorage storage events fire in OTHER tabs when a value changes. The writing tab does NOT receive the event. A classic workaround that works everywhere."

**Scroll step 4 -- SharedWorker**:
- Visual: 3 tab boxes. A central `SharedWorker` bubble in the middle, connected to all three tabs via `MessagePort` lines. State lives in the worker. Tabs send operations, worker broadcasts updates.
- Narrative: "A SharedWorker is a single JavaScript context shared by all tabs. State lives in the worker, not in any tab. Tabs communicate through message ports."

**Scroll step 5 -- Leader election**:
- Visual: 3 tab boxes. One has a crown icon. The leader tab makes API calls; others don't. The leader broadcasts fetched data to followers.
- Narrative: "Leader election ensures only one tab makes API calls. Without it, 5 open tabs means 5x the server load. The leader fetches, others receive."

**Scroll step 6 -- Election protocol**:
- Visual: the crown tab closes (red X). The other two tabs enter an "ELECTION" state (dotted borders, racing timers). The tab with the lower random timer wins -- crown transfers.
- Narrative: "When the leader closes, remaining tabs hold an election. Each sets a random timeout. The first to claim the lock becomes the new leader."

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`. Three simulated tab panels side by side, each `width: 33.3%`.
- **Tab panel**: `height: 400px`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`. Header: "Tab {n}" with a crown icon if leader (gold, 16px). Header also shows the active sync mechanism icon.
- **Shared state display**: each tab shows the same state: a counter (large number, `font-size: var(--text-2xl)`, centered) and a mini todo list (3 items). Both update across all tabs when changed in any tab.
- **Controls per tab**: "+1" / "-1" buttons for the counter. "Add todo" / "Remove last todo" buttons. A "Close tab" button (X) in the header (only for tabs 2 and 3; tab 1 cannot close).
- **Sync mechanism selector**: a segmented control above the tabs: `BroadcastChannel | localStorage | SharedWorker | Leader Election`. Default: BroadcastChannel. Switching resets all tabs to initial state.
- **Message animation**: when a tab sends a state change, a small colored dot animates from that tab to the others. BroadcastChannel: direct horizontal dot. localStorage: dot goes DOWN to a localStorage icon below, then UP to other tabs. SharedWorker: dot goes to central worker icon, then radiates out. Leader election: API calls only from the crowned tab.
- **Propagation timer**: each receiving tab shows a small latency number (e.g., "3ms") when it receives an update, indicating propagation time.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (3 tabs, counter=0,    |
              |  BroadcastChannel      |
              |  mode, Tab 1 is leader)|
              +-----------+------------+
                          |
               reader clicks +1 in Tab 2
                          |
                          v
              +------------------------+
              |    state-changed       |
              | (Tab 2 counter: 1.     |
              |  Dot animates to       |
              |  Tabs 1 and 3.         |
              |  All show 1.)          |
              +-----------+------------+
                          |
               reader closes leader tab
                          |
                          v
              +------------------------+
              |    election-running    |
              | (crown disappears.     |
              |  Remaining tabs show   |
              |  "ELECTING..." with    |
              |  racing timers.)       |
              +-----------+------------+
                          |
               timer fires in one tab
                          |
                          v
              +------------------------+
              |    new-leader          |
              | (winning tab gets      |
              |  crown. Other tab(s)   |
              |  become followers.)    |
              +-----------+------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees three tab panels side by side, all showing counter = 0 and the same 3 todos. Tab 1 has a gold crown (leader). Sync mechanism: BroadcastChannel.

2. **(5-12s)** Reader clicks "+1" in Tab 2. Tab 2's counter changes to 1. A blue dot animates horizontally from Tab 2 to Tab 1 and Tab 3. Both update to 1 near-instantly. Propagation labels show "2ms" and "3ms".

3. **(12-20s)** Reader clicks "+1" in Tab 3 twice rapidly. Dots animate from Tab 3 to the others. All tabs show 3. The message animation makes the communication visible.

4. **(20-28s)** Reader switches to "localStorage" mode. All tabs reset to 0. Reader clicks "+1" in Tab 1. A dot goes DOWN from Tab 1 to a localStorage icon below, then UP to Tabs 2 and 3. But Tab 1 does NOT receive a dot back (storage event doesn't fire in the writing tab). A small label appears under Tab 1: "Writer doesn't receive storage event". Tabs 2 and 3 update. Propagation: "12ms" (noticeably slower than BroadcastChannel).

5. **(28-38s)** Reader switches to "Leader Election" mode. Tab 1 has the crown. Reader clicks "+1" in Tab 2. Tab 2 sends the intent to the leader (Tab 1). Tab 1 makes the "API call" (shown as a dot going to a server icon and back), then broadcasts the confirmed state to all tabs. The extra hop is visible.

6. **(38-48s)** Reader clicks the X on Tab 1 (the leader). Tab 1 fades to grey with a "CLOSED" overlay. The crown disappears. Tabs 2 and 3 enter election state: their borders become dashed, and small countdown timers appear (random: Tab 2 at 400ms, Tab 3 at 250ms). Tab 3's timer reaches zero first -- Tab 3 gets the crown. Tab 2 stops its timer and becomes a follower.

7. **(48-60s)** Reader interacts with the two remaining tabs under Tab 3's leadership. They re-open Tab 1 (a "Reopen" button replaces the closed panel). Tab 1 returns as a follower. State syncs immediately from the leader.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Browser support matrix**:
- Visual: a grid. Rows: BroadcastChannel, SharedWorker, localStorage events. Columns: Chrome, Firefox, Safari, Edge. Green/red cells for support.
- Narrative: "BroadcastChannel has broad support now. SharedWorker has Safari gaps. localStorage events are universally supported but limited in functionality."

**Scroll step 2 -- Tab lifecycle edge cases**:
- Visual: scenarios. Tab crashes (no beforeunload fires). Tab is suspended (mobile background). Tab is duplicated (Cmd+D). Each breaks assumptions.
- Narrative: "Tabs don't always close cleanly. A crash leaves the leader lock held. Mobile suspension freezes timers. Tab duplication creates unexpected state clones. Heartbeat-based leader detection handles these."

**Scroll step 3 -- State size limits**:
- Visual: localStorage: "5MB limit", BroadcastChannel: "no built-in limit but large messages block", SharedWorker: "limited by worker memory".
- Narrative: "For large state, serialize carefully. BroadcastChannel with large messages blocks the UI. SharedWorker can hold more state but dies if all tabs close."

### Data & State Shape

```typescript
type SyncMechanism = "broadcast-channel" | "local-storage" | "shared-worker" | "leader-election";

type TabId = string;

type TabState = {
  id: TabId;
  isLeader: boolean;
  isClosed: boolean;
  electionTimer: number | null;     // ms remaining during election
};

type SharedState = {
  counter: number;
  todos: string[];                  // simple string list for the demo
};

type MessageDot = {
  id: string;
  fromTab: TabId;
  toTab: TabId;
  startTime: number;
  duration: number;                 // animation duration in ms
  path: "direct" | "via-storage" | "via-worker" | "via-leader";
};

type MultiTabState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Tabs
  tabs: TabState[];                 // 3 tabs

  // Shared state
  sharedState: SharedState;

  // Sync
  mechanism: SyncMechanism;
  messageDots: MessageDot[];        // active animations
  propagationTimes: Map<TabId, number>; // last measured propagation per tab

  // Leader election
  leaderId: TabId | null;
  isElecting: boolean;
};
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 with `DemoSandbox.Tabs` for the mechanism selector.

**Internal components**:
- `SimulatedTab`: a single tab panel. Props: `tab`, `sharedState`, `isLeader`, `onAction`, `onClose`. Renders counter, todos, controls.
- `MessageDotAnimation`: animated dot traveling between tabs. Uses `motion.div` with absolute positioning and `SPRING.snappy` for the travel path.
- `MechanismSelector`: segmented control for the 4 sync mechanisms.
- `LeaderCrown`: gold crown icon, animated with `SPRING.snappy` on mount/unmount.
- `ElectionTimer`: countdown display per tab during leader election. `font-family: var(--font-mono)`, `font-size: var(--text-xs)`.

### Edge Cases

**Closing the last leader-eligible tab**:
- Tab 1 cannot be closed. If there are only 2 tabs open and the leader closes, the remaining tab automatically becomes leader without election.

**Rapid state changes across multiple tabs**:
- BroadcastChannel handles this naturally (message ordering). localStorage events can fire out of order under high frequency. SharedWorker serializes through its message queue. The demo throttles to max 10 updates/second to keep animations readable.

**Switching mechanism with pending state changes**:
- All pending animations cancel. State resets to `{ counter: 0, todos: ["Buy milk", "Walk dog", "Read book"] }`. This prevents cross-mechanism confusion.

---

## sdp-video-streaming -- Adaptive Video Streaming
**Format**: system-design | **Effort**: large
**Cross-section refs**: S06 `net-protocols` (HTTP/2 multiplexing for segment downloads), S07 `perf-js` (main-thread budget for decode), S01 `core-render-cycle` (rAF for playback synchronization), S07 `perf-images` (progressive loading concepts)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a video player icon with a buffering spinner. Requirement pills: `CONTINUOUS PLAYBACK`, `ADAPTIVE QUALITY`, `BANDWIDTH RESILIENCE`.

**Scroll step 2 -- Segmented streaming**:
- Visual: a video timeline broken into segments (2-second chunks). Each chunk is a colored block. The player downloads chunks ahead of the playback position.
- Narrative: "Video isn't downloaded as one file. It's split into 2-10 second segments. The player requests segments sequentially, staying ahead of playback."

**Scroll step 3 -- Buffer management**:
- Visual: a buffer bar below the timeline. Left of the playhead: played (grey). Between playhead and buffer end: buffered (blue). Right of buffer: not yet loaded (empty). A "buffer health" metric: seconds of buffered content.
- Narrative: "The buffer absorbs network hiccups. If bandwidth drops briefly, the buffer provides content while the network catches up."

**Scroll step 4 -- Quality tiers**:
- Visual: the same segment shown at 4 quality levels stacked: 144p (tiny, 50KB), 480p (medium, 200KB), 1080p (large, 800KB), 4K (huge, 2MB). File size bars next to each.
- Narrative: "Each segment exists at multiple quality levels. The player chooses which quality to request based on current conditions."

**Scroll step 5 -- ABR algorithm**:
- Visual: a decision flowchart. "Current bandwidth?" -> if > 5Mbps: "1080p". If 1-5Mbps: "480p". If < 1Mbps: "144p". Also considers buffer health: low buffer -> drop quality to refill faster.
- Narrative: "Adaptive Bitrate (ABR) continuously measures bandwidth and buffer health. It selects the highest quality the connection can sustain without stalling."

**Scroll step 6 -- Full architecture**:
- Visual: Media Source Extensions API -> Segment Fetcher -> ABR Controller -> Buffer Manager -> Video Element. A bandwidth monitor feeding into ABR.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 640px`, centered.
- **Video player mockup**: `height: 320px`, `background: #000`, `border-radius: var(--radius-2)`. Center: a "frame counter" showing current frame number and quality level in large text (since we can't play actual video). The background color subtly shifts based on quality: darker = lower quality, brighter = higher quality.
- **Progress bar**: below the video. `height: 8px`. Three layers: played (grey), buffered (blue), total (dark grey). Playhead: `width: 12px`, `height: 12px`, white circle. Segments are visible as subtle dividers in the bar.
- **Quality indicator**: top-right of the video area. Badge showing "1080p" / "480p" / "144p" / "4K". Color-coded: green for high, yellow for medium, red for low. Transitions with `TRANSITION.enter`.
- **Buffer health meter**: below the progress bar. A horizontal bar showing seconds of buffer: "Buffer: 4.2s". Green if > 3s, yellow if 1-3s, red if < 1s.
- **Bandwidth graph**: `height: 120px`, below the buffer meter. X-axis: time (last 30s). Y-axis: bandwidth (Mbps, left) and quality level (right). Two lines: blue = measured bandwidth, orange = selected quality bitrate. The gap between them is the margin.
- **Controls row**: Play/pause button. Bandwidth simulator: `DialSegment` with presets: "Fast (10Mbps)", "Medium (3Mbps)", "Slow (0.5Mbps)", "Fluctuating (random)". ABR toggle: "ABR On / ABR Off (fixed 1080p)".
- **Stall indicator**: when playback stalls (buffer empty), a spinner overlays the video area with "Buffering..." text. This only happens when ABR is off and bandwidth is insufficient.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (video paused at 0.    |
              |  Buffer empty.         |
              |  ABR on, 10Mbps.)     |
              +-----------+------------+
                          |
               reader clicks play
                          |
                          v
              +------------------------+
              |    playing-buffering   |
              | (segments downloading. |
              |  Buffer filling.       |
              |  Quality selected      |
              |  by ABR.)              |
              +-----------+------------+
                          |
               buffer reaches 3s
                          |
                          v
              +------------------------+
              |    playing-stable      |
              | (playback and download |
              |  in steady state.      |
              |  Graph shows stable    |
              |  bandwidth/quality.)   |
              +-----------+------------+
                          |
               reader drops bandwidth
                          |
                          v
              +------------------------+
              |    adapting            |
              | (ABR detects drop.     |
              |  Quality decreases.    |
              |  Buffer may dip but    |
              |  playback continues.)  |
              +-----------+------------+
                          |
               bandwidth too low + no ABR
                          |
                          v
              +------------------------+
              |    stalled             |
              | (buffer empty.         |
              |  Spinner overlay.      |
              |  Segments downloading  |
              |  slowly.)              |
              +-----------+------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a video player with a progress bar, quality indicator ("1080p"), buffer health meter ("Buffer: 0.0s"), and a bandwidth graph. Bandwidth is set to "Fast (10Mbps)". ABR is on. Video is paused.

2. **(5-12s)** Reader clicks play. Segments start downloading (visible as blue chunks filling the buffer bar). The buffer health meter climbs: 1.0s, 2.0s, 3.0s, 4.0s. Quality stays at 1080p. Frame counter increments. The bandwidth graph shows a flat blue line at 10Mbps.

3. **(12-22s)** Reader switches bandwidth to "Slow (0.5Mbps)". The bandwidth graph's blue line drops sharply. ABR reacts: quality indicator transitions from "1080p" (green) to "480p" (yellow). The orange quality line on the graph drops to match. Buffer dips briefly to 2.0s but stabilizes because the lower quality segments are smaller. Playback continues uninterrupted.

4. **(22-30s)** Reader switches bandwidth to "Fluctuating". The blue bandwidth line oscillates randomly between 0.3 and 8Mbps. ABR continuously adjusts: quality bounces between 480p and 1080p. The buffer absorbs the fluctuations. The graph visually shows ABR tracking bandwidth.

5. **(30-42s)** Reader turns ABR OFF (fixed 1080p). With fluctuating bandwidth, the player keeps requesting 1080p segments even when bandwidth is 0.5Mbps. Buffer starts draining. Buffer health drops: 3.0s -> 2.0s -> 1.0s (yellow) -> 0.3s (red) -> 0.0s. The spinner overlay appears: "Buffering...". Playback stalls. The reader experiences the problem ABR solves.

6. **(42-50s)** Reader turns ABR back ON. Quality drops to 144p (matching the current low bandwidth). Buffer refills rapidly (144p segments are tiny). Playback resumes. Quality gradually increases as bandwidth recovers. The graph shows the recovery.

7. **(50-60s)** Reader returns to "Fast (10Mbps)". Quality climbs to 4K. Buffer stays healthy. The reader has experienced the full cycle: stable playback, bandwidth drop, adaptation, stall (without ABR), recovery.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- ABR aggressiveness**:
- Visual: two ABR strategies. "Conservative": drops quality early, avoids stalls but lower average quality. "Aggressive": stays high quality longer, risks stalls but better average quality.
- Narrative: "ABR algorithms have a tuning parameter: how aggressively to drop quality. Netflix is conservative (minimize stalls). YouTube is moderate. The 'right' setting depends on content type."

**Scroll step 2 -- Segment duration tradeoff**:
- Visual: short segments (2s) vs long segments (10s). Short: faster adaptation, more requests. Long: fewer requests, slower adaptation.
- Narrative: "Short segments let ABR react faster but generate more HTTP requests. Long segments reduce request overhead but react slowly to bandwidth changes."

**Scroll step 3 -- DRM and encryption**:
- Visual: the segment pipeline with an encryption/decryption step. Key exchange shown. Performance impact labeled.
- Narrative: "Content protection adds decrypt steps per segment. DRM (Widevine, FairPlay) requires key negotiation before playback. This adds latency to startup and segment switches."

### Data & State Shape

```typescript
type QualityLevel = "144p" | "480p" | "1080p" | "4K";

type Segment = {
  index: number;
  startTime: number;               // seconds
  duration: number;                 // 2 seconds
  quality: QualityLevel;
  sizeBytes: number;               // varies by quality
  loaded: boolean;
};

type BandwidthPreset = "fast" | "medium" | "slow" | "fluctuating";

type VideoStreamingState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Playback
  isPlaying: boolean;
  currentTime: number;             // seconds
  duration: number;                // total video duration (60s simulated)
  isStalled: boolean;

  // Buffer
  segments: Segment[];
  bufferHealth: number;            // seconds of buffered content ahead
  bufferTarget: number;            // target buffer (5s)

  // ABR
  abrEnabled: boolean;
  currentQuality: QualityLevel;
  measuredBandwidth: number;       // Mbps (simulated)
  bandwidthHistory: Array<{ time: number; value: number }>;
  qualityHistory: Array<{ time: number; level: QualityLevel }>;

  // Simulation
  bandwidthPreset: BandwidthPreset;
  simulationTick: number;          // incremented by rAF

  // Quality -> bitrate mapping
  qualityBitrates: Record<QualityLevel, number>; // Mbps
};

// Quality bitrate mapping:
// 144p: 0.3 Mbps
// 480p: 1.5 Mbps
// 1080p: 5.0 Mbps
// 4K: 15.0 Mbps
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 wrapping the video player.

**DialSegment**: bandwidth preset selector (4 presets).

**Internal components**:
- `VideoMockup`: the black video area with frame counter and quality indicator. No actual video -- uses quality-dependent background color and frame numbers.
- `ProgressBar`: segmented progress bar with played/buffered/total layers.
- `BufferHealthMeter`: horizontal meter with color-coded health.
- `BandwidthGraph`: time-series graph with dual Y-axes. Uses `<canvas>` for the graph drawing (avoids DOM overhead for 30s of data points at 10fps update rate). Grid lines, axis labels in `var(--font-mono)`.
- `ABRController`: pure logic. Given `measuredBandwidth` and `bufferHealth`, selects the highest `QualityLevel` whose bitrate is <= 80% of measured bandwidth. If buffer < 2s, drop one level below the bandwidth-optimal choice.
- `BandwidthSimulator`: generates simulated bandwidth values. "Fast": constant 10. "Medium": constant 3. "Slow": constant 0.5. "Fluctuating": Perlin noise between 0.3 and 8.0, changing every 500ms.
- `StallOverlay`: spinner + "Buffering..." text overlay on the video.

### Edge Cases

**ABR toggle during stall**:
- If ABR is turned ON while the player is stalled, it immediately selects the lowest quality. Buffer refills faster with small segments. Playback resumes as soon as 1 segment is buffered.

**Seeking (scrubbing the progress bar)**:
- Not implemented in this demo. The progress bar is display-only. Including seeking would add significant complexity (buffer invalidation, segment re-fetching) without proportional teaching value.

**Bandwidth preset change during playback**:
- Bandwidth changes take effect on the next simulation tick (100ms). The graph line shows the transition. ABR reacts within 1-2 segments (2-4 seconds).

---

## sdp-drag-drop -- Drag & Drop Sortable List
**Format**: system-design | **Effort**: large
**Cross-section refs**: S01 `core-render-cycle` (rAF for smooth drag animation), S01 `core-gpu` (transform for composited movement), S02 `dom-refresher` (DOM measurement for hit testing), S03 `api-observer-overview` (pointer events API)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a sortable list with an item being dragged. Requirement pills: `SMOOTH DRAG`, `DROP ZONES`, `KEYBOARD ACCESSIBLE`, `POINTER EVENTS`.

**Scroll step 2 -- Pointer event lifecycle**:
- Visual: a horizontal timeline. Three events: `pointerdown` (start), `pointermove` (many, rapid), `pointerup` (end). Each labeled with coordinates. Between down and up: a drag threshold check (5px of movement before committing to drag mode).
- Narrative: "A drag is three pointer events: down starts tracking, move updates position, up commits the drop. A 5px dead zone distinguishes drag from click."

**Scroll step 3 -- Item pick-up**:
- Visual: a list item lifting off the list (subtle scale and shadow increase). The original position shows a ghost placeholder (dashed outline, same height). The dragged item follows the pointer.
- Narrative: "On pick-up: clone the item visually, leave a placeholder, and translate the clone to follow the pointer. Use transform (GPU-composited) for the movement."

**Scroll step 4 -- Hit testing & gap animation**:
- Visual: the dragged item moves between list items. As it crosses the midpoint of an item, that item and all items below animate to create a gap. The gap follows the drag position.
- Narrative: "Hit test on each pointermove: which drop zone is the pointer over? Calculate by comparing pointer Y to each item's midpoint. Items animate open to create space."

**Scroll step 5 -- Drop & commit**:
- Visual: the dragged item drops into the gap. The placeholder disappears. The item springs into its new position. The list re-renders with the new order.
- Narrative: "On pointerup: animate the item from its drag position to the gap position. Commit the reorder to state. The spring animation makes the drop feel physical."

**Scroll step 6 -- Keyboard alternative**:
- Visual: focus ring on a list item. Arrow keys move it up/down (same gap animation). Enter commits the new position.
- Narrative: "Screen readers and keyboard users need an equivalent path. Space/Enter to pick up, arrows to move, Space/Enter to drop. Same animations, same result."

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 600px`. Two panels side by side.
- **Left panel -- Sortable List** (`width: 60%`):
  - 8 list items, each `height: 52px`, `padding: 0 var(--space-3)`, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`, `margin-bottom: var(--space-1)`. Content: drag handle (6 dots icon), item label ("Item A", "Item B", ...), and a subtle grip indicator.
  - Dragged item: `box-shadow: 0 8px 24px rgba(0,0,0,0.15)`, `scale: 1.02`, `opacity: 0.95`. Follows pointer via `transform: translate(0, deltaY)`.
  - Placeholder: dashed border, same height as the dragged item, `background: var(--diagram-layer-0)` at 8%.
  - Gap animation: items below the drop target translate down by `itemHeight + gap` using `transform: translateY()` with `SPRING.snappy`.
  - Keyboard mode indicator: when keyboard mode is active, a banner appears at the top: "Keyboard mode: arrows to move, Enter to drop" in `var(--color-muted)`, `font-size: var(--text-xs)`.
- **Right panel -- Pointer Event Timeline** (`width: 40%`):
  - `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`, `padding: var(--space-2)`, `overflow-y: auto`, `height: 400px`.
  - Title: "Pointer Events" in `var(--font-mono)`, `font-size: var(--text-xs)`.
  - Each event is a row: event type badge (`pointerdown` in blue, `pointermove` in green, `pointerup` in orange), coordinates `(x, y)`, and timestamp delta from drag start.
  - `pointermove` events are grouped: "32 pointermove events (14ms-1247ms)" with expand toggle to see all coordinates.
  - A mode toggle at the bottom: "Mouse mode / Keyboard mode". Keyboard mode disables pointer tracking and enables arrow key reordering.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (list visible, no      |
              |  item selected)        |
              +-----------+------------+
                          |
               pointerdown on item (or Space/Enter on focused item)
                          |
                          v
              +------------------------+
              |    drag-pending        |
              | (tracking pointer,     |
              |  waiting for 5px       |
              |  threshold)            |
              +-----------+------------+
                 |                  |
    pointer moves < 5px      pointer moves >= 5px
    + pointerup (= click)   (commit to drag)
                 |                  |
                 v                  v
              (demo-idle)   +------------------------+
                            |    dragging            |
                            | (item lifted, shadow,  |
                            |  placeholder shown,    |
                            |  gap animates as       |
                            |  pointer crosses       |
                            |  midpoints)            |
                            +-----------+------------+
                                        |
                             pointerup (or Enter in keyboard mode)
                                        |
                                        v
                            +------------------------+
                            |    dropping            |
                            | (item springs to new   |
                            |  position. Placeholder |
                            |  fades. List commits   |
                            |  new order.)           |
                            +-----------+------------+
                                        |
                             animation complete
                                        |
                                        v
                            +------------------------+
                            |    demo-idle           |
                            +------------------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a list of 8 items (A through H) on the left, and an empty pointer event timeline on the right. Items have visible drag handles (6-dot grip icon).

2. **(5-15s)** Reader clicks and holds on Item C's drag handle. The timeline logs: `pointerdown at (142, 208)`. Reader moves the mouse down past the 5px threshold. Item C lifts off with shadow and slight scale. A dashed placeholder appears where C was. The timeline begins logging `pointermove` events rapidly: coordinates updating in real-time.

3. **(15-25s)** Reader drags Item C downward past Item D. As the pointer crosses D's midpoint, D animates upward (into C's old position) with a smooth spring. The gap opens below D. Reader continues past E -- E also animates up. The gap follows the pointer. The timeline shows grouped pointermove events: "48 pointermove events".

4. **(25-32s)** Reader releases (pointerup). The timeline logs: `pointerup at (142, 364)`. Item C springs from its drag position into the gap between E and F. The placeholder fades. The list order is now: A, B, D, E, C, F, G, H. The drop animation uses `SPRING.snappy`.

5. **(32-42s)** Reader clicks "Keyboard mode". The first item (A) gets a visible focus ring. Reader presses Space -- Item A enters "picked up" state (subtle lift, keyboard mode banner appears). Reader presses ArrowDown three times. With each press, Item A swaps with the item below it, and the gap animation plays. Item A is now in position 4. Reader presses Enter -- Item A drops into position.

6. **(42-50s)** Reader switches back to mouse mode. The pointer event timeline has accumulated a full history of the drag: down, 48 moves, up. Reader expands the grouped pointermove events to see all 48 coordinates listed with timestamps. The density of events is itself a teaching moment.

7. **(50-60s)** Reader drags another item quickly. The timeline shows even more pointermove events (fast drag = more frames). They drag slowly -- fewer events. The relationship between drag speed and event frequency becomes visible.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Drag performance**:
- Visual: a flame chart showing a pointermove handler. The handler reads `getBoundingClientRect()` (forced layout) for each list item during hit testing. Red highlight: "Layout thrashing per frame".
- Narrative: "Naive hit testing reads layout on every pointermove (30+ times per second). Cache bounding rects on dragstart and only recalculate on list changes."

**Scroll step 2 -- Touch vs mouse vs pen**:
- Visual: three input types with their quirks. Touch: 300ms click delay (unless touch-action set), no hover state, fat finger imprecision. Pen: pressure sensitivity, tilt. Mouse: precise, hover, right-click.
- Narrative: "Pointer events unify mouse, touch, and pen. But each has quirks. Touch needs larger hit targets. Pen offers pressure data. Mouse offers hover previews."

**Scroll step 3 -- Nested sortable lists**:
- Visual: a list within a list (e.g., Trello board: columns containing cards). Dragging a card between columns. The hit testing becomes 2D.
- Narrative: "Nested sortables (Trello-style) require 2D hit testing: which column AND which position within that column. Most drag libraries handle this; building from scratch is significantly harder."

### Data & State Shape

```typescript
type ItemId = string;

type ListItem = {
  id: ItemId;
  label: string;                   // "Item A", "Item B", etc.
};

type PointerEvent = {
  type: "pointerdown" | "pointermove" | "pointerup";
  x: number;
  y: number;
  timestamp: number;
};

type DragDropState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // List
  items: ListItem[];               // current order
  originalItems: ListItem[];       // order before drag (for cancel)

  // Drag state
  dragState: "idle" | "pending" | "dragging" | "dropping";
  draggedItemId: ItemId | null;
  dragStartY: number;
  dragCurrentY: number;
  dropTargetIndex: number;         // where the item will be inserted
  placeholderIndex: number;        // current position of the gap

  // Item rects (cached on dragstart)
  itemRects: Map<ItemId, { top: number; height: number; midpoint: number }>;

  // Input mode
  inputMode: "mouse" | "keyboard";
  keyboardFocusIndex: number;      // for keyboard navigation
  keyboardPickedUp: boolean;       // true when space/enter activates pick-up

  // Pointer event log
  pointerLog: PointerEvent[];
  pointerLogGrouped: boolean;      // true = group pointermoves, false = show all
};
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 wrapping the sortable list + event timeline.

**Internal components**:
- `SortableList`: renders items with gap animation. Uses `motion.div` for each item's `translateY`.
- `SortableItem`: individual draggable item. Handles `onPointerDown`. When dragged: absolute positioning with `transform: translate(0, deltaY)`.
- `DragPlaceholder`: dashed-border ghost at the dragged item's original position.
- `PointerEventTimeline`: scrollable log panel. Groups `pointermove` events with expand/collapse. Each event type has a colored badge.
- `ModeToggle`: Mouse/Keyboard segmented control.
- `KeyboardModeOverlay`: banner indicating keyboard mode with instructions.

### Edge Cases

**Drag cancellation (Escape key)**:
- Pressing Escape during drag returns the item to its original position with `SPRING.snappy`. List order reverts to `originalItems`. Pointer event log records a "CANCELLED" entry.

**Fast vertical drag past multiple items**:
- Hit testing on each `pointermove` may skip items if the pointer moves fast. Solution: on each move, check ALL items between the previous drop target and the current pointer Y, not just the immediate neighbor.

**Drag handle vs item click**:
- Only the drag handle initiates drag. Clicking the item text does nothing drag-related (could be used for item editing). The handle has `cursor: grab` (and `cursor: grabbing` during drag).

**Item height changes during drag**:
- If an item's content changes height (e.g., text expansion), the cached rects become stale. This demo uses fixed-height items (52px) to avoid this complexity.

**Simultaneous keyboard and pointer**:
- If the reader clicks a drag handle while in keyboard mode, switch to mouse mode. If the reader presses Tab/Space while dragging with mouse, ignore keyboard input until the drag completes.

---

## sdp-notifications -- Notification System
**Format**: system-design | **Effort**: large
**Cross-section refs**: S06 `net-long-polling` (WebSocket/SSE for push), S07 `perf-assets` (Service Worker for Push API), S01 `core-event-loop` (timer scheduling for auto-dismiss), S03 `api-observer-overview` (notification API, permissions)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a bell icon with a red badge. Toast notifications stacked in a corner. Requirement pills: `PRIORITY QUEUING`, `TOAST MANAGEMENT`, `PUSH NOTIFICATIONS`, `PERSISTENCE`.

**Scroll step 2 -- Notification types**:
- Visual: four notification cards: info (blue), warning (yellow), error (red), success (green). Each with an icon, title, and body text. Ordered by priority: error > warning > success > info.
- Narrative: "Four severity levels with visual distinction. Priority ordering ensures critical notifications are seen first."

**Scroll step 3 -- Toast queue**:
- Visual: a queue (horizontal pipe). Notifications enter on the left. Max 3 toasts visible at once (shown as three slots at the right end). The 4th notification waits in the queue.
- Narrative: "Max 3 toasts visible simultaneously. Additional notifications queue. High-priority notifications jump ahead of low-priority items in the queue."

**Scroll step 4 -- Auto-dismiss and persistence**:
- Visual: a toast with a progress bar at the bottom that counts down (5 seconds). When it reaches zero, the toast slides away. Below: a notification center panel where dismissed toasts persist (for later review).
- Narrative: "Toasts auto-dismiss after a timer (configurable per type). But they're not gone -- they persist in the notification center for later review."

**Scroll step 5 -- Push API flow**:
- Visual: a pipeline: User grants permission -> Service Worker registers -> Push subscription created -> Subscription sent to server -> Server sends push -> SW receives -> Notification shown.
- Narrative: "Push notifications work even when the tab is closed. The Service Worker runs in the background, receives push events, and shows native OS notifications."

**Scroll step 6 -- Full architecture**:
- Visual: Event sources (WebSocket, user action, push) -> Priority Queue -> Toast Manager (max 3) -> Notification Center (persistent). Service Worker branch for push.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 640px`, centered. `height: 520px`.
- **App mockup area** (`height: 360px`): a simplified app layout (header, sidebar, content area) that serves as the backdrop for toast notifications.
- **Toast container**: top-right corner of the app area. `position: absolute`, `top: var(--space-3)`, `right: var(--space-3)`. Toasts stack vertically with `gap: var(--space-2)`. Max 3 visible. Each toast: `width: 320px`, `padding: var(--space-3)`, `border-radius: var(--radius-2)`, `border-left: 4px solid` (color by type). Background: `var(--color-surface)`. Shadow: `0 4px 12px rgba(0,0,0,0.1)`. Content: icon + title + body + dismiss X. Progress bar at bottom: `height: 3px`, counting down from full to empty over 5s (info), 8s (warning), 10s (error), 3s (success).
- **Controls panel** (`height: 160px`, below the app area):
  - **Notification generators**: four buttons colored by type: "Info", "Warning", "Error", "Success". Each click enqueues one notification of that type with generated content.
  - **Spam button**: "Spam 10 Mixed" -- fires 10 notifications of random types in rapid succession (100ms apart). THIS is the primary teaching control.
  - **Notification center toggle**: bell icon with unread badge. Opens a slide-out panel showing all notifications grouped by time ("Just now", "Earlier") with read/unread status and dismiss-all button.
  - **Push permission flow**: "Request Push Permission" button that triggers a mock permission flow visualization.
- **Queue visualization**: a horizontal bar between the app area and controls. Shows queued notifications as colored pills (by type). When a toast slot opens, the next pill slides right into the toast container. High-priority pills (error) jump ahead of lower-priority pills.

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (no toasts, empty      |
              |  queue, no unread in   |
              |  notification center)  |
              +-----------+------------+
                          |
               reader clicks a notification button
                          |
                          v
              +------------------------+
              |    toast-showing       |
              | (toast appears in      |
              |  top-right with        |
              |  enter animation.      |
              |  Progress bar starts.) |
              +-----------+------------+
                          |
          progress bar reaches 0    reader clicks dismiss
          (auto-dismiss)            (manual dismiss)
                          |              |
                          v              v
              +------------------------+
              |    toast-dismissed     |
              | (toast slides out.     |
              |  Notification moves    |
              |  to center. Next in    |
              |  queue takes slot.)    |
              +------------------------+

--- Spam path ---
              +------------------------+
              |    spam-active         |
              | (10 notifications      |
              |  arrive rapidly. 3     |
              |  show as toasts.       |
              |  7 queue as pills.     |
              |  Error pills jump      |
              |  the queue.)           |
              +------------------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a simple app layout with toast area empty, queue bar empty, and controls below. A bell icon with "0" badge.

2. **(5-12s)** Reader clicks "Info". An info toast slides in from the right: blue left border, info icon, title "New message", body text "You have a new message from Alex." Progress bar ticks down. After 5s, the toast auto-dismisses (slides right, fades). The bell badge increments to "1".

3. **(12-18s)** Reader clicks "Error". An error toast slides in: red left border, error icon, title "Upload failed", body "The file could not be uploaded." Its progress bar is longer (10s). Reader clicks "Info" again. Both toasts visible side by side.

4. **(18-30s)** Reader clicks "Spam 10 Mixed". Ten notifications fire rapidly: a mix of info, warning, error, and success. Three toasts appear immediately. The remaining 7 show as colored pills in the queue bar. The reader watches: an error notification that was 5th in line JUMPS ahead of 3 info notifications in the queue -- the pills physically reorder. As toasts dismiss, the next queued pill slides into the toast area.

5. **(30-40s)** The queue drains as toasts auto-dismiss and get replaced. The reader sees the priority system in action: errors show before warnings, warnings before info. The queue visualization makes the priority ordering tangible.

6. **(40-48s)** Reader clicks the bell icon. The notification center slides in from the right. All 10+ notifications are listed chronologically. Unread items have a dot indicator. Reader scrolls through them. Clicks "Dismiss all" -- all items fade out. Badge resets to "0".

7. **(48-60s)** Reader clicks "Request Push Permission". A mock browser permission dialog appears (not a real one): "FeedDemo wants to send you notifications. [Allow] [Block]". Reader clicks "Allow". A flow diagram animates: permission granted -> SW registration -> push subscription -> subscription sent to server. A native-style notification appears (mocked) outside the browser area: "FeedDemo: You have new activity."

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Toast fatigue**:
- Visual: 20 toasts stacked and overflowing. Label: "Notification blindness". Counter: "User dismissed 18 of 20 without reading."
- Narrative: "Too many notifications teach users to ignore them. Aggregate similar notifications ('3 new messages' instead of 3 separate toasts). Rate-limit non-critical notifications."

**Scroll step 2 -- Push permission UX**:
- Visual: a website showing a permission prompt immediately on load (before the user has done anything). A "bad practice" X overlaid. Alternative: prompt after the user clicks a "notify me" button.
- Narrative: "Requesting push permission on page load is the fastest way to get blocked. Wait until the user takes an action that implies they want notifications."

**Scroll step 3 -- Notification channels**:
- Visual: notification settings with per-type toggles: "Marketing: off", "Security: always on", "Social: email only", "Orders: push + email". A preferences panel.
- Narrative: "Users need granular control. Not 'all or nothing' but per-category, per-channel. The notification preference UI is as important as the notification system itself."

### Data & State Shape

```typescript
type NotificationType = "info" | "warning" | "error" | "success";

type NotificationPriority = 0 | 1 | 2 | 3;  // 0 = info, 1 = success, 2 = warning, 3 = error

type Notification = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
  autoDismissMs: number;           // 5000 info, 3000 success, 8000 warning, 10000 error
};

type ToastSlot = {
  notification: Notification;
  enterTime: number;
  progress: number;                // 1.0 -> 0.0, countdown
};

type NotificationState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Notifications
  allNotifications: Notification[];    // complete history
  queue: Notification[];               // pending, priority-sorted
  activeToasts: ToastSlot[];           // max 3 visible

  // Notification center
  centerOpen: boolean;
  unreadCount: number;

  // Push flow
  pushPermissionState: "prompt" | "granted" | "denied" | "idle";
  pushFlowStep: number;               // for the animated permission flow

  // Spam state
  isSpamming: boolean;
  spamRemaining: number;
};

// Priority sorting:
// queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
// Higher priority first. Within same priority, earlier timestamp first.
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2.

**DialSegment**: not needed here since controls are buttons, not continuous values.

**Internal components**:
- `ToastContainer`: manages the 3 toast slots. Uses `AnimatePresence` for enter/exit.
- `Toast`: individual toast with icon, text, dismiss button, and progress bar. Enter: slide from right with `SPRING.snappy`. Exit: slide right + fade.
- `QueueBar`: horizontal visualization of queued notifications as colored pills. Pills reorder with `layout` animation when priority insertion occurs.
- `NotificationCenter`: slide-out panel with notification list. Grouped by time period.
- `NotificationGenerator`: the 4 colored buttons + spam button.
- `PushPermissionFlow`: mock permission dialog and animated pipeline diagram.

### Edge Cases

**All 3 toast slots occupied when a high-priority notification arrives**:
- The lowest-priority visible toast is force-dismissed (accelerated exit animation, 100ms instead of 300ms) to make room for the high-priority notification. If all visible toasts are the same priority as the incoming one, the incoming notification queues normally.

**Toast hover pauses auto-dismiss**:
- When the reader hovers over a toast, the progress bar pauses. On mouse leave, it resumes. This prevents toasts from disappearing while the reader is reading them.

**Spam button clicked multiple times**:
- Each click enqueues 10 more notifications. They all go through the same priority queue. The queue can grow to 20, 30+ items. The queue bar scrolls horizontally if it overflows.

**Notification center opened while toasts are active**:
- Toasts continue their timers and dismiss normally even when the center is open. New notifications still show as toasts AND appear in the center simultaneously.

---

## sdp-microfrontend -- Micro-Frontend Architecture
**Format**: system-design | **Effort**: xl
**Cross-section refs**: S07 `perf-bundle` (code splitting, shared dependencies), S07 `perf-js` (JavaScript loading performance), S08 `render-csr-ssr-ssg` (rendering strategies per MFE), S06 `net-intro` (request overhead for multiple MFEs)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: three team icons (Team A, B, C) each with their own codebase. Requirement pills: `INDEPENDENT DEPLOY`, `SHARED DEPS`, `TEAM AUTONOMY`, `UNIFIED UX`.

**Scroll step 2 -- App shell**:
- Visual: a browser window. A thin `App Shell` frame (header + sidebar skeleton + content area). The shell is lightweight: "15KB bundle, loads in 200ms".
- Narrative: "The app shell is the orchestrator. It loads first, provides the layout, and boots up the micro-frontends."

**Scroll step 3 -- Remote containers**:
- Visual: three boxes appear inside the app shell layout: "Team A: Header" (top), "Team B: Product List" (left content), "Team C: Cart" (right sidebar). Each is a separate bundle loading independently. Loading spinners in each box that resolve at different times.
- Narrative: "Each micro-frontend is a remote container -- a separately built, separately deployed JavaScript bundle. The app shell loads them dynamically."

**Scroll step 4 -- Shared dependencies**:
- Visual: three download arrows for the three MFEs. Without sharing: each downloads React (150KB x 3 = 450KB). With Module Federation: React loads once (150KB shared). A "SHARED" label on the React package.
- Narrative: "Without dependency sharing, each MFE bundles its own React. Module Federation enables singleton shared packages -- loaded once, used by all."

**Scroll step 5 -- Event bus**:
- Visual: an `Event Bus` pipe connecting all three MFE boxes. Team B dispatches: `{ type: "ADD_TO_CART", product: {...} }`. The event travels through the bus to Team C's cart, which updates.
- Narrative: "MFEs communicate through an event bus, not direct imports. Team B publishes 'add to cart'. Team C subscribes. Neither imports the other's code."

**Scroll step 6 -- Full architecture**:
- Visual: App Shell -> Route resolution -> Load remote container -> Mount MFE -> Event bus for communication. Shared deps layer underneath all MFEs.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `height: 480px`.
- **App shell frame**: thin header + content area. `border: 2px solid var(--color-border)`, `border-radius: var(--radius-3)`.
- **MFE panels**: three distinct sections:
  - **Header MFE (Team A)**: top, `height: 48px`, `background: var(--diagram-layer-0)` at 8%. Contains: logo text, search bar (cosmetic), user avatar. Labeled "Team A" in a small badge.
  - **Product List MFE (Team B)**: left, `width: 65%`, `height: 400px`. Grid of 6 product cards. Each card: `width: calc(50% - var(--space-2))`, `height: 120px`, product name, price, "Add to Cart" button. Labeled "Team B".
  - **Cart MFE (Team C)**: right, `width: 35%`, `height: 400px`. Cart items list (initially empty: "Cart is empty"). Each cart item: product name, quantity, price. Total at bottom. Labeled "Team C".
- **Loading simulation**: on initial render, each MFE shows a skeleton/spinner. Team A loads in 200ms, Team B in 400ms, Team C in 300ms (different bundle sizes). Loading states resolve independently.
- **Event bus visualization**: when an event fires, an animated dot travels between MFE panels. The dot has a label showing the event type. A small event log panel below the app (`height: 60px`, `overflow-y: auto`) shows all events in `var(--font-mono)`.
- **Shared deps indicator**: a floating badge: "React: shared (loaded once)". Without sharing toggle: badge changes to "React: loaded 3x (450KB waste)".
- **Isolation mode tabs**: above the app: `iframe | Web Component | Module Federation`. Default: Module Federation. Switching changes the border style of each MFE panel and the shared deps indicator.

#### Interaction State Machine

```
              +------------------------+
              |    demo-loading        |
              | (app shell visible.    |
              |  MFE panels show       |
              |  skeleton loaders.     |
              |  Each resolves at      |
              |  different times.)     |
              +-----------+------------+
                          |
               all 3 MFEs loaded
                          |
                          v
              +------------------------+
              |    demo-ready          |
              | (all MFE panels        |
              |  rendered. Cart        |
              |  empty. Event log      |
              |  empty.)               |
              +-----------+------------+
                          |
               reader clicks "Add to Cart" in product list
                          |
                          v
              +------------------------+
              |    event-dispatched    |
              | (dot animates from     |
              |  Team B to Team C.     |
              |  Event logged. Cart    |
              |  updates with item.)   |
              +-----------+------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees an app shell frame with three sections. All three show skeleton loaders with team badges. The app shell header "MFE Demo" is immediately visible (it's not a micro-frontend, it's the shell).

2. **(5-10s)** Team A's header MFE loads first (200ms) -- skeleton dissolves into the header UI. Team C's cart loads next (300ms) -- shows "Cart is empty". Team B's product list loads last (400ms) -- 6 product cards appear. The independent loading order is the first teaching moment: each MFE has its own bundle, loads at its own pace.

3. **(10-18s)** Reader notices the shared deps badge: "React: shared (loaded once, 150KB)". They toggle to "Without sharing". Three download indicators appear: "React 150KB x 3". The badge changes to "React: 450KB total (3 copies)". They toggle back. The waste is quantified.

4. **(18-28s)** Reader clicks "Add to Cart" on a product card in Team B's product list. A blue dot with label "ADD_TO_CART" animates from Team B's panel to Team C's cart. The event log below records: `Team B -> ADD_TO_CART -> Team C`. The cart updates: the product appears with quantity 1 and its price. Total updates.

5. **(28-38s)** Reader adds two more products. Each time, the event dot animates between panels. The cart accumulates items. The event log shows all three events. The reader sees: Team B and Team C never import each other's code -- they communicate purely through the event bus.

6. **(38-48s)** Reader switches isolation mode to "iframe". The MFE panels get thicker borders (representing iframe isolation). The shared deps badge changes: "React: 150KB x 3 (iframes can't share)". The event bus visualization adds a "postMessage" label on the dots. The trade-off is visible: full isolation but no dependency sharing.

7. **(48-60s)** Reader switches to "Web Component" mode. Borders change to shadow DOM style. Shared deps partially shared. Event bus uses custom events. Each mode has visually distinct communication patterns.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- Consistency challenges**:
- Visual: each MFE using a slightly different button style. Team A: rounded blue. Team B: square green. Team C: pill red. Label: "Design system divergence".
- Narrative: "Without a shared design system, each team's UI diverges over time. Shared component libraries and design tokens are essential -- but force coupling between teams."

**Scroll step 2 -- Routing complexity**:
- Visual: URL bar showing `/products/shoes`. A route resolver deciding: which MFE owns this route? What if `/products/shoes/reviews` is owned by a different team?
- Narrative: "Route ownership must be explicitly defined. Nested routes crossing MFE boundaries require coordination. The app shell typically owns routing and delegates to MFEs."

**Scroll step 3 -- Testing and CI/CD**:
- Visual: three CI pipelines (one per team) plus an integration test pipeline. Arrows show: each team deploys independently, but integration tests catch cross-MFE breaks.
- Narrative: "Each MFE can deploy independently -- that's the benefit. But integration testing must verify that the composed application works. Contract testing between MFE event bus producers and consumers is essential."

### Data & State Shape

```typescript
type MFEId = "header" | "products" | "cart";

type Product = {
  id: string;
  name: string;
  price: number;
  imageColor: string;              // colored placeholder for product image
};

type CartItem = {
  product: Product;
  quantity: number;
};

type EventBusMessage = {
  type: "ADD_TO_CART" | "REMOVE_FROM_CART" | "SEARCH" | "USER_ACTION";
  source: MFEId;
  target: MFEId;
  payload: unknown;
  timestamp: number;
};

type IsolationMode = "module-federation" | "iframe" | "web-component";

type MicrofrontendState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // MFE loading
  mfeLoaded: Record<MFEId, boolean>;
  mfeLoadTimes: Record<MFEId, number>;   // ms

  // Products
  products: Product[];

  // Cart
  cartItems: CartItem[];
  cartTotal: number;

  // Event bus
  eventLog: EventBusMessage[];
  activeAnimation: EventBusMessage | null; // currently animating event

  // Configuration
  isolationMode: IsolationMode;
  sharedDepsEnabled: boolean;

  // Metrics
  totalBundleSize: number;               // changes based on isolation mode
  reactCopies: number;                   // 1 (shared) or 3 (not shared)
};
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 with `DemoSandbox.Tabs` for isolation mode selector.

**Internal components**:
- `AppShell`: the outer frame with layout slots for three MFEs.
- `HeaderMFE`: Team A's header. Loads with delay. Simple layout.
- `ProductListMFE`: Team B's product grid. Each product card has "Add to Cart" button that dispatches to the event bus.
- `CartMFE`: Team C's cart sidebar. Listens for cart events, renders cart items, computes total.
- `EventBusDot`: animated dot with label traveling between MFE panels. Uses `motion.div` with absolute positioning and `SPRING.snappy`.
- `EventLog`: scrollable monospace log showing all events.
- `SharedDepsBadge`: floating badge showing dependency sharing status.
- `MFELoadingSkeleton`: skeleton/shimmer placeholder shown while MFE bundles "load".

### Edge Cases

**Event bus message for a MFE that hasn't loaded yet**:
- Events are queued in the bus until the target MFE subscribes. When Team C's cart loads (after Team B), any ADD_TO_CART events that were dispatched during loading are replayed. The cart starts with the correct state.

**Isolation mode switch with items in cart**:
- Switching isolation mode resets the entire demo: cart empties, products reload, event log clears. A brief "Reloading..." overlay appears during the reset.

**Product list scrolling**:
- With 6 products in a 2-column grid, no scrolling is needed. If more products were added, the product list panel would scroll independently (each MFE manages its own scroll).

---

## sdp-image-gallery -- Image Gallery
**Format**: system-design | **Effort**: large
**Cross-section refs**: S04 `virt-windowing` (virtualization for large grids), S07 `perf-images` (lazy loading, srcset, format optimization), S03 `api-intersection` (IntersectionObserver for lazy loading), S03 `api-resize` (ResizeObserver for responsive masonry)

### Phase 1: Architecture Scrollytelling

**Scroll step 1 -- Requirements**:
- Visual: a grid of colorful image placeholders. Requirement pills: `LAZY LOADING`, `VIRTUALIZATION`, `RESPONSIVE GRID`, `PROGRESSIVE ENHANCEMENT`.

**Scroll step 2 -- Masonry grid layout**:
- Visual: a `<MasonryGrid>` component. Images of varying aspect ratios arranged in Pinterest-style columns. The column count adapts to container width: 2 cols (mobile), 3 cols (tablet), 4 cols (desktop).
- Narrative: "Masonry layout places items in the shortest column. Unlike a regular grid, items don't need to be the same height."

**Scroll step 3 -- Lazy loading via IO**:
- Visual: a `<LazyImage>` component with an IntersectionObserver sentinel. Images above the fold: loaded (solid). Images below the fold: placeholder (blurred). As the viewport scrolls down, images that enter the IO threshold start loading.
- Narrative: "IntersectionObserver watches each image placeholder. When it enters the viewport (plus a 200px root margin), the real image starts loading."

**Scroll step 4 -- BlurHash placeholders**:
- Visual: a transition animation: blurry colored rectangle (BlurHash) -> loading (semi-transparent) -> sharp image. The blur provides a meaningful preview.
- Narrative: "BlurHash encodes a tiny color preview (< 30 bytes) that decodes to a blurry placeholder. It tells the user 'something is here' without layout shift."

**Scroll step 5 -- Virtual grid**:
- Visual: the masonry grid with a "Rendering 12 of 500" counter. Items outside the viewport are ghost outlines (same as S04 virtualization). Only visible items have actual DOM nodes.
- Narrative: "Virtualization renders only visible grid cells. Combined with lazy loading: virtualized cells don't even start loading their images."

**Scroll step 6 -- Full architecture**:
- Visual: MasonryGrid -> LazyImage (with IO) -> BlurHash placeholder -> Image load -> Sharp display. VirtualGrid wrapping the masonry. Network panel showing deferred loads.

### Phase 2: Working Demo

#### Layout & Controls

- **Container**: `width: 100%`, `max-width: 720px`, centered. `height: 520px`, `overflow-y: auto`.
- **Masonry grid**: 3 columns (at demo width), `gap: var(--space-2)`. Each cell is a `<LazyImage>` component.
- **Image placeholders**: 500 simulated images. Each has a pre-computed color palette (3 colors used for the BlurHash-style placeholder). Aspect ratios vary: 1:1, 4:3, 3:4, 16:9 randomly assigned per image. Placeholder: CSS gradient using the 3 palette colors, blurred with `filter: blur(12px)`. Sharp state: a colored rectangle with a subtle pattern (diagonal stripes, dots, or chevrons) to simulate a real image -- using CSS patterns, not actual images.
- **Loading transition**: placeholder (blurred gradient) -> loading (gradient + pulse animation) -> sharp (colored rectangle with pattern). Transition: `TRANSITION.enter` (300ms).
- **Lightbox**: clicking an image opens a lightbox overlay. `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.9)`. Image centered and scaled to fit. Arrow buttons left/right. Close button (X) top-right. Keyboard: Escape to close, ArrowLeft/Right to navigate. Focus trapped inside lightbox.
- **Network panel**: side panel or overlay, `width: 200px`. Shows: "Loaded: 12 images", "Deferred: 488 images", "Bytes loaded: 1.2MB", "Bytes saved: 48.8MB". A bar chart showing loaded vs total. Updates as the reader scrolls and more images load.
- **Counter badge**: floating badge top-right: "Rendering 12 of 500 (saving 48.8MB)".

#### Interaction State Machine

```
              +------------------------+
              |    demo-idle           |
              | (grid visible, ~12     |
              |  images loaded above   |
              |  fold, rest are        |
              |  BlurHash placeholders)|
              +-----------+------------+
                          |
               reader scrolls down
                          |
                          v
              +------------------------+
              |    lazy-loading        |
              | (images entering IO    |
              |  threshold start       |
              |  loading. Placeholder  |
              |  -> pulse -> sharp.    |
              |  Counter updates.)     |
              +-----------+------------+
                          |
               reader clicks an image
                          |
                          v
              +------------------------+
              |    lightbox-open       |
              | (overlay with full-    |
              |  size image. Focus     |
              |  trapped. Arrow/Esc    |
              |  navigation.)          |
              +-----------+------------+
                          |
               Escape or click X
                          |
                          v
              +------------------------+
              |    demo-idle           |
              | (lightbox closes.      |
              |  Scroll position       |
              |  preserved.)           |
              +------------------------+
```

#### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a masonry grid with the first ~12 images loaded (colorful patterned rectangles). Below the fold: blurry gradient placeholders. The counter badge reads "Loaded 12 of 500 (saving 48.8MB)". The network panel shows bars.

2. **(5-15s)** Reader scrolls down slowly. As placeholders approach the viewport (200px before becoming visible), they begin loading: the blur pulses briefly, then resolves to a sharp colored pattern. The transition is smooth -- no layout shift because the placeholder already occupied the correct space. The counter updates: "Loaded 18 of 500 (saving 48.2MB)".

3. **(15-25s)** Reader scrolls faster. Multiple images load in rapid succession. The network panel's "Bytes loaded" counter ticks up. The "Bytes saved" counter is the hero metric -- it stays dramatically larger than "Bytes loaded" throughout.

4. **(25-32s)** Reader has scrolled to approximately image #50. Counter: "Loaded 50 of 500". They scroll back to the top -- all images there are already sharp (cached). No re-loading. The virtualization kicks in: images far below the viewport are unmounted from the DOM, but their loaded state is cached.

5. **(32-42s)** Reader clicks on an image. The lightbox opens: dark overlay, image centered. They press ArrowRight -- next image slides in. ArrowLeft -- previous. They navigate through 5 images. Press Escape -- lightbox closes. Focus returns to the clicked image in the grid. Scroll position is exactly where they left it.

6. **(42-52s)** Reader scrolls to the bottom of the grid (image ~500). Counter: "Loaded 52 of 500" -- virtualization means even scrolling to the bottom only loads what was visible during the scroll journey. Images that were briefly visible but then scrolled past are loaded and cached. Images never visible were never loaded.

7. **(52-60s)** Reader checks the final metrics. "Loaded 52 of 500. Bytes loaded: 5.2MB. Bytes saved: 44.8MB." The savings are dramatic. The grid performed smoothly throughout -- no jank, no blank flashes, no layout shifts.

### Phase 3: Tradeoff Scrollytelling

**Scroll step 1 -- BlurHash vs LQIP vs color-only**:
- Visual: three placeholder strategies side-by-side. BlurHash: meaningful color preview. LQIP (Low-Quality Image Placeholder): tiny JPEG scaled up. Color-only: single dominant color. Quality and byte cost compared.
- Narrative: "BlurHash is a good balance: ~30 bytes encodes a meaningful preview. LQIP is more accurate but requires a separate thumbnail request. Dominant color is simplest but least informative."

**Scroll step 2 -- CLS and image dimensions**:
- Visual: two page loads. Left: images without width/height attributes -- content shifts as images load. Right: images with aspect ratio preserved -- no shift.
- Narrative: "Without width and height (or aspect-ratio CSS), the browser doesn't know how much space to reserve. Images loading cause Cumulative Layout Shift -- one of the Core Web Vitals."

**Scroll step 3 -- CDN and responsive images**:
- Visual: a `srcset` attribute with multiple sizes. The CDN generates resized variants on the fly. Mobile gets 400px wide, desktop gets 1200px. Bandwidth saved per breakpoint.
- Narrative: "Serving the same 4K image to a mobile phone wastes bandwidth. srcset with CDN-generated variants ensures each device downloads an appropriately-sized image."

### Data & State Shape

```typescript
type ImageId = string;

type ImageData = {
  id: ImageId;
  aspectRatio: number;              // e.g., 1.0, 1.33, 0.75, 1.78
  colors: [string, string, string]; // 3 hex colors for BlurHash placeholder
  pattern: "stripes" | "dots" | "chevrons" | "grid"; // for "sharp" state
  estimatedBytes: number;           // simulated file size (50-200KB)
};

type ImageLoadState = "placeholder" | "loading" | "loaded";

type ImageGalleryState = {
  // Phase
  phase: "phase1" | "phase2" | "phase3" | "complete";
  scrollyStep: number;

  // Image data (static, generated on mount)
  images: ImageData[];              // 500 items

  // Load tracking
  loadStates: Map<ImageId, ImageLoadState>;
  loadedCount: number;
  totalEstimatedBytes: number;      // sum of all 500 images
  loadedBytes: number;              // sum of loaded images
  savedBytes: number;               // totalEstimatedBytes - loadedBytes

  // Virtualization
  scrollTop: number;
  viewportHeight: number;
  renderedRange: { startRow: number; endRow: number };
  columnCount: number;              // 3 at demo width

  // Lightbox
  lightboxOpen: boolean;
  lightboxIndex: number;            // index in the images array
};

// IO configuration:
// rootMargin: "200px 0px" (start loading 200px before entering viewport)
// threshold: 0
```

### Primitives & Props

**ScrollytellingShell**: phases 1 (6 steps) and 3 (3 steps).

**DemoSandbox**: phase 2 wrapping the gallery.

**Internal components**:
- `MasonryGrid`: responsive masonry layout using CSS columns or absolute positioning. Each column receives images sequentially by shortest-column-first algorithm.
- `LazyImage`: individual image cell. Uses IntersectionObserver for load triggering. Three visual states: blurred gradient placeholder, loading pulse, sharp pattern. Transition animated with `TRANSITION.enter`.
- `BlurPlaceholder`: CSS gradient with blur filter using the image's 3-color palette. `filter: blur(12px)`, `transform: scale(1.1)` (to hide blur edge artifacts), `overflow: hidden`.
- `SharpImage`: colored rectangle with CSS pattern (linear-gradient for stripes, radial-gradient for dots). Represents the "loaded" state.
- `Lightbox`: full-screen overlay with focus trap. Uses `motion.div` for enter/exit animation. Keyboard navigation. Previous/next buttons.
- `NetworkMetricsPanel`: displays loaded/deferred counts, bytes loaded/saved, with bar chart visualization.
- `CounterBadge`: floating badge with rendering count.

### Edge Cases

**Masonry column rebalancing on resize**:
- If the container width changes (though unlikely in the demo), the column count recalculates via ResizeObserver. Images reflow to the shortest column. Already-loaded images retain their state.

**Lightbox on an unloaded image**:
- If the reader clicks a placeholder (unlikely since placeholders are below the fold and clicking requires scrolling, which triggers loading), the lightbox shows the BlurHash placeholder at full size and begins loading the image. The sharp state appears when loading completes.

**Scroll to bottom with keyboard (Page Down)**:
- Keyboard scrolling triggers the same IO callbacks as manual scrolling. Images load identically regardless of scroll input method.

**500 image generation on mount**:
- Images are generated with deterministic seeded random (index-based) for colors, aspect ratios, and patterns. No actual image files. The generation is instant (no async).

**Very fast scroll (fling/momentum)**:
- Images may briefly show as placeholders before loading completes. The IO threshold of 200px provides a buffer, but fast flings can exceed it. This is acceptable -- the placeholder-to-sharp transition is quick enough (300ms) that it feels intentional.
