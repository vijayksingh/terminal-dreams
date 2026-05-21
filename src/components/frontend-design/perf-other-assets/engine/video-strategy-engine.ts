/**
 * Video decision engine — three embedding strategies scored against position.
 *
 * Numbers below are representative (not measured for any specific origin) and
 * derived from web.dev "Lazy-loading video" guide and the lite-youtube-embed
 * benchmark (Paul Irish, GitHub 2024): a stock YouTube IFrame ships ~1.2 MB
 * across ~14 requests; the facade ships a poster + ~3 KB of JS until click.
 */

export type VideoStrategy = "eager-mp4" | "poster-lazy" | "youtube-facade";
export type FoldPosition = "above" | "below";

export interface VideoOption {
  id: VideoStrategy;
  label: string;
  shortLabel: string;
  initialKB: number;
  requests: number;
  /** ms LCP impact: positive = delays LCP, negative = pre-empts work. */
  lcpDeltaMs: number;
  /** ms cost to user when they click play (download/parse delay). */
  interactionDelayMs: number;
  /** Plain-prose tradeoff shown after a decision. */
  tradeoff: string;
}

export const VIDEO_OPTIONS: Record<VideoStrategy, VideoOption> = {
  "eager-mp4": {
    id: "eager-mp4",
    label: "Raw <video src=\"hero.mp4\" autoplay>",
    shortLabel: "Eager MP4",
    initialKB: 8500,
    requests: 1,
    lcpDeltaMs: 2800,
    interactionDelayMs: 0,
    tradeoff:
      "8.5 MB of MP4 begins downloading before HTML parsing finishes. Bandwidth contention pushes the LCP image back ~2.8 s on slow 4G. The video plays instantly, but the rest of the page is starved.",
  },
  "poster-lazy": {
    id: "poster-lazy",
    label: "<video poster=\"hero.jpg\" preload=\"metadata\" controls>",
    shortLabel: "Poster + metadata",
    initialKB: 78,
    requests: 2,
    lcpDeltaMs: 0,
    interactionDelayMs: 120,
    tradeoff:
      "Poster JPEG (45 KB) plus a 33 KB metadata fetch — enough to render the frame and duration. The full stream begins on play. Cheap on first paint, ~120 ms perceived stall on click.",
  },
  "youtube-facade": {
    id: "youtube-facade",
    label: "<lite-youtube videoid=\"…\"> (facade)",
    shortLabel: "YouTube facade",
    initialKB: 35,
    requests: 2,
    lcpDeltaMs: 0,
    interactionDelayMs: 2000,
    tradeoff:
      "A static poster (32 KB) plus 3 KB of upgrade JS. The full IFrame, player JS, and CSS (≈1.2 MB across 14 requests) only fetch when the reader clicks. On click, expect ~2 s before the player is interactive.",
  },
};

/**
 * The best answer changes with fold position. Above-fold prefers fast playback;
 * below-fold prefers zero initial cost.
 */
export function bestVideoStrategy(fold: FoldPosition): VideoStrategy {
  return fold === "above" ? "poster-lazy" : "youtube-facade";
}

export interface VideoVerdict {
  rank: 1 | 2 | 3;
  headline: string;
  detail: string;
}

export function gradeVideoChoice(
  pick: VideoStrategy,
  fold: FoldPosition,
): VideoVerdict {
  if (fold === "above") {
    if (pick === "poster-lazy") {
      return {
        rank: 1,
        headline: "Right answer. Poster + metadata is the above-fold sweet spot.",
        detail:
          "Above-the-fold video is part of LCP. The poster paints in ~150 ms, gives the user something to look at, and only fetches the stream on play. Adding fetchpriority=\"high\" on the poster <img> closes the last 50 ms gap.",
      };
    }
    if (pick === "youtube-facade") {
      return {
        rank: 2,
        headline: "Reasonable, but you charged the click instead of the page.",
        detail:
          "Facades excel below the fold where the click is unlikely. Above the fold, ~80% of readers will press play and pay the 2 s upgrade cost. The poster-lazy <video> with preload=\"metadata\" is cheaper for the user who actually watches.",
      };
    }
    return {
      rank: 3,
      headline: "Eager MP4 above the fold is the textbook anti-pattern.",
      detail:
        "8.5 MB downloads on first paint, fighting your LCP image for bandwidth. On a throttled 4 G connection the hero image arrives ~2.8 s later. Even if autoplay works, you have annihilated CWV for everyone who scrolls past.",
    };
  }
  // below fold
  if (pick === "youtube-facade") {
    return {
      rank: 1,
      headline: "Right answer. Below-fold facade is free until interaction.",
      detail:
        "Most readers never scroll to a below-fold embed. The facade ships 35 KB of poster + JS — nothing else. The 2 s upgrade cost is only paid by the small fraction who click. Bandwidth saved for above-fold work.",
    };
  }
  if (pick === "poster-lazy") {
    return {
      rank: 2,
      headline: "Acceptable, but you are still paying metadata for nothing.",
      detail:
        "preload=\"metadata\" still costs ~33 KB of network for every page load — useful when the user will probably watch (above the fold), wasteful when they probably won't. Switch to preload=\"none\" or a facade below the fold.",
    };
  }
  return {
    rank: 3,
    headline: "Eager MP4 below the fold is even worse.",
    detail:
      "You pay 8.5 MB up front for a video the reader probably never reaches. Lazy-load the embed entirely. preload=\"none\" + a click handler, or a facade pattern, brings cost to zero until needed.",
  };
}

/**
 * Side-note attributes the lab surfaces in code samples.
 */
export const VIDEO_CODE_SAMPLES = {
  "eager-mp4": `<!-- Anti-pattern -->
<video src="hero.mp4" autoplay muted playsinline />`,
  "poster-lazy": `<video
  poster="hero.jpg"
  preload="metadata"
  controls
  playsinline
  muted>
  <source src="hero.av1.mp4" type="video/mp4; codecs=av01" />
  <source src="hero.h264.mp4" type="video/mp4" />
</video>`,
  "youtube-facade": `<lite-youtube
  videoid="dQw4w9WgXcQ"
  playlabel="Play product demo"
></lite-youtube>
<script type="module" src="https://cdn.jsdelivr.net/npm/lite-youtube-embed/src/lite-yt-embed.js"></script>`,
};
