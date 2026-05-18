# Section 5: Application State Design -- Brutal Critique (v4)

> Reviewed files:
> - `src/lib/lesson-plans/s05-app-state.ts` -- lesson metadata (4 stops)
> - `src/lib/lesson-plans/briefs/s05-app-state.md` -- implementation briefs
> - `src/lib/lesson-plans/types.ts` -- format guide and shared primitives
>
> This critique supersedes the v3 review (8.9/10). It evaluates the revised
> lesson plan against the four specific recommendations from v3.

---

## Overall Section Score: 9.2 / 10

| # | Dimension | Score | v3 Score | Delta | Justification |
|---|-----------|-------|----------|-------|---------------|
| 1 | Teaching Effectiveness | 9.5 / 10 | 9.5 | 0 | Senior-tricky scenarios improve stop 2's ceiling but don't change the section-wide score -- stop 1 and 4 were already at 9.5 |
| 2 | Engagement Quality | 9.0 / 10 | 8.5 | +0.5 | Senior-tricky scenarios close the engagement valley at stop 2 |
| 3 | Active vs Passive Balance | 9.0 / 10 | 9 | 0 | Unchanged -- the structural fixes don't alter active percentages |
| 4 | Concept Coverage Gaps | 9.0 / 10 | 9 | 0 | Unchanged -- gaps remain defensible |
| 5 | Feasibility | 8.0 / 10 | 7.5 | +0.5 | Two-path rollback now has a specified fallback; deterministic toggle simplifies server failure logic |
| 6 | Section Arc | 9.5 / 10 | 9 | +0.5 | Stop 4's deterministic toggle makes the Phase 2 -> Phase 4 callback reliable, tightening the stop's internal arc |

---

## v3 Recommendations: Status Check

The v3 critique made four specific recommendations projected to push the score from 8.9 to 9.2-9.4. Here is what actually changed in the `.ts` file.

### Recommendation 1: Make stop 4 Phase 4 failures deterministic and toggleable

**v3 said:** Replace "10% random server failure" with a toggle: "Server: Reliable / Flaky." Flaky mode: every 3rd like fails deterministically.

**Status: IMPLEMENTED.** The `.ts` description now reads: "SERVER TOGGLE: 'Server: Reliable / Flaky' (replaces 10% random chance). Reliable mode (default): all likes succeed. Reader sees optimistic UI working smoothly. Flaky mode (reader toggles): every 3rd like fails with visible rejection. Deterministic pattern ensures reader ALWAYS sees rollback -- no hoping for random distribution. Controlled discovery ('I turned on flaky mode') teaches more than random surprise."

The agent notes reinforce: "SERVER TOGGLE replaces 10% random failure: 'Reliable / Flaky' gives reader CONTROL over when to see rollbacks. Flaky mode: every 3rd like fails deterministically."

This is exactly what v3 asked for. Deterministic, toggleable, reader-controlled. **Fully resolved.**

### Recommendation 2: Specify the two-path rollback visual and add a fallback

**v3 said:** Side-by-side layout. Left: normalized rollback (1 op, 200ms). Right: denormalized rollback (3+ ops, 800ms, hunting label). Add a feasibility fallback: textual comparison captures 80% of teaching at 20% build cost.

**Status: IMPLEMENTED.** The `.ts` description now specifies: "KEY CONNECTION: On each rollback, show TWO rollback paths SIDE BY SIDE: LEFT: 'Normalized rollback' -- 1 operation, one cell flashes (~200ms), done. Decrement posts.byId[id].likes -- one source of truth, one update. RIGHT: 'Denormalized rollback' -- 3+ operations, cells flash sequentially (~800ms), 'hunting...' label appears as it finds and decrements in posts feed, comments sidebar, profile view. One might be missed (a 'stale' badge appears on the missed copy). FEASIBILITY FALLBACK: if side-by-side animation is too expensive, a textual comparison after the rollback captures 80% of the teaching."

The visual spec is concrete: left/right layout, timing (200ms vs 800ms), the "hunting..." label, the stale badge. The fallback is explicit. **Fully resolved.**

