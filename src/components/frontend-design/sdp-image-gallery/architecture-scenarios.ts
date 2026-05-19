import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry: dense node layout for the 480×162 viewBox ─────────────

const NODES: FlowNode[] = [
  {
    id: "api",
    label: "REST API",
    sublabel: "/gallery · /:id · /srcset",
    x: 158,
    y: 6,
    w: 164,
    h: 22,
  },
  {
    id: "gallery",
    label: "Gallery — state owner",
    sublabel: "images · cursor · lightbox · loading",
    x: 40,
    y: 46,
    w: 400,
    h: 28,
  },
  {
    id: "grid",
    label: "Grid",
    sublabel: "masonry · onNearEnd",
    x: 36,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "lightbox",
    label: "Lightbox",
    sublabel: "modal · focus trap",
    x: 180,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "pagination",
    label: "Pagination",
    sublabel: "cursor · onLoadMore",
    x: 324,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "imagecard",
    label: "ImageCard",
    sublabel: "leaf · onClick callback",
    x: 36,
    y: 132,
    w: 120,
    h: 22,
  },
];

const EDGES: FlowEdge[] = [
  { from: "api", to: "gallery", verb: "responds with" },
  { from: "gallery", to: "grid", verb: "passes props to" },
  { from: "gallery", to: "lightbox", verb: "passes props to" },
  { from: "gallery", to: "pagination", verb: "passes props to" },
  { from: "grid", to: "imagecard", verb: "renders" },
  {
    from: "imagecard",
    to: "gallery",
    dashed: true,
    verb: "fires onClick",
    pathOverride: "M 36,143 C 6,143 6,60 40,60",
    midpointOverride: { x: 6, y: 100 },
  },
  {
    from: "pagination",
    to: "gallery",
    dashed: true,
    verb: "fires onNearEnd",
    pathOverride: "M 444,108 C 474,108 474,60 440,60",
    midpointOverride: { x: 474, y: 84 },
  },
];

// ── Weight assumptions ──────────────────────────────────────────────
//
// Used by the bandwidth meter. Real-world ballpark numbers for a typical
// 1200×900 WebP photo. Surface these to the student via the "?" hover.

const WEIGHT = {
  imageSummary: 8, // KB per item — thumb URL + dims + blurhash
  imageDetail: 800, // KB per item — full WebP @ ~1200px
} as const;

// ── Type definitions — light (split) variants ───────────────────────

const T_GalleryListResponse: ArchTypeDef = {
  name: "GalleryListResponse",
  kind: "API response",
  fields: [
    { name: "images", type: "ImageSummary[]", note: "page of summaries" },
    { name: "nextCursor", type: "string | null", note: "for the next fetch" },
  ],
};

const T_ImageDetail: ArchTypeDef = {
  name: "ImageDetail",
  kind: "API response",
  extends: "ImageSummary",
  fields: [
    { name: "src", type: "string", note: "full-res URL" },
    { name: "srcSet", type: "SrcSetEntry[]", note: "responsive variants" },
    { name: "exif", type: "ExifData?" },
  ],
};

const T_GridProps: ArchTypeDef = {
  name: "GridProps",
  kind: "props",
  fields: [
    { name: "images", type: "ImageSummary[]" },
    { name: "layout", type: "LayoutMode" },
    { name: "onImageClick", type: "(id: string) => void" },
    { name: "onNearEnd", type: "() => void" },
  ],
};

const T_ImageCardProps: ArchTypeDef = {
  name: "ImageCardProps",
  kind: "props",
  fields: [
    { name: "image", type: "ImageSummary" },
    { name: "loaded", type: "boolean" },
    { name: "onClick", type: "() => void" },
  ],
};

const T_LightboxProps: ArchTypeDef = {
  name: "LightboxProps",
  kind: "props",
  fields: [
    { name: "image", type: "ImageDetail" },
    { name: "total", type: "number" },
    { name: "onClose", type: "() => void" },
    { name: "onNavigate", type: "(dir: 'prev' | 'next') => void" },
  ],
};

const T_OnImageClick: ArchTypeDef = {
  name: "onImageClick(id)",
  kind: "callback",
  fields: [{ name: "id", type: "string", note: "the clicked image id" }],
};

const T_OnNearEnd: ArchTypeDef = {
  name: "onNearEnd()",
  kind: "callback",
  fields: [{ name: "—", type: "() => void", note: "no payload" }],
};

const T_GetGallery: ArchTypeDef = {
  name: "GET /api/gallery",
  kind: "request",
  fields: [
    { name: "cursor", type: "string?", note: "next-page token" },
    { name: "limit", type: "number", note: "default 50" },
  ],
};

