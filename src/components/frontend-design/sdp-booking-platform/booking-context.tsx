"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";
export type ViewMode = "search" | "detail" | "booking";
export type PropertyType = "apartment" | "house" | "villa" | "cabin" | "studio";

export type Listing = {
  id: string;
  index: number;
  name: string;
  location: string;
  propertyType: PropertyType;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  superhost: boolean;
  instantBook: boolean;
  amenities: string[];
  mapX: number;
  mapY: number;
  imageSeed: number;
};

export type DayAvailability = {
  date: string;
  day: number;
  available: boolean;
  price: number;
  minStay: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

// ── Constants ───────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "instant-book", label: "Instant book or request-to-book?", description: "Instant book simplifies UX but needs availability locks" },
  { id: "multi-currency", label: "Multi-currency support?", description: "Conversion rates, locale-aware formatting" },
  { id: "dynamic-pricing", label: "Date-based dynamic pricing?", description: "Weekend/seasonal rates, surge pricing logic" },
  { id: "map-search", label: "Map-based search?", description: "Geo queries, marker clustering, viewport-based loading" },
  { id: "reviews", label: "Review and rating system?", description: "Trust signals, host responses, rating breakdown" },
];

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 11) return "optimizing";
  if (step <= 14) return "polishing";
  return "production";
}

// ── API Endpoints ───────────────────────────────────────────────

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/search",
    description: "Search and filter listings with pagination",
    usedBy: "SearchPage → ListingGrid",
    params: [
      { name: "location", type: "string?", note: "city or region query" },
      { name: "checkIn", type: "string?", note: "ISO date" },
      { name: "checkOut", type: "string?", note: "ISO date" },
      { name: "guests", type: "number", note: "min capacity" },
      { name: "priceMin", type: "number?", note: "floor filter" },
      { name: "priceMax", type: "number?", note: "ceiling filter" },
      { name: "propertyType", type: "string[]?", note: "union filter" },
      { name: "page", type: "number", note: "offset pagination" },
    ],
    responseType: "SearchResponse",
  },
  {
    method: "GET",
    path: "/api/listings/:id",
    description: "Full listing detail with host and amenities",
    usedBy: "SearchPage → DetailPanel",
    params: [
      { name: "id", type: "string", note: "listing identifier" },
    ],
    responseType: "ListingDetailResponse",
  },
  {
    method: "GET",
    path: "/api/listings/:id/availability",
    description: "Date-level availability and dynamic pricing",
    usedBy: "DetailPanel → AvailCalendar",
    params: [
      { name: "id", type: "string", note: "listing identifier" },
      { name: "startDate", type: "string", note: "month start" },
      { name: "endDate", type: "string", note: "month end" },
    ],
    responseType: "AvailabilityResponse",
  },
  {
    method: "POST",
    path: "/api/bookings",
    description: "Create a booking with guest and payment info",
    usedBy: "BookingForm → API",
    params: [
      { name: "listingId", type: "string", note: "target listing" },
      { name: "checkIn", type: "string", note: "ISO date" },
      { name: "checkOut", type: "string", note: "ISO date" },
      { name: "guests", type: "GuestCount", note: "adults + children" },
      { name: "guestDetails", type: "GuestDetails", note: "name, email, phone" },
    ],
    responseType: "BookingConfirmation",
  },
  {
    method: "GET",
    path: "/api/listings/:id/reviews",
    description: "Paginated reviews with rating breakdown",
    usedBy: "DetailPanel → ReviewList",
    params: [
      { name: "id", type: "string", note: "listing identifier" },
      { name: "page", type: "number", note: "offset pagination" },
      { name: "sort", type: "string?", note: "recent | rating" },
    ],
    responseType: "ReviewListResponse",
  },
];

// ── Data Models ─────────────────────────────────────────────────

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  extends?: string;
  fields: TypeField[];
};