### Recommendation 3: Fix ghost "second tab preview panel" in stop 2

**v3 said:** Discovery 2 references a "second tab preview panel" that doesn't exist in the component spec. Remove it or specify it.

**Status: IMPLEMENTED.** Discovery 2 now reads: "Write to localStorage, close the drawer, reopen it" with reaction "Data persists -- it survived the drawer close. A 'storage event' badge flashes showing cross-tab sync." The ghost "second tab preview panel" is gone. The agent notes confirm: "Ghost feature 'second tab preview panel' REMOVED from discovery 2 -- replaced with persist-across-close + storage event badge."

The replacement is buildable and teaches the same concept (persistence + cross-tab awareness) without requiring a fake second-tab preview. **Fully resolved.**

### Recommendation 4: Add 2-3 senior-tricky quiz scenarios to stop 2

**v3 said:** Add scenarios that would catch experienced developers: Cache API revalidation, SW storage access, cross-device persistence trick question.

**Status: IMPLEMENTED.** The `.ts` description now includes: "SENIOR-TRICKY SCENARIOS (3 of the 8 designed to catch experienced developers): 'Cache API responses that MUST revalidate on every load' (Cache API with explicit validation), 'Store a preference that a Service Worker reads during offline fetch' (IndexedDB -- SW cannot access localStorage), 'Persist state that survives browser profile migration to a new device' (trick question -- none of the browser APIs do this)."

All three scenarios from v3's suggestion list are adopted verbatim, with specific wrong-answer feedback for each. **Fully resolved.**

---

## What the Fixes Actually Changed

All four v3 recommendations were adopted. The question is whether they actually moved the needle.

### Impact of deterministic toggle (Stop 4 Phase 4)

This is the highest-impact fix. The deterministic toggle solves two problems simultaneously:

1. **Pedagogical reliability.** With 10% random failure, a reader who clicks "like" 5 times has a 59% chance of seeing zero failures. That means 4 in 10 readers would exit the phase without EVER seeing a rollback, making Phase 4's entire teaching arc about rollback a coin flip. With "every 3rd like fails in flaky mode," the reader sees a rollback on their 3rd click, guaranteed. The teaching moment is not left to chance.

2. **Implementation simplicity.** A deterministic counter (`likeCount % 3 === 0 ? reject : resolve`) is simpler to build and test than a random failure generator. No need for seeded RNGs, no flaky test behavior, no "I saw it work once but now it doesn't" support confusion. This actually REDUCES implementation complexity while improving pedagogical reliability.

The toggle also adds a layer of metacognition: the reader makes a conscious choice to "break" the server, which primes them to observe rollback behavior. This is better than surprise failure because the reader is LOOKING for the consequence when it happens.

**Score impact: +0.2 section arc (Phase 4 callback is now reliable), +0.1 feasibility (simpler implementation).**

### Impact of two-path rollback visual spec (Stop 4 Phase 4)

The spec resolves v3's biggest feasibility concern. The side-by-side layout with concrete timings (200ms left, 800ms right) gives an implementer a buildable target. The "hunting..." label and stale badge add personality to the denormalized path -- it feels frantic compared to the calm normalized path.

The feasibility fallback is the real win. By explicitly stating that a textual comparison captures 80% of teaching value, the spec gives the implementer permission to ship the fallback if the full animation exceeds the time budget. This changes the risk profile from "must build expensive animation or lose the teaching moment" to "build the animation if possible, fall back gracefully if not." That is a genuine feasibility improvement.

However, the spec still describes the fallback as a secondary option. An implementer reading the `.ts` will attempt the full animation first. The fallback text is buried in the middle of a long description string. If the intent is "build the fallback first, upgrade to animation if time permits," that should be stated more prominently in agentNotes.

**Score impact: +0.2 feasibility (fallback removes the hard dependency on animation), +0.1 teaching (visual spec ensures the comparison lands if built).**

### Impact of ghost feature removal (Stop 2)

