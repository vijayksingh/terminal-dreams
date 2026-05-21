/**
 * Third-party script audit engine — five scripts × four loading modes.
 *
 * Each script has a baseline cost on the main thread (eval + execution). The
 * mode the reader picks routes that cost differently:
 *   - "blocking": HTML parser stalls; the entire cost lands before DOMContent.
 *   - "async": downloads in parallel; executes as soon as it arrives, mid-parse.
 *   - "defer": downloads in parallel; executes after DOMContent in source order.
 *   - "partytown": Partytown runs the script in a Web Worker; main thread
 *     pays only a tiny proxy cost (~3 ms per cross-thread API call).
 *
 * Cost models come from web.dev's "Third-party impact" study (2024) and the
 * Partytown benchmarks (Builder.io blog, 2023-09): GA4 ≈ 220ms main, 8ms in
 * Worker; Intercom widget ≈ 380ms main, 14ms in Worker.
 */

export type ScriptMode = "blocking" | "async" | "defer" | "partytown";

export interface ThirdPartyScript {
  id: string;
  label: string;
  vendor: string;
  /** ms cost on main thread when loaded with blocking/async. */
  mainThreadMs: number;
  /** ms cost on main thread when offloaded to Partytown. */
  partytownMainMs: number;
  /** kb downloaded over network. */
  bytesKb: number;
  /** is this script safe to put in Partytown? (touches DOM hot paths?) */
  partytownSafe: boolean;
  /** why partytown is/isn't safe. */
  partytownNote: string;
  /** what this script does for the business. */
  purpose: string;
}

export const THIRD_PARTY_SCRIPTS: ThirdPartyScript[] = [
  {
    id: "ga4",
    label: "Google Analytics 4",
    vendor: "google",
    mainThreadMs: 220,
    partytownMainMs: 8,
    bytesKb: 48,
    partytownSafe: true,
    partytownNote:
      "GA4 only reads URL + event metadata and posts beacons. Safe in a Worker. Partytown ships a GA4 forwarder out of the box.",
    purpose: "Page-view + custom event analytics.",
  },
  {
    id: "intercom",
    label: "Intercom messenger",
    vendor: "intercom",
    mainThreadMs: 380,
    partytownMainMs: 14,
    bytesKb: 142,
    partytownSafe: true,
    partytownNote:
      "The boot script touches window/document during init. Partytown 0.10+ proxies enough APIs for the launcher to render; full conversation UI still hits main thread on open.",
    purpose: "Chat launcher + customer support inbox.",
  },
  {
    id: "ab-test",
    label: "Optimizely flag SDK",
    vendor: "optimizely",
    mainThreadMs: 95,
    partytownMainMs: 95,
    bytesKb: 36,
    partytownSafe: false,
    partytownNote:
      "Optimizely mutates the DOM synchronously to swap copy before paint. Moving it to a Worker round-trips through postMessage and the variant flashes the control first. Keep on main, but defer is dangerous (FOOC). Use blocking + a small synchronous payload.",
    purpose: "Server-driven A/B variant assignment before first paint.",
  },
  {
    id: "ads",
    label: "Ad exchange tag",
    vendor: "google-ads",
    mainThreadMs: 310,
    partytownMainMs: 22,
    bytesKb: 168,
    partytownSafe: true,
    partytownNote:
      "GPT bid + render runs many timers and fetches; Partytown proxies the work. Save a slot <div> for layout so deferred render does not shift content.",
    purpose: "Display-ad slot bidding + rendering.",
  },
  {
    id: "social",
    label: "Twitter/X embed widget",
    vendor: "twitter",
    mainThreadMs: 140,
    partytownMainMs: 10,
    bytesKb: 87,
    partytownSafe: true,
    partytownNote:
      "Pure injector — fetches a card, paints it inside a target node. Safe in Worker; pair with a placeholder so the card insertion does not cause CLS.",
    purpose: "Inline Tweet / social card render.",
  },
];

export type ScriptAssignment = Record<string, ScriptMode>;

export const DEFAULT_ASSIGNMENT: ScriptAssignment = {
  ga4: "blocking",
  intercom: "blocking",
  "ab-test": "blocking",
  ads: "blocking",
  social: "blocking",
};

export interface AuditTotals {
  /** ms on main thread before the page is interactive. */
  blockingMs: number;
  /** ms of main-thread script work in total (irrespective of when). */
  mainThreadMs: number;
  /** approximate INP penalty added by 3P scripts (long task ≥ 50 ms each). */
  inpPenaltyMs: number;
  /** kb downloaded by 3P scripts at initial load. */
  initialKb: number;
}

