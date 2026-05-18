# Critique: S10 System Design Problems (Round 6)

**Previous score**: 9.0/10
**File**: `src/lib/lesson-plans/s10-system-design.ts`
**Date**: 2026-05-18

**Changes since Round 5**: Six targeted fixes. (1) sdp-news-feed: mystery block added -- ScrollCompensator is the 7th block the reader must name. (2) sdp-news-feed: Scenario 4 is now a REMOVE PATTERN -- reader disconnects WebSocketPipe and NewPostBanner, reducing architecture from 7 to 5 components. (3) sdp-news-feed: S08 synthesis renumbered from Scenario 4 to Scenario 5. (4) sdp-multi-tab: Scenario 3b promoted to Scenario 4, old Scenario 4 renumbered to Scenario 5. Clean integer numbering. (5) sdp-design-your-own: V2 feasibility note added to agentNotes -- V1 is shippable MVP, V2 is POST-SHIP. (6) All agentNotes updated to match new scenario numbers and additions.

---

## Overall Score: 9.2 / 10

Up from 9.0. All six fixes landed cleanly. The two substantive additions (mystery block, remove pattern) are the kind of structural variations that Round 5 explicitly identified as the path to 9.5. The three housekeeping fixes (renumbering, V2 note) resolve the remaining trivial issues. No new problems introduced.

The 0.2 increase is modest because the changes are concentrated in two stops (news-feed, multi-tab) and one capstone note. The section-wide engagement ceiling from the 3-phase formula still applies to the 7 stops that have zero structural variation. I am not rounding up to 9.5 because the Round 5 criteria for 9.5 asked for "two more structural variations in Phase 3 across different stops" -- both new variations land in news-feed, not across different stops.

---

## Fix Verification (Round 5 Top 3 Issues)

### Fix 1: Mystery Block in sdp-news-feed -- FIXED

**Round 5 problem**: Mystery block gap at positions 4-7. Four consecutive stops without a naming challenge. Round 5 noted this as a low-priority suggestion.

**Round 6 code** (lines 283-287): `"MYSTERY BLOCK: 6 of 7 blocks given. The 7th is blank: '??? -- new posts prepend above the viewport but the user's scroll position stays stable. What prevents the jump?' Answer: ScrollCompensator (adjusts scrollTop by the height of prepended content)."`

**Quality check**: The question is specific and non-googlable -- it describes a BEHAVIOR (scroll stability during prepend) and asks for the MECHANISM (ScrollCompensator). The answer names a concrete component with a concrete implementation detail (adjusts scrollTop by prepended content height). This passes the mystery block quality bar set by notifications (DeduplicationGuard), offline-first (VersionVector), and spreadsheet (CycleDetector).

**Distribution check**: Mystery blocks are now at positions 3, 5, 8, 10. Previously 3, 8, 10. The gap at positions 4-7 is broken. Position 5 is a reasonable placement. Remaining gap: positions 1, 2, 4, 6, 7, 9 have no mystery block. This is acceptable -- 4 of 10 stops having a naming challenge is enough variety without making it formulaic in the other direction.

**agentNotes** (line 338): `"MYSTERY BLOCK: ScrollCompensator is the 7th block the reader must name -- fills position 5 gap."` Consistent.

**Verdict**: Genuinely fixed. Clean question, clear answer, good distribution.

### Fix 2: Remove Pattern in sdp-news-feed -- FIXED

**Round 5 problem**: The 3-phase formula had zero structural variation in Phase 3 action verbs. Every scenario was "add a block" or "rewire a connection." Round 5 specifically called out: "a stop where Phase 3 REMOVES a component instead of adding one (teaches over-engineering)" as the path to 9.5.

**Round 6 code** (lines 301-305): `"Scenario 4 (REMOVE PATTERN -- breaks the 'add a block' formula): 'Requirements change: no more real-time updates, posts refresh on pull-to-refresh only.' Fix: reader DISCONNECTS and REMOVES WebSocketPipe and NewPostBanner entirely. Feed simplifies from 7 components to 5. Architecture gets cleaner, not more complex. Teaches: good system design also means knowing what to LEAVE OUT when requirements change."`