This is a small fix with outsized value. Ghost features in specs are implementation traps: an engineer reads discovery 2, sees "second tab preview panel," searches the component spec for it, finds nothing, and either invents it (wasting time) or asks for clarification (blocking on communication). Removing it and replacing with a buildable interaction ("close drawer, reopen, data persists") eliminates a guaranteed implementation stumble.

The replacement also teaches better: "data persists across sessions" is more useful knowledge than "data appears in a second tab" because session persistence is the more common real-world concern. The "storage event" badge nods to cross-tab sync without requiring a multi-tab simulation.

**Score impact: +0.1 feasibility (removes implementation confusion). No teaching change -- the concept is equivalent.**

### Impact of senior-tricky scenarios (Stop 2)

This is the fix that closes stop 2's engagement gap. The three scenarios are well-chosen:

1. **Cache API revalidation**: This catches developers who think of Cache API as "just for PWAs" and don't know it supports explicit validation patterns. The wrong-answer feedback ("localStorage has no built-in revalidation") teaches something even if the reader gets it right on the second try.

2. **Service Worker storage**: This catches the common misconception that Service Workers can use localStorage. The synchronous-access constraint is the kind of detail that trips up developers who've only read SW tutorials. The wrong-answer feedback ("Service Workers run on a separate thread with no synchronous storage access") is precise and memorable.

3. **Cross-device persistence**: This is the strongest of the three because it's a TRICK QUESTION. The answer is "none of these." Developers who have internalized the browser storage mental model will instinctively reach for one of the five options. The correction ("All browser storage APIs are device-local. Cross-device = server.") teaches a boundary of the mental model, not just a fact within it.

The trick question is pedagogically valuable because it BREAKS the quiz's own framing. For 7 scenarios, the answer is always one of the 5 drawers. For scenario 8 (or wherever this falls), the answer is "none." This forces the reader to question whether the quiz itself is always solvable with the given options -- which is exactly how real engineering works. Not every problem has a solution in your current toolbox.

**Score impact: +0.3 engagement (seniors now have genuine surprises in stop 2), +0.1 teaching (trick question teaches the boundary of the mental model).**

---

## Dimension Scores: Detailed

### Dimension 1: Teaching Effectiveness -- 9.5/10

**Unchanged from v3.** The senior-tricky scenarios improve stop 2's CEILING but the section-wide score was already anchored by stops 1 and 4.

Stop 1 remains the strongest teaching stop (4 prediction gates, each testing a different hypothesis). Stop 4's unified arc (encounter bug -> normalize -> selectors -> rollback) is now more reliable because the deterministic toggle guarantees the reader sees the rollback. Stop 3's break-first allocator remains visceral. Stop 2's quiz-first flow is improved by the senior-tricky scenarios but the format (drag-to-bucket) is still selection, not construction.

**Where the 10 is blocked:** Same as v3. Stop 2 is selection-based interaction. The reader drags a card to a bucket -- they are CHOOSING from given options, not building or manipulating a system. A constructive version (e.g., "design a storage strategy for this app: wire 5 data types to 5 storage APIs and watch the app work/break") would cross from selection to construction. But this is a format-level constraint of the anatomy format, not a specification problem.

### Dimension 2: Engagement Quality -- 9.0/10

**Up from 8.5.** The senior-tricky scenarios close the engagement valley that v3 identified.

Before these scenarios, a senior developer could ace all 8 quiz items in 90 seconds with zero surprises. Now, 3 of the 8 are designed to trip up experienced developers:
- Cache API revalidation is non-obvious even for developers who use Cache API regularly.
- SW storage access requires knowing a threading constraint that most developers learn the hard way.
- Cross-device persistence breaks the quiz's own frame -- "none of these" is the answer, which challenges the assumption that the quiz is always solvable.

The trick question is particularly effective for seniors because experienced developers are MORE susceptible to the "one of these five must be right" framing. They have enough knowledge to confidently pick a wrong answer (maybe IndexedDB, maybe localStorage with a sync layer). The correction teaches not just a fact but a category boundary.

