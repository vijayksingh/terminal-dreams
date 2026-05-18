import type { LessonMeta } from "./types";

export const NETWORK: Record<string, LessonMeta> = {
  "net-intro": {
    stopId: "net-intro",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RequestLifecycleScrolly",
        description:
          "Sticky visual: animated request journey from browser to server. " +
          "Left: browser icon. Right: server icon. Between: animated pipeline stages. " +
          "As reader scrolls, each stage lights up with timing bar. " +
          "PREDICTION GATES embedded in the scroll: " +
          "After TCP step: 'Before the HTTP request fires, one more handshake is needed. " +
          "What does it establish?' (Compression / Encryption / Authentication) → reveals TLS. " +
          "Before waterfall: 'The first request took ~140ms of setup. How much setup will " +
          "request #2 need?' (Same 140ms / Half 70ms / Almost none 20ms) → reveals cold/warm toggle. " +
          "DRAGGABLE LATENCY BARS: After scrollytelling, the timing bars become inputs. " +
          "Reader drags DNS bar to 200ms (slow mobile), or TLS to 0ms (HTTP, not HTTPS). " +
          "Total latency updates live. This transforms observation into exploration. " +
          "The waterfall chart shows 6 resources loading with cold/warm toggle.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Browser and server icons, empty space between them",
        narrative: "You type a URL and press Enter. What happens in the next 200 milliseconds?",
      },
      {
        visual: "DNS stage expands: domain name → IP address",
        narrative: "DNS resolves the domain name to an IP address. Browser cache, OS cache, then recursive lookup. Typically 20-120ms.",
      },
      {
        visual: "TCP handshake: SYN → SYN-ACK → ACK packets animate between browser and server",
        narrative: "TCP three-way handshake establishes a reliable connection. Three round trips of packets. Another 30-100ms.",
      },
      {
        visual: "PREDICTION GATE: 'What does the next handshake establish?'",
        narrative: "For HTTPS: one more handshake exchanges certificates and establishes encryption. These handshakes are why the first request is slow.",
        interaction:
          "Prediction: What does the next stage establish? (a) Compression (b) Encryption — TLS (c) Authentication. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Content encoding (gzip, brotli) happens at the HTTP layer, not as a separate handshake. This handshake establishes encryption.' " +
          "(c) 'Authentication is an application-layer concern (cookies, tokens, headers). This handshake establishes encryption to protect those credentials in transit.'",
      },
      {
        visual: "HTTP request and response with expandable header sections",
        narrative: "Finally: the actual HTTP request. Headers, method, body. This is the part developers think about — but it's often the fastest stage.",
      },
      {
        visual: "PREDICTION GATE: 'How much setup for request #2?'",
        narrative: "Subsequent requests skip DNS, TCP, and TLS. Connection reuse is the browser's most aggressive optimization.",
        interaction:
          "Prediction: The first request needed ~140ms setup. How much for #2? (a) Same 140ms (b) Half (70ms) (c) Almost none (~20ms). " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'DNS results are cached, and TCP/TLS connections are reused. Watch what happens to ALL the setup stages — not just one.' " +
          "(b) 'Connection reuse is more aggressive than 50%. DNS, TCP, AND TLS are all eliminated — not just trimmed.'",
      },
      {
        visual: "Waterfall chart with cold/warm toggle + DRAGGABLE latency bars + repeat-resource toggle",
        narrative: "Now explore: drag the latency bars to simulate different conditions. What if DNS takes 200ms (slow mobile)? What if TLS is 0ms (HTTP)? Toggle 'repeat same resource' to see HTTP caching eliminate the entire round trip.",
        interaction: "Drag latency bars to change DNS, TCP, TLS durations. Toggle cold/warm start. Toggle 'repeat same resource' to see 304/cache behavior.",
      },
    ],
    discoveries: [
      {
        action: "Predict that request #2 needs the same 140ms setup",
        reaction: "Wrong — toggle shows DNS/TCP/TLS all eliminated. Total setup drops to ~20ms",
        teaches: "Connection reuse eliminates 80%+ of request overhead — the first request is uniquely expensive",
      },
      {
        action: "Drag DNS bar to 200ms (simulating slow mobile network)",
        reaction: "Total first-request time jumps to 320ms+ — DNS dominates on slow connections",
        teaches: "On slow networks, DNS resolution becomes the bottleneck — this is why DNS prefetching matters",
      },
      {
        action: "Drag TLS bar to 0ms (simulating HTTP, not HTTPS)",
        reaction: "One handshake eliminated. But a red warning: 'No encryption. Browsers will block mixed content.'",
        teaches: "TLS adds latency but is non-negotiable for security — optimize with TLS 1.3 (1 round trip), don't skip it",
      },
      {
        action: "Toggle 'repeat same resource' and watch the ENTIRE request disappear",
        reaction: "Second request for the same URL: 0ms. Not even a connection — the browser serves from HTTP cache. A '304 Not Modified' or 'disk cache' label appears",
        teaches: "HTTP caching eliminates the request entirely — connection reuse saves setup, caching skips the round trip. Cache-Control and ETag headers control this behavior",
      },
    ],
    learningOutcome: "Trace a request from URL to response and identify where latency hides in connection setup stages",
    agentNotes:
      "TWO prediction gates with TARGETED WRONG-ANSWER FEEDBACK: " +
      "After TCP (predict TLS): wrong answers explain compression is HTTP-layer, auth is application-layer. " +
      "Before waterfall (predict warm request): wrong answers explain connection reuse eliminates ALL stages, not just some. " +
      "Each wrong answer is a one-sentence correction explaining WHY the intuition failed — not just 'wrong, try again.' " +
      "DRAGGABLE latency bars after scrollytelling turn the timing diagram into an explorable. " +
      "The packet animations (SYN/ACK) are visual decoration — keep them simple, don't over-invest. " +
      "The cold/warm toggle dramatic stage removal is still the hero teaching moment.",
  },

  "net-cors": {
    stopId: "net-cors",
    format: "explorable",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CORSExplorable",
        description:
          "A request builder + browser decision tree visualizer. " +
          "LEFT PANEL — REQUEST BUILDER: " +
          "Origin: dropdown (app.example.com, localhost:3000, same-origin). " +
          "Target: api.different-domain.com (fixed, so most combos are cross-origin). " +
          "Method: GET / POST / PUT / DELETE (buttons). " +
          "Content-Type: text/plain / application/json / multipart/form-data. " +
          "Custom headers: toggle (adds X-Custom-Header). " +
          "Credentials: with / without toggle. " +
          "RIGHT PANEL — BROWSER DECISION TREE (animated): " +
          "When the reader clicks 'Send Request', the browser's invisible decision process " +
          "becomes VISIBLE as an animated flowchart: " +
          "1. 'Same origin?' → if yes, green path, request sent directly. " +
          "2. 'Simple request?' (GET/HEAD/POST + standard headers + allowed content types) " +
          "   → if yes, request sent with Origin header, response checked for Access-Control-Allow-Origin. " +
          "3. 'Preflight needed' → OPTIONS request appears as a VISIBLE intermediate step " +
          "   with its own headers (Access-Control-Request-Method, Access-Control-Request-Headers). " +
          "   Server response checked: Allow-Methods, Allow-Headers, Max-Age. " +
          "   If preflight passes → actual request fires. If fails → red CORS error with DECODED message. " +
          "SERVER RESPONSE CONFIGURATOR (bottom panel): " +
          "Toggle server headers: Access-Control-Allow-Origin (*, specific, missing), " +
          "Access-Control-Allow-Methods, Access-Control-Allow-Headers, " +
          "Access-Control-Allow-Credentials (true/false). " +
          "PREDICTION GATE at start: Reader configures POST + application/json (extremely common combo), " +
          "clicks Send. Before the browser decision tree animates: " +
          "'Will this request go straight to the server, or will something happen first?' " +
          "(a) Straight to server (b) Browser blocks it (c) Browser sends a check first. " +
          "Most readers pick (a) — being wrong IS the aha. " +
          "SECOND PREDICTION GATE: After reader sees a 200 OK response in Network tab: " +
          "'The server returned 200 OK. Can your JavaScript read the response?' " +
          "(a) Yes, 200 means success (b) No, the browser will block it. " +
          "Reveals: 200 OK ≠ accessible. CORS check happens AFTER the response arrives. " +
          "The server processed the request; the browser refuses to hand you the data. " +
          "WRONG-ANSWER FEEDBACK for all gates with one-sentence corrections. " +
          "WILDCARD + CREDENTIALS TRAP: Reader enables credentials + server has Allow-Origin: *. " +
          "Prediction: 'Will this work?' → No. Wildcard and credentials are mutually exclusive. " +
          "DECODED ERROR MESSAGES: Every CORS failure shows the cryptic browser error " +
          "AND a plain-English decode: 'No Access-Control-Allow-Origin header' → " +
          "'The server didn't include your origin in its allowed list.' " +
          "Cross-section connection: feeds directly into sec-cors in Security section " +
          "(which covers the defensive/configuration side).",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Send POST + application/json (the most common frontend request)",
        reaction: "Preflight OPTIONS request appears as visible intermediate step. Most readers expect the request to go straight to the server",
        teaches: "application/json triggers a preflight — the browser sends an OPTIONS check before your actual request. This is invisible in normal dev tools unless you know to look",
      },
      {
        action: "See server return 200 OK, but JavaScript can't read the response",
        reaction: "Browser blocks access despite successful response. The request WORKED — the server processed it — but the browser refuses to hand you the data",
        teaches: "CORS is a browser-side restriction, not a server-side one. The server sees and processes the request. The browser decides whether YOUR CODE can read the result",
      },
      {
        action: "Enable credentials with Access-Control-Allow-Origin: *",
        reaction: "Request fails. Wildcard and credentials are mutually exclusive — the server must echo the specific origin",
        teaches: "Wildcard Allow-Origin is a shortcut that breaks under credentials. Production APIs serving authenticated requests MUST specify exact origins",
      },
      {
        action: "Switch origin to same-origin and see the entire decision tree collapse",
        reaction: "No preflight, no CORS headers needed, request goes directly. The decision tree's first node short-circuits everything",
        teaches: "Same-origin requests bypass CORS entirely — this is why local development with a proxy works but direct API calls from a different port don't",
      },
      {
        action: "Configure PUT method and watch which server headers are required",
        reaction: "Preflight checks Access-Control-Allow-Methods. Missing PUT from the list → blocked even though GET works fine",
        teaches: "Each non-simple method must be explicitly allowed. Servers that only configure Allow-Origin forget Allow-Methods — the second most common CORS misconfiguration",
      },
    ],
    learningOutcome: "Predict whether a request needs a preflight, configure server headers to allow cross-origin access, and decode CORS error messages",
    agentNotes:
      "EXPLORABLE FORMAT with GUIDED-THEN-SANDBOX structure: " +
      "GATE SEQUENCE (guided — request builder locked to specific configs): " +
      "1. Initial state: request builder pre-configured to POST + application/json. " +
      "   Reader clicks 'Send Request' → GATE 1 fires: 'Will this go straight to the server?' " +
      "   Decision tree animates the preflight path. " +
      "2. After gate 1 completes, server returns 200. " +
      "   GATE 2 fires: 'Can your JS read the response?' " +
      "   Decision tree shows browser blocking despite 200 OK. " +
      "3. Reader prompted to toggle credentials. " +
      "   GATE 3 fires: 'Will wildcard + credentials work?' " +
      "   Decision tree shows incompatibility. " +
      "AFTER ALL 3 GATES: Request builder fully unlocked. Server configurator becomes editable. " +
      "Free exploration mode with 'Try these:' suggestions. " +
      "THREE PREDICTION GATES each have targeted wrong-answer feedback. " +
      "The browser decision tree animating in real time is the core teaching device — " +
      "CORS confusion exists because this tree is invisible. Making it visible IS the lesson. " +
      "DECODED ERROR MESSAGES: pair every cryptic browser error with plain English. " +
      "SERVER CONFIGURATOR: the reader toggles server headers to FIX their own CORS errors. " +
      "Cross-section connection to sec-cors (Security): this stop teaches 'what CORS does'; " +
      "sec-cors teaches 'how to configure it defensively.' " +
      "Don't over-invest in the animated arrows — the decision tree flowchart is the hero visual.",
  },

  "net-protocols": {
    stopId: "net-protocols",
    format: "battle",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "ProtocolBattle",
        description:
          "Three protocol lanes: HTTP/1.1, HTTP/2, HTTP/3. Each loads the same 6 resources. " +
          "Animated waterfall per protocol with live timing. " +
          "PREDICTION GATE before mid-race loss: 'All three protocols are racing at 0% loss. " +
          "You are about to introduce 5% packet loss. Which protocol will slow down MOST?' " +
          "(a) HTTP/1.1 (b) HTTP/2 (c) HTTP/3 (d) All equally. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'HTTP/1.1 uses separate connections per resource — one lost packet affects only that connection. " +
          "HTTP/2 multiplexes everything over ONE TCP connection — one lost packet blocks ALL streams.' " +
          "(c) 'HTTP/3 uses QUIC (UDP-based) which isolates streams — a lost packet only affects the stream it belongs to. " +
          "It is the LEAST affected, not the most.' " +
          "(d) 'Packet loss exposes architectural differences. TCP-based protocols stall differently than QUIC.' " +
          "MID-RACE PARAMETER CHANGES: The packet loss slider applies LIVE during a race. " +
          "Reader starts a race at 0% loss, sees all three performing similarly, then " +
          "WHILE THE RACE IS RUNNING drags packet loss to 5%. HTTP/2 immediately starts " +
          "freezing. HTTP/3 barely notices. " +
          "This is far more dramatic than restarting with new settings — the reader CAUSES " +
          "the divergence in real time. " +
          "Controls: packet loss (0-10% — live), resource count (1-20 — restarts race), " +
          "resource sizes (small/medium/large — restarts race). " +
          "Only resource count/size changes restart. Packet loss applies immediately. " +
          "Visual pulse on slider when dragged mid-race to signal 'this is affecting the race.' " +
          "HTTP/1.1 batching: at 20 resources, resources 7-12 WAIT with hourglass icons " +
          "while the first 6 load (browser connection limit). " +
          "REAL-WORLD GROUNDING: 5% packet loss = typical mobile network. " +
          "200-800ms stalls ≈ TCP retransmission timeout. Noted in brief for implementer.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Start race at 0% loss, then drag packet loss to 5% mid-race",
        reaction: "HTTP/2 suddenly freezes (all streams stall). HTTP/3 continues (only affected stream pauses). The transition is visible in real time",
        teaches: "HTTP/2 over TCP has head-of-line blocking at the transport layer — one lost packet freezes everything. HTTP/3's QUIC isolates damage",
      },
      {
        action: "Set resource count to 20 on HTTP/1.1",
        reaction: "Resources queue in batches of 6 (browser connection limit), taking 4x longer than HTTP/2",
        teaches: "HTTP/1.1 opens max 6 connections per origin — multiplexing eliminates this bottleneck",
      },
      {
        action: "Watch HTTP/2 vs HTTP/3 at 0% packet loss",
        reaction: "Nearly identical performance — the difference is invisible without loss",
        teaches: "HTTP/3's advantage over HTTP/2 only manifests under lossy conditions — perfect networks hide the difference",
      },
    ],
    learningOutcome: "Explain multiplexing and HOL-blocking differences between HTTP/1.1, HTTP/2, and HTTP/3",
    agentNotes:
      "Battle format. KEY CHANGE: mid-race packet loss slider (no restart). The reader CAUSES " +
      "the divergence live, which is stickier than configuring before the experiment. " +
      "Resource count/size changes DO restart (meaningless mid-race). " +
      "Visual pulse on the slider when dragged mid-race signals active effect. " +
      "CALIBRATION NOTE: 5% loss = mobile network, 200-800ms stall ≈ TCP retransmission. " +
      "These real-world grounding numbers prevent the implementer from building an inaccurate simulation.",
  },

  "net-long-polling": {
    stopId: "net-long-polling",
    format: "battle",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "RealtimeBattle",
        description:
          "Three lanes: Long Polling, WebSocket, SSE. Simulated server sending messages. " +
          "SIMPLIFIED VISUAL: bandwidth utilization bars (not animated sequence diagrams). " +
          "Bar height = useful data (green) vs overhead (red). At low frequency, all bars " +
          "mostly green. At high frequency, long polling's bar is 90% red. " +
          "'Detail view' toggle shows the last 10 messages as arrows (mini sequence diagram). " +
          "PREDICTION GATE before switching to high frequency: 'At 10 messages/second, " +
          "what fraction of long polling's bandwidth will be overhead (connection setup, not data)?' " +
          "(a) ~10% (b) ~50% (c) ~70-90%. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Each long poll cycle closes and reopens the connection. At 10 msg/s, the connection " +
          "setup headers dwarf the tiny data payload — overhead dominates.' " +
          "(b) 'Closer, but each connection cycle includes HTTP headers (~500 bytes) for a ~50 byte message. " +
          "The ratio gets worse as frequency increases.' " +
          "FREQUENCY TOGGLE remains the key teaching device: " +
          "Low (1/5s): all three look similar. " +
          "Medium (1/s): long polling overhead visible. " +
          "High (10/s): long polling drowns, WS and SSE efficient. " +
          "Overhead counter: 'Long polling: 73% overhead at 10 msg/s'. " +
          "RECONNECTION DEMO: simulate disconnect button. " +
          "SSE auto-reconnects (EventSource built-in). " +
          "WebSocket stays disconnected (needs manual reconnection logic — no code editor, " +
          "just a 'reconnect' button that appears only for WebSocket to make the gap visible). " +
          "Long polling reconnects naturally on next request. " +
          "CLIENT→SERVER: 'Send' button on each lane. " +
          "SSE shows 'server→client only — cannot send'. WS shows bidirectional.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Switch frequency from low (1/5s) to high (10/s)",
        reaction: "Long polling bar turns 90% red (overhead). WS and SSE bars stay mostly green",
        teaches: "Long polling overhead is proportional to message frequency — at high frequency, most bandwidth is connection setup, not data",
      },
      {
        action: "Simulate disconnect on all three lanes",
        reaction: "SSE: auto-reconnects in ~3s. WebSocket: stays disconnected, 'reconnect' button appears. Long polling: reconnects on next request",
        teaches: "SSE has built-in reconnection; WebSocket requires manual reconnection logic — a critical production consideration",
      },
      {
        action: "Try 'Send' (client→server) on each lane",
        reaction: "SSE: 'server→client only'. WS: bidirectional arrow flies. Long polling: creates a separate POST request",
        teaches: "SSE is unidirectional. For bidirectional communication, WebSocket is the native choice",
      },
    ],
    learningOutcome: "Choose between long polling, WebSocket, and SSE based on frequency, direction, and reconnection needs",
    agentNotes:
      "Battle format. SIMPLIFIED VISUAL: bandwidth utilization bars (green=useful, red=overhead) " +
      "instead of full animated sequence diagrams. Sequence diagrams are hard to render well at " +
      "variable density and are a performance risk at high frequency. " +
      "'Detail view' toggle shows last 10 messages as arrows for readers who want the protocol detail. " +
      "Reconnection demo: no code editor. WebSocket gets a 'reconnect' button that SSE doesn't need. " +
      "The button's existence IS the lesson about manual vs automatic reconnection.",
  },

  "net-rest-graphql": {
    stopId: "net-rest-graphql",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "RESTvsGraphQLExplorable",
        description:
          "FORMAT CHANGED from comparison table to problem-solving explorable. " +
          "PHASE 1 — BUILD WITH REST (reordered to climax at N+1): " +
          "A user profile page wireframe shows the data needed " +
          "(avatar, name, posts with author info, follower count). Below: a request builder. " +
          "Step A: Reader constructs GET /user → sees 20+ fields returned, 80% wasted " +
          "(red strikethrough on unused fields). " +
          "Step B: Reader tries to optimize: add ?fields=name,avatar → waste REDUCED to 0 for " +
          "this request (partial fix acknowledged — the explorable respects REST's tools). " +
          "BRIDGE: 'Payload optimized. But this page needs data from THREE different endpoints…' " +
          "Step C: Reader needs posts → builds GET /posts → gets 10 posts. " +
          "Step D: Reader needs author info for each post → builds 10 more " +
          "GET /posts/:id/author requests → N+1 EXPLOSION: 11 request pills stack up. " +
          "This is the PEAK FRUSTRATION — the unsolved problem that motivates Phase 2. " +
          "?fields= can't help (it reduces payload, not request count). " +
          "No custom endpoint escape hatch here — the reader must sit with the problem. " +
          "PHASE 2 — DISCOVER GRAPHQL: No leading 'What if you could ask for exactly what " +
          "you need?' — instead, simply 'Try a different approach:' and present the query builder. " +
          "Reader selects fields: user { name, avatar, posts { title, author { name } } }. " +
          "Single request, zero waste. The label 'GraphQL' appears AFTER the first successful query, " +
          "preserving the discovery moment. " +
          "PHASE 3 — HONEST TRADEOFFS: Caching complexity, schema overhead, tooling cost. " +
          "NOW the custom endpoint appears: 'REST has another partial solution — /api/user/profile-bundle " +
          "gets 1 request with exact fields, but you need a bespoke endpoint per view.' " +
          "CHALLENGE: Build a simple query for follower count only → GraphQL still requires full " +
          "stack (schema, resolver, client) for one integer. REST's GET /user/followers/count is simpler. " +
          "This turns tradeoffs from passive reading into confirmed experience.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Build GET /user and see 20+ fields with 80% strikethrough in red",
        reaction: "Only name and avatar needed, but email, bio, created_at, settings all returned. Waste is visceral",
        teaches: "REST endpoints return fixed shapes — over-fetching is structural, not a bug in your API",
      },
      {
        action: "Try ?fields=name,avatar on GET /user",
        reaction: "Waste reduced to 0 for this request — REST's partial fix works for flat resources",
        teaches: "Sparse fieldsets are a real REST optimization, not a straw man. But they only reduce payload, not request count",
      },
      {
        action: "Try to get posts with authors: 1 + 10 = 11 requests stacking up (Phase 1 climax)",
        reaction: "11 request pills animate in rapid succession. ?fields= can't help — this is about request COUNT, not payload SIZE",
        teaches: "N+1 is structural: each relationship requires a separate round trip. No amount of field filtering eliminates it",
      },
      {
        action: "Build the equivalent GraphQL query (Phase 2 — label appears AFTER first success)",
        reaction: "Single request, exact fields, nested author data resolved automatically. 1 pill vs 11",
        teaches: "GraphQL resolves nested data in a single query — the N+1 problem disappears at the API layer",
      },
      {
        action: "Build a simple follower-count-only query in GraphQL (Phase 3 challenge)",
        reaction: "GraphQL requires full schema + resolver + client for a single integer. REST's GET /user/followers/count is one line",
        teaches: "GraphQL's flexibility has overhead — for simple lookups, REST is simpler. The right tool depends on query complexity",
      },
    ],
    learningOutcome: "Experience REST's limitations firsthand, then evaluate when GraphQL's flexibility is worth the tooling cost",
    agentNotes:
      "FORMAT CHANGED from comparison table to problem-solving explorable. " +
      "PHASE 1 REORDERED: waste → ?fields= partial fix → posts → N+1 CLIMAX. " +
      "N+1 is the unsolved problem that motivates GraphQL. Custom endpoint moved to Phase 3 " +
      "(tradeoffs) so it doesn't defuse the N+1 tension before GraphQL appears. " +
      "PHASE 2 LABEL DELAY: Don't say 'GraphQL' until the reader's first query succeeds. " +
      "'Try a different approach:' → query builder → success → 'This is GraphQL.' " +
      "PHASE 3 CHALLENGE: follower-count-only query shows GraphQL's overhead for simple lookups. " +
      "Custom endpoint appears here as 'REST has another partial solution — but bespoke per view.' " +
      "CRITICAL: REST's ?fields= is shown EARLY and acknowledged as a real optimization. " +
      "A senior who thinks 'I'd just add a fields parameter' sees it explored and respected " +
      "before encountering its limits. The explorable earns GraphQL's place by making the " +
      "reader struggle with the problem it solves, then honestly shows where GraphQL is overkill.",
  },
};