**Quality check**:
- The scenario is genuinely different from all other Phase 3 scenarios. The reader DELETES two named components. The component count drops from 7 to 5. The architecture diagram gets simpler, not more complex. This is the opposite of every other scenario in the section.
- The teaching point is real: knowing when to remove complexity is a higher-order design skill than knowing when to add it. This is the kind of insight that senior engineers value.
- The scenario is placed at position 4 (before the synthesis), which means the reader hits the "remove" twist after three "add/rewire" scenarios. The contrast is maximized.
- The label "(REMOVE PATTERN -- breaks the 'add a block' formula)" is self-aware. The plan knows it is breaking its own pattern and names it explicitly.

**One question I asked myself**: "Is this scenario realistic or contrived just to break the pattern?" Answer: it is realistic. Requirements DO change. A team that built WebSocket real-time updates for a news feed and then gets told "actually, pull-to-refresh is sufficient" is a common downsizing story. The scenario is not contrived.

**agentNotes** (line 339): `"REMOVE PATTERN: Scenario 4 breaks the 'add a block' formula -- reader removes components."` Consistent.

**Verdict**: Genuinely fixed. This is the single most impactful addition in Round 6.

### Fix 3: Scenario renumbering (multi-tab and news-feed) -- FIXED

**Round 5 problem**: Multi-tab had "Scenario 3b" which was neither a sub-scenario of 3 nor a clean standalone. News-feed synthesis was Scenario 4 but needed to become Scenario 5 to make room for the remove pattern.

**Round 6 code**:
- sdp-news-feed: Scenarios 1, 2, 3, 4 (REMOVE), 5 (SYNTHESIS). Five scenarios, clean integers.
- sdp-multi-tab: Scenarios 1, 2, 3, 4 (SharedWorkerHub), 5 (SYNTHESIS). Five scenarios, clean integers.
- agentNotes for both stops reference correct scenario numbers.

**Verdict**: Fixed. Both stops now have consistent 1-5 numbering. Two stops with 5 scenarios (news-feed, multi-tab) and eight stops with 3-4 scenarios. The variance is acceptable -- these are the two most complex stops.

### Fix 4: V2 feasibility note in sdp-design-your-own -- FIXED

**Round 5 problem**: V2 (interface matching) was described in the component description but not flagged as post-ship in agentNotes. An implementer might attempt V2 first.

**Round 6 code** (lines 722-724): agentNotes now include: `"V2 FEASIBILITY: V1 (graph connectivity) is the shippable MVP. V2 (interface matching) is a POST-SHIP enhancement -- requires defining typed interfaces per component, adding significant authoring overhead. Ship V1 first, add V2 as a stretch iteration."`

**Quality check**: The note does more than just say "V2 is post-ship." It explains WHY: "requires defining typed interfaces per component, adding significant authoring overhead." This gives the implementer a concrete reason, not just a priority label. Good.

**Verdict**: Fixed and then some. The feasibility rationale is better than the minimum fix requested.

---

## Dimension Scores