**Where the 10 is blocked:** Stop 3 still has a thin "after the allocator" experience. Once the reader finds the green-zone allocation (~30% main thread, ~20% worker, ~50% IndexedDB), there is no further challenge. There is no "now handle a spike" scenario, no "what happens when 50MB of data arrives at once" disruption. The allocator is a single-solution sandbox. Adding a second challenge ("now handle a real-time data stream -- 1MB/second arriving") would test whether the reader's mental model holds under pressure. But this is a minor gap -- the allocator is already good for teaching the core concept.

### Dimension 3: Active vs Passive Balance -- 9.0/10

**Unchanged from v3.**

| Stop | Est. Active % | v3 Estimate | Change | What's Active |
|------|---------------|-------------|--------|---------------|
| state-search | 90% | 90% | 0% | 4 prediction gates + 4 races + mode switching + dataset slider |
| state-storage | 70% | 70% | 0% | Quiz-first: 8 drag scenarios + drawer exploration driven by wrong answers |
| state-memory | 75% | 75% | 0% | Break-it-first + allocator sliders + LRU toggle |
| state-shape | 85% | 85% | 0% | Rename bug + normalization drag + selector toggle + like button + server toggle |
| **Section avg** | **~80%** | **~80%** | **0%** | |

The v4 changes (deterministic toggle, two-path spec, senior scenarios) refine WHAT happens during interactions but don't change HOW MUCH time the reader spends interacting vs reading. The active/passive ratio was already strong. No change expected, none observed.

### Dimension 4: Concept Coverage Gaps -- 9.0/10

**Unchanged from v3.** The three remaining gaps (state machines/reducer patterns, server state vs client state, cross-tab synchronization) are the same. None of the v4 fixes address these because they were correctly assessed as defensible scope boundaries in v3.

One minor note: the trick question ("persist state that survives browser profile migration to a new device -- none of these") actually REDUCES a gap by teaching the boundary between client-side and server-side state management. The reader learns that browser storage is fundamentally device-local, which implicitly teaches the server-state vs client-state distinction. This doesn't merit a score increase because it's a single quiz scenario, not a dedicated teaching section, but it's worth acknowledging.

### Dimension 5: Feasibility -- 8.0/10

**Up from 7.5.** Two changes improve feasibility:

1. **Deterministic toggle simplifies Phase 4 server logic.** A `likeCount % 3 === 0` check is simpler than a random failure generator with the additional UI work to ensure the reader happens to see a failure. No RNG seeding, no test flakiness, no "run it 10 times and hope." Estimated savings: 1-2 days.

2. **Feasibility fallback for two-path rollback.** The explicit fallback ("textual comparison captures 80% of teaching") changes the risk profile. The implementer can ship the textual version in 1 day and upgrade to the full animation if time permits. Without the fallback, the two-path animation was a hard requirement that could block the entire stop. With it, the stop ships either way.

| Stop | v3 Real Effort | v4 Real Effort | Change | Reason |
|------|---------------|----------------|--------|--------|
| state-search | large+ | large+ | Unchanged | 4 prediction gates are specified, no new complexity |
| state-storage | medium+ | medium+ | Unchanged | Quiz scenarios specified inline, no new structural work |
| state-memory | medium-large | medium-large | Unchanged | No changes |
| state-shape | XL | large-XL | Reduced | Toggle simpler than RNG; fallback removes hard animation dependency |

**Remaining feasibility risks:**

1. **Brief-to-.ts mismatch persists for stop 2.** The brief (`s05-app-state.md`) still describes the old "browse then quiz" flow with 4 tabs per drawer. The `.ts` says "STREAMLINED: each drawer has only 2 views (not 4)" and "QUIZ-FIRST DESIGN." The brief's state machine starts at CABINET with drawer exploration; the `.ts` starts at QUIZ_ACTIVE. An implementer reading both will be confused. The brief also has 8 quiz scenarios that may not match the `.ts`'s 8 (the `.ts` now includes 3 senior-tricky replacements, but the brief still has the original 8). **This is the section's most dangerous specification debt.** An implementer working from the brief will build 4 tabs per drawer and a "browse then quiz" flow, then discover the `.ts` says 2 tabs and "quiz first." That is rework, not polish.