export const DATA_MODELS: TypeDef[] = [
  {
    name: "ListingSummary",
    category: "api",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string", note: "display name" },
      { name: "location", type: "string", note: "city, country" },
      { name: "coordinates", type: "LatLng", note: "for map pin" },
      { name: "pricePerNight", type: "number", note: "base rate" },
      { name: "rating", type: "number", note: "0–5 average" },
      { name: "reviewCount", type: "number" },
      { name: "thumbnailUrl", type: "string", note: "320px card image" },
      { name: "propertyType", type: "PropertyType" },
      { name: "superhost", type: "boolean", note: "trust badge" },
      { name: "instantBook", type: "boolean" },
    ],
  },
  {
    name: "ListingDetail",
    category: "api",
    extends: "ListingSummary",
    fields: [
      { name: "description", type: "string" },
      { name: "images", type: "string[]", note: "carousel URLs" },
      { name: "amenities", type: "Amenity[]" },
      { name: "bedrooms", type: "number" },
      { name: "bathrooms", type: "number" },
      { name: "maxGuests", type: "number" },
      { name: "host", type: "HostInfo" },
      { name: "houseRules", type: "string[]" },
      { name: "cancellationPolicy", type: "CancelPolicy" },
    ],
  },
  {
    name: "DateAvailability",
    category: "api",
    fields: [
      { name: "date", type: "string", note: "YYYY-MM-DD" },
      { name: "available", type: "boolean" },
      { name: "price", type: "number", note: "dynamic rate" },
      { name: "minStay", type: "number", note: "nights" },
    ],
  },
  {
    name: "PriceBreakdown",
    category: "api",
    fields: [
      { name: "nightlyRate", type: "number" },
      { name: "nights", type: "number" },
      { name: "subtotal", type: "number" },
      { name: "cleaningFee", type: "number" },
      { name: "serviceFee", type: "number" },
      { name: "taxes", type: "number" },
      { name: "total", type: "number" },
    ],
  },
  {
    name: "SearchState",
    category: "state",
    fields: [
      { name: "query", type: "string" },
      { name: "dateRange", type: "DateRange | null" },
      { name: "guests", type: "GuestCount" },
      { name: "filters", type: "FilterSet" },
      { name: "results", type: "ListingSummary[]" },
      { name: "loading", type: "boolean" },
      { name: "page", type: "number" },
    ],
  },
  {
    name: "BookingState",
    category: "state",
    fields: [
      { name: "step", type: "'guests' | 'payment' | 'confirm'" },
      { name: "listing", type: "ListingDetail" },
      { name: "dates", type: "DateRange" },
      { name: "guestDetails", type: "GuestDetails" },
      { name: "confirmed", type: "boolean" },
    ],
  },
  {
    name: "FilterSet",
    category: "props",
    fields: [
      { name: "priceRange", type: "[number, number]" },
      { name: "propertyTypes", type: "PropertyType[]" },
      { name: "amenities", type: "string[]" },
      { name: "instantBookOnly", type: "boolean" },
      { name: "superhostOnly", type: "boolean" },
    ],
  },
  {
    name: "GuestCount",
    category: "props",
    fields: [
      { name: "adults", type: "number", note: "min 1" },
      { name: "children", type: "number" },
      { name: "infants", type: "number" },
    ],
  },
];

// ── Feature unlock map ──────────────────────────────────────────

export const FEATURE_UNLOCK: Record<string, number> = {
  filters: 5,
  datePicker: 6,
  detailView: 7,
  availability: 8,
  bookingFlow: 9,
  mapView: 10,
  realtime: 11,
  searchOptimization: 12,
  responsive: 13,
  errorHandling: 14,
};

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

import {
  PROPERTY_TYPES as ENGINE_PROPERTY_TYPES,
  generateListings as engineGenerateListings,
  generateMonthDays as engineGenerateMonthDays
} from "./engine/booking-helpers";

export const PROPERTY_TYPES = ENGINE_PROPERTY_TYPES;
export const generateListings = engineGenerateListings;
export const generateMonthDays = engineGenerateMonthDays;


// ── Extra types ─────────────────────────────────────────────────

export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type BookingError = {
  type: "conflict" | "payment" | "network";
  message: string;
  alternativeDates?: string;
} | null;

// ── Context ─────────────────────────────────────────────────────