const T_GetImage: ArchTypeDef = {
  name: "GET /api/gallery/:id",
  kind: "request",
  fields: [{ name: "id", type: "string", note: "the image id" }],
};

// ── Type definitions — heavy (no-split) variants ────────────────────
//
// In the counterfactual, /gallery returns ImageDetail[] directly and
// the props that used to carry ImageSummary now carry ImageDetail.
// The /:id endpoint doesn't exist (we strikethrough it in the diagram).

const T_GalleryListResponse_Heavy: ArchTypeDef = {
  name: "GalleryListResponse",
  kind: "API response",
  fields: [
    {
      name: "images",
      type: "ImageDetail[]",
      note: "full detail per item — no separate fetch",
    },
    { name: "nextCursor", type: "string | null" },
  ],
};

const T_GridProps_Heavy: ArchTypeDef = {
  name: "GridProps",
  kind: "props",
  fields: [
    { name: "images", type: "ImageDetail[]", note: "heavyweight per item" },
    { name: "layout", type: "LayoutMode" },
    { name: "onImageClick", type: "(id: string) => void" },
    { name: "onNearEnd", type: "() => void" },
  ],
};

const T_ImageCardProps_Heavy: ArchTypeDef = {
  name: "ImageCardProps",
  kind: "props",
  fields: [
    { name: "image", type: "ImageDetail", note: "heavyweight per card" },
    { name: "loaded", type: "boolean" },
    { name: "onClick", type: "() => void" },
  ],
};

// ── Scenario 1: Initial load ─────────────────────────────────────────

const SCENARIO_INITIAL_LOAD_WITH_SPLIT: ArchStep[] = [
  {
    nodeId: "api",
    caption: "Gallery mounts and requests the first page.",
    payload: { type: T_GetGallery },
    stateAfter: [
      { key: "images", value: "[]" },
      { key: "cursor", value: "null" },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "Server responds with 50 lightweight summaries.",
    payload: {
      type: T_GalleryListResponse,
      weightKB: 50 * WEIGHT.imageSummary, // 400 KB
    },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "grid",
    caption: "Gallery hands the lightweight summary array to Grid.",
    payload: { type: T_GridProps },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "imagecard",
    caption: "Grid renders one ImageCard per summary — leaves carry nothing heavy.",
    payload: { type: T_ImageCardProps },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
];

const SCENARIO_INITIAL_LOAD_NO_SPLIT: ArchStep[] = [
  {
    nodeId: "api",
    caption: "Gallery mounts and requests the first page.",
    payload: { type: T_GetGallery },
    stateAfter: [
      { key: "images", value: "[]" },
      { key: "cursor", value: "null" },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption:
      "Server returns 50 full ImageDetail records — every image, full resolution, up front.",
    payload: {
      type: T_GalleryListResponse_Heavy,
      weightKB: 50 * WEIGHT.imageDetail, // 40,000 KB = 40 MB
    },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "grid",
    caption: "Gallery passes heavy ImageDetail[] down to Grid.",
    payload: { type: T_GridProps_Heavy },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "imagecard",
    caption:
      "Grid renders ImageCards with heavyweight detail in every leaf.",
    payload: { type: T_ImageCardProps_Heavy },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
];

// ── Scenario 2: Click image ──────────────────────────────────────────

const SCENARIO_CLICK_IMAGE_WITH_SPLIT: ArchStep[] = [
  {
    nodeId: "imagecard",
    caption: "User clicks ImageCard #7.",
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "ImageCard fires onClick up to Gallery — events flow upward.",
    payload: { type: T_OnImageClick },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: null, loading: true }",
      },
    ],
  },
  {
    nodeId: "api",
    caption: "Gallery requests the heavy ImageDetail for that one image.",
    payload: { type: T_GetImage },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: null, loading: true }",
      },
    ],
  },
  {
    nodeId: "gallery",
    caption: "Server returns ImageDetail — fetched only because the user asked.",
    payload: {
      type: T_ImageDetail,
      weightKB: WEIGHT.imageDetail, // 800 KB — one heavy fetch
    },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: ImageDetail, loading: false }",
      },
    ],
  },
  {
    nodeId: "lightbox",
    caption: "Gallery passes the detail down to Lightbox; modal opens.",
    payload: { type: T_LightboxProps },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: ImageDetail, loading: false }",
      },
    ],
  },
];