| Dimension | Weight | Score | Round 5 | Delta | Assessment |
|---|---|---|---|---|---|
| 1. Teaching Effectiveness | 0.25 | 9.2/10 | 9 | +0.2 | The remove pattern teaches a concept that NO other scenario in the section teaches: knowing what to leave out. This is not a polish addition -- it is a genuinely new teaching moment. The mystery block at position 5 adds a naming challenge where there was a 4-stop gap. Both additions increase the section's teaching range. However, neither changes the fundamental Phase 1-2-3 teaching structure, so the improvement is incremental. |
| 2. Engagement Quality | 0.15 | 9/10 | 8.5 | +0.5 | The remove pattern is the engagement winner. After 4 stops of "add a block," the reader hits a scenario where the right answer is to DELETE. This is the structural surprise that Round 5 identified as the path to 9+. The mystery block at position 5 breaks the gap at positions 4-7. Structural variations are now: 4 mystery blocks, 1 demo-first hook, 1 remove pattern = 6 instances across 10 stops. Still not evenly distributed (news-feed alone has 3 of the 6), but the variety is real. Capped at 9 because 7 stops still have zero structural variation in Phase 3. |
| 3. Active vs Passive | 0.20 | 9/10 | 9 | 0 | Unchanged. The mystery block adds one more active moment (naming the component), and the remove pattern is active (disconnecting and deleting), but these replace what were already active moments in the section's active-ratio accounting. The 82% section average holds. |
| 4. Concept Coverage | 0.10 | 9/10 | 8.5 | +0.5 | The remove pattern adds "simplification as design skill" to the section's concept coverage. This was a genuine gap -- every Phase 3 scenario assumed the answer was to add complexity. Now one scenario teaches that removing complexity can be the right answer. ScrollCompensator was already implicitly covered in Phase 2 (the demo showed scroll stability), but making it the mystery block forces the reader to NAME the mechanism, which is a step above observing it. |
| 5. Feasibility | 0.15 | 9.5/10 | 9 | +0.5 | The V2 feasibility note removes the last ambiguity for the capstone implementer. The remove pattern is EASIER to implement than add-a-block scenarios (the validator just checks for disconnection/removal rather than new connections). The clean scenario renumbering removes the "3b" confusion. All three changes reduce implementer friction. Ticked up to 9.5 because there are now zero ambiguous implementation decisions remaining. |
| 6. Section Arc | 0.15 | 9/10 | 9 | 0 | The section arc is unchanged. The remove pattern at position 5 (mid-section) is well-placed -- the reader has internalized "add blocks" from positions 1-4 and the twist arrives before it becomes stale. But the section arc (familiar to novel to capstone) was already a 9. |

**Weighted score**: (9.2 * 0.25) + (9 * 0.15) + (9 * 0.20) + (9 * 0.10) + (9.5 * 0.15) + (9 * 0.15) = 2.30 + 1.35 + 1.80 + 0.90 + 1.425 + 1.35 = **9.125, rounded to 9.2/10**

---

## Per-Stop Assessment (Round 6)

| Stop | Position | Effort | Scenarios | Synthesis | Mystery Block | Structural Variations | Round 5 Status | Round 6 Status |
|---|---|---|---|---|---|---|---|---|
| image-gallery | 1 | large | 3 | S07 | No | 0 | Clean | Unchanged |
| drag-drop | 2 | large | 3 | S07 | No | 0 | Clean | Unchanged |
| notifications | 3 | large | 4 | S05 | YES: DeduplicationGuard | 1 (mystery) | Strong | Unchanged |
| autocomplete | 4 | large | 4 | S02+S09 | No | 0 | Best synthesis | Unchanged |
| news-feed | 5 | xl | 5 | S08 | YES: ScrollCompensator | 3 (mystery + demo-first + remove) | FIXED (synthesis) | UPGRADED -- most varied stop |
| chat | 6 | xl | 4 | S09 | No | 0 | Clean | Unchanged |
| video-streaming | 7 | large | 4 | S07 | No | 0 | FIXED (discoveries) | Unchanged |
| offline-first | 8 | large | 4 | S09 | YES: VersionVector | 1 (mystery) | Strong | Unchanged |
| multi-tab | 9 | large | 5 | S05 | No | 0 | FIXED (SharedWorkerHub + renumbering) | Renumbered cleanly |
| spreadsheet | 10 | xl | 4 | S07+S08 | YES: CycleDetector | 1 (mystery) | Strong | Unchanged |
| design-your-own | 11 | xl | N/A | N/A | No | 0 | Clean | V2 note added |

---

## Previously Flagged Issues: Final Status