2. **Stop 4 discovery 4 still says "occasionally one rolls back."** The description has the deterministic toggle, but discovery 4 reads: "Most likes stick instantly. Occasionally one rolls back (count decrements with a red flash) -- server returned an error." With the deterministic toggle, it's not "occasionally" -- it's every 3rd like in flaky mode. This is a minor inconsistency: the discovery describes the FEEL of the interaction (which is correct -- it does FEEL occasional from the reader's perspective) but doesn't match the deterministic spec. Not a blocker, but sloppy.

3. **The 8 quiz scenarios are split across .ts and brief.** The `.ts` describes 3 senior-tricky scenarios inline. The brief has 8 scenarios. Are the 3 senior-tricky scenarios REPLACEMENTS for 3 of the brief's 8, or ADDITIONS making 11 total? The `.ts` says "8 scenario cards" and the brief has exactly 8. But the brief's 8 don't include the senior-tricky ones. An implementer must decide: use the brief's 8 and add the senior-tricky 3 (making 11, which contradicts "8 scenario cards"), or replace 3 of the brief's 8 with the senior-tricky ones (but which 3?). The `.ts` agent notes don't resolve this: "3 of 8 scenarios are SENIOR-TRICKY" implies they are part of the 8, but doesn't say which of the brief's original 8 they replace.

**Where the 9 is blocked:** The brief/ts mismatch. If the brief were rewritten to match the `.ts` (2 tabs, quiz-first flow, senior-tricky scenarios integrated into the 8), feasibility would jump to 8.5-9.0. As it stands, the brief is a liability that will cost 2-3 days of rework when the implementer discovers the contradiction.

### Dimension 6: Section Arc -- 9.5/10

**Up from 9.0.** The deterministic toggle makes stop 4's internal arc reliable:

```
Phase 1: Encounter the bug (denormalized state creates update anomalies)
Phase 2: Fix the bug (normalize entities, arrows replace copies)
Phase 3: Read from normalized state (memoized selectors prevent redundant computation)
Phase 4: Write to normalized state (deterministic toggle -> guaranteed rollback -> two-path comparison)
```

Phase 4's callback to Phase 2 (normalization makes rollback trivial) was already designed in v3, but the 10% random failure meant the reader might never SEE the rollback. With the deterministic toggle, the arc CLOSES every time. The Phase 2 -> Phase 4 connection is no longer probabilistic.

The section-level arc remains:

```
Stop 1 (battle):     WHAT data structure to use
Stop 2 (anatomy):    WHERE to persist it
Stop 3 (explorable): HOW to manage memory
Stop 4 (explorable): SHAPE of state design
```

Each stop motivates the next. Stop 4's normalization theme retroactively enriches stops 1-3: the reader realizes that the "Map for exact lookup" choice from stop 1 and the "IndexedDB for large data" choice from stop 2 are both inputs to the normalized state SHAPE in stop 4.

**Where the 10 is blocked:** The cross-stop connections are implicit, not interactive. The reader must INFER that stop 1's Map recommendation becomes stop 4's normalized lookup structure. If stop 4 explicitly referenced stop 1 ("Remember how Map gave you O(1) lookup? That's why byId uses an object -- it IS a map"), the arc would close explicitly. But this is a prose concern, not a structural one.

---

## Per-Stop Detailed Critique

### Stop 1: state-search (Data Structure Battle)

**Verdict: Section's strongest stop. Unchanged from v3.**

No v4 changes affect this stop. The four prediction gates remain the section's densest teaching mechanism. The insert/delete mode discoveries (element-shifting animation for Array) remain well-specified. The Trie Web Worker construction remains a good technical detail.

**Remaining issue (carried from v3, still unresolved):** The Delete mode prediction ("Which has the cheapest deletion?") likely produces the same answer as Insert for most readers (Map wins both). If the fourth prediction doesn't teach something new, it's a redundant interaction. Consider making Delete position-dependent: "For Delete at index 0 vs Delete at index N-1 in an Array, how does position affect cost?" This would teach that array mutation cost depends on position.

### Stop 2: state-storage (Browser Storage Anatomy)

**Verdict: Significantly improved. No longer the section's weakest stop (now tied with stop 3).**

The senior-tricky scenarios transform this stop's ceiling. Before v4, a senior developer who knew the five storage APIs had nothing to learn. Now, three scenarios are designed to catch them:

1. **Cache API revalidation** challenges the "Cache API = PWA offline" mental model. Most developers don't think of Cache API as a revalidation tool.
2. **SW storage access** teaches a threading constraint that isn't intuitive. "Service Workers can't use localStorage" is a fact most developers learn by hitting the error in production.
3. **Cross-device persistence** is the strongest because it's a trick question. The answer "none of these" teaches the BOUNDARY of browser storage -- everything here is device-local.

The wrong-answer feedback for each is specific and instructive. This is not generic "wrong, try again" -- it explains the mechanism. Good.

**Remaining issues:**

1. **Brief/ts mismatch is now CRITICAL.** The brief has 4 tabs per drawer; the `.ts` has 2. The brief has "browse then quiz"; the `.ts` has "quiz first." The brief has 8 original scenarios; the `.ts` has 3 senior-tricky replacements that don't map to the brief's 8. This is no longer a "should fix" -- it's a "will cause rework." Every day the brief stays unsynced increases the risk that an implementer builds the wrong thing.

2. **The 5 non-senior scenarios are still brief-only, not in the .ts.** The `.ts` says "8 scenario cards" and specifies 3 senior-tricky ones inline. The other 5 exist only in the brief (which is built around the old flow). An implementer working from the `.ts` alone has 3 scenarios and must invent 5 more. An implementer working from the brief has 8 scenarios that don't include the senior-tricky 3. Neither path produces the intended 8.

3. **Drawer streamlining (2 views) contradicts the brief.** The `.ts` says "STREAMLINED: each drawer has only 2 views (not 4): 'Try It' panel and 'Traits' card." The brief specifies 4 tabs: "View Data", "Write Test", "Size Limits", "Traits." The implementer must choose. The `.ts` is ground truth, but the brief has the visual choreography for the 4-tab version, not the 2-view version.

### Stop 3: state-memory (Memory Tier Allocator)

**Verdict: Strong. Unchanged from v3.**

No v4 changes affect this stop. The format is explorable (corrected from scrollytelling in an earlier revision). The break-first structure remains sound. Operation counts are honest.

**Remaining issues (carried from v3, unchanged):**

1. **"Simulated UI freeze" is still underspecified.** The `.ts` says "A simulated UI freezes" but doesn't say HOW. A fake app preview with dropped-frame animation would make the connection visceral. Without it, "memory pressure" is an abstract gauge, not a visible user-facing consequence.

2. **Constrained slider behavior is still unspecified.** When one slider moves, which others adjust? The brief mentions a lock toggle but the `.ts` doesn't specify constraint resolution.

3. **Below-the-fold prose risk.** The `.ts` says "BELOW the interactive: 3 short prose sections." If the interactive is satisfying, the reader may never scroll to them. In-context annotations would be better.

### Stop 4: state-shape (State Shape Explorable)

**Verdict: The section's most improved stop. The deterministic toggle and two-path spec make Phase 4 reliable and buildable.**

The unified arc across four phases is now tight AND reliable:

- Phase 1: Encounter the bug (denormalized stale data)
- Phase 2: Fix the bug (normalization)
- Phase 3: Read from normalized state (memoized selectors)
- Phase 4: Write to normalized state (deterministic toggle -> guaranteed rollback -> side-by-side comparison)

The deterministic toggle is the key improvement. With 10% random failure, an implementer would also need defensive code to ENSURE the reader sees at least one failure (e.g., forcing the 5th like to fail if none have failed yet). The deterministic toggle eliminates this entire category of defensive logic. It's pedagogically better AND simpler to build.

The two-path visual spec (left: 200ms normalized, right: 800ms denormalized with "hunting..." label) gives the implementer a concrete target. The stale badge on the missed copy is a nice detail -- it makes the denormalized path feel not just slower but DANGEROUS (you might miss one, and that missed copy becomes a bug).

The feasibility fallback is well-positioned: it captures the INSIGHT (normalized is 1 op, denormalized is 3+ and you might miss one) without the animation cost. An implementer can ship the fallback in day 1 and add the animation later.

**Remaining issues:**

1. **Discovery 4 says "occasionally" but the toggle is deterministic.** Discovery 4: "Most likes stick instantly. Occasionally one rolls back." With the deterministic toggle in flaky mode, every 3rd like fails. "Occasionally" is misleading -- it should read "Every 3rd like fails in flaky mode -- the rollback is guaranteed, so you can study the recovery mechanism." The discovery should match the interaction spec.

2. **The mock social app fidelity is still unspecified.** How many posts? How many comments? How many users? The brief doesn't have a state-shape stop at all (it was added after the brief was written). The `.ts` says "a mock social app" but the minimum viable mock (number of entities, visual layout) is left to the implementer.

3. **Phase 3 (memoized selectors) is the thinnest phase.** A toggle between "compute on render" and "memoized selector" with a render counter is functional but not visceral. The reader toggles, sees a number change, and moves on. Compare this to Phase 1 (visible bug, infuriating stale data) or Phase 4 (deterministic rollback, side-by-side comparison). Phase 3 is a toggle + counter -- the weakest interaction in a strong stop.

---

## Top 3 Remaining Weaknesses

### 1. Brief/ts mismatch for stop 2 is now CRITICAL specification debt

The `.ts` and brief disagree on three fundamental design decisions:
- Number of drawer views: `.ts` says 2; brief says 4
- Teaching flow: `.ts` says quiz-first; brief says browse-then-quiz
- Quiz scenarios: `.ts` has 3 senior-tricky inline; brief has 8 originals without them

This is no longer a "nice to fix" -- it is the single most likely cause of implementation rework in the section. An engineer will read both, get confused, ask for clarification, and lose days. If the brief is not rewritten before implementation begins, the first week of stop 2's build will be wasted.

**Severity: HIGH.** Easy to fix (hours of spec writing), expensive to ignore (days of rework).

### 2. Stop 3 "simulated UI freeze" is still a hand-wave

The `.ts` says the UI freezes but doesn't specify what "the UI" is. Is it a mock app? A mock animation? A mock form that stops responding to clicks? The GC pause triangles and Long Task labels are INDICATORS of a freeze, not the freeze itself. The reader needs to see a tangible user-facing consequence (a janky animation, a button that doesn't respond, a scroll that stutters) to connect "memory pressure" with "bad UX."

