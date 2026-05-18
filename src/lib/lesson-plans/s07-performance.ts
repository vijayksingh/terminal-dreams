import type { LessonMeta } from "./types";

export const PERFORMANCE: Record<string, LessonMeta> = {
  "perf-js": {
    stopId: "perf-js",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [600, 800],
    interactives: [
      {
        component: "JSPerfScrolly",
        description:
          "Sticky visual: mock Chrome DevTools Performance flame chart. " +
          "Scrollytelling walks through a page load's JS execution: " +
          "1. Single 2MB bundle: one HUGE block in the flame chart, blocking everything " +
          "2. Code-split by route: 3 smaller blocks, with idle gaps between them " +
          "3. Defer non-critical: heavy libraries load AFTER first paint (shown below the fold) " +
          "4. Web Worker: computation moves to separate thread (parallel bar above main thread) " +
          "Each step: time-to-interactive marker moves LEFT (earlier), main thread blocked time shrinks. " +
          "After scroll: interactive where reader drags script blocks between 'critical path' and " +
          "'deferred' zones, watching TTI change in real-time.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "PREDICTION GATE: 'A 2MB JavaScript bundle is loaded. How long do you think it blocks the main thread?'",
        narrative: "A single 2MB bundle. The browser parses, compiles, and executes it all before anything is interactive.",
        interaction: "Prediction: (a) 0.5s (b) 1.2s (c) 2.1s (d) 4.0s. " +
          "WRONG-ANSWER FEEDBACK: (a) '0.5s would be ~500KB. Parse + compile + execute scales roughly with size.' " +
          "(b) 'Closer, but you're underestimating compile time. V8 compiles lazily but still pays upfront for 2MB.' " +
          "(d) 'That's possible on low-end mobile, but on desktop ~2s is typical for 2MB.'",
      },
      {
        visual: "Bundle splits into 3 chunks. Gaps appear between them. TTI moves to 2.1s",
        narrative: "Route-based code splitting: only load the current page's JavaScript. The initial chunk is 400KB instead of 2MB. TTI drops by 45%.",
      },
      {
        visual: "PREDICTION GATE: charting library (90KB) still loads on every page",
        narrative: "The charting library is needed when the user scrolls to the dashboard, not on page load. What should you do with it?",
        interaction: "Prediction: What should you do? (a) Load it synchronously but later (b) Defer it past first paint (c) Remove it entirely",
      },
      {
        visual: "Heavy library chunk moves below a 'first paint' line. TTI moves to 1.4s",
        narrative: "Defer non-critical scripts. That charting library isn't needed until the user scrolls to the dashboard. Load it after first paint, not before.",
      },
      {
        visual: "Computation block moves to a parallel 'Worker thread' lane. Main thread is nearly empty. TTI: 0.9s",
        narrative: "Web Workers run JavaScript on a separate thread. Move data processing, parsing, and heavy computation off the main thread entirely.",
        interaction: "Drag script blocks between 'critical' and 'deferred' zones to see TTI change",
      },
    ],
    discoveries: [
      {
        action: "Drag a non-critical script back to 'critical'",
        reaction: "TTI jumps by the exact parse+execute time of that script — direct cause and effect",
        teaches: "Every script on the critical path directly delays interactivity — the relationship is linear",
      },
      {
        action: "Try to move DOM manipulation to the Worker thread",
        reaction: "Error: 'Workers cannot access the DOM.' The code bounces back to main thread with a red warning",
        teaches: "Web Workers run on a separate thread but have no DOM access — only pure computation (parsing, encoding, math) can be offloaded",
      },
    ],
    learningOutcome: "Reduce JavaScript's TTI impact through splitting, deferring, and offloading",
    agentNotes:
      "The flame chart should look like actual DevTools — developers will recognize it instantly. " +
      "PREDICTION GATE between steps 2 and 3: 'The charting library is 90KB. It is needed on scroll, " +
      "not on load. What should you do?' This forces reasoning about deferral. " +
      "WEB WORKER DISCOVERY: reader tries to drag DOM manipulation to Worker → bounces back with error. " +
      "This teaches the Worker limitation through failure, not through a list of constraints. " +
      "The 'drag scripts between zones' interactive is the key teaching tool — tactile action " +
      "with immediate metric feedback.",
  },

  "perf-css": {
    stopId: "perf-css",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "CSSPerfExplorable",
        description:
          "UNIFIED SCENARIO: 'Your page has a 180KB stylesheet. FCP is 1.8s. Budget: 0.6s. Fix it.' " +
          "Three tabs now share a SINGLE GOAL and metric (FCP): " +
          "TAB 1 — DIAGNOSE (Specificity): Type selectors that compete on the page. " +
          "The specificity calculator helps understand WHY some rules override others — " +
          "needed for knowing which rules are truly dead. Side-by-side selector comparison " +
          "with 'WINS' badge. This tab answers 'which rules actually matter?' " +
          "TAB 2 — EXTRACT (Critical CSS): PREDICTION GATE: 'What percentage of this 180KB " +
          "stylesheet is needed for first paint? Guess a number.' Most guess 60-80%. Answer: ~20%. " +
          "This surprise motivates the extraction. Mock page split at fold line. " +
          "Rules above fold = GREEN, below = RED. Click 'extract critical CSS' — " +
          "only green rules go inline, rest deferred. FCP drops from 1.8s toward 0.6s budget. " +
          "TAB 3 — TRIM (Unused CSS): remaining deferred stylesheet. Rules matching " +
          "ZERO elements highlighted red. BUT: some 'unused' rules are JS-toggled states " +
          "(dark mode, modal, hover states). Blindly removing them BREAKS the page. " +
          "Reader must inspect WHICH unused rules are safe to remove vs which are dynamic. " +
          "Click each red rule: 'safe to remove' or 'needed by JS'. Wrong removal → page breaks " +
          "visibly (modal has no styles, dark mode unstyled). Correct audit strips dead code safely. " +
          "FCP counter updates across all three tabs — reader works toward the 0.6s target. " +
          "The tabs have a shared goal (meet FCP budget), natural order (diagnose, extract, trim), " +
          "and cumulative impact (each tab reduces FCP further).",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Type '#hero .card.featured' and see the specificity breakdown",
        reaction: "[1, 2, 0] — one ID, two classes, zero elements. Compare against '.hero-card' at [0, 1, 0]",
        teaches: "Specificity is a three-column weight system: IDs >> Classes >> Elements. One ID outweighs any number of classes",
      },
      {
        action: "Predict what percentage of the 180KB stylesheet is needed for first paint",
        reaction: "Most guess 60-80%. Answer: ~20%. The surprise motivates the extraction — click 'extract critical CSS' and FCP drops from 1.8s to 0.6s",
        teaches: "Most of a stylesheet is below-the-fold styles. Critical CSS extraction inlines only the ~20% needed for first paint, eliminating render-blocking",
      },
      {
        action: "Run unused CSS detection on the mock stylesheet",
        reaction: "42% of CSS rules match zero elements — 38KB of dead code",
        teaches: "CSS accumulates dead rules over time — auditing unused CSS can cut stylesheet size nearly in half",
      },
    ],
    learningOutcome: "Audit CSS performance through specificity analysis, critical CSS extraction, and dead code removal",
    agentNotes:
      "UNIFIED BUDGET SCENARIO — not three disconnected tools. A shared FCP counter across " +
      "all tabs gives the reader a goal: get from 1.8s to 0.6s. Tab order matters: " +
      "diagnose (specificity) → extract (critical CSS) → trim (unused). Each tab's improvement " +
      "is cumulative. The specificity calculator animates three columns as reader types. " +
      "Side-by-side selector comparison with 'WINS' label. Critical CSS: fold line on mock page " +
      "is the visual divider between green and red rules.",
  },

  "perf-images": {
    stopId: "perf-images",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "ImagePerfExplorable",
        description:
          "UNIFIED SCENARIO: 'This page has 20 images. Your bandwidth budget is 1.0MB. Optimize.' " +
          "Three zones share this budget — each zone's optimization compounds toward the goal. " +
          "ZONE 1 — FORMAT COMPARISON: PREDICTION GATE: 'How much smaller is AVIF vs JPEG " +
          "at the same perceived quality? 10%? 25%? 50%?' Reader commits, then sees the answer. " +
          "A sample image shown in 4 formats (AVIF, WebP, JPEG, PNG) " +
          "with file size bars. Quality slider: drag it and watch all 4 sizes change proportionally. " +
          "Budget impact: switching all 20 images to AVIF saves X MB toward the 1.0MB goal. " +
          "ZONE 2 — SRCSET BUILDER: drag breakpoints on a responsive viewport slider. " +
          "For each breakpoint, set an image width. Output: the generated <img> srcset attribute, " +
          "live. As you resize the viewport, the ACTIVE source highlights. " +
          "ZONE 3 — LAZY LOADING BUDGET: a page with 20 images. Initial load budget: 1.0MB. " +
          "Reader chooses which images to eager-load and which to lazy-load (checkboxes). " +
          "If too many eager: budget overflows, turns red. If hero image is lazy-loaded: " +
          "warning 'Hero is the LCP element — lazy-loading delays Largest Contentful Paint.' " +
          "Left waterfall: shows eager (all 20 requests). Right: reader's configuration. " +
          "Total bytes counter per configuration. Connects directly to perf-cwv LCP.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Drag quality to 60% and compare AVIF vs JPEG file sizes",
        reaction: "AVIF is 45% smaller while looking perceptually identical to JPEG",
        teaches: "Modern formats (AVIF, WebP) achieve dramatically better compression at equivalent visual quality",
      },
      {
        action: "Set srcset breakpoints and resize the viewport",
        reaction: "The browser loads DIFFERENT image sizes at different viewport widths — the active source highlights",
        teaches: "srcset lets the browser choose the right image size, saving bandwidth on small screens",
      },
      {
        action: "Configure lazy loading within the 1.0MB budget",
        reaction: "Eager-load hero + 3 above-fold = 0.9MB (under budget, green). Lazy-load remaining 16 = load on scroll. Hero warning disappears when hero is eager",
        teaches: "Lazy loading is a budget decision: eager-load LCP-critical + above-fold images, lazy-load everything else",
      },
    ],
    learningOutcome: "Choose the right image format, implement srcset for responsive images, and lazy-load below-fold images",
    agentNotes:
      "Three zones, each teaching one optimization. The format comparison should use " +
      "pre-computed data (can't transcode in browser). The srcset builder outputs REAL HTML " +
      "that the reader can copy. Zone 3 BUDGET CONSTRAINT: the reader must decide which images " +
      "to eager vs lazy within 1.0MB budget. The LCP warning when hero is lazy-loaded connects " +
      "directly to perf-cwv. This adds a decision layer over the simple 'eager vs lazy' demo.",
  },

  "perf-assets": {
    stopId: "perf-assets",
    format: "explorable",
    effort: "xl",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "AssetPerfExplorable",
        description:
          "FORMAT CHANGED from scrollytelling taxonomy to problem-first explorable. " +
          "THREE ZONES with shared metrics: " +
          "ZONE 1 — FONT LOADING (problem-first): " +
          "A mock page starts with CLS 0.42 and FOIT for 1.5s. Reader must FIX it. " +
          "A dropdown of font-display strategies (not a 5-step scroll). Reader experiments: " +
          "swap (CLS improves but non-zero), fallback (better on slow), optional (zero CLS " +
          "but no custom font on first visit), size-adjust (zero CLS with custom font). " +
          "Each selection replays the loading animation and updates CLS counter. " +
          "The reader discovers size-adjust by elimination, not by being told 'this is the pro move.' " +
          "ZONE 2 — VIDEO OPTIMIZATION: " +
          "DECISION POINT: 'This page has a product demo video above the fold. Pick the embedding strategy.' " +
          "Reader must CHOOSE before seeing comparison results. Three options: " +
          "(a) Raw MP4 src (huge download, blocks page) " +
          "(b) <video> with <source> format fallback + poster + lazy load (small initial) " +
          "(c) YouTube iframe with facade pattern (zero cost until click). " +
          "Wrong choice shows consequence: (a) initial load jumps by 8MB, LCP delayed by 3s. " +
          "(c) facade click-to-play adds 2s interaction delay for above-fold content — user must click AND wait. " +
          "Right answer depends on fold position: (b) for above-fold, (c) for below-fold. " +
          "FOLLOWUP: 'Now the same video moves below the fold. Does your answer change?' " +
          "Metrics: initial load weight, LCP impact, interaction delay. " +
          "ZONE 3 — THIRD-PARTY SCRIPT AUDIT: " +
          "A mock page with 5 third-party scripts (analytics, chat widget, A/B testing, " +
          "ad network, social embed). Each has toggles: async, defer, Partytown offload, block. " +
          "'Main thread time' gauge shows impact. Reader discovers the chat widget blocks " +
          "interactivity for 400ms and moves it to Partytown — gauge drops dramatically.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Try font-display strategies by dropdown until finding size-adjust",
        reaction: "swap: CLS 0.18. fallback: CLS 0.08. optional: CLS 0 but no custom font. size-adjust: CLS 0 WITH custom font",
        teaches: "size-adjust on fallback fonts eliminates the layout shift from font swapping — discovered by elimination, not instruction",
      },
      {
        action: "Compare raw MP4 vs facade pattern for embedded video",
        reaction: "Raw: 8MB download on load, LCP delayed. Facade: 0KB until click, just a poster image",
        teaches: "Facade patterns for video embeds eliminate the heaviest assets from initial load — load the player only on interaction",
      },
      {
        action: "Move the chat widget to Partytown in Zone 3",
        reaction: "Main thread time drops by 400ms. The chat widget now runs in a Web Worker — zero main-thread impact",
        teaches: "Third-party scripts are the #1 cause of performance regressions — offloading to Workers removes their main-thread cost entirely",
      },
    ],
    learningOutcome: "Optimize fonts (font-display + size-adjust), video (facade patterns), and third-party scripts (async/defer/Partytown)",
    agentNotes:
      "FORMAT CHANGED from scrollytelling taxonomy to problem-first explorable. " +
      "SCOPE EXPANDED to cover fonts + video + third-party scripts (was fonts-only). " +
      "Zone 1 is problem-first: start with broken CLS, reader fixes by experimenting with strategies. " +
      "Discovery through elimination, not instruction. Zone 2 (video) uses pre-computed size data. " +
      "Zone 3 (third-party) is the most impactful for production — 3P scripts are the #1 perf killer. " +
      "Effort upgraded to XL: 3 distinct sub-components (font CLS, video comparison, 3P script audit). " +
      "MUST-SHIP: Zone 1 (fonts) + Zone 3 (third-party scripts) — most production-relevant. " +
      "STRETCH: Zone 2 (video) — informative but observational. Zones 1+3 alone are shippable.",
  },

  "perf-cwv": {
    stopId: "perf-cwv",
    format: "explorable",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CoreWebVitalsExplorable",
        description:
          "A mock webpage that 'loads' with configurable issues. Three gauges: LCP, INP, CLS. " +
          "THE MECHANIC: the page has deliberate performance issues. Reader must DIAGNOSE " +
          "and FIX each one by toggling options. It's a detective game. " +
          "LCP issue: hero image is lazy-loaded (bad) → toggle to eager → LCP drops from 4.2s to 1.8s. " +
          "  Reader discovers which element IS the LCP element (it highlights with a blue border). " +
          "INP issue: click handler runs heavy sync JS (200ms) → toggle to async/yield → INP drops. " +
          "  Reader clicks the button and FEELS the delay, then sees it disappear after fix. " +
          "CLS issue: images without dimensions → toggle dimensions → CLS drops from 0.42 to 0.01. " +
          "  Reader watches the page layout JUMP when images load (before fix) vs stay stable (after). " +
          "Each fix: gauge animates from red/yellow to green. All three green = 'passing Core Web Vitals' celebration. " +
          "ROUND 2 (SECTION-WIDE SYNTHESIS): After fixing the guided page, present a SECOND page " +
          "that pulls problems from ALL prior S07 stops. " +
          "PROGRESSIVE REVEAL (mirrors Round 1): Round 2 introduces ONE metric at a time. " +
          "Phase A — LCP: reader diagnoses LCP issues first. MINIMUM VIABLE DEFINITION before " +
          "each phase: 'LCP = largest visible element render time. Target: <2.5s. Your page: 4.8s.' " +
          "Issues: render-blocking CSS (perf-css) + unoptimized hero format (perf-images). " +
          "Phase B — INP: after LCP is green, INP gauge activates. Definition: 'INP = worst " +
          "interaction delay. Target: <200ms. Your page: 340ms.' Issue: 200KB synchronous " +
          "bundle on click (perf-js + perf-bundle). " +
          "Phase C — CLS: after INP is green, CLS gauge activates. Definition: 'CLS = cumulative " +
          "layout shift. Target: <0.1. Your page: 0.38.' Issues: font swap without size-adjust " +
          "(perf-assets) + missing resource hints (perf-hints). " +
          "Round 2 toggles are BLANK — no guided toggles. Reader must identify each issue, " +
          "name which optimization category it belongs to, and select the fix. " +
          "All three green = section synthesis complete. This is the section's capstone.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Click the slow button and FEEL the 200ms delay",
        reaction: "The button visibly lags. INP gauge reads 240ms (red). Toggle the fix → button responds instantly",
        teaches: "INP measures the worst interaction delay — users physically feel anything over 100ms",
      },
      {
        action: "Watch the page load without image dimensions",
        reaction: "Content jumps down when images load. CLS gauge reads 0.42 (red). With dimensions: zero shift",
        teaches: "CLS is caused by elements that change size after initial render — always set explicit dimensions on images and embeds",
      },
      {
        action: "Find the LCP element by hovering elements on the mock page",
        reaction: "The hero image highlights — it's the LCP element. Its lazy-load attribute is the problem",
        teaches: "LCP tracks the largest visible element — usually a hero image or heading. It should NEVER be lazy-loaded",
      },
    ],
    learningOutcome: "Diagnose and fix LCP, INP, and CLS issues by understanding what triggers each metric and what the fix is",
    agentNotes:
      "Detective game format. The reader doesn't read about CWV — they DIAGNOSE issues on " +
      "a broken page. Each fix is a toggle that immediately updates the gauge. The goal: " +
      "turn all three gauges green. Use Google's actual thresholds: LCP <2.5s, INP <200ms, CLS <0.1. " +
      "The 'feel the delay' on INP is the most powerful teaching moment. " +
      "ROUND 2 = SECTION-WIDE SYNTHESIS CAPSTONE: the broken page pulls problems from ALL 7 stops " +
      "(render-blocking CSS from perf-css, unoptimized images from perf-images, sync bundle from " +
      "perf-js/perf-bundle, font swap from perf-assets, missing hints from perf-hints). " +
      "PROGRESSIVE REVEAL: Round 2 introduces metrics one at a time (LCP → INP → CLS) with " +
      "minimum viable definitions before each phase. Prevents information dump. " +
      "Reader must name the optimization category AND the fix. This makes perf-cwv the section's " +
      "culminating exam, not just a CWV-specific exercise. " +
      "SCOPE: Round 2 is a stretch goal. Round 1 alone is shippable and teaches the core CWV concepts.",
  },

  "perf-bundle": {
    stopId: "perf-bundle",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "BundleOptScrolly",
        description:
          "Sticky visual: bundle treemap (rectangles sized by bytes, like webpack-bundle-analyzer). " +
          "Scrollytelling applies optimizations step by step: " +
          "1. Single bundle: one giant treemap. Total: 1.2MB. Initial load waterfall shows 1 request " +
          "2. Route splitting: treemap splits into 4 chunks. Current route chunk highlighted. Total same, initial load: 340KB " +
          "3. Tree shaking: unused exports fade out and shrink. Chunks get smaller " +
          "4. Dynamic import for heavy lib: large rectangle separates into 'loaded on demand' zone " +
          "5. Common chunk extraction: shared code moves to vendor chunk (loaded once, cached) " +
          "A running counter: Initial Load Size dropping from 1.2MB → 340KB → 280KB → 190KB → 165KB. " +
          "After scroll: SEQUENCING CHALLENGE (not just drag-to-reorganize). " +
          "Given a real-world bundle (a dashboard app), the reader must DECIDE the optimization " +
          "order: which technique to apply first, second, third. Each technique has a different " +
          "impact depending on order — tree shaking after splitting is different from before. " +
          "Wrong order: some optimizations have reduced impact. Optimal order: maximum cumulative gain. " +
          "Shows the order-dependent interaction between techniques, not just their existence.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "PREDICTION GATE: 'A dashboard app with React, chart library, date picker, and 12 route pages. How big is the JavaScript bundle?'",
        narrative: "Every import, every dependency, every route — all in one file. The user downloads it all before seeing anything.",
        interaction: "Prediction: (a) 200KB (b) 500KB (c) 1.2MB (d) 3MB. " +
          "WRONG-ANSWER FEEDBACK: (a) '200KB is React alone. Add charting, dates, and 12 routes — dependencies compound.' " +
          "(b) 'A reasonable guess for a smaller app, but chart libraries alone can be 300KB+.' " +
          "(d) 'Possible if you added a PDF renderer, but 1.2MB is typical for this stack.'",
      },
      {
        visual: "Treemap splits into 4 colored chunks. Only one (340KB) is highlighted as 'initial load'",
        narrative: "Route-based code splitting. Each page gets its own chunk. Users only download the code for the page they're visiting. 72% reduction in initial load.",
      },
      {
        visual: "Unused export rectangles fade to ghost outlines and shrink. Chunks visibly smaller",
        narrative: "Tree shaking: bundlers detect and remove unused exports. That utility library you imported for one function? Only that function ships.",
      },
      {
        visual: "PREDICTION GATE: charting library (90KB) is still in the initial bundle",
        narrative: "After tree shaking, the charting library is still 90KB. It's only used on the dashboard page. How should the bundler handle it?",
        interaction: "Prediction: (a) Keep it in initial bundle — it's only 90KB (b) Create a separate chunk loaded on demand " +
          "(c) Merge it into the shared vendor chunk so it's cached across pages. " +
          "WRONG-ANSWER FEEDBACK: (a) '90KB sounds small, but it's dead weight on every non-dashboard page. " +
          "Why pay the cost on settings?' " +
          "(c) 'Vendor chunks are for shared deps (React, utils). This library is used on ONE route — " +
          "putting it in vendor means EVERY page downloads charting code it never executes.'",
      },
      {
        visual: "Large library rectangle animates to a separate 'on-demand' zone. Initial load counter drops",
        narrative: "Dynamic import: heavy libraries (chart, editor, PDF renderer) load only when the user navigates to the feature that needs them.",
      },
      {
        visual: "Shared code rectangles migrate to a 'vendor' chunk. Cache icon appears on it",
        narrative: "Shared dependencies (React, utilities) extracted to a common chunk. It's cached independently — when you deploy new feature code, the vendor chunk stays cached.",
        interaction: "Drag modules between chunks and watch initial load size change",
      },
    ],
    discoveries: [
      {
        action: "Apply optimizations in different orders in the sequencing challenge",
        reaction: "Tree shaking after splitting removes MORE because the bundler analyzes per-route usage. Splitting first = 280KB → 190KB. Splitting after = 340KB → 220KB",
        teaches: "Bundle optimizations interact: the order you apply them changes the total gain. Splitting before tree shaking lets per-route dead code elimination work",
      },
      {
        action: "Drag a large library back to the initial chunk",
        reaction: "Initial load size jumps by exactly that library's size — direct cause and effect",
        teaches: "Every byte in the initial bundle is a byte the user waits for — keep it minimal",
      },
    ],
    learningOutcome: "Apply code splitting, tree shaking, dynamic import, and chunk extraction to reduce initial bundle size",
    agentNotes:
      "The treemap is the hero visual. Use actual rectangle-packing layout (like a real bundle " +
      "analyzer). The shrinking animation at each step should be smooth — rectangles physically " +
      "getting smaller. The running counter is always visible. " +
      "PREDICTION GATE between tree shaking and dynamic import: 'charting library is 90KB, only " +
      "used on dashboard. What should happen?' This tests whether reader can distinguish tree " +
      "shaking (remove unused exports) from dynamic import (load on demand). " +
      "The post-scroll drag-to-reorganize interactive lets readers experiment freely.",
  },

  "perf-hints": {
    stopId: "perf-hints",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "ResourceHintsExplorable",
        description:
          "A timeline visualization of a page load. Resources appear as bars on the timeline. " +
          "CONSTRUCTION-BASED (not toggle-based): instead of toggling hints on/off, the reader " +
          "WRITES the <link> tags themselves. A mini code editor shows the <head> section. " +
          "The reader types: <link rel='preconnect' href='https://fonts.googleapis.com'>. " +
          "If correct: the timeline shifts — DNS+TCP+TLS bars start early. 'Time saved' gap appears. " +
          "If wrong (e.g., 'preload' without 'as' attribute): warning explains what's missing. " +
          "FIVE CHALLENGES, each requiring a different hint type: " +
          "1. Cross-origin font: needs preconnect (DNS+TCP+TLS saved) " +
          "2. Critical hero image: needs preload with as='image' (priority boost) " +
          "3. Next-page JS bundle: needs prefetch (idle-time loading) " +
          "4. ES module: needs modulepreload (parse+compile early) " +
          "5. Third-party API: needs dns-prefetch (lightweight, just DNS) " +
          "6. Hero image already preloaded but still loses the priority race to a stylesheet: " +
          "   needs fetchpriority='high' on the <img> tag. Teaches the newest priority attribute. " +
          "After writing each correct tag, the timeline updates and 'time saved' gap appears. " +
          "TRAP: the reader can try preloading EVERYTHING — the timeline shows priority inversion " +
          "(everything high-priority = nothing high-priority, page gets SLOWER). " +
          "The construction mechanic produces REAL HTML the reader can copy to their project.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Write <link rel='preconnect' href='...'> for the cross-origin font",
        reaction: "DNS+TCP+TLS time shifts to overlap with HTML parsing — font starts loading 200ms earlier. Timeline gap labeled 'time saved'",
        teaches: "preconnect eliminates connection setup latency for known cross-origin resources",
      },
      {
        action: "Write preload tags for every resource on the page",
        reaction: "Warning: 'Priority inversion — when everything is high priority, nothing is'. Page load actually gets SLOWER",
        teaches: "Preload is for critical resources only. Over-preloading saturates bandwidth and delays the truly important resources",
      },
      {
        action: "Use prefetch for a resource needed on the NEXT page",
        reaction: "Resource loads at idle time (low priority). When user navigates, it's already cached — instant load",
        teaches: "prefetch is for anticipated future navigations — it loads during idle time without competing with current page resources",
      },
    ],
    learningOutcome: "Use resource hints to eliminate connection overhead and strategically preload/prefetch resources",
    agentNotes:
      "CONSTRUCTION-BASED, not toggle-based. The reader WRITES <link> tags, not toggles hints. " +
      "This is the only stop where the output is copy-pasteable HTML for the reader's real project. " +
      "SIX challenges requiring six different hint types — including fetchpriority='high' (Challenge 6). " +
      "fetchpriority is supported in all major browsers since 2023 and is the recommended way to " +
      "signal resource importance alongside preload. Its inclusion rounds out resource hint coverage. " +
      "The 'time saved' gap visualization (colored space on timeline) makes each hint's benefit tangible. " +
      "The 'preload everything → priority inversion' trap teaches restraint. " +
      "MINI CODE EDITOR: a simple <head> section editor. No syntax highlighting needed — just a " +
      "text input with validation. Accept <link rel='...' href='...' as='...'> patterns.",
  },
};
