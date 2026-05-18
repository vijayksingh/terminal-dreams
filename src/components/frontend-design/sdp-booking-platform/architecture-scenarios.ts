import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry: nodes positioned for the 480×360 viewBox ──────────────
//
// SearchPage is the state-owner (protagonist). Left half holds the
// search-side components; right half holds the detail/booking side.
// Callbacks route around the outside, props flow down.

const NODES: FlowNode[] = [
  {
    id: "api",
    label: "REST API",
    sublabel: "/search, /listings/:id, /availability, /bookings",
    x: 120,
    y: 10,
    w: 240,
    h: 30,
  },
  {
    id: "search-page",
    label: "SearchPage (state owner)",
    sublabel: "results · selected · dates · booking",
    x: 40,
    y: 72,
    w: 400,
    h: 44,
  },
  {
    id: "search-bar",
    label: "SearchBar",
    sublabel: "location · dates · guests",
    x: 20,
    y: 152,
    w: 110,
    h: 42,
  },
  {
    id: "filter-panel",
    label: "FilterPanel",
    sublabel: "type · price · amenities",
    x: 146,
    y: 152,
    w: 110,
    h: 42,
  },
  {
    id: "listing-grid",
    label: "ListingGrid",
    sublabel: "results list",
    x: 20,
    y: 228,
    w: 110,
    h: 36,
  },
  {
    id: "map-view",
    label: "MapView",
    sublabel: "geo markers",
    x: 146,
    y: 228,
    w: 110,
    h: 36,
  },
  {
    id: "detail-panel",
    label: "DetailPanel",
    sublabel: "images · info · calendar",
    x: 280,
    y: 152,
    w: 170,
    h: 42,
  },
  {
    id: "avail-calendar",
    label: "AvailCalendar",
    sublabel: "pricing per day",
    x: 280,
    y: 228,
    w: 84,
    h: 36,
  },
  {
    id: "booking-form",
    label: "BookingForm",
    sublabel: "checkout flow",
    x: 375,
    y: 228,
    w: 84,
    h: 36,
  },
];

// ── Edges ───────────────────────────────────────────────────────────

const EDGES: FlowEdge[] = [
  { from: "api", to: "search-page", verb: "responds with" },
  { from: "search-page", to: "search-bar", verb: "passes props to" },
  { from: "search-page", to: "filter-panel", verb: "passes props to" },
  { from: "search-page", to: "listing-grid", verb: "passes props to" },
  { from: "search-page", to: "map-view", verb: "passes props to" },
  { from: "search-page", to: "detail-panel", verb: "passes props to" },
  { from: "detail-panel", to: "avail-calendar", verb: "passes props to" },
  { from: "detail-panel", to: "booking-form", verb: "passes props to" },
  // Callbacks travel back up via custom paths
  {
    from: "listing-grid",
    to: "search-page",
    dashed: true,
    verb: "fires onSelect",
    pathOverride: "M 20,246 C -10,246 -10,94 40,94",
    midpointOverride: { x: -6, y: 170 },
  },
  {
    from: "booking-form",
    to: "search-page",
    dashed: true,
    verb: "fires onConfirm",
    pathOverride: "M 459,246 C 490,246 490,94 440,94",
    midpointOverride: { x: 486, y: 170 },
  },
];

// ── Type definitions ────────────────────────────────────────────────

const T_SearchRequest: ArchTypeDef = {
  name: "GET /api/search",
  kind: "request",
  fields: [
    { name: "location", type: "string?", note: "city or region" },
    { name: "checkIn", type: "string?", note: "ISO date" },
    { name: "checkOut", type: "string?", note: "ISO date" },
    { name: "guests", type: "number" },
    { name: "page", type: "number" },
  ],
};

const T_SearchResponse: ArchTypeDef = {
  name: "SearchResponse",
  kind: "API response",
  fields: [
    { name: "listings", type: "ListingSummary[]", note: "page of results" },
    { name: "total", type: "number" },
    { name: "hasMore", type: "boolean" },
  ],
};

const T_ListingDetail: ArchTypeDef = {
  name: "ListingDetailResponse",
  kind: "API response",
  extends: "ListingSummary",
  fields: [
    { name: "images", type: "string[]", note: "carousel URLs" },
    { name: "amenities", type: "Amenity[]" },
    { name: "host", type: "HostInfo" },
    { name: "houseRules", type: "string[]" },
  ],
};

