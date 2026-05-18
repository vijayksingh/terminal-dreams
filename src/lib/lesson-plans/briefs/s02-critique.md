# Section 02: DOM API -- Brutal Critique (Round 6, Post Round-5 Fixes)

**Reviewer**: Independent adversarial quality critic
**Date**: 2026-05-18
**Scope**: 4 stops (dom-refresher, dom-querying, dom-query-perf, dom-assignment-1)
**Source material**: `s02-dom-api.ts` (lesson metadata, source of truth), `types.ts` (format guide and shared primitives)
**Previous score**: 9.1 / 10
**Revision summary**: Three fixes claimed against Round 5's top 3 weaknesses: (1) dom-querying wrong-answer feedback added to Round 2 prediction with two specific wrong answers; Round 3 given a concrete complex selector `.sidebar > .card:not(.hidden)` with discovery that only query* methods handle compound selectors. (2) Layout-triggering tooltips upgraded from passive hover to prediction micro-gate with select-all-that-apply format and wrong-answer feedback for two specific error cases. (3) Challenge 3 SuboptimalPattern added: detects querySelectorAll on every keystroke, quantifies waste at 3,000 traversals/minute.

---

## Overall Section Score: 9.4 / 10

| # | Dimension | Weight | Previous | Current | Delta | Rationale |
|---|-----------|--------|----------|---------|-------|-----------|
| 1 | Teaching Effectiveness | 0.25 | 9 / 10 | 9.5 / 10 | +0.5 | All three fixes directly improve teaching depth. dom-querying now has wrong-answer feedback that teaches THROUGH misconceptions. Layout micro-gate converts passive tooltips to prediction-first. Challenge 3 SuboptimalPattern quantifies waste concretely. |
| 2 | Engagement Quality | 0.15 | 9 / 10 | 9 / 10 | 0 | No new engagement mechanics. The fixes deepen existing interactions rather than adding variety. Already near ceiling. |
| 3 | Active vs Passive Balance | 0.20 | 9.5 / 10 | 10 / 10 | +0.5 | The layout micro-gate was the last passive stretch in dom-query-perf. It is now prediction-first. Every scroll step and every decision point in the section requires active commitment before reveal. |
| 4 | Concept Coverage Gaps | 0.10 | 9 / 10 | 9 / 10 | 0 | No new concept coverage. Round 3's compound selector adds a discovery (only query* handles complex selectors) but this is a method-capability detail, not a new subtopic. Template/Shadow DOM remain correctly deferred. |
| 5 | Feasibility | 0.15 | 9 / 10 | 9 / 10 | 0 | The prediction micro-gate adds a small implementation scope increase (select-all-that-apply widget in Decision 3). Offset by Round 3's concrete selector reducing implementing-agent guesswork. Net zero. |
| 6 | Section Arc | 0.15 | 9.5 / 10 | 9.5 / 10 | 0 | No arc changes. The dom-querying-to-dom-query-perf bridge gap persists (live collections to query performance -- the conceptual connection is unsurfaced). |

**Weighted score**: (9.5 * 0.25) + (9 * 0.15) + (10 * 0.20) + (9 * 0.10) + (9 * 0.15) + (9.5 * 0.15) = 2.375 + 1.35 + 2.00 + 0.90 + 1.35 + 1.425 = **9.4 weighted**

---

## Verification of Round-5 Fixes

### Fix 1: dom-querying wrong-answer feedback and concrete Round 3 selector -- VERIFIED, SUBSTANTIVE

**Round 2 wrong-answer feedback** (lines 97-100):

Two specific wrong answers are now specified with targeted correction:

- "getElementsByClassName is faster" gets: "Speed is nearly identical -- the REAL difference is what happens AFTER the query: one collection stays alive, one freezes."
- "querySelectorAll supports more syntax" gets: "True but trivial -- the live vs static behavior is the difference that causes bugs in production (live collections mutate mid-iteration)."