This has been flagged in v2, v3, and now v4. It keeps surviving because it's not a WRONG spec -- it's an INCOMPLETE spec. The fix is a single paragraph: "A mock 'Todo App' preview panel (200x300px) runs a continuous 60fps animation (a ball bouncing). When memory pressure exceeds 80%, the animation drops to 15fps (visible stutter). When below 40%, it runs at 60fps (smooth). The reader sees the DIRECT consequence of their allocation choices on user experience."

**Severity: MEDIUM.** Not a correctness problem -- the stop teaches without it. But the stop teaches better with it, and the fix is cheap (one paragraph of spec, one small component to build).

### 3. Stop 4 discovery 4 is stale relative to the deterministic toggle spec

Discovery 4 says "Most likes stick instantly. Occasionally one rolls back." But the deterministic toggle means rollbacks are predictable, not occasional. The discovery should describe the TOGGLED experience: the reader switches to flaky mode, sees every 3rd like fail, studies the rollback mechanism, then compares normalized vs denormalized paths. The current discovery describes the OLD random-failure behavior.

**Severity: LOW.** The description text doesn't affect build, but it could confuse an implementer reading the discoveries as a test plan. The fix is a one-line edit.

---

## 3 Specific, Actionable Recommendations

### 1. Rewrite the stop 2 brief to match the .ts (HIGH PRIORITY)

