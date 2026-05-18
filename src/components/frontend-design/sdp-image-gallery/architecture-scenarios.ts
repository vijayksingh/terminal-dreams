import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry: dense node layout for the 480×190 viewBox ─────────────
//
// API on top, Gallery wide in the middle (state owner), three sibling
// components below, ImageCard as the leaf under Grid. Heights are
// sized for two text lines + breathing room — no more.

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

// ── Edges: props go down, callbacks loop back up around the sides ──

const EDGES: FlowEdge[] = [
  { from: "api", to: "gallery", verb: "responds with" },
  { from: "gallery", to: "grid", verb: "passes props to" },
  { from: "gallery", to: "lightbox", verb: "passes props to" },
  { from: "gallery", to: "pagination", verb: "passes props to" },
  { from: "grid", to: "imagecard", verb: "renders" },
  // Callbacks travel back up. Route around the left + right to avoid
  // overlapping the downward props edges.
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

// ── Type definitions reused across scenarios ────────────────────────

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
  fields: [
    { name: "id", type: "string", note: "the clicked image id" },
  ],
};

const T_OnNearEnd: ArchTypeDef = {
  name: "onNearEnd()",
  kind: "callback",
  fields: [
    { name: "—", type: "() => void", note: "no payload" },
  ],
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
  fields: [
    { name: "id", type: "string", note: "the image id" },
  ],
};

// ── Scenarios ───────────────────────────────────────────────────────

export const IMAGE_GALLERY_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "Gallery is the only stateful node. Props flow down; events flow up. Type contracts make the split safe.",
  viewBox: "0 0 480 162",
  nodes: NODES,
  edges: EDGES,
  protagonist: "gallery",
  scenarios: [
    {
      id: "initial-load",
      label: "Initial load",
      blurb:
        "Mount → fetch → render. Watch how Gallery's state is the only state, and how ImageSummary is the only shape the grid needs.",
      steps: [
        {
          nodeId: "api",
          caption: "Gallery mounts and requests the first page.",
          payload: {
            type: T_GetGallery,
            sample: ["GET /api/gallery", "  ?limit=50"],
          },
          stateAfter: [
            { key: "images", value: "[]" },
            { key: "cursor", value: "null" },
            { key: "loading", value: "true" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "gallery",
          caption: "Server responds with 50 summaries and a next cursor.",
          payload: {
            type: T_GalleryListResponse,
            sample: [
              "{",
              "  images: ImageSummary[50],",
              '  nextCursor: "eyJpZCI6NTB9"',
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "grid",
          caption: "Gallery hands the lightweight summary array to Grid.",
          payload: {
            type: T_GridProps,
            sample: [
              "{",
              "  images: ImageSummary[50],",
              '  layout: "css-grid",',
              "  onImageClick: fn,",
              "  onNearEnd: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "imagecard",
          caption: "Grid renders one ImageCard per summary — leaf components, no state.",
          payload: {
            type: T_ImageCardProps,
            sample: [
              "{",
              '  image: { id, thumb, w, h, … },',
              "  loaded: false,",
              "  onClick: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
      ],
    },
    {
      id: "click-image",
      label: "Click image",
      blurb:
        "Why ImageSummary and ImageDetail are split: the grid only carries summaries; the lightbox triggers a separate fetch for the heavy detail.",
      steps: [
        {
          nodeId: "imagecard",
          caption: "User clicks ImageCard #7.",
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "gallery",
          caption: "ImageCard fires onClick up to Gallery — events flow upward.",
          payload: {
            type: T_OnImageClick,
            sample: ['onImageClick("img-7")'],
          },
          stateAfter: [
            { key: "images", value: "50" },
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
          payload: {
            type: T_GetImage,
            sample: ["GET /api/gallery/img-7"],
          },
          stateAfter: [
            { key: "images", value: "50" },
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
          caption: "Server returns ImageDetail — full src + responsive srcSet.",
          payload: {
            type: T_ImageDetail,
            sample: [
              "{",
              '  id: "img-7",',
              '  thumb: "/.../img-7-200.webp",',
              '  src: "/.../img-7-1600.avif",',
              "  srcSet: [/*…*/],",
              "  exif: { iso, lens, … }",
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
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
          payload: {
            type: T_LightboxProps,
            sample: [
              "{",
              "  image: ImageDetail,",
              "  total: 50,",
              "  onClose: fn,",
              "  onNavigate: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            {
              key: "lightbox",
              value: "{ idx: 7, detail: ImageDetail, loading: false }",
            },
          ],
        },
      ],
    },
    {
      id: "fetch-next-page",
      label: "Scroll to end",
      blurb:
        "Sibling components don't know about each other — Pagination notifies Gallery, and Gallery decides whether to fetch.",
      steps: [
        {
          nodeId: "grid",
          caption: "User scrolls toward the bottom of the grid.",
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "pagination",
          caption: "Pagination crosses its sentinel and prepares to call Gallery.",
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "gallery",
          caption: "Pagination fires onNearEnd; Gallery decides to fetch more.",
          payload: {
            type: T_OnNearEnd,
            sample: ["onNearEnd()"],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "true" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "api",
          caption: "Gallery sends the next request with the saved cursor.",
          payload: {
            type: T_GetGallery,
            sample: [
              "GET /api/gallery",
              '  ?cursor="eyJpZCI6NTB9"',
              "  &limit=50",
            ],
          },
          stateAfter: [
            { key: "images", value: "50" },
            { key: "cursor", value: '"eyJpZCI6NTB9"' },
            { key: "loading", value: "true" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "gallery",
          caption: "Server returns 50 more summaries and the next cursor.",
          payload: {
            type: T_GalleryListResponse,
            sample: [
              "{",
              "  images: ImageSummary[50],",
              '  nextCursor: "fGhq…"',
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "100" },
            { key: "cursor", value: '"fGhq…"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
        {
          nodeId: "grid",
          caption: "Updated summary array flows down; Grid appends new cards.",
          payload: {
            type: T_GridProps,
            sample: [
              "{",
              "  images: ImageSummary[100],",
              '  layout: "css-grid",',
              "  onImageClick: fn,",
              "  onNearEnd: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "images", value: "100" },
            { key: "cursor", value: '"fGhq…"' },
            { key: "loading", value: "false" },
            { key: "lightbox", value: "null" },
          ],
        },
      ],
    },
  ],
  footnote:
    "Each scenario auto-plays once when you scroll to step 3. Use the dots to scrub, or pick a different scenario above.",
};
