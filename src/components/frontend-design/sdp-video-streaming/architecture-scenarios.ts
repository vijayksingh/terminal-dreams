import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry: nodes positioned for the 480×360 viewBox ──────────────
//
// Player UI is at the top. ABR Controller and Buffer Manager sit mid-row.
// Segment Fetcher and Bandwidth Estimator sit lower. CDN at the bottom.

const NODES: FlowNode[] = [
  {
    id: "player-ui",
    label: "Player UI",
    sublabel: "controls, quality indicator, buffer bar",
    x: 140,
    y: 10,
    w: 200,
    h: 36,
  },
  {
    id: "abr-controller",
    label: "ABR Controller",
    sublabel: "quality selection, mode switching",
    x: 30,
    y: 90,
    w: 180,
    h: 36,
  },
  {
    id: "buffer-manager",
    label: "Buffer Manager",
    sublabel: "segment queue, underrun detection",
    x: 270,
    y: 90,
    w: 180,
    h: 36,
  },
  {
    id: "segment-fetcher",
    label: "Segment Fetcher",
    sublabel: "HTTP requests, retry, abort",
    x: 30,
    y: 180,
    w: 180,
    h: 36,
  },
  {
    id: "bandwidth-estimator",
    label: "Bandwidth Estimator",
    sublabel: "EWMA, sample history",
    x: 270,
    y: 180,
    w: 180,
    h: 36,
  },
  {
    id: "cdn",
    label: "CDN / Origin",
    sublabel: "manifest, segments, edge servers",
    x: 140,
    y: 260,
    w: 200,
    h: 36,
  },
];

// ── Edges ───────────────────────────────────────────────────────────

const EDGES: FlowEdge[] = [
  { from: "player-ui", to: "abr-controller", verb: "requests quality decision" },
  { from: "abr-controller", to: "buffer-manager", verb: "enqueues segments" },
  { from: "abr-controller", to: "segment-fetcher", verb: "issues fetch" },
  { from: "segment-fetcher", to: "cdn", verb: "HTTP GET segment" },
  { from: "bandwidth-estimator", to: "abr-controller", verb: "reports throughput" },
  { from: "buffer-manager", to: "player-ui", verb: "feeds playback" },
  {
    from: "cdn",
    to: "bandwidth-estimator",
    dashed: true,
    verb: "measures download speed",
  },
];

// ── Type definitions ────────────────────────────────────────────────

const T_ManifestResponse: ArchTypeDef = {
  name: "ManifestResponse",
  kind: "API response",
  fields: [
    { name: "videoId", type: "string" },
    { name: "qualities", type: "QualityLevel[]", note: "bitrate ladder" },
    { name: "segmentDuration", type: "number", note: "seconds" },
    { name: "totalDuration", type: "number", note: "seconds" },
  ],
};

const T_ABRDecision: ArchTypeDef = {
  name: "ABRDecision",
  kind: "internal",
  fields: [
    { name: "selectedQuality", type: "string", note: "e.g. 720p" },
    { name: "reason", type: "string", note: "why this quality" },
    { name: "bufferLevel", type: "number", note: "seconds buffered" },
    { name: "estimatedBandwidth", type: "number", note: "kbps" },
    { name: "confidence", type: "number", note: "0-1" },
  ],
};

const T_SegmentRequest: ArchTypeDef = {
  name: "SegmentRequest",
  kind: "request",
  fields: [
    { name: "quality", type: "string" },
    { name: "index", type: "number" },
    { name: "url", type: "string", note: "CDN edge URL" },
  ],
};

const T_BandwidthReport: ArchTypeDef = {
  name: "BandwidthReport",
  kind: "internal",
  fields: [
    { name: "estimatedKbps", type: "number" },
    { name: "sampleCount", type: "number" },
    { name: "trend", type: "'stable' | 'rising' | 'falling'" },
  ],
};

