import type { LessonMeta } from "./types";

export const RENDERING: Record<string, LessonMeta> = {
  "render-csr-ssr-ssg": {
    stopId: "render-csr-ssr-ssg",
    format: "battle",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RenderStrategyBattle",
        description:
          "Three mock pages loading simultaneously: CSR, SSR, SSG. " +
          "Each shows an ANIMATED LOADING SEQUENCE: " +
          "CSR: blank white → spinner → JS downloads → content pops in → interactive " +
          "SSR: content appears quickly (from server HTML) → hydration period (clicks don't work!) → interactive. " +
          "HYDRATION UNCANNY VALLEY: artificially extend hydration to 3 seconds (not 1.3s — too fast to catch). " +
          "Prompt at hydration start: 'Try clicking a product card NOW.' Click during hydration → button " +
          "depresses visually but nothing happens. After hydration → click works. The failure must be felt. " +
          "SSG: content appears INSTANTLY (from CDN) → hydration → interactive " +
          "METRIC SPOTLIGHT (not all 4 racing simultaneously): Start with FCP only ('when do you " +
          "see something?'). After 2-3 scenarios, introduce TTI ('when can you click?'). TTFB and " +
          "LCP available in expandable 'Advanced Metrics' panel. This prevents 12-data-point overload. " +
          "After each loading sequence, spotlight ONE metric by rewinding to the moment it fired " +
          "and labeling that frame (e.g., 'FCP — the moment content appears'). " +
          "SCENARIO TOGGLES (this is the teaching device): " +
          "- Slow network: CSR suffers most (big JS download). SSG barely affected (CDN) " +
          "- Slow server: SSR suffers (server render time). CSR/SSG unaffected " +
          "- Dynamic content: SSG shows stale data (updated 1hr ago). Others show fresh " +
          "- SEO crawler: CSR shows blank page (no JS execution). SSR/SSG show full content " +
          "Reader discovers: there's no 'best' strategy. Each scenario has a different winner. " +
          "DISCOVERY CHECKLIST (guides navigation): After trying 2 scenarios, show a checklist: " +
          "'□ Found where CSR loses □ Found where SSG loses □ Found where SSR loses □ Found the " +
          "hydration gap.' Reader works through the matrix with purpose, not random toggling. " +
          "SEO CRAWLER: when toggled, show a search results page — CSR page has 'No description available' " +
          "and missing thumbnail. SSR/SSG pages have rich snippets. The consequence is concrete, not just a label.",
        reuses: ["DemoSandbox", "DialSegment"],
      },
    ],
    discoveries: [
      {
        action: "Toggle 'slow network' and watch CSR vs SSG",
        reaction: "CSR takes 8s to show anything (big JS download). SSG shows content in 200ms (from CDN edge)",
        teaches: "CSR performance is gated by JavaScript download — on slow networks, the blank page persists for seconds",
      },
      {
        action: "Toggle 'dynamic content' and watch SSG",
        reaction: "SSG shows a '1 hour ago' timestamp while SSR shows 'just now' — the data is stale",
        teaches: "SSG trades freshness for speed — content is frozen at build time. Not suitable for highly dynamic data",
      },
      {
        action: "Click a button during SSR's hydration period",
        reaction: "Nothing happens. A 'hydrating...' indicator shows. After hydration completes, the click works",
        teaches: "SSR has a 'uncanny valley': content is visible but NOT interactive until hydration completes",
      },
    ],
    learningOutcome: "Choose between CSR, SSR, and SSG based on network conditions, content dynamism, and interactivity requirements",
    agentNotes:
      "Battle format. The scenario toggles are everything — without them, it's just a " +
      "comparison table. The reader DISCOVERS that each approach wins in different scenarios. " +
      "METRIC SPOTLIGHT: don't show all 4 metrics at once. Start with FCP, add TTI after 2 runs. " +
      "After each loading sequence, spotlight one metric by rewinding to the moment it fired. " +
      "This connects abstract metric names to concrete viewport events. " +
      "The hydration uncanny valley (click doesn't work during hydration) is a powerful " +
      "physical experience. Show the button depressing but nothing happening.",
  },

  "render-isr": {
    stopId: "render-isr",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "ISRExplorable",
        description:
          "FORMAT CHANGED from scrollytelling to explorable. INTERACTIVE-FIRST. " +
          "ORIENTATION BEAT (10 seconds, disappears after first interaction): " +
          "'This server caches pages. Green = fresh cache. Spawn a visitor to see what happens.' " +
          "Drop the reader into a running ISR system: a timeline with a cache box (grey/green/yellow), " +
          "visitors arriving, and a revalidation dial. " +
          "Reader spawns visitors by clicking and discovers the lifecycle by observation: " +
          "- First visitor: slow (cache miss, 2s build). Cache turns green. " +
          "- Visitors within window: instant (20ms). Cache stays green. " +
          "- Wait for stale: cache turns yellow. Next visitor still fast but triggers rebuild. " +
          "Nudge hints appear only when the reader stalls: 'Try spawning a visitor after the " +
          "cache turns yellow.' Scrollytelling labels appear as ANNOTATIONS on behavior the " +
          "reader already observed, not as pre-scripted narration. " +
          "ON-DEMAND REVALIDATION: A toggle switches from time-based to on-demand mode. " +
          "In on-demand mode, the timer disappears and a 'Publish' button appears. " +
          "Reader clicks 'Publish' → cache immediately invalidates and rebuilds. " +
          "Compare: time-based (stale for up to window duration) vs on-demand (fresh immediately " +
          "after publish). This covers the missing half of ISR. " +
          "Goal challenge: 'Keep ALL visitors under 100ms response time.'",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Spawn many visitors during the revalidation window",
        reaction: "All get instant responses from cache — zero server load regardless of traffic",
        teaches: "ISR absorbs traffic spikes: all visitors within the window hit the cache, only ONE rebuild happens in the background",
      },
      {
        action: "Toggle to on-demand mode and click 'Publish'",
        reaction: "Cache invalidates immediately — next visitor gets fresh content without waiting for timer",
        teaches: "On-demand revalidation gives instant freshness without timer overhead — use it for CMS webhooks and content updates",
      },
      {
        action: "Try to keep all visitors under 100ms (the goal challenge)",
        reaction: "First visitor always exceeds 100ms (cold cache). Reader discovers: pre-warm the cache by triggering a build before traffic arrives",
        teaches: "The first-visitor penalty is unavoidable — production ISR systems pre-warm caches on deploy",
      },
    ],
    learningOutcome: "Implement both time-based and on-demand ISR, tune the revalidation window, and understand the cold-cache penalty",
    agentNotes:
      "FORMAT CHANGED from scrollytelling to explorable. Discovery-first, labels-second. " +
      "The reader spawns visitors and discovers the lifecycle by observation. " +
      "Annotations appear AFTER the reader encounters the behavior, not before. " +
      "ON-DEMAND REVALIDATION added via toggle — was completely missing from the brief. " +
      "The goal challenge ('keep all under 100ms') gives the explorable a purpose.",
  },

  "render-ssr-streaming": {
    stopId: "render-ssr-streaming",
    format: "explorable",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "StreamingSSRExplorable",
        description:
          "FORMAT CHANGED from scrollytelling to explorable. " +
          "ORIENTATION BEAT: 'The left frame is traditional SSR. The right is streaming. " +
          "Drag a section's load time and watch both.' (Disappears after first drag.) " +
          "INTERACTIVE-FIRST: The reader builds a page by assigning Suspense boundaries " +
          "and configuring section load times (drag horizontal bars to set timing). " +
          "COMPARISON MODE: left = traditional SSR, right = streaming SSR. " +
          "Both frames update IN REAL TIME as the reader drags section load times. " +
          "When the reader stretches 'Recommendations' from 300ms to 5000ms, " +
          "the traditional frame's blank period stretches while the streaming frame's " +
          "other sections remain unaffected — making decoupling viscerally obvious. " +
          "SELECTIVE HYDRATION: After sections stream in, click a not-yet-hydrated section " +
          "to bump it in the hydration queue. The queue visualizer (colored blocks) reorders. " +
          "SUSPENSE BOUNDARY PLACEMENT: Reader can drag Suspense boundary markers to wrap " +
          "different section combinations. Wrapping two slow sections in ONE boundary means " +
          "both wait for the slowest. Wrapping them separately means each streams independently. " +
          "This teaches boundary granularity through experimentation. " +
          "Brief annotations appear as tooltips when the reader encounters each behavior.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Drag 'Recommendations' load time from 300ms to 5000ms and watch both frames",
        reaction: "Traditional: blank for 5s. Streaming: shell + fast sections in 0.3s, slow section in 5s. Decoupling is immediate",
        teaches: "Streaming decouples fast components from slow ones — dragging the timing makes the independence visceral",
      },
      {
        action: "Click a section during hydration that hasn't hydrated yet",
        reaction: "React prioritizes hydrating the clicked section. Queue visualizer reorders in real time",
        teaches: "Selective hydration responds to user intent — the browser hydrates what the user is interacting with first",
      },
      {
        action: "Wrap two slow sections in one Suspense boundary vs separate boundaries",
        reaction: "One boundary: both wait for the slowest. Separate: each streams independently",
        teaches: "Suspense boundary granularity controls streaming independence — finer boundaries = better progressive loading",
      },
    ],
    learningOutcome: "Design Suspense boundary placement for optimal streaming and understand selective hydration's prioritization",
    agentNotes:
      "FORMAT CHANGED from scrollytelling to explorable. CONTINUOUS MANIPULATION: reader drags " +
      "section load times and sees both frames update in real time. No 'configure then replay' — " +
      "the comparison is always live. Suspense boundary placement (drag to wrap sections) adds " +
      "a second interaction axis beyond timing. Annotations appear as tooltips on behavior " +
      "the reader encounters, not as pre-scripted narration.",
  },

  "render-rsc": {
    stopId: "render-rsc",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RSCExplorable",
        description:
          "DISCOVERY-FIRST (inverted from original scrollytelling-first). " +
          "Sticky visual: component tree (like React DevTools). All nodes start ORANGE (client). " +
          "Bundle size meter: 420KB. " +
          "PHASE 1 — INTERACTIVE TREE (first thing reader sees): " +
          "Challenge: 'Can you get the bundle under 200KB without breaking interactivity?' " +
          "Reader toggles individual components server (blue) ↔ client (orange). " +
          "Bundle size meter updates live. When a component with useState/onClick is toggled " +
          "to server: error shake + 'This component uses state — it must stay client.' " +
          "CASCADE DISCOVERY: toggle a subtree root to server → ALL children turn blue, " +
          "bundle drops dramatically. This is the key insight, discovered by doing. " +
          "Serialization + data fetching panels appear ON HOVER (desktop) or TAP (mobile) of blue nodes. " +
          "Each blue node shows a small inspect icon (ℹ) to signal interactivity on touch devices. " +
          "'Renders on server → serialized payload → 0 KB shipped.' " +
          "Server components with data fetching show: 'async — fetches directly on server.' " +
          "PHASE 2 — SCROLLYTELLING (AFTER the reader has explored): " +
          "Now the scroll steps EXPLAIN what the reader already experienced: " +
          "1. 'Why did bundle drop when you moved that subtree?' → explains serialization " +
          "2. 'Why couldn't you move the form to server?' → explains the 'use client' boundary " +
          "3. Deep dive: the actual RSC wire format (abbreviated) vs JS bundle side-by-side " +
          "These steps deepen understanding rather than introduce concepts from scratch.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "AFTER EXPLORATION: 'Why did bundle drop when you moved that subtree?'",
        narrative: "Server components render into a serialized payload — lightweight data, not executable JavaScript. When you toggled that subtree root, you removed ALL its children's code from the bundle.",
      },
      {
        visual: "The 'use client' boundary visualized on the tree",
        narrative: "The 'use client' directive marks where interactivity begins. Everything above it can be server-rendered. Everything below ships JS. The boundary is the design decision.",
      },
      {
        visual: "Side-by-side: RSC wire format (4 lines of JSON) vs client component JS (200 lines)",
        narrative: "This is what 'serialized payload' actually means. The server sends a compact description of the rendered tree. The client reconstructs it without executing any component code. 4 lines vs 200 lines — that's the bundle savings you saw.",
      },
    ],
    discoveries: [
      {
        action: "Toggle a large subtree root from client to server (Phase 1 exploration)",
        reaction: "Bundle size drops dramatically — the entire subtree's JS is eliminated. Reader discovers the cascade",
        teaches: "Moving a component to server removes ALL its children's JS too (unless a child is explicitly 'use client')",
      },
      {
        action: "Try to toggle a component with useState to server",
        reaction: "Error shake + 'This component uses state — it must stay client.' The toggle bounces back",
        teaches: "Server components have no lifecycle — no state, no effects, no event handlers. The tree enforces this constraint visually",
      },
      {
        action: "Hover a server component with data fetching",
        reaction: "Inline panel: 'async — fetches directly on server. No loading state, no client fetch, no waterfall'",
        teaches: "Server components can be async and fetch data directly — no useEffect/fetch pattern, no client-server waterfall",
      },
    ],
    learningOutcome: "Design component trees with server/client boundaries that minimize shipped JavaScript while preserving interactivity",
    agentNotes:
      "DISCOVERY-FIRST: the interactive tree comes BEFORE the scrollytelling. Reader toggles " +
      "components and discovers the cascade (subtree JS elimination) and the 'use client' boundary " +
      "(error shake on stateful components) BEFORE being told how it works. " +
      "CHALLENGE: 'Get bundle under 200KB without breaking interactivity.' This gives the " +
      "exploration a goal. Serialization and data fetching info appears as inline panels on " +
      "hover — the reader encounters it while exploring, not in a separate view. " +
      "SCROLL STEPS explain AFTER discovery: 'Why did bundle drop?' + 'use client' boundary " +
      "+ actual wire format side-by-side. The scroll deepens, it doesn't introduce. " +
      "Bundle size meter updates in real-time. Error shake + bounce-back on invalid toggle " +
      "makes constraints visible without a prose explanation.",
  },

  "render-edge": {
    stopId: "render-edge",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "EdgeRenderingScrolly",
        description:
          "Sticky visual: simplified world map with CDN edge nodes (dots) and a central origin server. " +
          "Scrollytelling: " +
          "1. Origin-only: user in Tokyo, server in Virginia. Show request line traveling across the world " +
          "2. CDN for static assets: CSS/JS served from Tokyo edge (fast), API still goes to Virginia. " +
          "INTERACTIVE ZONE UNLOCKS HERE — after step 1 (not step 2). Reader immediately " +
          "toggles between origin, CDN, and edge rendering while picking locations. Steps 2-4 " +
          "become annotations on behavior the reader already discovered through exploration. " +
          "2. CDN for static assets: CSS/JS served from Tokyo edge (fast), API still goes to Virginia. " +
          "3. Edge rendering: HTML rendered at Tokyo edge node. Much shorter request line " +
          "4. The catch emerges from exploration: when reader selects 'database-heavy' page type " +
          "and edge mode, the request line visibly bounces edge → origin → edge → client. " +
          "RUNTIME CONSTRAINT DISCOVERY: a 'Page uses' toggle (static HTML / Node.js API / heavy computation). " +
          "Select 'Node.js API' with edge mode → edge node shows 'Module not found: sharp' error, " +
          "request falls back to origin with visible penalty. Select 'heavy computation' → edge cold " +
          "start clock ticks for 2s before first response, then subsequent requests are fast. " +
          "Constraint icons appear as annotations on behavior the reader already saw, not pre-loaded. " +
          "Toggle: personalized content (edge wins) vs database-heavy (origin wins).",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Tokyo user → Virginia server. Long line across Pacific. Latency: 280ms",
        narrative: "Your user in Tokyo. Your server in Virginia. Every request crosses the Pacific Ocean. Physics is the bottleneck — 280ms round trip minimum.",
      },
      {
        visual: "ANNOTATION (after reader toggles CDN mode): short lines for static assets, long line for API",
        narrative: "You split the request. Static assets from the nearest edge — fast. But HTML and API calls still cross the ocean. This is CDN for assets, not for rendering.",
      },
      {
        visual: "ANNOTATION (after reader toggles edge rendering): all lines are short — 20ms",
        narrative: "The edge node rendered the HTML itself. 20ms instead of 280ms. The reader already felt this — this label names why: compute moved to the edge, not just caching.",
      },
      {
        visual: "ANNOTATION (after reader hits runtime error or cold start): constraint icons on the edge node",
        narrative: "Edge is not origin. The 'Module not found' error or cold start clock is the tradeoff: latency for capability. Edge trades runtime power for proximity.",
        interaction: "Pick your location on the map and see latency for each approach",
      },
    ],
    discoveries: [
      {
        action: "Select a location far from the origin server",
        reaction: "Origin latency: 300ms+. Edge latency: 20-40ms. The difference grows with distance",
        teaches: "Edge rendering benefits are proportional to distance from origin — the farther your users, the bigger the win",
      },
      {
        action: "Toggle 'database-heavy page' mode",
        reaction: "Edge rendering becomes SLOWER than origin — the edge must make its own cross-ocean DB call",
        teaches: "Edge rendering only helps when the rendering doesn't need origin data. Database-heavy pages should stay on origin (near the database)",
      },
      {
        action: "Select 'Node.js API' in the 'Page uses' toggle while in edge mode",
        reaction: "Edge node shows 'Module not found: sharp' error — request falls back to origin with visible latency penalty",
        teaches: "Edge runtimes don't support all Node.js APIs — native modules like sharp are unavailable. The fallback to origin erases the latency win",
      },
      {
        action: "Select 'heavy computation' in the 'Page uses' toggle and trigger the first request",
        reaction: "Cold start clock ticks for 2s before first response. Subsequent requests are fast (warm worker reuse)",
        teaches: "Edge functions have cold starts — the first request pays a startup penalty. Frequent cold starts on low-traffic routes can make edge slower than origin",
      },
    ],
    learningOutcome: "Decide when edge rendering reduces latency vs when it adds complexity without benefit",
    agentNotes:
      "The world map with animated request lines is a simple but effective visual. The line " +
      "LENGTH represents latency — physically longer line = more latency. Keep the map simplified " +
      "(just dots and lines, not a full geographic rendering). " +
      "INTERACTIVE ZONE UNLOCKS AFTER STEP 1 — reader immediately explores origin vs CDN vs edge. " +
      "Steps 2-4 become annotations on behavior the reader already discovered. " +
      "THREE DISCOVERY AXES: (1) distance-proportional benefit, (2) database-heavy penalty, " +
      "(3) runtime constraints ('Page uses' toggle: static/Node.js API/heavy computation). " +
      "The runtime constraint discovery fills the gap — edge is not just latency, it is compatibility. " +
      "The database-heavy toggle is the critical counter-insight — prevents cargo-culting edge.",
  },

  "render-choose": {
    stopId: "render-choose",
    format: "challenge-chain",
    effort: "large",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "RenderStrategyChooser",
        description:
          "SYNTHESIS CAPSTONE — tests whether the reader can APPLY the rendering knowledge. " +
          "5 real-world scenario cards. For each, the reader CHOOSES a rendering strategy " +
          "and sees the consequences: " +
          "Scenario 1: E-commerce product page (needs SEO + fresh prices + fast FCP). " +
          "  Wrong: CSR (no SEO). Wrong: SSG (stale prices). Right: ISR or SSR+streaming. " +
          "Scenario 2: News article (needs SEO + frequent updates + global audience). " +
          "  Wrong: SSG without ISR (stale headlines). Right: ISR with short window or on-demand. " +
          "Scenario 3: Internal dashboard (no SEO + real-time data + complex interactivity). " +
          "  Wrong: SSG (stale data). Wrong: edge (database penalty). Right: CSR or SSR. " +
          "Scenario 4: HYBRID — News site (static header, ISR article body, CSR comment section, " +
          "RSC sidebar). Reader must assign the RIGHT strategy to each REGION of the page. " +
          "VISUAL FORMAT: A page wireframe divided into 4 labeled regions (Header, Article Body, " +
          "Comments, Sidebar). Each region has a dropdown selector with all strategies. As the reader " +
          "assigns strategies, a split-screen loading simulation plays: left shows the chosen config, " +
          "right shows the optimal config. Wrong regions flash with specific failure messages. " +
          "SETUP NOTE before Scenario 4: 'Real pages don't use one strategy. This page has four " +
          "regions — assign a strategy to each.' " +
          "  Wrong: ISR for comments (stale — shows '2 hours ago' while users expect real-time). " +
          "  Wrong: CSR for article body (no SEO — Google sees empty div). " +
          "  Wrong: SSR for header (unnecessary server cost for static content — $200/mo wasted). " +
          "  Right: SSG header + ISR article + CSR comments + RSC sidebar. " +
          "  This is the scenario that teaches real-world COMPOSITION — no production page uses one strategy. " +
          "TRADEOFF ON CORRECT ANSWERS: Even correct selections show the tradeoff. SSR for e-commerce " +
          "(correct) shows: 'Correct — but ISR would be 3x cheaper if your prices update hourly, not per-second.' " +
          "This prevents the 'one right answer' mental model. " +
          "Scenario 5: COMPOSITION — Social feed page with 4 regions (navigation shell, feed items, " +
          "user profile sidebar, interaction buttons). Same wireframe mechanic as Scenario 4. " +
          "Reader assigns strategies per region: " +
          "  Wrong: CSR for feed items (slow initial load + no SEO for shared posts — shows 'No preview' in share card). " +
          "  Wrong: SSG for feed items (stale — shows '3 hours ago' while friends posted 'just now'). " +
          "  Wrong: Omitting RSC for sidebar (80KB of JS for a component with zero state — bundle meter spikes). " +
          "  Right: SSG nav shell + SSR+streaming feed + RSC sidebar + CSR interaction buttons. " +
          "  This tests the full synthesis: CSR + SSR+streaming + SSG + RSC in one page. Omitting RSC " +
          "  has a visible consequence (bundle size spike), not just a 'bonus' mention. " +
          "Each wrong answer shows the CONSEQUENCE. Specific, not generic. " +
          "Each scenario card shows a mini page mockup with the loading sequence for the " +
          "chosen strategy. Reader sees their choice play out before getting the verdict. " +
          "COMPLETION PAYOFF: After Scenario 5, a decision tree diagram fades in — all 5 strategies " +
          "as branches with the key differentiator at each fork (SEO needed? → SSR/SSG. Real-time? → CSR. " +
          "Mixed regions? → Compose). The reader's correct and incorrect choices from all 5 scenarios " +
          "are plotted on the tree, showing decision accuracy at each fork. This transforms 5 individual " +
          "scenarios into a unified mental model. Section ends with this diagram, not an abrupt stop.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Choose CSR for the e-commerce product page",
        reaction: "SEO crawler sees blank page. Google can't index products. Revenue drops. Verdict: wrong",
        teaches: "CSR fails for SEO-dependent pages — search engines need server-rendered content",
      },
      {
        action: "Choose SSG for the internal dashboard",
        reaction: "Dashboard shows data from last build (2 hours ago). Users see stale metrics and lose trust",
        teaches: "SSG is wrong for frequently-changing data — the build-time snapshot goes stale immediately",
      },
      {
        action: "Choose edge rendering for the dashboard with database queries",
        reaction: "Edge node makes cross-ocean DB calls. Latency INCREASES vs origin. Verdict: edge is wrong here",
        teaches: "Edge rendering backfires when the rendering needs origin data — keep compute near the database",
      },
    ],
    learningOutcome: "Choose the right rendering strategy for real-world scenarios by weighing SEO, freshness, interactivity, and infrastructure constraints",
    agentNotes:
      "SYNTHESIS CAPSTONE. Tests transfer: can the reader APPLY strategies to real scenarios? " +
      "Each wrong answer shows a SPECIFIC consequence. Mini page mockup plays loading sequence. " +
      "SCENARIO 4 IS HYBRID: reader assigns strategies PER REGION of a news site page " +
      "(SSG header + ISR article + CSR comments + RSC sidebar). This teaches composition — " +
      "real pages use multiple strategies, not just one. Wrong region assignments show specific " +
      "failures (ISR for comments = stale, CSR for article = no SEO). " +
      "After correct single-strategy answers (scenarios 1-3), scenario 4 tests whether the reader " +
      "can COMPOSE strategies. Scenario 5 (social feed) deepens with SSR+streaming+RSC. " +
      "COMPLETION PAYOFF: decision tree recap diagram after Scenario 5. Reader's choices plotted " +
      "on the tree — transforms 5 individual scenarios into a unified mental model. " +
      "Format: challenge-chain (sequential, each unlocking the next). Must be the final stop.",
  },
};
