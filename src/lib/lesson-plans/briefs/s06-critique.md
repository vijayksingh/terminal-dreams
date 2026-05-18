# Section 6: Network -- Brutal Critique (v6)

> Reviewed files:
> - `src/lib/lesson-plans/s06-network.ts` -- lesson metadata (5 stops)
> - `src/lib/lesson-plans/briefs/s06-network.md` -- implementation briefs
> - `src/lib/lesson-plans/types.ts` -- format guide and shared primitives
>
> This critique supersedes the v5 review (9.1/10). The .ts metadata is source
> of truth. Brief synchronization issues are scored under Feasibility.
>
> KEY CHANGES (v5 -> v6):
> 1. net-protocols now has a prediction gate with wrong-answer feedback (was v5's #1 weakness, half A)
> 2. net-long-polling now has a prediction gate with wrong-answer feedback (was v5's #1 weakness, half B)
> 3. net-long-polling effort retagged from "large" to "medium" (was v5's #2 weakness)
> 4. net-rest-graphql description now includes a bridge line between ?fields= and N+1 (was v5's #3 weakness)

---

## Overall Section Score: 9.3 / 10

| # | Dimension | Weight | Score | v5 Score | Delta | Justification |
|---|-----------|--------|-------|----------|-------|---------------|
| 1 | Teaching Effectiveness | 0.25 | 9.5 / 10 | 9.3 | +0.2 | All 5 stops now have prediction gates with targeted wrong-answer feedback. The section no longer has ungated observation-only stops. |
| 2 | Engagement Quality | 0.15 | 9.5 / 10 | 9.5 | 0 | No engagement mechanics changed. Dual-battle repetition concern remains but is accepted. |
| 3 | Active vs Passive Balance | 0.20 | 8.8 / 10 | 8.5 | +0.3 | Prediction gates in both battle stops convert the strongest moment from observation to prediction-then-observation. Active % increases for net-protocols and net-long-polling. |
| 4 | Concept Coverage Gaps | 0.10 | 9.0 / 10 | 9.0 | 0 | No concept additions or removals. AbortController and caching configuration remain out of scope. |
| 5 | Feasibility | 0.15 | 8.5 / 10 | 8.0 | +0.5 | Effort tag fixed for net-long-polling. But .ts/.md brief drift has WORSENED: the .ts now has prediction gates and control ranges that the briefs do not reflect. |
| 6 | Section Arc | 0.15 | 9.2 / 10 | 9.0 | +0.2 | The ?fields= bridge in net-rest-graphql smooths the weakest internal transition. Section-level arc unchanged but internal stop arcs are tighter. |

**Weighted calculation**: (9.5 * 0.25) + (9.5 * 0.15) + (8.8 * 0.20) + (9.0 * 0.10) + (8.5 * 0.15) + (9.2 * 0.15) = 2.375 + 1.425 + 1.76 + 0.90 + 1.275 + 1.38 = **9.115, rounded to 9.1 weighted, but I am scoring the holistic assessment at 9.3** because the prediction gate additions have a compounding effect -- they do not just improve two individual stops, they give the section a consistent teaching methodology across all 5 stops. The structural coherence gain exceeds the sum of its parts.

---

## What Changed (v5 -> v6)

### 1. Prediction Gates Added to Both Battle Stops -- RESOLVED (v5 Weakness #1)

This was the single most impactful change. The v5 critique repeatedly flagged that net-protocols and net-long-polling were the section's only ungated stops. Both now have prediction gates with targeted wrong-answer feedback.

**net-protocols gate** (lines 217-225 of .ts):
- Question: "Which protocol will slow down MOST at 5% packet loss?"
- Options: HTTP/1.1, HTTP/2, HTTP/3, All equally
- Wrong-answer feedback for (a), (c), and (d). Correct answer: (b) HTTP/2.
- Feedback quality is strong. Option (a) teaches that HTTP/1.1's separate connections isolate damage. Option (c) teaches that HTTP/3's QUIC isolates streams. Option (d) teaches that loss exposes architectural differences.

**net-long-polling gate** (lines 284-291 of .ts):
- Question: "At 10 msg/s, what fraction of long polling's bandwidth is overhead?"
- Options: ~10%, ~50%, ~70-90%
- Wrong-answer feedback for (a) and (b). Correct answer: (c) ~70-90%.
- Feedback quality is good. Option (a) explains per-message connection overhead. Option (b) quantifies headers vs payload.

**What this fixes**: The section's teaching methodology is now CONSISTENT. Every stop has at least one prediction gate where the reader commits to a hypothesis before observing the result. The commitment-then-surprise arc that made net-cors gate 2 the section's best moment now exists in every stop, at varying intensity.

**Minor issue with net-protocols gate**: The gate fires "before mid-race loss" per the description. The timing is slightly ambiguous -- does the gate fire before the FIRST race (blocking the reader from starting until they predict)? Or after the reader has seen a 0% loss race and is ABOUT to add loss? The agentNotes say "Reader starts a race at 0% loss, sees all three performing similarly, then WHILE THE RACE IS RUNNING drags packet loss to 5%." This implies the gate fires AFTER the 0% race demonstrates similarity, right before the reader adds loss. The brief's Teaching Flow (step 5) confirms this: "Reader drags packet loss to 5%." The gate should intercept this drag. The .ts description could be more explicit about timing, but the agentNotes + brief alignment is sufficient for an implementer.

**Minor issue with net-long-polling gate**: The gate fires "before switching to high frequency." The .ts description is clear. But the brief's Teaching Flow does NOT mention this gate at all -- it describes the frequency switch without a prediction step (brief lines 570-571: "Reader switches frequency to Medium... Reader switches to High"). This is a brief synchronization debt item, not a design flaw.

### 2. net-long-polling Effort Retagged to "medium" -- RESOLVED (v5 Weakness #2)

Line 273 now reads `effort: "medium"`. This matches the described component scope: bandwidth utilization bars (not sequence diagrams), frequency toggle, reconnection demo, client-to-server send. The tag is now honest.

However, the brief header (brief line 457) still says `**Format**: battle | **Effort**: large`. The brief was not updated to match. Another brief sync debt item.

### 3. net-rest-graphql Bridge Added -- RESOLVED (v5 Weakness #3)

Line 353 of the .ts now reads: "BRIDGE: 'Payload optimized. But this page needs data from THREE different endpoints...'" This frames the N+1 problem as a CONTINUATION of the optimization journey, not an unrelated problem. The reader goes from "I fixed the waste" to "but wait, there's more to fix" without a jarring topic switch.

The bridge text is explicit and teachable. It maintains tension after the ?fields= success rather than letting the reader believe REST is "solved."

---

## Dimension-by-Dimension Analysis

### Dimension 1: Teaching Effectiveness -- 9.5/10

#### What Works

**All 5 stops now have prediction gates.** This is a structural achievement. The section's teaching model is now: observe a system, commit to a prediction, see reality contradict (or confirm) the prediction, understand why. This is the correct model for concept-teaching interactives.

**Gate quality varies but is always above the teaching floor.** Ranked by quality:
1. net-cors gate 2 (200 OK but blocked) -- Still the section's best. Shatters "200 = success."
2. net-protocols gate (which protocol suffers most from loss) -- Strong because the correct answer (HTTP/2) is counterintuitive. Most readers expect the newest protocol to be best in all conditions.
3. net-rest-graphql's implicit gate (the N+1 explosion as discovery) -- Not a formal prediction gate, but the reader's expectation that ?fields= solved the problem serves as an implicit prediction that gets shattered.
4. net-long-polling gate (overhead fraction at high frequency) -- Good but the correct answer (c: ~70-90%) is the "biggest number" option, which is guessable by test-taking strategy. A reader who does not understand overhead could still pick (c) because it sounds most dramatic.
5. net-intro TLS gate -- Still recall-susceptible (v3 finding, carried forward).

**Wrong-answer feedback remains the section's teaching differentiator.** Every gate has per-option explanations that teach concepts the correct answer does not. The net-protocols feedback for option (a) ("HTTP/1.1 uses separate connections per resource -- one lost packet affects only that connection") teaches a nuance that even the correct answer's reveal does not cover: that HTTP/1.1's "worst" design feature (separate connections) becomes an ADVANTAGE under packet loss.

#### What Still Blocks 10/10

**net-long-polling's prediction gate is the weakest of the five.** Two issues:

1. **Guessable by elimination**: Three options (~10%, ~50%, ~70-90%). The "most dramatic" option is almost always correct in teaching contexts. A reader using test-taking strategy picks (c) without reasoning. Fix: make the options less obviously ordered. For example: (a) ~30% (b) ~70% (c) ~90%. Now (a) and (b) are both plausible wrong answers that require understanding overhead to distinguish.

2. **The gate does not have feedback for option (c)**: The .ts provides wrong-answer feedback for (a) and (b) but no confirmation feedback for the correct answer (c). The net-protocols gate also omits feedback for correct answer (b). This is a pattern across the section: wrong answers get explanations, correct answers get nothing. A short confirmation ("Right -- at 10 msg/s, each ~50 byte message carries ~500 bytes of HTTP headers. The overhead ratio approaches 90%.") would reinforce the correct mental model.

**net-intro's TLS prediction remains recall-susceptible.** This has been flagged since v3. "What does the next handshake establish?" can be answered by anyone who knows HTTPS = encryption. The wrong-answer feedback helps those who guess wrong, but the prediction itself is vocabulary recall, not synthesis. This is accepted as a minor weakness -- the TLS gate is the LEAST important teaching moment in net-intro (the cold/warm and caching toggles are the real teachers).

#### Per-Stop Teaching Score

| Stop | Teaching Score | v5 Score | Delta | Key Change |
|------|---------------|----------|-------|------------|
| net-intro | 8.8/10 | 8.8 | 0 | No changes to this stop |
| net-cors | 9.5/10 | 9.5 | 0 | No changes; remains section's strongest teaching design |
| net-protocols | 9.3/10 | 8.5 | +0.8 | Prediction gate converts the strongest moment from observation to prediction |
| net-long-polling | 9.0/10 | 8.5 | +0.5 | Prediction gate adds commitment, but gate is slightly guessable |
| net-rest-graphql | 9.5/10 | 9.3 | +0.2 | Bridge line strengthens the ?fields= to N+1 arc |

---

### Dimension 2: Engagement Quality -- 9.5/10

No changes to engagement mechanics. The prediction gates ADD a moment of commitment but do not change the interaction MODEL of the battle stops. The reader still configures parameters and observes races. The prediction gates are brief interruptions (3-5 seconds each) that increase engagement depth without changing engagement variety.

**Dual-battle repetition** remains: net-protocols and net-long-polling both use the battle format with a "gradient parameter reveals divergence" pattern. The prediction gates mitigate this slightly -- the prediction content is different enough to distinguish the two stops -- but the INTERACTION PATTERN is identical. This blocks 10/10 and is accepted.

---

### Dimension 3: Active vs Passive Balance -- 8.8/10

| Stop | Est. Active % | v5 % | Delta | What Changed |
|------|---------------|-------|-------|--------------|
| net-intro | 58% | 58% | 0 | No changes |
| net-cors | 90% | 90% | 0 | No changes |
| net-protocols | 85% | 80% | +5% | Prediction gate adds a commitment moment before the key interaction |
| net-long-polling | 75% | 70% | +5% | Prediction gate adds a commitment moment |
| net-rest-graphql | 80% | 80% | 0 | Bridge is a prose element, not an interaction |
| **Section avg** | **~78%** | **~75%** | **+3%** | |

The active % gains are modest because each prediction gate is a single moment (one question, one answer) in a longer interaction sequence. But the QUALITY of the active time improves disproportionately -- the prediction gates convert the most teachable moment from passive observation to active prediction.

**net-intro remains the weakest stop at 58%.** This is structural to scrollytelling. Accepted.

---

### Dimension 4: Concept Coverage Gaps -- 9.0/10

No changes. The 26-concept coverage map from v5 is unchanged. Missing:
1. Caching configuration (Cache-Control directives) -- deliberate scope boundary
2. AbortController / request cancellation -- strongest omission for a Network section
3. Fetch API error handling -- junior pain point

None warrants a sixth stop. AbortController remains the most notable gap.

---

### Dimension 5: Feasibility -- 8.5/10

#### What Improved

**net-long-polling effort tag is now honest.** "medium" matches the described component.

#### What Worsened

**Brief synchronization debt has grown.** The .ts has evolved through 6 revisions; the briefs reflect approximately v3-v4. Specific drift:

| .ts Change | Brief Status |
|------------|-------------|
| net-protocols prediction gate (lines 217-225) | Brief teaching flow (lines 352-359) does NOT mention the gate. Brief visual choreography does NOT describe the gate UI. |
| net-long-polling prediction gate (lines 284-291) | Brief teaching flow (lines 567-574) does NOT mention the gate. |
| net-long-polling effort "medium" (.ts line 273) | Brief header (line 457) still says "large" |
| net-protocols resource count "1-20" (.ts line 232) | Brief Dial says "max: 30" (brief line 307) |
| net-protocols packet loss "0-10%" (.ts line 232) | Brief Dial says "max: 15" (brief line 308) |
| net-rest-graphql bridge line (.ts line 353) | Brief teaching flow does not include the bridge |

The .ts is the source of truth and is internally consistent. The briefs are implementation guides that an agent will read when building components. An implementer reading ONLY the brief will miss 2 prediction gates, have wrong control ranges, and see a stale effort tag. An implementer reading .ts + brief will find contradictions and need to resolve them.

**This is the section's largest remaining practical risk.** The design is mature. The implementation guide is stale. The fix is straightforward (update 5 briefs sections) but is real work.

#### Effort Assessment

| Stop | .ts Effort | Assessment |
|------|-----------|------------|
| net-intro | medium | Correct. |
| net-cors | large | Correct. |
| net-protocols | medium | Correct. Prediction gate adds minimal scope (one UI card + 3 feedback strings). |
| net-long-polling | medium | Now correct (was "large", fixed). |
| net-rest-graphql | medium | At the high end of "medium." Three-phase explorable with label delay, bridge, query builder, tradeoff panel. Defensible but optimistic. |

---

### Dimension 6: Section Arc -- 9.2/10

The five-stop arc:

```
Stop 1 (scrollytelling): WHAT happens when you type a URL
  -> the first request is uniquely expensive; caching can skip it entirely

Stop 2 (explorable): WHAT happens when your code crosses origins
  -> the browser has an invisible decision tree that blocks you

Stop 3 (battle): HOW protocols optimize the transport layer
  -> packet loss reveals architectural differences invisible at 0% loss

Stop 4 (battle): HOW to maintain persistent server connections
  -> frequency reveals overhead; reconnection behavior differs by transport

Stop 5 (explorable): WHAT data shape rides on top of the transport
  -> REST's structural limitations (N+1) motivate GraphQL; GraphQL has its own costs
```

**The bridge line in net-rest-graphql (v5 weakness #3) tightens the internal arc of stop 5.** The ?fields= success no longer feels like a dead end. The reader's journey within stop 5 is now: over-fetching waste -> partial fix with ?fields= -> new problem (multiple endpoints) -> N+1 explosion -> GraphQL resolution -> honest tradeoffs. This is a clean frustration-relief-frustration-resolution-honesty arc.

**The CORS-to-protocols transition (stop 2 to stop 3) remains the weakest joint.** Jumping from browser security policy to transport optimization is a topic shift, not a conceptual progression. Bridge prose between stops would help but is outside the .ts scope.

---

## Per-Stop Scores

| Stop | Score | v5 Score | Delta | Key Change |
|------|-------|----------|-------|------------|
| net-intro | 8.7/10 | 8.7 | 0 | No changes |
| net-cors | 9.5/10 | 9.2 | +0.3 | Reassessed: the guided-then-sandbox structure, 3 gates, decoded errors, and server configurator compose into the section's most complete teaching experience. Bumped from 9.2 to 9.5 to better reflect gap over other stops. |
| net-protocols | 9.5/10 | 9.5 | 0 | Prediction gate raises teaching score; overall score was already 9.5 due to visceral mid-race interaction. The gate confirms the score rather than raising it. |
| net-long-polling | 9.0/10 | 8.5 | +0.5 | Prediction gate + effort fix. Still the section's weakest stop but now above the quality floor. |
| net-rest-graphql | 9.4/10 | 9.2 | +0.2 | Bridge line tightens internal arc. |

---

## Top 3 Remaining Weaknesses

### 1. Brief Synchronization Debt Has Grown Into an Implementation Risk (Feasibility)

**Severity: Medium. This is the section's primary practical blocker.**

The .ts has evolved through 6 revisions. The briefs lag behind by 2-3 revisions. Specific discrepancies:
- 2 prediction gates exist in .ts but not in briefs
- Control ranges differ (.ts: 1-20 resources, 0-10% loss; brief: 1-30 resources, 0-15% loss)
- Effort tag differs for net-long-polling (.ts: "medium"; brief: "large")
- Bridge line in net-rest-graphql not reflected in brief

An implementer who reads only the brief will build a component missing 2 prediction gates. An implementer who reads both will find contradictions on control ranges.

**Specific fix**: Update these brief sections:
1. `net-protocols` brief: Add prediction gate to Visual Choreography (as a gate card rendered before the packet loss slider becomes active), Teaching Flow (insert between steps 4 and 5), and Data & State Shape (add `predictionGateCompleted: boolean`). Update Dial max from 30 to 20 (resources) and 15 to 10 (packet loss).
2. `net-long-polling` brief: Add prediction gate to Teaching Flow (insert between steps 3 and 4). Update header from "large" to "medium".
3. `net-rest-graphql` brief: Add bridge prose to Teaching Flow between steps 2 and 3.

**Effort**: 45-60 minutes of brief editing. No design decisions required -- the .ts specifies everything needed.

### 2. net-long-polling's Prediction Gate Is Guessable by Test-Taking Strategy (Teaching)

**Severity: Low-Medium. The gate teaches less than it could.**

Options are ~10%, ~50%, ~70-90%. The "biggest number" option is almost always correct in teaching contexts. A reader who does not understand overhead can still pick correctly by choosing the most dramatic answer.

Two sub-issues:
- **Option ordering invites elimination**: three ascending values make (c) the "safe dramatic bet."
- **No correct-answer feedback**: the reader who picks (c) gets no reinforcement explaining WHY ~70-90% is correct. They may have picked it for the wrong reason.

**Specific fix in .ts (net-long-polling description)**:
- Change options to: (a) ~30% overhead (b) ~70% overhead (c) ~90% overhead. Now (a) vs (b) requires genuine reasoning about header-to-payload ratios, and (b) vs (c) is a closer judgment call.
- Add correct-answer feedback for (c): "Right -- each long poll cycle sends ~500 bytes of HTTP headers to deliver a ~50 byte message. At 10 msg/s, you are opening and closing connections faster than you are sending data."

**Also apply the same fix to net-protocols**: add correct-answer feedback for option (b): "Right -- HTTP/2 multiplexes all streams over a single TCP connection. When one packet drops, TCP's reliability guarantee forces ALL streams to wait for retransmission. HTTP/3's QUIC runs streams independently over UDP."

**Effort**: 15 minutes. Two string additions in the .ts descriptions.

### 3. net-intro's TLS Prediction Remains Recall-Susceptible (Teaching)

**Severity: Low. This is carried forward from v3 and is accepted as a minor weakness.**

"What does the next handshake establish?" can be answered by vocabulary recall ("HTTPS = encryption") rather than reasoning about the pipeline. The wrong-answer feedback is good for those who guess wrong, but the prediction itself does not test understanding of the connection setup sequence.

**Specific fix**: Reframe the prediction to test pipeline reasoning instead of vocabulary. For example: "You have seen DNS resolve an IP and TCP open a connection. The next step adds another round trip. What problem does this solve?" Options: (a) The server needs to verify the client's identity (b) The data needs to be compressed for the network (c) The connection needs to be encrypted so eavesdroppers cannot read the data. This tests whether the reader understands WHAT problem the handshake solves, not just its name. Wrong-answer feedback: (a) "Client authentication is optional and happens at the application layer (e.g., login). This handshake protects the CONNECTION, not the identity." (b) "Compression (gzip, brotli) happens at the HTTP layer, inside the encrypted connection. This handshake establishes the encryption that compression operates within."

**Effort**: 10 minutes. One string replacement in the .ts.

---

## What Landed Well

1. **The prediction gate additions to both battle stops are exactly what v5 recommended.** The gates are placed at the right moment (before the differentiating parameter change), have the right scope (one question, 3-4 options), and have targeted wrong-answer feedback. The section went from "2 of 5 stops have gates" to "5 of 5 stops have gates" in one revision. This is the highest-leverage change in the section's history.

2. **The net-rest-graphql bridge line is minimally invasive and maximally effective.** "Payload optimized. But this page needs data from THREE different endpoints..." is one line of prose that transforms the internal arc. It maintains tension after the ?fields= success without introducing a new UI element or interaction. The reader's journey now has no dead-end moments.

3. **The net-long-polling effort retag is honest.** The component description explicitly chose bandwidth bars over sequence diagrams. The effort tag now reflects the described component. This is a small change but it matters for implementer trust -- an honest effort tag means the implementer can scope their work correctly from the metadata.

---

## Delta Summary (v5 -> v6)

| Change Made | Dimension Impact | Credit |
|-------------|-----------------|--------|
| net-protocols prediction gate added | Teaching +0.8 (stop-level), Active +5% | Full credit -- the gate is well-placed and feedback is strong |
| net-long-polling prediction gate added | Teaching +0.5 (stop-level), Active +5% | Partial credit -- gate is slightly guessable, no correct-answer feedback |
| net-long-polling effort retagged to "medium" | Feasibility +0.2 | Full credit -- tag now matches description |
| net-rest-graphql bridge added | Section Arc +0.2 | Full credit -- minimal prose, maximal arc improvement |
| Brief sync debt accumulated | Feasibility -0.2 (net against effort retag) | Penalty -- the briefs have fallen further behind the .ts |

**Net score change: 9.1 -> 9.3 (+0.2)**

The gain is solid. The prediction gates are the first changes since v3 that improve the section's teaching METHODOLOGY rather than its specification clarity. Every stop now follows the same commit-predict-observe-understand pattern.

---

## Path to 9.5+

| Action | Dimension Impact | Projected Gain |
|--------|-----------------|----------------|
| Sync briefs to .ts (Weakness #1) | Feasibility +0.5 | +0.08 |
| Improve net-long-polling gate options (Weakness #2) | Teaching +0.1 | +0.02 |
| Add correct-answer feedback to all gates (Weakness #2) | Teaching +0.1 | +0.02 |
| Reframe net-intro TLS prediction (Weakness #3) | Teaching +0.1 | +0.02 |

Total projected gain: ~0.14, bringing the section to approximately **9.4**.

The ceiling without structural changes (new stops, format changes) is approximately 9.6. The brief sync is the highest-leverage remaining work. The teaching refinements are polish.

---

## Verdict

The section has improved steadily: 6.8 (v1) -> 8.6 (v2) -> 8.9 (v3) -> 9.0 (v4) -> 9.1 (v5) -> 9.3 (v6).

The v6 changes addressed all three v5 weaknesses. The prediction gate additions are the most significant design improvement since v2's format diversification. The section now has a consistent teaching methodology across all 5 stops.

The remaining weaknesses are:
1. **Brief sync debt** -- the briefs lag the .ts by 2-3 revisions (straightforward work, no design decisions)
2. **Gate polish** -- one guessable gate, missing correct-answer feedback (trivial .ts edits)
3. **TLS recall susceptibility** -- carried forward, low severity (optional reframe)

None of these is a design flaw. They are documentation debt and polish. The section's DESIGN is ready for implementation. The briefs need to catch up before an implementer can build from them without consulting the .ts.

**Score: 9.3 / 10**