Both wrong-answer paths redirect the reader to the actual lesson (live vs static). The second response is particularly well-crafted: it acknowledges the reader is technically correct ("True but trivial") and then pivots to what actually matters. This teaches prioritization of knowledge, not just facts.

**Round 3 concrete selector** (lines 101-103):

The selector `.sidebar > .card:not(.hidden)` is specified. The discovery is explicit: "Only querySelector/querySelectorAll handle compound selectors. getElementById and getElementsByClassName cannot." This creates a natural capstone for the three-round progression: Round 1 (speed difference), Round 2 (return type difference), Round 3 (capability difference). The rounds now form a complete taxonomy of how query methods differ.

**What this fixes**: The v5 critique's top weakness ("dom-querying is under-specified relative to other stops") is substantially addressed. Wrong-answer feedback brings dom-querying's prediction gates to parity with dom-query-perf. The concrete selector eliminates implementing-agent guesswork for Round 3.

**What remains unaddressed**: Round 1 still has no wrong-answer feedback. If a reader predicts "querySelector is faster" (unlikely but possible), there is no specified correction. This is minor -- the race animation itself is strong implicit feedback -- but it is the only prediction gate in the section without explicit wrong-answer handling.

### Fix 2: Layout-triggering prediction micro-gate -- VERIFIED, EXACTLY WHAT WAS NEEDED

Lines 158-163 now specify:

```
PREDICTION MICRO-GATE before tooltip reveal: 'Which of these reads trigger layout?
Pick all that apply: element.id, offsetHeight, textContent, getBoundingClientRect, getComputedStyle.'
Most readers select ALL reads -- reveal shows only geometry/style reads are expensive.
WRONG-ANSWER FEEDBACK: selecting element.id or textContent -> 'These access cached properties --
no layout calculation needed.' Missing getComputedStyle -> 'getComputedStyle forces BOTH style
recalculation AND layout -- it is the most expensive read.'
```

This converts the v5 critique's #2 weakness (passive tooltips) into an active prediction. The select-all-that-apply format is the right choice -- it tests discrimination (which reads are expensive) rather than recall (name an expensive read). The two wrong-answer paths cover the two most common errors:

1. **False positive**: Selecting element.id/textContent (thinking ALL reads are expensive). Correction teaches: "cached properties -- no layout calculation needed." This directly attacks cargo-cult batching.
2. **False negative**: Missing getComputedStyle (not knowing it is expensive). Correction teaches: "forces BOTH style recalculation AND layout -- it is the most expensive read." The emphasis on BOTH and "most expensive" creates a hierarchy within expensive reads.

The prediction-then-reveal sequence means the tooltips now serve as CONFIRMATION of the reader's prediction, not as new information delivered passively. This is a structural improvement to the teaching flow.

**One observation**: The micro-gate specifies 5 options (element.id, offsetHeight, textContent, getBoundingClientRect, getComputedStyle) with 3 correct answers (offsetHeight, getBoundingClientRect, getComputedStyle) and 2 wrong answers (element.id, textContent). This is a reasonable ratio. But the wrong-answer feedback only covers two error cases (selecting a free property, missing getComputedStyle). It does not cover: selecting ALL five (a common pattern the description itself acknowledges: "Most readers select ALL reads"). If a reader selects all five, the feedback should highlight the distinction, not just flag element.id individually. Minor, but an implementing agent may handle this edge case inconsistently.

### Fix 3: Challenge 3 SuboptimalPattern -- VERIFIED, WELL-QUANTIFIED

Lines 270-273:

```
SUBOPTIMAL DETECTION: if reader calls querySelectorAll on every keystroke to find matching items,
test passes but feedback says: 'You re-query the DOM on every keystroke -- cache the item
references once and filter from the cached array. querySelectorAll costs 50 node checks
x 60 keystrokes/minute = 3,000 wasted traversals per minute.'
```