const T_AvailabilityResponse: ArchTypeDef = {
  name: "AvailabilityResponse",
  kind: "API response",
  fields: [
    { name: "dates", type: "DateAvailability[]", note: "per-day pricing" },
    { name: "blockedRanges", type: "DateRange[]" },
  ],
};

const T_GridProps: ArchTypeDef = {
  name: "ListingGridProps",
  kind: "props",
  fields: [
    { name: "listings", type: "ListingSummary[]" },
    { name: "loading", type: "boolean" },
    { name: "onSelect", type: "(id: string) => void" },
  ],
};

const T_DetailProps: ArchTypeDef = {
  name: "DetailPanelProps",
  kind: "props",
  fields: [
    { name: "listing", type: "ListingDetail" },
    { name: "availability", type: "DateAvailability[]" },
    { name: "onBook", type: "() => void" },
    { name: "onBack", type: "() => void" },
  ],
};

const T_BookingRequest: ArchTypeDef = {
  name: "POST /api/bookings",
  kind: "request",
  fields: [
    { name: "listingId", type: "string" },
    { name: "checkIn", type: "string" },
    { name: "checkOut", type: "string" },
    { name: "guests", type: "GuestCount" },
    { name: "guestDetails", type: "GuestDetails" },
  ],
};

const T_BookingConfirmation: ArchTypeDef = {
  name: "BookingConfirmation",
  kind: "API response",
  fields: [
    { name: "bookingId", type: "string" },
    { name: "status", type: "'confirmed'" },
    { name: "confirmationCode", type: "string", note: "e.g. BK-7823AF" },
    { name: "totalPrice", type: "number" },
    { name: "breakdown", type: "PriceBreakdown" },
  ],
};

const T_OnSelect: ArchTypeDef = {
  name: "onSelect(id)",
  kind: "callback",
  fields: [
    { name: "id", type: "string", note: "selected listing id" },
  ],
};

const T_GetDetail: ArchTypeDef = {
  name: "GET /api/listings/:id",
  kind: "request",
  fields: [
    { name: "id", type: "string", note: "listing identifier" },
  ],
};

// ── Scenarios ───────────────────────────────────────────────────────