/**
 * Compute totals for the current assignment. The headline metric is "blocking"
 * (work before the user can interact) — the difference between async/defer
 * (cheap up front) and Partytown (cheap forever).
 */
export function computeTotals(assignment: ScriptAssignment): AuditTotals {
  let blockingMs = 0;
  let mainThreadMs = 0;
  let inpPenaltyMs = 0;
  let initialKb = 0;

  for (const script of THIRD_PARTY_SCRIPTS) {
    const mode = assignment[script.id] ?? "blocking";

    // Bytes downloaded at initial load — async/defer/blocking all fetch; only
    // a lazy facade would zero this. Partytown still downloads on main page
    // load (it then routes execution to a Worker).
    initialKb += script.bytesKb;

    if (mode === "blocking") {
      blockingMs += script.mainThreadMs;
      mainThreadMs += script.mainThreadMs;
      // Blocking scripts spawn long tasks during parse → all of it is INP risk.
      if (script.mainThreadMs >= 50) inpPenaltyMs += script.mainThreadMs - 50;
    } else if (mode === "async") {
      // Async runs whenever it arrives; ~70% lands before interactive
      // (2024 HTTP Archive long-task data on third-party async scripts).
      blockingMs += Math.round(script.mainThreadMs * 0.7);
      mainThreadMs += script.mainThreadMs;
      if (script.mainThreadMs >= 50)
        inpPenaltyMs += Math.round((script.mainThreadMs - 50) * 0.7);
    } else if (mode === "defer") {
      // Defer runs after DOMContent — no contribution to blocking time but still
      // a long task that can hurt INP if the user interacts early. ~40% of long
      // tasks overlap an interaction window in field data (Web Almanac 2024).
      mainThreadMs += script.mainThreadMs;
      if (script.mainThreadMs >= 50)
        inpPenaltyMs += Math.round((script.mainThreadMs - 50) * 0.4);
    } else if (mode === "partytown") {
      // Worker-resident script — main pays only the proxy cost.
      blockingMs += script.partytownMainMs;
      mainThreadMs += script.partytownMainMs;
    }
  }

  return { blockingMs, mainThreadMs, inpPenaltyMs, initialKb };
}

export interface PriorityVerdict {
  isOptimal: boolean;
  headline: string;
  detail: string;
}

/**
 * The "correct" priority audit. The trap: the Optimizely flag SDK *must* run
 * blocking — moving it to defer/Partytown causes a flash of original copy
 * (FOOC). The intuition "everything to Partytown" fails. Predictions live in
 * MDX; this constant powers the "Show optimal" button in the lab.
 */
export const OPTIMAL_ASSIGNMENT: ScriptAssignment = {
  ga4: "partytown",
  intercom: "partytown",
  "ab-test": "blocking",
  ads: "partytown",
  social: "partytown",
};

export function gradeAssignment(assignment: ScriptAssignment): PriorityVerdict {
  const abTest = assignment["ab-test"];
  const allPartytown = Object.values(assignment).every(
    (m) => m === "partytown",
  );

  if (allPartytown) {
    return {
      isOptimal: false,
      headline:
        "Trap: you moved the A/B SDK to Partytown. The control copy flashes before the variant arrives.",
      detail:
        "Optimizely (and any flag SDK that swaps DOM before paint) must run blocking. The cross-thread Partytown round-trip introduces a paint frame where the original copy renders, then the variant replaces it (FOOC). Anything that touches the DOM synchronously before first paint stays on main.",
    };
  }

  if (abTest !== "blocking") {
    return {
      isOptimal: false,
      headline:
        "Flag SDKs cannot defer. The A/B variant must be in the DOM before first paint.",
      detail:
        "defer waits for DOMContent; async lands whenever the network responds. Both will paint the control variant first. The reader sees the page change under them — terrible UX, also pollutes your experiment data (engagement on the wrong variant).",
    };
  }

  const partytownCount = Object.values(assignment).filter(
    (m) => m === "partytown",
  ).length;
  if (partytownCount >= 4) {
    return {
      isOptimal: true,
      headline:
        "Audit passes. Heavy 3P scripts in a Worker, the SDK that must paint synchronously stayed on main.",
      detail:
        "GA4, Intercom, ads, and social all pay their cost off the main thread — main-thread blocking drops by ~85%. INP penalty effectively zero. The A/B SDK stays blocking because correctness beats throughput.",
    };
  }

  return {
    isOptimal: false,
    headline:
      "Better, but several heavyweights still run on main. Move them to Partytown.",
    detail:
      "Any script that posts beacons (analytics), boots a UI later (chat), or runs timers (ads) can move to a Worker. Each one you leave on main keeps the long-task bill ticking on every page load.",
  };
}