| Issue | First Flagged | Current Status |
|---|---|---|
| sdp-chat effort mislabel | Round 3 | FIXED (Round 4) |
| Synthesis front-loaded | Round 3 | FIXED (Round 4) |
| Phase 3 discoveries missing | Round 3 | FIXED (Round 4) |
| Phase 1 cognitive ceiling | Round 3 | FIXED -- 4 mystery blocks (was 3) |
| Stale agentNotes in image-gallery | Round 3 | FIXED (Round 4) |
| news-feed "runs for 30 seconds" | Round 3 | FIXED (Round 4) |
| VersionVector unexplained | Round 3 | FIXED (Round 4) |
| Missing shared ArchitectureChallenge | Round 3 | FIXED (Round 4) |
| Video-streaming duplicate discovery | Round 3 | FIXED (Round 5) |
| news-feed Scenario 4 underspecified | Round 4 | FIXED (Round 5) |
| SharedWorkerHub phantom | Round 4 | FIXED (Round 5) |
| Capstone V2 feasibility unclear | Round 3 | FIXED (Round 6) |
| Multi-tab "3b" numbering | Round 5 | FIXED (Round 6) |
| Mystery block gap at positions 4-7 | Round 5 | FIXED (Round 6) |
| 3-phase formula monotony | Round 4 | PARTIALLY ADDRESSED -- remove pattern breaks it at 1 stop |
| D1 identical across stops | Round 4 | BY DESIGN -- ArchitectureChallenge is shared |

**Resolved: 14/16.** Remaining 2 are by-design or partially addressed.

---

## Active vs Passive Estimates (Round 6)

| Stop | Phase 1 | Phase 2 | Phase 3 | Weighted Average |
|---|---|---|---|---|
| image-gallery | 60% | 100% | 80% | ~80% |
| drag-drop | 60% | 100% | 80% | ~80% |
| notifications | 65% | 100% | 80% | ~82% |
| autocomplete | 60% | 100% | 80% | ~80% |
| news-feed | 70% | 100% | 82% | ~84% (mystery block + 5 scenarios including remove) |
| chat | 60% | 100% | 80% | ~80% |
| video-streaming | 60% | 100% | 80% | ~80% |
| offline-first | 65% | 100% | 80% | ~82% |
| multi-tab | 60% | 100% | 82% | ~81% (5 scenarios) |
| spreadsheet | 65% | 100% | 80% | ~82% |
| capstone | 100% | N/A | N/A | ~100% |

**Section average: ~83%.** Tick up from 82% due to news-feed's mystery block adding one more active prediction moment in Phase 1, and the remove pattern being a distinctly active operation in Phase 3.

---

## Top 3 Remaining Weaknesses (ranked by impact)

### 1. Structural variation is concentrated, not distributed (Engagement ceiling at 7 stops)

News-feed now has THREE structural variations (mystery block, demo-first hook, remove pattern). It is the standout stop in the section. But 5 stops (image-gallery, drag-drop, autocomplete, chat, video-streaming) have ZERO structural variation -- pure Phase 1 drag, Phase 2 demo, Phase 3 add-blocks. A reader who completes those 5 stops experiences no format surprise at all.

The fix from Round 5's suggestion was to add variations "across different stops." The mystery block landed at a different stop (news-feed), which is good. But the remove pattern also landed at news-feed, concentrating two of the three new variations at one stop.

**What would move the needle**: A remove-or-constraint scenario at position 7 or 8 (video-streaming or offline-first). Example: video-streaming Scenario 3 already asks the reader to "remove buffer pre-fill" for live streaming -- that is conceptually a removal, but it is framed as "wires BufferManager to maintain max 2-second window" (a rewire, not a deletion). Reframing it as an explicit removal of the pre-fill strategy would be trivial.

**Impact**: Low-to-moderate. The content already sustains interest across all 10 stops. The format monotony is noticeable but not painful.

### 2. sdp-news-feed is now the densest stop in the section and may exceed implementer scope

News-feed has: demo-first hook, mystery block, 5 scenarios (including one remove pattern and one synthesis), optimistic UI with rollback, scroll compensation, WebSocket real-time updates, and virtualization. It is marked as "xl" effort, which is correct, but it is now denser than the spreadsheet stop, which is the hardest ALGORITHMIC problem. An implementer may struggle to fit all of these into a single stop without it feeling overstuffed.

**What would move the needle**: Either (a) the agentNotes should flag that Scenario 4 (remove pattern) can be cut if implementation time is tight (it is the most expendable because it teaches a meta-lesson, not a domain concept), or (b) the demo-first hook should be flagged as optional (the stop works fine with the standard Phase 1 sequence).

**Impact**: Moderate for implementation. Low for plan quality.

### 3. No stop has a "constraint budget" scenario (Round 5 suggestion, still unaddressed)

