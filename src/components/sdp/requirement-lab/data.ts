import type { ProbeTriageConfig } from "./types";

// ── Image-gallery probe library ─────────────────────────────────────
//
// 12 candidate probes. 6 high-value, 2 medium, 2 low (answered in brief),
// 2 traps. Learner picks 5. Best score: ~all 5 high. Realistic score:
// 3-4 high + 1-2 misses.

export const IMAGE_GALLERY_TRIAGE: ProbeTriageConfig = {
  briefTitle: "Build an infinite-scroll image gallery.",
  briefBody:
    "Viewers browse a feed of images and tap to see details. That's it. That's the whole brief.",
  briefFacts: [
    "the brief is deliberately thin",
    "what it doesn't say is the lesson",
    "you have 5 stakeholder questions — spend them well",
  ],
  budget: 5,

  library: [
    // ── HIGH (surfaces real architectural pressure) ────────────────
    {
      id: "h-scale-feed",
      text: "What if the gallery has 10,000 images?",
      flavor: "scale",
      quality: "high",
      response:
        "A 10K-item feed can't ship as a single render — pagination becomes structural, not a feature. You also commit here to cursor-based (stable under inserts) versus offset-based (simpler, breaks under inserts).",
      teaching:
        "Scale probes force architectural commitments no stakeholder volunteers.",
      surfaces: [
        {
          surfaceId: "flow-pagination",
          kind: "flow",
          title: "Cursor-based feed pagination",
          detail:
            "Viewer scrolls → near-end trigger → request with cursor + limit → append page.",
        },
        {
          surfaceId: "constraint-no-full-load",
          kind: "constraint",
          title: "Feed never loads the full result set",
          detail: "Memory and bandwidth budgets fall apart past a few hundred items.",
        },
      ],
    },
    {
      id: "h-image-fails",
      text: "What if an image returns a 404?",
      flavor: "failure",
      quality: "high",
      response:
        "A broken image must render *something* — placeholder, not a blank box. To render anything without the image, you need to know things about it without having it: alt text, dominant color, aspect ratio. That requirement is what makes ImageSummary structurally distinct from ImageDetail.",
      teaching:
        "Failure probes force data-shape decisions you'd otherwise punt to runtime.",
      surfaces: [
        {
          surfaceId: "entity-image-summary",
          kind: "entity",
          title: "ImageSummary",
          detail:
            "Lightweight feed payload — id, thumbnailUrl, altText, dominantColor, aspectRatio.",
        },
        {
          surfaceId: "constraint-placeholder",
          kind: "constraint",
          title: "Failed image renders a placeholder, never blank",
          detail: "Use dominantColor + altText as the fallback.",
        },
      ],
    },
    {
      id: "h-upload-while-scroll",
      text: "What if a new image arrives while a viewer is mid-scroll?",
      flavor: "concurrency",
      quality: "high",
      response:
        "Two things must not happen: positions can't silently shift (viewer loses their place), and new items can't silently appear (they're invisible). Cursor pagination handles position. Visibility needs an explicit affordance — 'N new items above' nudge — instead of a silent insert.",
      teaching:
        "Concurrency probes surface invariants obvious in hindsight and catastrophic in production.",
      surfaces: [
        {
          surfaceId: "constraint-stable-order",
          kind: "constraint",
          title: "Feed order is stable within a session",
          detail: "Already-seen positions don't shift when new items arrive.",
        },
        {
          surfaceId: "constraint-new-items-nudge",
          kind: "constraint",
          title: "New items surface via affordance, not silently",
          detail: "Explicit 'N new items above' nudge instead of inserting silently.",
        },
      ],
    },
    {
      id: "h-slow-mobile",
      text: "What if a viewer is on slow mobile wifi?",
      flavor: "context",
      quality: "high",
      response:
        "On slow networks, the layout must be navigable before images arrive. ImageSummary commits the feed shape — thumbnails appear immediately, then upgrade to higher resolution as bandwidth allows. Comments wait; detail waits; the feed never blocks.",
      teaching:
        "Context probes expose what your defaults assume — usually 'desktop on broadband.'",
      surfaces: [
        {
          surfaceId: "constraint-progressive",
          kind: "constraint",
          title: "Feed renders before images load",
          detail: "ImageSummary lays out the feed; full images upgrade progressively.",
        },
      ],
    },
    {
      id: "h-share-deep-link",
      text: "What if a viewer shares a link to image #5837?",
      flavor: "context",
      quality: "high",
      response:
        "Deep linking means the URL encodes image identity, and opening that URL delivers detail view immediately — not 'load the feed, then scroll to it.' You're committing to a navigation model: detail view is a real route, not a modal state.",
      teaching:
        "Deep-link probes surface URL/state architecture you'd otherwise discover in production.",
      surfaces: [
        {
          surfaceId: "flow-detail-route",
          kind: "flow",
          title: "Detail view is a routable URL",
          detail: "Direct navigation to /image/:id loads detail without the feed.",
        },
        {
          surfaceId: "constraint-url-state",
          kind: "constraint",
          title: "URL encodes image identity",
          detail: "Detail view restores from URL on cold load.",
        },
      ],
    },
    {
      id: "h-tap-detail-actor",
      text: "What does a viewer see when they tap an image?",
      flavor: "ambition",
      quality: "high",
      response:
        "Tap transitions from feed mode to detail mode — two viewport states, two data shapes. The summary in the card isn't enough; you need full image, srcset variants, maybe EXIF. The split between ImageSummary and ImageDetail isn't an optimization — it's a consequence of the brief itself.",
      teaching:
        "Happy-path probes still surface pressure if you probe the right side of the path.",
      surfaces: [
        {
          surfaceId: "actor-viewer",
          kind: "actor",
          title: "Viewer",
          detail: "Browses the feed and taps to expand detail.",
        },
        {
          surfaceId: "flow-tap-to-detail",
          kind: "flow",
          title: "Tap to expand → fetch ImageDetail",
          detail: "Card holds summary; tap dispatches detail fetch keyed by id.",
        },
        {
          surfaceId: "entity-image-detail",
          kind: "entity",
          title: "ImageDetail",
          detail: "Detail payload — full image, srcset, EXIF.",
        },
      ],
    },

    // ── MEDIUM (defensible pick, marginal pressure) ────────────────
    {
      id: "m-comments-scale",
      text: "What if a popular image gets thousands of comments?",
      flavor: "scale",
      quality: "medium",
      response:
        "Comments can't be embedded in ImageDetail at that scale — they have to paginate independently. That said, this brief is read-only for MVP; comments may not exist at all. Worth asking, but partially answered by the next ambition probe.",
      teaching:
        "Sometimes a probe is technically right but stepped on by a scope decision.",
      surfaces: [
        {
          surfaceId: "constraint-lazy-comments",
          kind: "constraint",
          title: "Comments paginate independently",
          detail: "If comments exist at all, they don't ride with ImageDetail.",
        },
      ],
    },
    {
      id: "m-likes-comments",
      text: "What if viewers can like or comment on images?",
      flavor: "ambition",
      quality: "medium",
      response:
        "These would add a write surface this brief doesn't have. Naming them out of scope is itself a requirement — it tells future-you what NOT to build. A defensible probe, though it returns less pressure than a probe about what you ARE building.",
      teaching:
        "Ambition probes harvest boundaries. Every Boundary is a future bug you don't ship.",
      surfaces: [
        {
          surfaceId: "boundary-social",
          kind: "boundary",
          title: "Likes, comments, shares — out of scope (MVP)",
          detail: "Read-only feed. Social signals come post-launch.",
        },
      ],
    },

    // ── LOW (answered in the brief; wasted question) ───────────────
    {
      id: "l-can-tap",
      text: "Will viewers be able to tap an image to see details?",
      flavor: "ambition",
      quality: "low",
      critique:
        "Already in the brief — 'tap to see details.' Asking confirms what you've been told; the stakeholder will repeat themselves. You've burned a question on a fact you already had.",
    },
    {
      id: "l-feed-of-images",
      text: "Is the feed a list of images?",
      flavor: "ambition",
      quality: "low",
      critique:
        "Tautological — the brief literally says 'image gallery.' Pick questions that change what you'd build. This one doesn't.",
    },

    // ── TRAP (actively bad question) ───────────────────────────────
    {
      id: "t-redis",
      text: "Should we use Redis for caching the feed?",
      flavor: "scale",
      quality: "trap",
      trapKind: "tech-bait",
      critique:
        "Tech bait. You're choosing a tool before the brief has produced any constraint that would justify it. Redis, Postgres, S3, Kafka — none of these are answers until requirements exist. Probe the brief first; let the tech pick itself.",
    },
    {
      id: "t-vague",
      text: "What if something breaks?",
      flavor: "failure",
      quality: "trap",
      trapKind: "vague",
      critique:
        "Too vague to convert into a requirement. What breaks? Under what conditions? The stakeholder will give you back the same vagueness you handed them. Probes need a subject and a stressor — naming both is half the work.",
    },
  ],
};