const T_BufferStatus: ArchTypeDef = {
  name: "BufferStatus",
  kind: "internal",
  fields: [
    { name: "level", type: "number", note: "seconds buffered" },
    { name: "health", type: "'green' | 'yellow' | 'red'" },
    { name: "segmentCount", type: "number" },
  ],
};

// ── Scenarios ───────────────────────────────────────────────────────

export const VIDEO_STREAMING_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "The ABR Controller is the brain: it takes throughput estimates and buffer status, then decides which quality to fetch next. The Buffer Manager feeds the Player UI; the Bandwidth Estimator measures real download speed from CDN responses.",
  viewBox: "0 0 480 310",
  nodes: NODES,
  edges: EDGES,
  protagonist: "abr-controller",
  scenarios: [
    {
      id: "bandwidth-drop",
      label: "Bandwidth drop",
      blurb:
        "Bandwidth drops mid-stream. The Bandwidth Estimator detects the change, ABR lowers quality, and the buffer absorbs the transition without stalling.",
      steps: [
        {
          nodeId: "cdn",
          caption: "CDN response times spike — segment download slows from 200ms to 2s.",
          stateAfter: [
            { key: "bandwidth", value: "5000 kbps" },
            { key: "quality", value: '"1080p"' },
            { key: "buffer", value: "8s" },
            { key: "playing", value: "true" },
          ],
        },
        {
          nodeId: "bandwidth-estimator",
          caption: "EWMA detects throughput drop: 5000 kbps -> 800 kbps.",
          payload: {
            type: T_BandwidthReport,
            sample: [
              "{",
              "  estimatedKbps: 800,",
              "  sampleCount: 3,",
              '  trend: "falling"',
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "800 kbps" },
            { key: "quality", value: '"1080p"' },
            { key: "buffer", value: "6s" },
            { key: "playing", value: "true" },
          ],
        },
        {
          nodeId: "abr-controller",
          caption: "ABR decides to drop quality: 1080p -> 360p to match available bandwidth.",
          payload: {
            type: T_ABRDecision,
            sample: [
              "{",
              '  selectedQuality: "360p",',
              '  reason: "bandwidth insufficient for 720p",',
              "  bufferLevel: 6,",
              "  estimatedBandwidth: 800,",
              "  confidence: 0.85",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "800 kbps" },
            { key: "quality", value: '"360p"' },
            { key: "buffer", value: "5s" },
            { key: "playing", value: "true" },
          ],
        },
        {
          nodeId: "segment-fetcher",
          caption: "Fetcher aborts pending 1080p segment, starts fetching 360p.",
          payload: {
            type: T_SegmentRequest,
            sample: [
              "{",
              '  quality: "360p",',
              "  index: 42,",
              '  url: "cdn.example.com/seg/360p/42.m4s"',
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "800 kbps" },
            { key: "quality", value: '"360p"' },
            { key: "buffer", value: "4s" },
            { key: "playing", value: "true" },
          ],
        },
        {
          nodeId: "buffer-manager",
          caption: "360p segment loads quickly. Buffer stabilizes — no underrun.",
          payload: {
            type: T_BufferStatus,
            sample: [
              "{",
              "  level: 6,",
              '  health: "yellow",',
              "  segmentCount: 3",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "800 kbps" },
            { key: "quality", value: '"360p"' },
            { key: "buffer", value: "6s" },
            { key: "playing", value: "true" },
          ],
        },
      ],
    },
    {
      id: "buffer-underrun",
      label: "Buffer underrun",
      blurb:
        "Buffer drains to zero — emergency quality drop, rebuffer event, then gradual recovery as bandwidth returns.",
      steps: [
        {
          nodeId: "buffer-manager",
          caption: "Buffer drops to 0s. Playback stalls — rebuffering spinner shown.",
          stateAfter: [
            { key: "bandwidth", value: "200 kbps" },
            { key: "quality", value: '"720p"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "player-ui",
          caption: "Player shows buffering indicator. Fires underrun event.",
          stateAfter: [
            { key: "bandwidth", value: "200 kbps" },
            { key: "quality", value: '"720p"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
            { key: "underruns", value: "+1" },
          ],
        },
        {
          nodeId: "abr-controller",
          caption: "Emergency drop to lowest quality (144p) to refill buffer fastest.",
          payload: {
            type: T_ABRDecision,
            sample: [
              "{",
              '  selectedQuality: "144p",',
              '  reason: "emergency: buffer underrun",',
              "  bufferLevel: 0,",
              "  estimatedBandwidth: 200,",
              "  confidence: 0.95",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "200 kbps" },
            { key: "quality", value: '"144p"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "segment-fetcher",
          caption: "Fetches 144p segments rapidly — small file size, fast download.",
          stateAfter: [
            { key: "bandwidth", value: "200 kbps" },
            { key: "quality", value: '"144p"' },
            { key: "buffer", value: "3s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "buffer-manager",
          caption: "Buffer reaches 3s minimum — playback resumes.",
          payload: {
            type: T_BufferStatus,
            sample: [
              "{",
              "  level: 3,",
              '  health: "yellow",',
              "  segmentCount: 3",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "200 kbps" },
            { key: "quality", value: '"144p"' },
            { key: "buffer", value: "3s" },
            { key: "playing", value: "true" },
          ],
        },
      ],
    },
    {
      id: "quality-rampup",
      label: "Quality ramp-up",
      blurb:
        "Stream starts at lowest quality for fast first frame, then progressively ramps up as bandwidth stabilizes.",
      steps: [
        {
          nodeId: "player-ui",
          caption: "User hits play. Player requests manifest from CDN.",
          stateAfter: [
            { key: "bandwidth", value: "unknown" },
            { key: "quality", value: '"none"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "cdn",
          caption: "CDN returns manifest with 5 quality levels.",
          payload: {
            type: T_ManifestResponse,
            sample: [
              "{",
              '  videoId: "abc123",',
              "  qualities: [144p...4K],",
              "  segmentDuration: 4,",
              "  totalDuration: 3600",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "unknown" },
            { key: "quality", value: '"none"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "abr-controller",
          caption: "No bandwidth data yet — starts at 144p for fastest first frame.",
          payload: {
            type: T_ABRDecision,
            sample: [
              "{",
              '  selectedQuality: "144p",',
              '  reason: "cold start — no bandwidth data",',
              "  bufferLevel: 0,",
              "  estimatedBandwidth: 0,",
              "  confidence: 0.1",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "unknown" },
            { key: "quality", value: '"144p"' },
            { key: "buffer", value: "0s" },
            { key: "playing", value: "false" },
          ],
        },
        {
          nodeId: "bandwidth-estimator",
          caption: "First segment download measured: ~3500 kbps throughput.",
          payload: {
            type: T_BandwidthReport,
            sample: [
              "{",
              "  estimatedKbps: 3500,",
              "  sampleCount: 1,",
              '  trend: "stable"',
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "3500 kbps" },
            { key: "quality", value: '"144p"' },
            { key: "buffer", value: "4s" },
            { key: "playing", value: "true" },
          ],
        },
        {
          nodeId: "abr-controller",
          caption: "Bandwidth supports 720p. Ramps up: 144p -> 720p.",
          payload: {
            type: T_ABRDecision,
            sample: [
              "{",
              '  selectedQuality: "720p",',
              '  reason: "bandwidth supports upgrade",',
              "  bufferLevel: 4,",
              "  estimatedBandwidth: 3500,",
              "  confidence: 0.7",
              "}",
            ],
          },
          stateAfter: [
            { key: "bandwidth", value: "3500 kbps" },
            { key: "quality", value: '"720p"' },
            { key: "buffer", value: "4s" },
            { key: "playing", value: "true" },
          ],
        },
      ],
    },
  ],
};
