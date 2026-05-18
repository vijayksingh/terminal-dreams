import type { LessonMeta } from "./types";

export const SECURITY: Record<string, LessonMeta> = {
  "sec-xss": {
    stopId: "sec-xss",
    format: "challenge-chain",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "XSSChallengeChain",
        description:
          "ATTACK/DEFEND game. Two phases per challenge: " +
          "Phase 1 (ATTACK): reader is given a vulnerable input and must craft an XSS payload " +
          "that 'executes' (mock execution — highlights the vulnerability, doesn't actually run). " +
          "Phase 2 (DEFEND): reader must apply the defense by EDITING CODE, not selecting from " +
          "radio buttons. Show the vulnerable code line and let the reader modify it: " +
          "wrap output in escapeHtml(), replace innerHTML with textContent, add DOMPurify. " +
          "The reader CONSTRUCTS the defense in code, not picks it from a menu. " +
          "6 challenges, escalating difficulty: " +
          "1. Reflected XSS: inject <script> via URL parameter. Defense: HTML entity encoding " +
          "2. Stored XSS: inject via form input. Defense: output encoding " +
          "3. DOM XSS via innerHTML. Defense: use textContent instead " +
          "4. Attribute injection: break out of an attribute. Defense: attribute encoding " +
          "5. Event handler injection: onmouseover='alert(1)'. Defense: DOMPurify sanitization " +
          "   (strips event handler attributes). Note: CSP adds another layer but is taught in sec-csp — " +
          "   the defense HERE must be purely sanitization-based, completable without sec-csp knowledge. " +
          "6. Mutation XSS: payload that's safe statically but becomes dangerous after DOM mutation. " +
          "   Defense: DOMPurify with strict config " +
          "SANDBOXED: everything runs in an iframe with sandbox attribute. No real code execution.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Craft a <script> tag payload in the reflected XSS challenge",
        reaction: "Payload 'executes' — vulnerable code path highlighted in red. Then: apply encoding and try again → payload renders as harmless text",
        teaches: "XSS happens when user input is interpreted as code. Output encoding converts code characters to display characters",
      },
      {
        action: "Use textContent instead of innerHTML in challenge 3",
        reaction: "The <script> tag renders as literal text instead of executing — defense succeeds",
        teaches: "textContent is inherently safe — it can never inject HTML. innerHTML parses and executes its content",
      },
      {
        action: "Encounter mutation XSS in challenge 6",
        reaction: "A payload that passes initial sanitization becomes dangerous after DOM mutation — even DOMPurify with default config misses it",
        teaches: "Mutation XSS exploits the browser's HTML parser normalization — even 'safe' HTML can become dangerous after parsing",
      },
    ],
    learningOutcome: "Both CRAFT and DEFEND against XSS attacks — understanding the attack is the best defense",
    agentNotes:
      "Attack/defend format. Reader learns to THINK like an attacker first, then builds defenses. " +
      "DEFEND PHASE: code editing, NOT radio buttons. Show the vulnerable line, let the reader " +
      "modify it (e.g., innerHTML → textContent). This preserves the interaction depth from the " +
      "attack phase. Radio buttons are a dramatic drop-off after crafting payloads. " +
      "CODE VALIDATION: Use output-based validation, not string matching. After the reader edits " +
      "the defense code, run it (in the sandbox) with the challenge's attack payload. If the " +
      "payload renders as visible text (not executed), the defense passes. This allows creative " +
      "solutions (textContent, innerText, escapeHtml, DOMPurify) without requiring exact string " +
      "matches. Display the RENDERED OUTPUT so the reader sees their defense working — '<script>' " +
      "appearing as literal text is the visual proof. " +
      "CRITICAL: all execution is mocked. Use visual indicators (red glow for 'executed', " +
      "green shield for 'blocked') instead of actual script execution. " +
      "Sandbox iframe with no script execution is mandatory.",
  },

  "sec-csrf": {
    stopId: "sec-csrf",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CSRFScrolly",
        description:
          "Sticky visual: three actors as boxes — User (laptop), Bank (server), Evil Site (red server). " +
          "Animated arrows (HTTP requests) flow between them. " +
          "Scrollytelling walks through the attack: " +
          "1. User logs into bank → session cookie set (cookie icon on User box) " +
          "2. User visits evil.com (separate tab) " +
          "3. Evil site renders hidden form targeting bank.com/transfer " +
          "4. Form auto-submits → browser attaches bank's cookie → bank processes transfer " +
          "5. Show the problem: browser ALWAYS attaches cookies for the target domain " +
          "CONSTRUCTION BEAT (step 6): Present the vulnerable server handler: " +
          "app.post('/transfer', (req, res) => { transferMoney(req.body.to, req.body.amount); }) " +
          "Reader adds CSRF token verification code. Same 'edit code' pattern as sec-xss defend phases. " +
          "Then DEFENSE ISOLATION (each defense gets its own isolated beat): " +
          "7. CSRF token ONLY: toggle on/off. Evil site's form is missing the token → bank rejects. " +
          "8. SameSite ONLY (start with Strict): toggle. Browser doesn't send cookies on cross-site " +
          "request. FORWARD REFERENCE: 'You will configure this SameSite attribute yourself in " +
          "sec-cookies — and discover why Strict is not always the answer.' " +
          "9. Origin header ONLY: toggle. Request from evil.com, bank sees wrong origin → rejects. " +
          "10. ALL THREE together: defense-in-depth — multiple layers blocking the same attack at " +
          "different points. Toggle to see which defense catches the attack at which stage. " +
          "After scroll: reader toggles individual defenses on/off and watches the attack " +
          "succeed/fail at different stages.",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    scrollSteps: [
      {
        visual: "User box → Bank box. Login request with credentials. Session cookie appears on User box",
        narrative: "You log into your bank. The server sets a session cookie. This cookie will be sent with every request to bank.com — the browser does this automatically.",
      },
      {
        visual: "User opens second tab. Evil site box appears. User visits it",
        narrative: "You visit a seemingly harmless website in another tab. Meanwhile, your bank cookie is still active.",
      },
      {
        visual: "PREDICTION GATE: Evil site submits a form to bank.com",
        narrative: "The evil site just submitted a form to bank.com. Will the browser attach your session cookie?",
        interaction: "Prediction: Will the browser send your bank cookie with this cross-site form? (a) No — different site " +
          "(b) Yes — browser always sends cookies for the target domain. " +
          "WRONG-ANSWER FEEDBACK: (a) 'The browser doesn't care WHERE the form came from — it only cares " +
          "WHERE the form is going. bank.com is the target, so the bank cookie is attached automatically. " +
          "This is the fundamental CSRF insight: browsers attach cookies by destination, not by origin.'",
      },
      {
        visual: "Evil site renders invisible form. Arrow: evil.com → bank.com. Cookie attaches automatically",
        narrative: "Evil site's hidden form submits a transfer request TO your bank. The browser helpfully attaches your session cookie — it can't tell the user didn't intend this.",
      },
      {
        visual: "Bank processes the request. Money transferred. Red warning flash",
        narrative: "The bank sees a valid session cookie and processes the transfer. From the bank's perspective, it's a legitimate request — same cookie, same session.",
      },
      {
        visual: "CONSTRUCTION: Vulnerable server handler code shown. Reader edits to add CSRF token verification",
        narrative: "Here's the bank's transfer handler — no protection. Add CSRF token verification: check that req.body._csrf matches the token stored in the session.",
        interaction: "Edit the server handler: add CSRF token verification. The code editor highlights where to add the check.",
      },
      {
        visual: "CSRF token flow. Evil site's form is missing the token. Bank rejects → red X on arrow",
        narrative: "Defense 1: CSRF tokens. The bank includes a random token in each form. Evil site can't read this token (same-origin policy) — so its forged form is rejected.",
        interaction: "Toggle CSRF token defense on/off ONLY. Watch the attack succeed (no token) or fail (token present).",
      },
      {
        visual: "SameSite=Strict. Cookie has badge 'SameSite'. Arrow from evil.com has no cookie attached",
        narrative: "Defense 2: SameSite cookies. With SameSite=Strict, the browser simply doesn't send the cookie on cross-origin requests. Evil site's form arrives cookieless — rejected. You will configure this attribute yourself in sec-cookies.",
        interaction: "Toggle SameSite defense on/off ONLY. Watch the cookie disappear from the cross-site request.",
      },
      {
        visual: "Origin header check. Request from evil.com shows Origin: evil.com. Bank compares → mismatch → rejects",
        narrative: "Defense 3: Origin header. The browser includes an Origin header on cross-site requests. The bank checks: Origin evil.com ≠ bank.com → rejected.",
        interaction: "Toggle Origin check on/off ONLY. Watch the Origin header comparison succeed or be skipped.",
      },
      {
        visual: "All three defenses active simultaneously. Three shields at different stages of the attack flow",
        narrative: "Defense-in-depth: all three layers active. The CSRF token catches it at form validation. SameSite catches it at cookie attachment. Origin catches it at request validation. Three independent layers — any one is sufficient.",
        interaction: "Toggle individual defenses on/off to see which defense catches the attack at which stage.",
      },
    ],
    discoveries: [
      {
        action: "Turn off CSRF token defense but keep SameSite=Strict on",
        reaction: "Attack still blocked — SameSite prevents the cookie from being sent at all",
        teaches: "SameSite cookies are a browser-level defense — they don't require server-side token infrastructure",
      },
      {
        action: "Turn off all defenses",
        reaction: "Attack succeeds — the full sequence plays out with money transferred",
        teaches: "Without defenses, CSRF is trivially exploitable — any website can make authenticated requests on your behalf",
      },
    ],
    learningOutcome: "Explain the CSRF attack flow and implement defenses: tokens, SameSite cookies, and origin verification",
    agentNotes:
      "The three-actor diagram with animated HTTP arrows is the core visual. Each arrow should be " +
      "a labeled packet that physically travels between boxes. PREDICTION GATE before the attack: " +
      "'Will the browser send your cookie?' Most learners say 'No, different site' — being WRONG " +
      "is the aha moment. " +
      "CONSTRUCTION BEAT at step 6: same code-editing pattern as sec-xss defend phases. " +
      "Reader sees the vulnerable handler and adds CSRF token check. This is the stop's only " +
      "construction moment — it must feel like the sec-xss pattern, not a quiz. " +
      "DEFENSE ISOLATION: steps 7-10 isolate each defense into its own toggle beat. " +
      "Reader sees each defense blocking the attack at a DIFFERENT stage (cookie attachment, " +
      "form validation, origin check). Step 10 combines all three — defense-in-depth. " +
      "FORWARD REFERENCE at step 8: 'You will configure SameSite yourself in sec-cookies.' " +
      "When a defense blocks an attack, the arrow hits a SHIELD and bounces back (red X).",
  },

  "sec-csp": {
    stopId: "sec-csp",
    format: "playground",
    effort: "large",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "CSPPlayground",
        description:
          "Interactive CSP header builder. " +
          "LEFT: directive toggles (default-src, script-src, style-src, img-src, connect-src, " +
          "font-src, frame-src). For each directive: source selector (self, specific domains, " +
          "unsafe-inline, unsafe-eval, nonce-based, hash-based). " +
          "RIGHT: mock page that ATTEMPTS to load various resources. Each resource shows " +
          "a status: ALLOWED (green) or BLOCKED (red) based on current CSP. " +
          "The mock page has: inline script, external script, inline style, external stylesheet, " +
          "cross-origin image, iframe, XHR to API. " +
          "OUTPUT: the complete Content-Security-Policy header string (copyable). " +
          "VIOLATION LOG at bottom: shows what a real browser would report in the console. " +
          "PRESET SCENARIOS: 'Strict', 'Common', 'Permissive' — click to see a pre-configured CSP. " +
          "CHALLENGE-CHAIN (primary) with playground fallback (tab switch to free sandbox): " +
          "4 ESCALATING MISSIONS, not just one: " +
          "Mission 1: 'Lock down scripts.' Block all inline scripts while allowing self-hosted JS. " +
          "  Pass: script-src 'self'. Fail: page breaks because analytics needs a CDN. " +
          "Mission 2: 'Allow third-party resources.' Add analytics (cdn.analytics.com) and " +
          "  Google Fonts (fonts.googleapis.com + fonts.gstatic.com) without opening unsafe-inline. " +
          "Mission 3: 'Block the XSS.' An injected <script> tries to execute. Reader's CSP must " +
          "  block it while keeping all legitimate resources working. Cross-stop link: " +
          "  'This is the XSS payload from sec-xss — but now you're stopping it with headers, not code.' " +
          "Mission 4: 'Nonce everything.' Convert to nonce-based CSP. Add nonce to legitimate scripts, " +
          "  injected script has no nonce → blocked. This is the production-grade CSP. " +
          "Each mission's violation log shows EXACTLY what broke and why. " +
          "Score per mission: 'N/N resources allowed, N/N attack vectors blocked.' " +
          "After all 4: free playground tab available for experimentation. " +
          "CROSS-STOP: Mission 3 explicitly references sec-xss payloads.",
        reuses: ["DemoSandbox", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Start with a strict CSP (default-src 'none') and watch everything break",
        reaction: "All resources blocked — entire page is red. Progressively whitelist to see what each directive allows",
        teaches: "Start strict and loosen — it's safer to whitelist than to blacklist. Each directive you add is an explicit trust boundary",
      },
      {
        action: "Add unsafe-inline to script-src",
        reaction: "Warning: 'unsafe-inline defeats most of CSP's XSS protection. Consider nonce-based or hash-based instead'",
        teaches: "unsafe-inline is the most dangerous CSP escape hatch — it allows any inline script, including injected XSS",
      },
      {
        action: "Forget connect-src and try to make an API call",
        reaction: "API call blocked. Violation log: 'Refused to connect to api.example.com (violates connect-src)'",
        teaches: "connect-src controls fetch/XHR/WebSocket destinations — forgetting it breaks API calls even if script-src allows the JS",
      },
    ],
    learningOutcome: "Build a Content-Security-Policy header by experimentation, understanding what each directive protects",
    agentNotes:
      "CHALLENGE-CHAIN with playground fallback — 4 escalating missions, not a single scenario. " +
      "Each mission adds complexity: lock down → allow 3P → block XSS → nonce everything. " +
      "CROSS-STOP LINK in Mission 3: the XSS payload from sec-xss appears, but now the defense " +
      "is headers, not code. This bidirectional connection makes the section compound. " +
      "Free playground available as a tab AFTER completing missions. " +
      "Violation log should look like Chrome DevTools console errors. " +
      "Score display per mission gives granular progress feedback.",
  },

  "sec-cors": {
    stopId: "sec-cors",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "CORSExplorable",
        description:
          "STRUCTURE FLIPPED: Request builder FIRST, then scrollytelling explains what happened. " +
          "PHASE 1 — BUILD AND FAIL: Reader starts with the request builder. Goal: " +
          "'Make this cross-origin request succeed.' Reader configures method, headers, " +
          "and server CORS settings. They send the request and it FAILS (because they " +
          "forgot Access-Control-Allow-Headers, or used wildcard with credentials). " +
          "The failure is the hook. They see: '200 OK received… but JavaScript can't read it.' " +
          "PHASE 2 — UNDERSTAND WHY: Scrollytelling explains what happened: " +
          "1. Simple request flow: GET + standard headers → browser sends directly " +
          "2. PREDICTION GATE: 'The server responded 200 OK. Can your JavaScript read the data?' " +
          "3. Browser BLOCKS the response (it arrived! but JS can't read it). " +
          "   THIS is the single most important CORS insight. " +
          "4. POST + application/json → preflight OPTIONS → allowed methods/headers → actual request. " +
          "5. PREDICTION GATE: 'Your code uses Access-Control-Allow-Origin: * with credentials:true. " +
          "   Will this work?' (No — wildcard doesn't work with credentials.) " +
          "PHASE 3 — FIX IT: Return to the request builder with understanding. Now the reader " +
          "configures the correct headers and watches the request succeed. Each header in the " +
          "inspector explains itself on hover.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Request builder: reader configures method, headers, CORS settings. Goal: 'Make it succeed'",
        narrative: "Your goal: make this cross-origin request succeed. Configure the method, headers, and server CORS settings.",
        interaction: "Configure and send a cross-origin request. Watch it fail.",
      },
      {
        visual: "Simple GET with standard headers. Browser sends directly to server",
        narrative: "A simple GET with standard headers goes straight through — no questions asked by the browser.",
      },
      {
        visual: "PREDICTION GATE: Server responded 200 OK",
        narrative: "The server responded with 200 OK. Can your JavaScript read the response data?",
        interaction: "Prediction: Server responded 200 OK. Can JS read the data? (a) Yes — it's a 200 (b) No — browser blocks it without CORS header. " +
          "WRONG-ANSWER FEEDBACK: (a) 'The request succeeded and the server processed it — but CORS is a BROWSER " +
          "restriction. The browser received the response, saw no Access-Control-Allow-Origin header, and refused " +
          "to hand the data to your JavaScript. The 200 status is meaningless without CORS headers.'",
      },
      {
        visual: "Response arrived but browser BLOCKS JavaScript from reading it. '200 OK but blocked' visual",
        narrative: "The request SUCCEEDED. The server processed it. But without Access-Control-Allow-Origin, the browser protects the response data from your JavaScript.",
      },
      {
        visual: "POST + Content-Type: application/json → preflight OPTIONS fires first",
        narrative: "Non-simple requests trigger a preflight. The browser asks permission with an OPTIONS request BEFORE sending yours.",
      },
      {
        visual: "PREDICTION GATE: wildcard origin with credentials",
        narrative: "Your code uses Access-Control-Allow-Origin: * with credentials:true. Will this work?",
        interaction: "Prediction: Does wildcard + credentials work? (a) Yes — * means everyone (b) No — credentials require exact origin. " +
          "WRONG-ANSWER FEEDBACK: (a) 'Wildcard (*) means any origin can read the response — but with credentials " +
          "(cookies), the browser needs to know EXACTLY which origin to trust. Allowing * with credentials would let " +
          "any website read authenticated data. The spec explicitly forbids this combination.'",
      },
      {
        visual: "Request builder returns. Reader configures correct CORS headers and succeeds",
        narrative: "Now you understand the flow. Return to the builder, fix the headers, and watch the request succeed.",
        interaction: "Fix the CORS configuration based on what you learned",
      },
    ],
    discoveries: [
      {
        action: "Set Content-Type to application/json and see the preflight trigger",
        reaction: "An OPTIONS request fires before the actual request — the browser is asking permission first",
        teaches: "application/json triggers preflight because it's not a 'simple' content type. multipart/form-data and text/plain don't.",
      },
      {
        action: "See that a CORS-blocked response was actually received (status 200)",
        reaction: "The response ARRIVED with status 200 — the server processed it. But the browser won't let JS read it",
        teaches: "CORS is a BROWSER restriction, not a server restriction. The server always processes the request — CORS only controls whether JavaScript can read the response",
      },
      {
        action: "Set Access-Control-Allow-Origin to '*' with credentials: true",
        reaction: "Error: 'Cannot use wildcard origin with credentials. Must specify exact origin'",
        teaches: "Credentials (cookies) require an exact origin — wildcard doesn't work. This is a deliberate security constraint",
      },
    ],
    learningOutcome: "Predict when CORS preflights occur, configure server CORS headers, and debug common CORS errors",
    agentNotes:
      "STRUCTURE FLIPPED: request builder FIRST, scrollytelling SECOND. Reader fails first, " +
      "then learns WHY. TWO PREDICTION GATES: (1) '200 OK but can JS read it?' — most learners " +
      "say yes, being wrong IS the lesson. (2) 'Wildcard + credentials?' — common production mistake. " +
      "PHASE 3 returns to the builder with understanding. The cycle is: fail → understand → succeed. " +
      "CRITICAL insight: the response ARRIVES but browser blocks it. This is the most misunderstood aspect of CORS.",
  },

  "sec-cookies": {
    stopId: "sec-cookies",
    format: "playground",
    effort: "large",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "CookiePlayground",
        description:
          "A cookie jar visualization. Each cookie is a card with all attributes visible. " +
          "Cookie builder: form to create cookies with name, value, domain, path, expires, " +
          "HttpOnly, Secure, SameSite (Strict/Lax/None). " +
          "ATTACK SCENARIOS: " +
          "1. XSS tries document.cookie → shows which cookies are accessible (HttpOnly blocks it) " +
          "2. HTTP request on non-HTTPS → shows which cookies are sent (Secure blocks it) " +
          "3. Cross-site form submission → shows which cookies are sent (SameSite blocks it) " +
          "Each cookie card gets a SECURITY SCORE: green shields for security attributes, " +
          "red warnings for missing ones. A 'best practices' cookie appears as a template. " +
          "CHALLENGE-CHAIN (primary) with playground fallback: " +
          "Challenge 1: 'Configure for Production.' Your app stores a session token and a theme " +
          "preference. Configure cookies for both. Session: HttpOnly + Secure + SameSite=Strict. " +
          "Theme: skip HttpOnly (JS reads it) but needs Secure + SameSite=Lax. " +
          "Challenge 2: 'Survive the email link.' A user clicks a link from an email to your site. " +
          "SameSite=Strict cookie is NOT sent (user is logged out!). Fix: switch to Lax. " +
          "CROSS-STOP LINK: 'This is the CSRF attack from sec-csrf — SameSite is your cookie-level defense.' " +
          "Challenge 3: 'Survive the iframe.' An iframe loads your page. Which cookies are sent? " +
          "(Lax: no, Strict: no, None+Secure: yes). Reader discovers None is needed for cross-site " +
          "embeds but ONLY with Secure flag. " +
          "Challenge 4: 'Stop the XSS theft.' XSS script runs document.cookie. Reader's cookie " +
          "config must prevent theft. CROSS-STOP LINK: 'This is XSS from sec-xss stealing what " +
          "you configured.' HttpOnly is the defense. " +
          "Free playground available as a tab after completing challenges. " +
          "Each challenge builds on the previous — attributes compound across scenarios.",
        reuses: ["DemoSandbox", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Create a cookie without HttpOnly and run the XSS scenario",
        reaction: "XSS reads the cookie value! Red alert. Toggle HttpOnly on → XSS returns empty",
        teaches: "HttpOnly prevents JavaScript from reading the cookie — the #1 defense against cookie theft via XSS",
      },
      {
        action: "Set SameSite=None without Secure flag",
        reaction: "Browser rejects the cookie entirely — SameSite=None requires Secure",
        teaches: "SameSite=None (allow cross-site) REQUIRES Secure — browsers enforce this to prevent insecure cross-site cookies",
      },
    ],
    learningOutcome: "Set cookie security attributes that prevent XSS theft, CSRF, and insecure transmission",
    agentNotes:
      "CHALLENGE-CHAIN with playground fallback — 4 escalating challenges, not just one scenario. " +
      "CROSS-STOP LINKS: Challenge 2 references sec-csrf (SameSite as cookie-level CSRF defense), " +
      "Challenge 4 references sec-xss (XSS stealing cookies). These bidirectional connections " +
      "make the section compound — concepts from earlier stops reappear in new contexts. " +
      "The Lax vs Strict email-link scenario is the most practically important distinction. " +
      "Free playground tab available after completing challenges. " +
      "Green shields / red warnings on each cookie card make security posture instant.",
  },

  "sec-oauth": {
    stopId: "sec-oauth",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [600, 800],
    interactives: [
      {
        component: "OAuthExplorable",
        description:
          "TWO PHASES: scrollytelling reference + attack simulation synthesis. " +
          "PHASE 1 — LEARN THE FLOW: Four tabs, one per OAuth flow. Each tab is a " +
          "scrollytelling sequence diagram with color-coded arrows (green=public, red=secret, " +
          "accent=token). Tab 1: Auth Code + PKCE (recommended). Tab 2: Client Credentials. " +
          "Tab 3: Auth Code (server-side). Tab 4: Implicit (DEPRECATED). " +
          "PREDICTION GATE in Tab 1 before token exchange: 'An attacker stole the authorization " +
          "code from the URL. Can they exchange it for a token?' (Yes without PKCE / No with PKCE.) " +
          "PREDICTION GATE in Tab 2 (Client Credentials): 'Is a user involved in this flow?' " +
          "(Most juniors say yes. Answer: No — machine-to-machine. No redirect, no user consent. " +
          "The client authenticates with its own credentials, not a user's.) " +
          "PREDICTION GATE in Tab 3 (Server-Side Auth Code): 'This flow does not use PKCE. " +
          "Is it vulnerable to code interception?' (Answer: No — the server has a client secret, " +
          "a secure channel the browser cannot have. PKCE is for PUBLIC clients that cannot store secrets.) " +
          "PREDICTION GATE in Tab 4 (Implicit — DEPRECATED): 'The access token appears in the URL " +
          "fragment. Can a network attacker intercept it?' (Answer: The fragment is NOT sent over the " +
          "network, but it IS visible in browser history and can leak via referrer headers. Too many " +
          "side channels — this is why the flow is deprecated.) " +
          "PHASE 2 — DEFENSE-STACK CONFIGURATOR (not a matching quiz): " +
          "Reader configures a complete defense stack for their OAuth implementation: " +
          "- Token storage: localStorage / sessionStorage / memory / HttpOnly cookie " +
          "- Cookie attributes: HttpOnly, Secure, SameSite (Strict/Lax/None) " +
          "- CSP: script-src policy for the auth flow " +
          "- CORS: allowed origins for token endpoints " +
          "- CSRF: state parameter on/off, SameSite cookie defense on/off " +
          "After configuring, 5 ATTACKS RUN against the reader's setup: " +
          "Attack 1: Stolen auth code → succeeds if PKCE is off " +
          "Attack 2: CSRF on redirect URI → succeeds if state parameter is off " +
          "Attack 3: XSS reads token → succeeds if token is in localStorage (not memory) " +
          "Attack 4: Script injection → succeeds if CSP allows unsafe-inline " +
          "Attack 5: Cookie theft via XSS → succeeds if HttpOnly is off " +
          "Each attack that succeeds shows WHY and which configuration would stop it. " +
          "The reader's goal: configure a setup where ALL 5 attacks fail. " +
          "PARTIAL-STATE DASHBOARD: After each configuration change, show a defense scorecard: " +
          "'3/5 attacks blocked' with per-attack status (✓ blocked / ✗ vulnerable). When 3+ attacks " +
          "are blocked, highlight remaining gaps: 'Attack 3 succeeds because token is in localStorage — " +
          "check your token storage setting.' Priority hint when stuck >30s: 'Start with token storage — " +
          "it affects 2 attacks.' This prevents dead-end confusion at partial completion. " +
          "This is a simulation, not a matching quiz — the reader BUILDS defenses and WATCHES " +
          "attacks succeed or fail against their configuration. " +
          "Cross-section connections: each attack references the specific stop where the defense " +
          "was taught (sec-xss, sec-csrf, sec-csp, sec-cookies, sec-cors).",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    scrollSteps: [
      {
        visual: "Browser generates code_verifier (random string) and code_challenge (SHA256 hash)",
        narrative: "PKCE (Proof Key for Code Exchange): the browser generates a random secret (verifier) and its hash (challenge). The verifier stays in the browser — only the hash is sent initially.",
      },
      {
        visual: "Arrow: Browser → Auth Server. Carries: client_id + redirect_uri + code_challenge",
        narrative: "The browser redirects to the authorization server, carrying the client ID and the code challenge hash. The code verifier is NOT sent yet.",
      },
      {
        visual: "User authenticates (login form). Auth server sends back authorization code via redirect",
        narrative: "The user authenticates with the auth server. On success, the server redirects back to your app with an authorization code — a one-time-use code.",
      },
      {
        visual: "Arrow: Browser → Auth Server. Carries: authorization_code + code_verifier. Returns: access_token + refresh_token",
        narrative: "The browser exchanges the authorization code AND the original code verifier for tokens. The auth server checks the verifier against the stored challenge — proof that the same browser started and finished the flow.",
      },
      {
        visual: "Access token in memory (green shield). Refresh token in HttpOnly cookie (green shield). Token in URL: red X",
        narrative: "Store the access token in memory (not localStorage — XSS could steal it). Refresh token goes in an HttpOnly cookie. Never store tokens in URLs.",
      },
      {
        visual: "Tab 2: Client Credentials flow. No user involved — machine-to-machine arrows only",
        narrative: "Client Credentials: machine-to-machine. No redirect, no user consent screen. The service authenticates with its own credentials.",
        interaction: "Prediction: Is a user involved in this flow? (a) Yes — all OAuth needs a user (b) No — machine-to-machine. WRONG: (a) 'Client Credentials is for backend services talking to other services. There is no browser, no redirect, no human. The client authenticates itself with a secret.'",
      },
      {
        visual: "Tab 3: Server-Side Auth Code. No PKCE. Server has client_secret (locked vault icon)",
        narrative: "Server-side Auth Code: same redirect flow but the server holds a client secret. PKCE is unnecessary when you have a secure back-channel.",
        interaction: "Prediction: This flow has no PKCE. Is it vulnerable to code interception? (a) Yes — no PKCE means no protection (b) No — the server has a client secret. WRONG: (a) 'PKCE protects PUBLIC clients that cannot store secrets (browsers, mobile apps). Servers have a client_secret — a secure channel the browser cannot have. The secret proves identity at the token exchange.'",
      },
      {
        visual: "Tab 4: Implicit flow. Access token in URL fragment. DEPRECATED banner. Browser history icon, referrer header icon",
        narrative: "Implicit flow: the access token goes directly in the URL fragment. No intermediate code, no exchange step. Deprecated because too many side channels leak the token.",
        interaction: "Prediction: The token is in the URL fragment (#access_token=...). Can a network attacker intercept it? " +
          "(a) Yes — it's in the URL (b) No — fragments aren't sent over the network. " +
          "WRONG-ANSWER FEEDBACK: (a) 'Fragments (#...) are NOT sent in the HTTP request — they stay in the browser. " +
          "A network attacker cannot see them. BUT the token leaks through browser history, referrer headers, " +
          "and extension access. Network interception is not the only threat model.' " +
          "CORRECT-ANSWER NOTE: (b) 'Correct — but the token still leaks via browser history, referrer headers, " +
          "and logs. Too many side channels. This is why Implicit flow is deprecated in favor of Auth Code + PKCE.'",
      },
    ],
    discoveries: [
      {
        action: "Predict whether a stolen auth code can be exchanged (PKCE prediction gate)",
        reaction: "Without PKCE: yes — the code alone is enough. With PKCE: no — the attacker lacks the verifier",
        teaches: "PKCE prevents authorization code interception: even if an attacker steals the code, they can't exchange it without the verifier",
      },
      {
        action: "Switch to the Implicit flow tab",
        reaction: "Token appears directly in the URL fragment (#access_token=...). Red warning: 'DEPRECATED'",
        teaches: "Implicit flow puts the access token in the URL — visible in browser history, logs, and referrer headers",
      },
      {
        action: "Identify that Attack 3 (XSS reads localStorage) is stopped by in-memory storage",
        reaction: "Correct — access tokens in memory survive page lifetime but are invisible to XSS reading localStorage",
        teaches: "Token storage location matters: localStorage is XSS-readable, memory is not. The attack simulation connects OAuth to XSS defense",
      },
      {
        action: "Identify that Attack 5 (cookie without HttpOnly) is stopped by HttpOnly flag",
        reaction: "Correct — references sec-cookies. The reader synthesizes knowledge from earlier in the section",
        teaches: "The attack simulation capstone tests whether the reader internalized ALL 5 prior stops, not just OAuth",
      },
    ],
    learningOutcome: "Implement Authorization Code + PKCE for SPAs and defend OAuth flows against attacks using knowledge from the entire section",
    agentNotes:
      "TWO PHASES: scrollytelling reference + defense-stack configurator. " +
      "Phase 1 keeps the animated sequence diagrams — good reference material. " +
      "PREDICTION GATE in Tab 1: 'Can a stolen code be exchanged?' tests PKCE understanding. " +
      "Phase 2 is a DEFENSE-STACK CONFIGURATOR, not a matching quiz. The reader CONFIGURES " +
      "token storage, cookie attributes, CSP, CORS, and CSRF defenses — then watches 5 attacks " +
      "run against their setup. Attacks that succeed show exactly which config would stop them. " +
      "Goal: configure a setup where ALL 5 attacks fail. " +
      "This is the section's culminating exam — it tests whether the reader can APPLY knowledge " +
      "from all 5 prior stops (sec-xss, sec-csrf, sec-csp, sec-cookies, sec-cors) in a " +
      "realistic OAuth integration context. " +
      "Color coding: public (green), secret (red), token (accent). Tab 4 DEPRECATED banner.",
  },
};