const SCENARIO_CLICK_IMAGE_NO_SPLIT: ArchStep[] = [
  {
    nodeId: "imagecard",
    caption: "User clicks ImageCard #7.",
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "onClick fires up to Gallery — the detail is already in memory.",
    payload: { type: T_OnImageClick },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: images[7], loading: false }",
      },
    ],
  },
  {
    nodeId: "lightbox",
    caption:
      "Lightbox opens immediately — no extra fetch. The cost was paid upfront.",
    payload: { type: T_LightboxProps },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      {
        key: "lightbox",
        value: "{ idx: 7, detail: images[7], loading: false }",
      },
    ],
  },
];

// ── Scenario 3: Scroll to end ────────────────────────────────────────

const SCENARIO_SCROLL_WITH_SPLIT: ArchStep[] = [
  {
    nodeId: "grid",
    caption: "User scrolls toward the bottom of the grid.",
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "pagination",
    caption: "Pagination crosses its sentinel and prepares to call Gallery.",
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "Pagination fires onNearEnd; Gallery decides to fetch more.",
    payload: { type: T_OnNearEnd },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "api",
    caption: "Gallery sends the next request with the saved cursor.",
    payload: { type: T_GetGallery },
    stateAfter: [
      { key: "images", value: "ImageSummary[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "Server returns 50 more lightweight summaries.",
    payload: {
      type: T_GalleryListResponse,
      weightKB: 50 * WEIGHT.imageSummary, // 400 KB
    },
    stateAfter: [
      { key: "images", value: "ImageSummary[100]" },
      { key: "cursor", value: '"fGhq…"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "grid",
    caption: "Updated summary array flows down; Grid appends new cards.",
    payload: { type: T_GridProps },
    stateAfter: [
      { key: "images", value: "ImageSummary[100]" },
      { key: "cursor", value: '"fGhq…"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
];

const SCENARIO_SCROLL_NO_SPLIT: ArchStep[] = [
  {
    nodeId: "grid",
    caption: "User scrolls toward the bottom of the grid.",
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "pagination",
    caption: "Pagination crosses its sentinel and prepares to call Gallery.",
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption: "Pagination fires onNearEnd; Gallery decides to fetch more.",
    payload: { type: T_OnNearEnd },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "api",
    caption: "Gallery sends the next request.",
    payload: { type: T_GetGallery },
    stateAfter: [
      { key: "images", value: "ImageDetail[50]" },
      { key: "cursor", value: '"eyJpZCI6NTB9"' },
      { key: "loading", value: "true" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "gallery",
    caption:
      "Server returns 50 more full ImageDetail records — every page costs another 40 MB.",
    payload: {
      type: T_GalleryListResponse_Heavy,
      weightKB: 50 * WEIGHT.imageDetail, // 40,000 KB = 40 MB
    },
    stateAfter: [
      { key: "images", value: "ImageDetail[100]" },
      { key: "cursor", value: '"fGhq…"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
  {
    nodeId: "grid",
    caption: "Heavy ImageDetail[] flows down again; Grid appends new cards.",
    payload: { type: T_GridProps_Heavy },
    stateAfter: [
      { key: "images", value: "ImageDetail[100]" },
      { key: "cursor", value: '"fGhq…"' },
      { key: "loading", value: "false" },
      { key: "lightbox", value: "null" },
    ],
  },
];

// ── Config ───────────────────────────────────────────────────────────

export const IMAGE_GALLERY_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "ImageSummary (lightweight) vs ImageDetail (heavyweight) — the type split is what makes lazy loading possible.",
  viewBox: "0 0 480 162",
  nodes: NODES,
  edges: EDGES,
  protagonist: "gallery",
  scenarios: [
    {
      id: "initial-load",
      label: "Initial load",
      blurb:
        "Mount → fetch → render. Toggle the split to see how the same flow turns into 40 MB instead of 400 KB.",
      steps: SCENARIO_INITIAL_LOAD_WITH_SPLIT,
      stepsWithoutSplit: SCENARIO_INITIAL_LOAD_NO_SPLIT,
    },
    {
      id: "click-image",
      label: "Click image",
      blurb:
        "The interactive moment. With split, opening the lightbox costs 800 KB on demand. Without split, it costs nothing — because everything was already loaded.",
      steps: SCENARIO_CLICK_IMAGE_WITH_SPLIT,
      stepsWithoutSplit: SCENARIO_CLICK_IMAGE_NO_SPLIT,
    },
    {
      id: "fetch-next-page",
      label: "Scroll to end",
      blurb:
        "Pagination compounds the choice. Every page with split is 400 KB; every page without split is 40 MB.",
      steps: SCENARIO_SCROLL_WITH_SPLIT,
      stepsWithoutSplit: SCENARIO_SCROLL_NO_SPLIT,
    },
  ],
};