The quantification (50 nodes x 60 keystrokes = 3,000 wasted traversals/minute) makes the waste visceral, not abstract. This mirrors Challenge 1's SuboptimalPattern style (which quantifies individual reflows). All four challenges now have explicit suboptimal detection:

| Challenge | SuboptimalPattern | Quantification |
|-----------|------------------|----------------|
| 1 (render list) | appendChild in loop | "5 elements individually -- each triggers a potential reflow" |
| 2 (delete buttons) | Per-element handlers | "you added 5 handlers -- try event delegation" |
| 3 (search/filter) | querySelectorAll per keystroke | "50 nodes x 60 keystrokes = 3,000 wasted traversals/minute" |
| 4 (sort) | innerHTML clear + re-render | "you destroyed all DOM state (focus, scroll position)" |

The progression in SuboptimalPattern feedback is worth noting: Challenge 1 teaches batch-insert (DOM write optimization). Challenge 2 teaches event delegation (handler optimization). Challenge 3 teaches reference caching (DOM read optimization). Challenge 4 teaches node reuse (state preservation). Each targets a different optimization axis. The section arc within the challenge chain is strong.

**Detection specificity**: The detection trigger ("calls querySelectorAll or getElementsBy inside the input event handler" from the v5 critique's recommendation, simplified to "calls querySelectorAll on every keystroke" in the actual fix) is narrower than what the v5 critique suggested. It only catches querySelectorAll, not getElementsByClassName or other query methods used per-keystroke. An implementing agent might want to broaden detection. Minor gap.

---

## Per-Dimension Deep Analysis

### 1. Teaching Effectiveness -- 9.5/10 (up from 9)

The three fixes collectively close the section's teaching quality asymmetry. Before this round, dom-query-perf was significantly stronger than dom-querying in prediction-gate depth. Now they are near parity:

| Stop | Prediction Gates | Wrong-Answer Feedback | Teaching Through Error |
|------|-----------------|----------------------|----------------------|
| dom-refresher | Implicit (puzzle goals) | Puzzle 2 cloneNode(false) surprise | Strong |
| dom-querying | 3 rounds | Round 2: 2 specific wrong answers | Now strong (was weak) |
| dom-query-perf | 3 scroll steps + 1 micro-gate | All 4 have 2-3 wrong-answer paths | Very strong |
| dom-assignment-1 | Skip-gate | 4 SuboptimalPattern detections | Very strong |

The layout micro-gate is the single best fix in this round. It converts the section's last "observe and read" moment into "predict, commit, be surprised." The wrong-answer feedback for selecting element.id ("cached properties -- no layout calculation needed") teaches a specific mechanism, not just "wrong."

**What prevents 10/10**: Two gaps.

First, dom-querying Round 1 still lacks wrong-answer feedback. A reader who predicts querySelector is faster (perhaps reasoning "more specific = faster") gets no explicit correction -- only the implicit feedback of watching the race. Every other prediction in the section now has explicit wrong-answer handling.

Second, the section does not surface the WHEN of live vs static collections. dom-querying teaches THAT the difference exists (live collections auto-update). dom-query-perf teaches optimization strategies. But no stop teaches the decision framework: "When should you deliberately CHOOSE a live collection?" Real-world use case: monitoring a container whose children change frequently (e.g., a chat message list). This is an applied-understanding gap, not a factual one.

### 2. Engagement Quality -- 9/10 (unchanged)

The fixes deepen existing interactions but do not add new engagement variety. This is correct -- the section does not need more interaction types. It needs the existing ones to be airtight, which they now are.

The dom-refresher senior skip-to-puzzles gap and dom-querying Round 1 triviality for seniors persist from the v5 critique. Both are 30-60 second annoyances, not engagement killers.

### 3. Active vs Passive Balance -- 10/10 (up from 9.5)

This is the dimension that hits its ceiling. The layout micro-gate was the last passive stretch in the section. Updated stop-by-stop:

| Stop | Active % | Change |
|------|----------|--------|
| dom-refresher | ~82% | Unchanged |
| dom-querying | ~78% | Up from ~75% -- Round 2 and Round 3 now have richer active content |
| dom-query-perf | ~85% | Up from ~80% -- micro-gate converts tooltip hover to prediction |
| dom-assignment-1 | ~90% | Unchanged |
| **Section avg** | **~84%** | Up from ~82% |

Every scroll step, every race round, every decision point, and every challenge now requires active commitment before reveal. The section has no passive stretches longer than the scroll-between-steps reading (2-4 sentences, inherent to scrollytelling format).

10/10 does not mean "perfect" -- it means "at the ceiling for this format." Scrollytelling inherently has reading time between steps. Challenge-chain has test-feedback reading time. These are not passive in the pedagogical sense (reading a specific correction after a wrong prediction is active processing). The section has eliminated all avoidable passivity.

### 4. Concept Coverage Gaps -- 9/10 (unchanged)

Round 3's compound selector discovery ("only query* methods handle compound selectors") adds a useful capability-awareness fact but does not constitute a new subtopic. The coverage map is unchanged:

- Covered thoroughly: CRUD methods, query methods (4 types), live vs static collections, query performance (scoping, caching), layout thrashing, event delegation, DocumentFragment, node reuse
- Covered via teaser: MutationObserver (Puzzle 3 bonus, leads to Section 3)
- Covered partially: cloneNode (Puzzle 2, shallow vs deep), template element (only via cloneNode adjacency)
- Absent (correctly deferred): Shadow DOM, template element deep-dive, custom elements

### 5. Feasibility -- 9/10 (unchanged)

The micro-gate adds a select-all-that-apply widget to Decision 3 in dom-query-perf. This is a small implementation scope increase (checkbox group with 5 options, wrong-answer feedback logic, reveal trigger). It is offset by Round 3's concrete selector reducing implementing-agent design decisions.

The Challenge 3 SuboptimalPattern adds keystroke-level detection logic to the challenge runner. Detection of querySelectorAll inside an input handler requires either AST analysis of the reader's code or a simpler heuristic (does the submitted code contain querySelectorAll inside the handler function). The agentNotes do not specify detection mechanism. An implementing agent will likely use string matching (presence of querySelectorAll in the handler body), which is imperfect but sufficient for the SuboptimalPattern's teaching purpose.

### 6. Section Arc -- 9.5/10 (unchanged)

The dom-querying-to-dom-query-perf bridge gap persists. Stop 2 ends with live vs static collections. Stop 3 opens with query performance in scroll handlers. The conceptual bridge (live collections have performance implications because the browser maintains them across mutations) is not surfaced. This is the same gap flagged in the v5 critique.

Within dom-querying, the three-round progression is now complete and well-arced:
- Round 1: Speed difference (getElementById O(1) vs querySelector tree walk)
- Round 2: Type difference (live HTMLCollection vs static NodeList)
- Round 3: Capability difference (only query* handles compound selectors)

This is a clean taxonomy: how fast, what you get back, what you can express. The arc within the stop is strong.

---

## Per-Stop Assessment

### Stop 1: dom-refresher -- 9/10 (unchanged)

No changes this round. Decomposition guidance from Round 4 remains the strongest implementation spec in the section. The 12 unnamed methods remain a minor feasibility gap.

### Stop 2: dom-querying -- 9/10 (up from 8)

This is the stop that improved the most. Round 2 wrong-answer feedback, Round 3 concrete selector, and the compound-selector discovery collectively close the specification gap that made this the section's weakest stop for two rounds.

The two wrong-answer paths in Round 2 are the highlight. "True but trivial" for the syntax-support answer is a pedagogical technique: it validates the reader's knowledge while redirecting their attention to what matters more. This is sophisticated teaching-through-correction.

Round 3's `.sidebar > .card:not(.hidden)` is specific enough for implementation, complex enough to demonstrate the point (getElementById cannot express this), and realistic enough to feel practical (this is a selector a real developer would write).

**Remaining gap**: Round 1 wrong-answer feedback. See Teaching Effectiveness analysis.

### Stop 3: dom-query-perf -- 9.5/10 (unchanged score, but deeper)

The micro-gate does not change the score (9.5 was already appropriate for this stop's quality) but it eliminates the one inconsistency flagged in v5: passive tooltips in a prediction-first stop. The stop now has FOUR prediction gates (3 scroll steps + 1 micro-gate) plus THREE structured decisions. Every interaction requires commitment.

The micro-gate's wrong-answer feedback is well-differentiated:
- Selecting element.id: teaches about cached properties (mechanism)
- Missing getComputedStyle: teaches about style+layout dual cost (severity hierarchy)

These are not "wrong, try again" -- they teach specific facts through the error.

### Stop 4: dom-assignment-1 -- 9/10 (unchanged score, but more complete)

The Challenge 3 SuboptimalPattern closes the last gap in the challenge chain's suboptimal detection coverage. All four challenges now catch and teach through common mistakes.

The quantification style is consistent across challenges: Challenge 1 counts reflows, Challenge 3 counts traversals. Both give the reader a concrete number that makes the waste tangible. Challenge 2 counts handlers ("5 handlers"). Challenge 4 names the consequence ("destroyed all DOM state"). The SuboptimalPattern feedback varies in style (quantity vs consequence) which prevents monotony.

---

## Top 3 Remaining Weaknesses

### 1. dom-querying Round 1 is the only prediction gate without wrong-answer feedback (LOW)

Every other prediction in the section -- dom-querying Round 2, dom-query-perf steps 1-3, dom-query-perf micro-gate -- now has explicit wrong-answer feedback. Round 1 does not. If a reader predicts querySelector is faster (possible reasoning: "it takes a CSS selector, which is more specific, so it should be faster"), the race animation is the only correction.

This is low severity because: (a) most readers will correctly predict getElementById is faster, (b) the race animation is strong implicit feedback, and (c) Round 1 is the simplest prediction in the section. But the asymmetry is visible.

**Fix**: Add one wrong-answer path: "'querySelector is faster because it uses CSS selectors' -- CSS selector matching requires tree traversal. getElementById is a hash-map lookup -- O(1) regardless of tree size." Effort: 10 minutes.

### 2. Stop 2 to Stop 3 bridge gap persists (LOW)

dom-querying ends with live vs static collections. dom-query-perf opens with query performance in scroll handlers. The conceptual connection (live collections require the browser to maintain references across DOM mutations, which has performance implications when the DOM is frequently modified) is not surfaced anywhere.

A reader finishing dom-querying knows THAT live collections auto-update. A reader starting dom-query-perf learns about query scoping and caching. But the link -- "this is why querySelectorAll's static snapshot is often PREFERRED in hot paths" -- is not explicit.

**Fix**: Add a bridge sentence to dom-query-perf's first scroll step narrative or a discovery entry in dom-querying that connects live collection behavior to performance cost. Effort: 15 minutes.

### 3. The 12 DOM methods in dom-refresher are unnamed (LOW)

The specification says "12 runnable methods (3 per CRUD category)" but does not name them. An implementing agent must choose which 12 methods to include. The choices affect teaching quality -- including insertBefore vs replaceChild vs replaceWith changes what Puzzle 1 can teach about node manipulation.

This was flagged as a remaining nit in v5 and is unchanged. It is low severity because an implementing agent will make reasonable choices, but specifying the methods would eliminate quality variance.

**Fix**: Add a concrete list to agentNotes. Example: "Create: createElement, createDocumentFragment, cloneNode. Read: querySelector, querySelectorAll, getElementById. Update: textContent, setAttribute, classList.add. Delete: remove, removeChild, replaceChild." Effort: 15 minutes.

---

## What Landed Well

### All three fixes address the exact weaknesses identified, with no scope creep

Each fix is precisely targeted:
- Fix 1 adds wrong-answer feedback to the specific prediction gate that lacked it (dom-querying Round 2) and specifies the exact selector that was missing (Round 3). It does not add new rounds or restructure the battle.
- Fix 2 converts passive tooltips to a prediction micro-gate without changing the tooltip content or the Decision 3 drag interaction. It layers prediction on top of existing content.
- Fix 3 adds a SuboptimalPattern to the specific challenge that lacked one (Challenge 3) with quantification that matches the style of existing SuboptimalPatterns. It does not restructure the challenge chain.

This discipline -- fixing what was flagged without adding new scope -- is exactly right at this stage of refinement.

### The quantification in Fix 3 is visceral

"50 node checks x 60 keystrokes/minute = 3,000 wasted traversals per minute" is the kind of concrete feedback that makes a reader FEEL the waste. It echoes the style established in Challenge 1 ("5 elements individually -- each triggers a potential reflow") and extends it with a time dimension (per minute). The reader learns to think about DOM operations in terms of frequency, not just unit cost.

### The dom-querying Round 3 compound selector creates a complete taxonomy

Before this fix, Rounds 1-3 taught: speed difference, type difference, and... an unspecified full comparison. Now they teach: speed difference, type difference, capability difference. The three rounds form a complete answer to "How do query methods differ?" -- in performance, return type, and expressiveness. This is a structural improvement disguised as a small specification change.

### The micro-gate wrong-answer feedback teaches mechanism, not just correction

"These access cached properties -- no layout calculation needed" for element.id is not "wrong, it's free." It explains WHY it is free (cached property). "getComputedStyle forces BOTH style recalculation AND layout" is not "wrong, it's expensive." It explains WHAT makes it expensive (dual cost). The reader gains a mental model, not just a fact table.

---

## Score Movement Summary

| Round | Score | Key Changes |
|-------|-------|-------------|
| 5 (previous) | 9.1 | Decomposition guidance, skip-gate resolution, layout tooltips |
| 6 (current) | 9.4 | Wrong-answer feedback parity, prediction micro-gate, Challenge 3 SuboptimalPattern |

**Diminishing returns**: The score moved +0.3 on three well-targeted fixes. The remaining weaknesses are all LOW severity. Further metadata refinement will yield diminishing returns -- the next +0.3 likely requires structural changes (new stop, format change, or cross-stop bridge content) rather than specification polish.

---

## Honest Path from 9.4 to 9.7

| Action | Dimension Impact | Effort | Priority |
|--------|-----------------|--------|----------|
| Add Round 1 wrong-answer feedback | Teaching +0.05 | 10 min | P3 |
| Add stop 2-to-3 bridge sentence | Arc +0.1 | 15 min | P2 |
| Name the 12 DOM methods | Feasibility +0.1 | 15 min | P3 |
| Add "when to choose live collections" decision framework | Teaching +0.1, Coverage +0.1 | 1 hour | P2 |
| Add dom-refresher skip-to-puzzles path for seniors | Engagement +0.1 | 30 min metadata, 2-4 hours impl | P3 |

P2 fixes together get to ~9.5. Reaching 9.7 requires the P3 fixes plus structural additions that increase implementation scope. The section is at its practical ceiling for metadata refinement.

---

## Verdict

**Previous score**: 9.1 / 10
**Current score**: 9.4 / 10

All three Round-5 fixes are verified, substantive, and well-executed. The dom-querying wrong-answer feedback closes a two-round-old asymmetry. The prediction micro-gate eliminates the section's last passive stretch. The Challenge 3 SuboptimalPattern completes the challenge chain's suboptimal detection coverage with visceral quantification.

The section is now uniformly strong across all four stops. dom-querying, which was the weakest stop for two rounds, has risen to parity with the others. The remaining weaknesses are all LOW severity and addressable with under an hour of combined metadata work. This section is ready to build.