type BookingContextValue = {
  activeStep: number;
  phase: Phase;

  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  listings: Listing[];
  filteredListings: Listing[];

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedQuery: string;
  isSearching: boolean;
  selectedTypes: Set<string>;
  toggleType: (t: string) => void;
  priceRange: [number, number];
  setPriceRange: (r: [number, number]) => void;
  guestCount: number;
  setGuestCount: (n: number) => void;

  checkIn: string | null;
  checkOut: string | null;
  setDateRange: (ci: string | null, co: string | null) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;

  selectedListing: Listing | null;
  selectListing: (listing: Listing | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  bookingStep: number;
  setBookingStep: (s: number) => void;
  bookingConfirmed: boolean;
  setBookingConfirmed: (b: boolean) => void;
  guestDetails: GuestDetails;
  setGuestDetails: (d: GuestDetails) => void;
  bookingError: BookingError;
  setBookingError: (e: BookingError) => void;
  simulateConflict: boolean;
  setSimulateConflict: (b: boolean) => void;

  hoveredMarker: string | null;
  setHoveredMarker: (id: string | null) => void;

  featureToggles: Record<string, boolean>;
  toggleFeature: (f: string) => void;
  isActive: (feature: string) => boolean;

  loadedSet: Set<string>;
  priceFlash: string | null;
  realtimeEvents: { time: string; label: string; type: string }[];

  metrics: { domNodes: number; networkReqs: number; searchLatency: string; cls: number };
  stateEntries: StateEntry[];
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be within BookingProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────

export function BookingProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const phase = getPhase(activeStep);

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set(["instant-book", "dynamic-pricing", "reviews"]));
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({});
  const toggleFeature = useCallback((f: string) => {
    setFeatureToggles(prev => ({ ...prev, [f]: !prev[f] }));
  }, []);
  const isActive = useCallback((feature: string) => {
    const unlock = FEATURE_UNLOCK[feature];
    if (!unlock) return false;
    if (activeStep > unlock) return true;
    if (activeStep === unlock) return featureToggles[feature] ?? false;
    return false;
  }, [activeStep, featureToggles]);

  const listingCount = activeStep <= 3 ? 0 : activeStep === 4 ? 8 : 24;
  const listings = useMemo(() => generateListings(listingCount), [listingCount]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchQuery = useCallback((q: string) => {
    setSearchQuery(q);
    if (isActive("searchOptimization")) {
      setIsSearching(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(q);
        setIsSearching(false);
      }, 300);
    } else {
      setDebouncedQuery(q);
    }
  }, [isActive]);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const toggleType = useCallback((t: string) => {
    setSelectedTypes(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }, []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [guestCount, setGuestCount] = useState(2);

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const setDateRange = useCallback((ci: string | null, co: string | null) => { setCheckIn(ci); setCheckOut(co); }, []);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const selectListing = useCallback((l: Listing | null) => setSelectedListing(l), []);
  const [viewMode, setViewMode] = useState<ViewMode>("search");

  const [bookingStep, setBookingStep] = useState(1);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({ firstName: "", lastName: "", email: "", phone: "" });
  const [bookingError, setBookingError] = useState<BookingError>(null);
  const [simulateConflict, setSimulateConflict] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const [priceFlash, setPriceFlash] = useState<string | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Map<string, number>>(new Map());
  const [realtimeEvents, setRealtimeEvents] = useState<{ time: string; label: string; type: string }[]>([]);
  const priceTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rtStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive("realtime") || activeStep < 11) {
      clearInterval(priceTimerRef.current);
      clearTimeout(flashTimerRef.current);
      setPriceFlash(null);
      setRealtimeEvents([]);
      return;
    }
    rtStartRef.current = Date.now();
    setRealtimeEvents([{ time: "0.0s", label: "WS connected", type: "info" }]);

    priceTimerRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * listings.length);
      const l = listings[idx];
      if (!l) return;
      let oldPrice = 0;
      let newPrice = 0;
      setPriceOverrides(prev => {
        oldPrice = prev.get(l.id) ?? l.pricePerNight;
        const delta = Math.random() > 0.5 ? Math.round(oldPrice * 0.12) : -Math.round(oldPrice * 0.08);
        newPrice = Math.max(50, oldPrice + delta);
        const next = new Map(prev);
        next.set(l.id, newPrice);
        return next;
      });
      setPriceFlash(l.id);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setPriceFlash(null), 1200);

      const elapsed = ((Date.now() - rtStartRef.current) / 1000).toFixed(1);
      setRealtimeEvents(prev => {
        const event = { time: `${elapsed}s`, label: `${l.name} $${oldPrice} → $${newPrice}`, type: "price" };
        return [event, ...prev].slice(0, 8);
      });
    }, 4000);
    return () => {
      clearInterval(priceTimerRef.current);
      clearTimeout(flashTimerRef.current);
    };
  }, [isActive, activeStep, listings]);

  useEffect(() => {
    setPriceOverrides(new Map());
  }, [listingCount]);

  // Loading simulation
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());
  const loadTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (activeStep < 4) return;
    const allIds = listings.map(l => l.id);
    setLoadedSet(new Set());
    let loaded = 0;
    loadTimerRef.current = setInterval(() => {
      loaded += 3;
      setLoadedSet(new Set(allIds.slice(0, loaded)));
      if (loaded >= allIds.length) clearInterval(loadTimerRef.current);
    }, 150);
    return () => clearInterval(loadTimerRef.current);
  }, [activeStep, listings]);

  useEffect(() => {
    if (activeStep < 7) { setViewMode("search"); setSelectedListing(null); }
    if (activeStep < 9) { setBookingStep(1); setBookingConfirmed(false); }
    if (activeStep === 7 && listings.length > 0 && !selectedListing) {
      setSelectedListing(listings[0]);
      setViewMode("detail");
    }
    if (activeStep === 6) setCalendarOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedListing intentionally excluded to avoid loop
  }, [activeStep, listings.length]);

  const pricedListings = useMemo(() => {
    if (priceOverrides.size === 0) return listings;
    return listings.map(l => {
      const override = priceOverrides.get(l.id);
      return override !== undefined ? { ...l, pricePerNight: override } : l;
    });
  }, [listings, priceOverrides]);

  const filteredListings = useMemo(() => {
    if (!isActive("filters")) return pricedListings;
    const q = debouncedQuery.toLowerCase();
    return pricedListings.filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(l.propertyType)) return false;
      if (l.pricePerNight < priceRange[0] || l.pricePerNight > priceRange[1]) return false;
      if (l.maxGuests < guestCount) return false;
      return true;
    });
  }, [pricedListings, isActive, debouncedQuery, selectedTypes, priceRange, guestCount]);

  const metrics = useMemo(() => {
    const showOpt = isActive("searchOptimization");
    const showVirt = isActive("mapView");
    return {
      domNodes: filteredListings.length * (showVirt ? 6 : 8) + 40,
      networkReqs: filteredListings.length + (isActive("availability") ? 1 : 0),
      searchLatency: showOpt ? "48ms" : filteredListings.length > 16 ? "320ms" : "85ms",
      cls: isActive("datePicker") ? 0.02 : 0.18,
    };
  }, [filteredListings.length, isActive]);

  const stateEntries: StateEntry[] = useMemo(() => {
    const e: StateEntry[] = [
      { label: "step", value: activeStep },
      { label: "phase", value: phase },
      { label: "viewMode", value: viewMode },
      { label: "listings", value: filteredListings.length },
    ];
    if (isActive("filters")) {
      e.push({ label: "searchQuery", value: searchQuery || "(empty)" });
      if (isActive("searchOptimization") && searchQuery !== debouncedQuery) {
        e.push({ label: "debounced", value: debouncedQuery || "(pending)", highlight: true });
      }
      e.push({ label: "priceRange", value: `$${priceRange[0]}-$${priceRange[1]}` });
    }
    if (checkIn) e.push({ label: "checkIn", value: checkIn });
    if (checkOut) e.push({ label: "checkOut", value: checkOut });
    if (selectedListing) e.push({ label: "selected", value: selectedListing.name });
    if (viewMode === "booking") e.push({ label: "bookingStep", value: bookingStep });
    return e;
  }, [activeStep, phase, viewMode, filteredListings.length, isActive, searchQuery, priceRange, checkIn, checkOut, selectedListing, bookingStep]);

  const value: BookingContextValue = useMemo(() => ({
    activeStep, phase,
    scopeEnabled, toggleScope,
    listings: pricedListings, filteredListings,
    searchQuery, setSearchQuery: handleSearchQuery,
    debouncedQuery, isSearching,
    selectedTypes, toggleType,
    priceRange, setPriceRange,
    guestCount, setGuestCount,
    checkIn, checkOut, setDateRange,
    calendarOpen, setCalendarOpen,
    selectedListing, selectListing,
    viewMode, setViewMode,
    bookingStep, setBookingStep,
    bookingConfirmed, setBookingConfirmed,
    guestDetails, setGuestDetails,
    bookingError, setBookingError,
    simulateConflict, setSimulateConflict,
    hoveredMarker, setHoveredMarker,
    featureToggles, toggleFeature, isActive,
    loadedSet, priceFlash, realtimeEvents, metrics, stateEntries,
  }), [
    activeStep, phase, scopeEnabled, toggleScope,
    pricedListings, filteredListings,
    searchQuery, handleSearchQuery, debouncedQuery, isSearching,
    selectedTypes, toggleType, priceRange, setPriceRange,
    guestCount, setGuestCount, checkIn, checkOut, setDateRange,
    calendarOpen, setCalendarOpen, selectedListing, selectListing,
    viewMode, setViewMode, bookingStep, setBookingStep,
    bookingConfirmed, setBookingConfirmed, guestDetails, setGuestDetails,
    bookingError, setBookingError, simulateConflict, setSimulateConflict,
    hoveredMarker, setHoveredMarker, featureToggles, toggleFeature, isActive,
    loadedSet, priceFlash, realtimeEvents, metrics, stateEntries,
  ]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