This is the same recommendation from v3. It has not been done. The gap is now larger because the `.ts` has evolved further (2 views, quiz-first, senior-tricky scenarios) while the brief remains frozen at the v1 design (4 tabs, browse-then-quiz, original 8 scenarios).

The rewrite must cover:
- State machine: starts at QUIZ_ACTIVE, not CABINET. Drawer opens are triggered by QUIZ_WRONG, not by reader clicks.
- Visual choreography: quiz cards appear first. Drawer expansion is a RESPONSE to wrong answers.
- Drawer views: 2 views ("Try It" and "Traits"), not 4 tabs.
- Quiz scenarios: integrate the 3 senior-tricky scenarios into the 8, specifying which original scenarios they replace.
- Data shapes: update to match the streamlined 2-view design.

Estimated effort: 3-4 hours to rewrite. Cost of not doing it: 2-3 days of implementer confusion and rework.

### 2. Specify the simulated UI freeze in stop 3

Add a concrete "mock app" visual to the `.ts` description:

> "A mock 'Todo App' preview panel (200x300px, top-right of the sticky visual) shows a continuous animation (items entering/leaving a list). When mainThreadLoad > 80%, the animation stutters visibly (frame rate drops from 60fps to 15fps, items jitter). When mainThreadLoad < 40%, the animation is smooth. The reader sees the direct consequence of memory pressure on user experience. The preview is not interactive -- it's a passive indicator that makes the gauges' meaning tangible."