export const BOOKING_PLATFORM_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  title: "Architecture",
  thesis:
    "SearchPage owns all state. Props flow down to display components; callbacks bubble events back up. The API layer is only touched by the state owner.",
  viewBox: "0 0 480 280",
  nodes: NODES,
  edges: EDGES,
  protagonist: "search-page",
  scenarios: [
    {
      id: "search-flow",
      label: "Search listings",
      blurb:
        "User enters a location and dates. SearchPage fetches results and distributes them to Grid and MapView.",
      steps: [
        {
          nodeId: "search-bar",
          caption: "User types 'Bali' and selects Jun 15–18.",
          stateAfter: [
            { key: "results", value: "[]" },
            { key: "selected", value: "null" },
            { key: "loading", value: "true" },
            { key: "viewMode", value: '"search"' },
          ],
        },
        {
          nodeId: "api",
          caption: "SearchPage sends a search request with location and dates.",
          payload: {
            type: T_SearchRequest,
            sample: [
              "GET /api/search",
              '  ?location=Bali',
              '  &checkIn=2026-06-15',
              '  &checkOut=2026-06-18',
              '  &guests=2',
            ],
          },
          stateAfter: [
            { key: "results", value: "[]" },
            { key: "selected", value: "null" },
            { key: "loading", value: "true" },
            { key: "viewMode", value: '"search"' },
          ],
        },
        {
          nodeId: "search-page",
          caption: "API returns 24 listings matching 'Bali'. State updates.",
          payload: {
            type: T_SearchResponse,
            sample: [
              "{",
              "  listings: ListingSummary[24],",
              "  total: 24,",
              "  hasMore: false",
              "}",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: "null" },
            { key: "loading", value: "false" },
            { key: "viewMode", value: '"search"' },
          ],
        },
        {
          nodeId: "listing-grid",
          caption: "Grid receives the listing summaries — lightweight data, no detail.",
          payload: {
            type: T_GridProps,
            sample: [
              "{",
              "  listings: ListingSummary[24],",
              "  loading: false,",
              "  onSelect: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: "null" },
            { key: "loading", value: "false" },
            { key: "viewMode", value: '"search"' },
          ],
        },
      ],
    },
    {
      id: "view-detail",
      label: "View listing",
      blurb:
        "User clicks a card. SearchPage fetches full detail and availability, then opens the DetailPanel.",
      steps: [
        {
          nodeId: "listing-grid",
          caption: "User clicks 'Oceanfront Villa'. Grid fires onSelect callback.",
          payload: {
            type: T_OnSelect,
            sample: ['onSelect("listing-0")'],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: "null" },
            { key: "loading", value: "true" },
            { key: "viewMode", value: '"search"' },
          ],
        },
        {
          nodeId: "api",
          caption: "SearchPage fetches detail + availability in parallel.",
          payload: {
            type: T_GetDetail,
            sample: [
              "Promise.all([",
              '  GET /api/listings/listing-0,',
              '  GET /api/listings/listing-0/availability',
              "])",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: '"listing-0"' },
            { key: "loading", value: "true" },
            { key: "viewMode", value: '"detail"' },
          ],
        },
        {
          nodeId: "search-page",
          caption: "Both responses arrive. State updates with detail + pricing.",
          payload: {
            type: T_ListingDetail,
            sample: [
              "{",
              '  ...ListingSummary,',
              "  images: string[5],",
              "  amenities: Amenity[6],",
              '  host: { name: "Made", superhost: true }',
              "}",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: '"Oceanfront Villa"' },
            { key: "loading", value: "false" },
            { key: "viewMode", value: '"detail"' },
          ],
        },
        {
          nodeId: "detail-panel",
          caption: "DetailPanel renders images, amenities, and availability calendar.",
          payload: {
            type: T_DetailProps,
            sample: [
              "{",
              "  listing: ListingDetail,",
              "  availability: DateAvailability[30],",
              "  onBook: fn,",
              "  onBack: fn",
              "}",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: '"Oceanfront Villa"' },
            { key: "loading", value: "false" },
            { key: "viewMode", value: '"detail"' },
          ],
        },
        {
          nodeId: "avail-calendar",
          caption: "Calendar shows per-day prices. Blocked dates are greyed out.",
          payload: {
            type: T_AvailabilityResponse,
            sample: [
              "{",
              "  dates: [",
              '    { date: "Jun 15", price: 185, available: true },',
              '    { date: "Jun 16", price: 240, available: true },',
              "    ...",
              "  ]",
              "}",
            ],
          },
          stateAfter: [
            { key: "results", value: "24" },
            { key: "selected", value: '"Oceanfront Villa"' },
            { key: "loading", value: "false" },
            { key: "viewMode", value: '"detail"' },
          ],
        },
      ],
    },
    {
      id: "book-stay",
      label: "Book a stay",
      blurb:
        "User completes checkout. BookingForm collects details, SearchPage POSTs to the API, and the confirmation arrives.",
      steps: [
        {
          nodeId: "booking-form",
          caption: "User fills in guest details and clicks 'Confirm Booking'.",
          stateAfter: [
            { key: "viewMode", value: '"booking"' },
            { key: "bookingStep", value: '"payment"' },
            { key: "confirmed", value: "false" },
          ],
        },
        {
          nodeId: "search-page",
          caption: "SearchPage validates and sends the booking request.",
          payload: {
            type: T_BookingRequest,
            sample: [
              "POST /api/bookings",
              '{  listingId: "listing-0",',
              '   checkIn: "2026-06-15",',
              '   checkOut: "2026-06-18",',
              "   guests: { adults: 2 }",
              "}",
            ],
          },
          stateAfter: [
            { key: "viewMode", value: '"booking"' },
            { key: "bookingStep", value: '"payment"' },
            { key: "confirmed", value: "false" },
            { key: "loading", value: "true" },
          ],
        },
        {
          nodeId: "api",
          caption: "Server validates availability, creates booking, returns confirmation.",
          payload: {
            type: T_BookingConfirmation,
            sample: [
              "{",
              '  bookingId: "bk_7823af",',
              '  status: "confirmed",',
              '  confirmationCode: "BK-7823AF",',
              "  totalPrice: 781",
              "}",
            ],
          },
          stateAfter: [
            { key: "viewMode", value: '"booking"' },
            { key: "bookingStep", value: '"confirm"' },
            { key: "confirmed", value: "true" },
            { key: "loading", value: "false" },
          ],
        },
        {
          nodeId: "booking-form",
          caption: "Confirmation screen shows booking code and total.",
          payload: {
            type: T_BookingConfirmation,
            sample: [
              "Confirmation: BK-7823AF",
              "3 nights at $185/night",
              "Total: $781",
            ],
          },
          stateAfter: [
            { key: "viewMode", value: '"booking"' },
            { key: "bookingStep", value: '"confirm"' },
            { key: "confirmed", value: "true" },
            { key: "loading", value: "false" },
          ],
        },
      ],
    },
  ],
};