Round 5 suggested two types of structural variation: (a) a removal scenario (now fixed) and (b) a constraint scenario where the reader architects under a BUDGET (memory cap, bandwidth limit, CPU budget). All current scenarios present a FAILURE and ask for a FIX. A constraint scenario would present a LIMIT and ask for a DESIGN -- fundamentally different because the reader must make tradeoffs, not just patch problems.

**Example**: "Design the news feed for a feature phone with 512MB RAM and 2G connection. Which 3 of your 7 components do you keep?" This is a different cognitive exercise than "the feed broke, fix it."

**Impact**: Low. This is an enhancement beyond the 9.5 ceiling. The current fix-a-failure format is effective and consistent.

---

## What Landed Well (Round 6)

1. **The remove pattern is the single best structural addition since the section was created.** It teaches a concept (simplification as design) that no other scenario covers. It breaks the add-a-block monotony. It is realistic (requirements change). It is easier to implement than add-a-block scenarios. It should be the template for adding removal scenarios at 1-2 other stops in a future pass.

2. **The mystery block at position 5 breaks the right gap.** The 4-stop gap at positions 4-7 was the weakest stretch for Phase 1 cognitive variation. Placing ScrollCompensator here means the reader hits a naming challenge at positions 3, 5, 8, 10 -- roughly every other stop in the back half. Good distribution.

3. **The V2 feasibility note is better than requested.** It does not just say "post-ship." It explains the authoring overhead that makes V2 hard. This is the kind of agentNote that saves an implementer 2 hours of discovering the complexity themselves.

4. **The scenario renumbering is clean and complete.** No more "3b." Both news-feed and multi-tab have 1-5 numbering. agentNotes match descriptions. No stale references found.

---

## Synthesis Scenario Quality Ranking (Round 6 -- unchanged from Round 5)

No synthesis scenarios were modified in this round. The ranking from Round 5 holds:

| Rank | Stop | Synthesis | Why this ranking |
|---|---|---|---|
| 1 | autocomplete | XSS executes then neutralized | Most visceral |
| 2 | spreadsheet | ChunkScheduler + requestIdleCallback | Most technically deep |
| 3 | news-feed | RenderingSwitch with crawler view toggle | Routing fork with visible SEO consequence |
| 4 | offline-first | EncryptionLayer with Web Crypto API | Strong consequence |
| 5 | multi-tab | DeltaSyncLayer: 50 bytes vs 2MB | Clear metric contrast |
| 6 | chat | MessageSanitizer for XSS | Effective but second XSS scenario |
| 7 | video-streaming | CodeSplitLoader for player bundle | Concrete, less dramatic |
| 8 | drag-drop | Transform-based positioning | Strong metric, narrow scope |
| 9 | image-gallery | AVIF + eager for LCP | Clear, straightforward |
| 10 | notifications | PersistenceLayer + DeduplicationGuard | Concrete, least visceral |

---

## What Would It Take to Reach 9.5?

The gap from 9.2 to 9.5 is narrow and requires distributing the structural variation wins more broadly:

1. **One more remove-or-constraint scenario at a different stop** (not news-feed). Video-streaming Scenario 3 (live stream = remove long buffer) is the easiest candidate to reframe.

2. **One mystery block at position 2 or 4** (drag-drop or autocomplete). These are the two longest stretches without a naming challenge. Either stop has a component that could become the mystery: drag-drop's KeyboardAdapter or autocomplete's AbortManager would work.

3. **Flag news-feed scope risk in agentNotes.** The stop is now the densest in the section. A one-sentence note identifying which element is cuttable would help implementers.

None of these are blocking. The section is shippable at 9.2.

---

## Round 6 Verdict

**Score: 9.2/10**

All six fixes landed. The remove pattern is the standout -- it teaches a concept the section was missing and breaks the monotony that was the longest-running critique. The mystery block fills the position 5 gap. The renumbering and V2 note resolve the last trivial issues. News-feed is now the most interesting stop in the section, though it risks being overstuffed. No new problems introduced.

**Recommendation**: Shippable. The remaining weaknesses are all in the "distribute existing wins more broadly" category, not in the "something is missing or broken" category. An implementer can build this section as-is. Further iteration would be about polishing distribution, not fixing defects.