This adds one small component (a mock app with conditional frame rate) and makes the entire stop's teaching arc stronger. The reader goes from "the gauge is red, that's bad" to "the gauge is red AND the app is stuttering, that's what my users see."

Estimated effort: 30 minutes of spec writing, 1-2 days of implementation.

### 3. Fix discovery 4 in stop 4 to match the deterministic toggle

Replace:
> "Spam the like button with optimistic updates enabled" -> "Most likes stick instantly. Occasionally one rolls back"

With:
> "Toggle server to 'Flaky' mode and like 3 posts" -> "First two likes succeed instantly. Third like fails -- the count decrements with a red flash and the two-path comparison shows: 1 operation (normalized) vs 3+ operations (denormalized, one missed)"

This aligns the discovery with the deterministic toggle spec and also previews the two-path comparison, making the discovery more specific and buildable.

Estimated effort: 5 minutes.

---

## Path to 9.5+

| Fix | Projected Impact | Effort |
|-----|-----------------|--------|
| Rewrite stop 2 brief | +0.2 feasibility (eliminates rework risk) | 3-4 hours |
| Specify simulated UI freeze in stop 3 | +0.1 teaching, +0.1 engagement (visceral consequence) | 30 min spec + 1-2 days build |
| Fix discovery 4 in stop 4 | +0.05 feasibility (spec consistency) | 5 minutes |
| **Total projected** | **+0.2 to +0.3** | **~4 hours spec work** |

Current score: 9.2. With these fixes: 9.4-9.5.

The remaining gap to 10.0 is structural: stop 2's anatomy format caps its interactivity (selection, not construction), and stop 3's allocator is a single-solution sandbox (no disruption or second challenge after the reader finds the green zone). These would require format-level changes that are not worth the effort at this quality level.

---

## Verdict

The v4 lesson plan has addressed all four v3 recommendations correctly. The deterministic toggle makes Phase 4 reliable and simpler to build. The two-path rollback spec with feasibility fallback resolves the biggest build risk. The ghost feature is gone. The senior-tricky scenarios close the engagement gap.

The section's remaining weaknesses are specification debt (brief/ts mismatch for stop 2), an underspecified visual (simulated UI freeze in stop 3), and a stale discovery (stop 4 discovery 4). All three are fixable in under 4 hours of spec work.

**Score: 9.2 / 10**

The 0.3-point gain from v3's 8.9 comes from: senior-tricky scenarios (+0.5 engagement -> +0.08 weighted), deterministic toggle (+0.5 section arc + feasibility -> +0.17 weighted), and two-path spec (+0.5 feasibility -> +0.08 weighted).

The 0.3-point gap to 9.5 comes from: brief/ts mismatch (fixable), underspecified UI freeze (fixable), and stop 2's format ceiling (structural, acceptable).
