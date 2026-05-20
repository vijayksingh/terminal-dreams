"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  BookingProvider,
  useBooking,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  MONTH_NAMES,
  PROPERTY_TYPES,
  generateMonthDays,
  type Listing,
  type TypeDef,
  type GuestDetails,
} from "./booking-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { BOOKING_PLATFORM_ARCH_CONFIG } from "./architecture-scenarios";
import { MiniCalendar, MiniMap, AvailabilityCalendar } from "./ui/BookingComponents";
import styles from "./BookingPlatformLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function BookingPlatformLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();

  return (
    <BookingProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
            noMotion ? (
              <PlanningView activeStep={activeStep} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`planning-${activeStep}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={TRANSITION.enterCard}
                >
                  <PlanningView activeStep={activeStep} />
                </motion.div>
              </AnimatePresence>
            )
          ) : (
            <BookingEvolution />
          )}
        </div>
      </div>
    </BookingProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "G", "F", "D", "Det",
  "$$", "BK", "Map",
  "RT", "Opt", "Mob",
  "Err", "∞",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Build steps">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <RequirementsView />;
  if (activeStep === 2) return <ApiDesignView />;
  return <ComponentTreeView />;
}

const BOOKING_SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  "instant-book": { loc: 90, components: 2 },
  "multi-currency": { loc: 60, components: 1 },
  "dynamic-pricing": { loc: 110, components: 2 },
  "map-search": { loc: 150, components: 3 },
  reviews: { loc: 80, components: 2 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useBooking();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter(s => scopeEnabled.has(s.id))
      .map(s => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    let loc = 220;
    let components = 4;
    scopeEnabled.forEach(id => {
      const c = BOOKING_SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; components += c.components; }
    });
    const grade = loc < 350 ? "Low" : loc < 550 ? "Medium" : "High";
    return { loc, components, grade };
  }, [scopeEnabled]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Scope checklist</h3>
      <div className={styles.checklist}>
        {SCOPE_ITEMS.map(item => (
          <button
            key={item.id}
            className={styles.checkItem}
            data-checked={scopeEnabled.has(item.id) ? "true" : undefined}
            onClick={() => toggleScope(item.id)}
            type="button"
            aria-pressed={scopeEnabled.has(item.id)}
          >
            <span className={styles.checkToggle}>
              {scopeEnabled.has(item.id) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className={styles.checkLabel}>{item.label}</span>
              <p className={styles.checkDesc}>{item.description}</p>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.scopeSummary}>
        <div className={styles.scopeLabel}>Scope</div>
        <div className={styles.scopeValue}>{summary}</div>
      </div>
      <div className={styles.complexityMeter} aria-live="polite">
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Est. LOC</span>
          <span className={styles.complexityValue}>{complexity.loc}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Components</span>
          <span className={styles.complexityValue}>{complexity.components}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Complexity</span>
          <span className={styles.complexityValue} data-grade={complexity.grade.toLowerCase()}>{complexity.grade}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: API Design ──────────────────────────────────────────────

const BK_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = BK_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = BK_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : BK_API_TABS.length - 1)) % BK_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="bk-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="bk-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>Endpoints</button>
        <button type="button" role="tab" id="bk-tab-types" aria-selected={tab === "types"} aria-controls="bk-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>Types</button>
      </div>
      <div role="tabpanel" id={`bk-panel-${tab}`} aria-labelledby={`bk-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
      </div>
    </div>
  );
}

function EndpointCards() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map(ep => {
        const key = `${ep.method}-${ep.path}`;
        const isOpen = expanded === key;
        return (
          <div
            key={key}
            className={styles.endpointCard}
            data-expanded={isOpen ? "true" : undefined}
          >
            <button
              type="button"
              className={styles.endpointHeader}
              onClick={() => setExpanded(isOpen ? null : key)}
              aria-expanded={isOpen}
              aria-controls={`bk-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className={styles.endpointDetail} id={`bk-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
                <p className={styles.endpointDesc}>{ep.description}</p>
                <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
                {ep.params.length > 0 && (
                  <>
                    <div className={styles.endpointDetailLabel}>Parameters</div>
                    <div className={styles.paramGrid}>
                      {ep.params.map(p => (
                        <div key={p.name} className={styles.paramRow}>
                          <span className={styles.paramName}>{p.name}</span>
                          <span className={styles.paramType}>{p.type}</span>
                          <span className={styles.paramNote}>{p.note}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className={styles.endpointDetailLabel}>Response</div>
                <div className={styles.responseType}>{ep.responseType}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 3: Component Architecture ──────────────────────────────────

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={BOOKING_PLATFORM_ARCH_CONFIG} />
    </div>
  );
}

// ── TypeCards ────────────────────────────────────────────────────────

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
};

function TypeCards({ category }: { category: "api" | "state" | "props" }) {
  const types = DATA_MODELS.filter(t => t.category === category);
  return (
    <div className={styles.typeCardGrid}>
      {types.map(t => <TypeCard key={t.name} typeDef={t} />)}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>{typeDef.category}</span>
      </div>
      {typeDef.extends && (
        <div className={styles.typeCardExtends}>extends <span>{typeDef.extends}</span></div>
      )}
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f, i) => (
          <div key={i} className={styles.typeFieldRow}>
            {f.name && <span className={styles.typeFieldName}>{f.name}</span>}
            <span className={styles.typeFieldType}>{f.type}</span>
            {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Booking evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function BookingEvolution() {
  const { activeStep, stateEntries } = useBooking();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionStack}>
      <MetricsBar />

      {noMotion ? (
        <StepControls />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TRANSITION.enterCard}
          >
            <StepControls />
          </motion.div>
        </AnimatePresence>
      )}

      <BookingView />

      {noMotion ? (
        <StepWidget />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`widget-${activeStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.enterCard}
          >
            <StepWidget />
          </motion.div>
        </AnimatePresence>
      )}

      <StateInspector entries={stateEntries} title="Booking State" />
    </div>
  );
}

// ── Metrics bar ─────────────────────────────────────────────────────

function MetricsBar() {
  const { metrics } = useBooking();
  return (
    <div className={styles.metricsBar} role="status" aria-label="Simulated performance metrics">
      <MetricCard label="DOM" value={metrics.domNodes} bad={metrics.domNodes > 200} good={metrics.domNodes <= 100} />
      <MetricCard label="Network" value={metrics.networkReqs} bad={metrics.networkReqs > 25} good={metrics.networkReqs <= 10} />
      <MetricCard label="Latency" value={metrics.searchLatency} bad={metrics.searchLatency === "320ms"} good={metrics.searchLatency === "48ms"} />
      <MetricCard label="CLS" value={metrics.cls.toFixed(2)} bad={metrics.cls > 0.1} good={metrics.cls <= 0.05} />
    </div>
  );
}

function MetricCard({ label, value, bad, good }: { label: string; value: string | number; bad: boolean; good: boolean }) {
  const status = bad ? "bad" : good ? "good" : "neutral";
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-status={status}>{value}</div>
    </div>
  );
}

// ── Step controls ───────────────────────────────────────────────────

function StepControls() {
  const { activeStep } = useBooking();

  switch (activeStep) {
    case 4: return <PredictionChallenge question="You're rendering 8 listing cards. What data does each card minimally need?" options={["Just name + price — users will click for details", "Name, price, location, rating, image URL", "Full listing object including amenities and reviews", "Everything — prefetch all data to avoid detail-view loading"]} correctIndex={1} explanation="The card needs name, price, location, rating, and image URL — enough to make a decision without clicking. Amenities and reviews belong in the detail view (fetched on demand). Prefetching everything wastes bandwidth and delays initial render." />;
    case 5: return <PredictionChallenge question="Adding live search to 8 listings. What happens to search latency?" options={["Negligible — 8 items is nothing", "~50ms — DOM queries add up", "~320ms — filtering triggers full re-render"]} correctIndex={0} explanation="At 8 listings, even naive filtering is instant. The problem appears at scale — try adding more filters and watch step 12." />;
    case 6: return <StepMessage text="Date picker opens. Select check-in and check-out dates." />;
    case 7: return <StepMessage text="Click a listing card to see the detail panel." />;
    case 8: return <PredictionChallenge question="Pricing varies by day. Where should dynamic prices be computed?" options={["Client — user sees instant updates", "Server — single source of truth", "Both — server is authority, client previews"]} correctIndex={2} explanation="Real booking platforms compute server-side for accuracy but show client-side estimates for responsiveness. The price you see while browsing is a preview — the server confirms at checkout." />;
    case 9: return <StepMessage text="Click 'Book Now' to enter the checkout flow." />;
    case 10: return <PredictionChallenge question="Adding a map alongside the listing grid. What's the biggest UX risk?" options={["Map and list get out of sync", "Double rendering tanks performance", "Map steals 50% of screen space"]} correctIndex={0} explanation="Bidirectional sync is the hard problem. Hovering a map pin must highlight the listing card and vice versa. Without shared state (hoveredMarker), they feel like two unrelated views." />;
    case 11: return <PredictionChallenge question="Two users view the same listing. User A books it. What should User B see?" options={["Nothing — they'll find out at checkout", "A toast saying 'just booked' with no price change", "Price flash + availability update via push event", "Page auto-redirects to the next listing"]} correctIndex={2} explanation="Real-time price flash + availability is the standard. Optimistic UI shows the old price briefly, then the push event corrects it. This prevents double-bookings without forcing full page reloads." />;
    case 12: return <PredictionChallenge question="Users type in the search box. When should you fire the search query?" options={["Every keystroke (0ms)", "After 150ms pause", "After 300ms pause", "On Enter key only"]} correctIndex={2} explanation="300ms is the sweet spot — fast enough to feel responsive, slow enough to batch most word completions. 150ms still fires mid-word. Enter-only breaks the 'instant filter' mental model." />;
    case 13: return <PredictionChallenge question="On mobile, you have a listing grid + map. What's the best layout approach?" options={["Stack vertically — grid on top, map below", "Tabs — toggle between list view and map view", "Collapse map into a floating button that opens an overlay", "Keep side-by-side but at 50/50"]} correctIndex={2} explanation="Airbnb's pattern: the map becomes a floating 'Map' button on mobile. The full grid uses the screen width. Tapping 'Map' opens a full-screen overlay. Tabs add a mode-switch cognitive load. Stacking wastes half the viewport on a tiny map." />;
    case 14: return <PredictionChallenge question="User clicks 'Confirm Booking' but the server returns 409 Conflict. What happened?" options={["Invalid credit card", "Session expired", "Another guest booked the same dates", "Server rate-limited the request"]} correctIndex={2} explanation="409 Conflict means the resource state changed between read and write. In booking, this is a race condition — two users selected the same dates, but only one can win. The UI should show the conflict, re-fetch availability, and let the user pick new dates." />;
    case 15: return <PredictionChallenge question="Your platform supports 12 currencies. Where should currency conversion happen?" options={["Client-side — faster display, no extra API calls", "Server-side — single source of truth for exchange rates", "CDN edge — cached rates closest to user", "Both client and server — preview on client, confirm on server"]} correctIndex={3} explanation="Client shows a preview conversion for instant feedback using cached rates. Server is the authority — the final booking price is always server-computed with real-time exchange rates. This is the same optimistic pattern as pricing: client previews, server confirms." />;
    default: return null;
  }
}

function StepMessage({ text, severity }: { text: string; severity?: "warning" }) {
  return <div className={styles.stepMessage} data-severity={severity}>{text}</div>;
}

function PredictionChallenge({ question, options, correctIndex, explanation }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>{question}</div>
      <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            data-correct={revealed && i === correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
            onClick={() => !revealed && setSelected(i)}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
          {selected === correctIndex ? "✓ " : "✗ "}{explanation}
        </div>
      )}
    </div>
  );
}

// ── Main booking view ───────────────────────────────────────────────

function BookingView() {
  const { viewMode, isActive } = useBooking();

  return (
    <div className={styles.bookingContainer}>
      {isActive("filters") && viewMode !== "booking" && <SearchBarUI />}
      <div className={styles.viewArea}>
        {viewMode === "search" && <SearchResultsView />}
        {viewMode === "detail" && <DetailView />}
        {viewMode === "booking" && <BookingFlowView />}
      </div>
    </div>
  );
}

// ── Search bar ──────────────────────────────────────────────────────

function SearchBarUI() {
  const { searchQuery, setSearchQuery, isSearching, guestCount, setGuestCount, checkIn, checkOut, calendarOpen, setCalendarOpen, isActive, setDateRange, viewMode } = useBooking();

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchBar} data-searching={isSearching ? "true" : undefined}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Where to?"
          aria-label="Search listings by location or name"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button
          type="button"
          className={styles.searchDateBtn}
          onClick={() => setCalendarOpen(!calendarOpen)}
          aria-expanded={calendarOpen}
          aria-label="Select dates"
        >
          {checkIn && checkOut ? `${checkIn.slice(5)} → ${checkOut.slice(5)}` : "Dates"}
        </button>
        <div className={styles.guestControl}>
          <button type="button" className={styles.guestBtn} aria-label="Fewer guests" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>-</button>
          <span className={styles.guestCount} aria-live="polite" aria-label={`${guestCount} guests`}>{guestCount}</span>
          <button type="button" className={styles.guestBtn} aria-label="More guests" onClick={() => setGuestCount(Math.min(10, guestCount + 1))}>+</button>
        </div>
      </div>

      {calendarOpen && viewMode === "search" && <MiniCalendar />}
      <FilterChips />
    </div>
  );
}

function FilterChips() {
  const { selectedTypes, toggleType, priceRange, setPriceRange } = useBooking();

  return (
    <div className={styles.filterRow}>
      {PROPERTY_TYPES.map(t => (
        <button
          key={t}
          type="button"
          className={styles.filterChip}
          data-active={selectedTypes.has(t) ? "true" : undefined}
          aria-pressed={selectedTypes.has(t)}
          onClick={() => toggleType(t)}
        >
          {t}
        </button>
      ))}
      <div className={styles.priceSlider}>
        <span className={styles.priceLabel}>${priceRange[0]}</span>
        <input
          type="range"
          min={0}
          max={500}
          step={25}
          value={priceRange[1]}
          onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
          className={styles.rangeInput}
        />
        <span className={styles.priceLabel}>${priceRange[1]}</span>
      </div>
    </div>
  );
}



// ── Search results view ─────────────────────────────────────────────

const PICSUM_LIMIT = 24;

function SearchResultsView() {
  const { filteredListings, loadedSet, isActive, isSearching, selectListing, setViewMode, hoveredMarker, setHoveredMarker, priceFlash } = useBooking();
  const showMap = isActive("mapView");
  const showSkeleton = isActive("searchOptimization");

  return (
    <div className={showMap ? styles.splitLayout : styles.gridLayout}>
      <div className={styles.srOnly} role="status" aria-live="polite">
        {filteredListings.length} listings found
      </div>
      <div className={styles.listingGrid}>
        {filteredListings.map(listing => {
          const loaded = loadedSet.has(listing.id);
          const isHovered = hoveredMarker === listing.id;

          if (!loaded && showSkeleton) {
            return <div key={listing.id} className={styles.skeletonCard}><div className={styles.skeletonImg} /><div className={styles.skeletonLine} /><div className={styles.skeletonLineShort} /></div>;
          }

          return (
            <ListingCard
              key={listing.id}
              listing={listing}
              highlighted={isHovered}
              flashing={priceFlash === listing.id}
              onHover={showMap ? setHoveredMarker : undefined}
              onClick={() => {
                if (isActive("detailView")) {
                  selectListing(listing);
                  setViewMode("detail");
                }
              }}
            />
          );
        })}
      </div>
      {showMap && <MiniMap />}
    </div>
  );
}

function ListingCard({ listing, highlighted, flashing, onClick, onHover }: {
  listing: Listing;
  highlighted: boolean;
  flashing?: boolean;
  onClick: () => void;
  onHover?: (id: string | null) => void;
}) {
  const picsumUrl = listing.index < PICSUM_LIMIT
    ? `https://picsum.photos/seed/b${listing.imageSeed}/280/200`
    : null;

  return (
    <div
      className={styles.listingCard}
      data-highlighted={highlighted ? "true" : undefined}
      data-flashing={flashing ? "true" : undefined}
      role="button"
      tabIndex={0}
      aria-label={`${listing.name}, ${listing.location}, $${listing.pricePerNight} per night, ${listing.rating} stars`}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={styles.cardImage}>
        {picsumUrl ? (
          <img src={picsumUrl} alt={listing.name} className={styles.cardImg} loading="lazy" />
        ) : (
          <div className={styles.cardImgFill} style={{ background: `oklch(50% 0.12 ${(listing.index * 37 + 15) % 360})` }} />
        )}
        {listing.superhost && <span className={styles.superhostBadge}>Superhost</span>}
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardLocation}>{listing.location}</div>
        <div className={styles.cardName}>{listing.name}</div>
        <div className={styles.cardBottom}>
          <span className={styles.cardPrice} data-flash={flashing ? "true" : undefined}>${listing.pricePerNight}<span>/night</span></span>
          <span className={styles.cardRating}>{"★"} {listing.rating}</span>
        </div>
      </div>
    </div>
  );
}



// ── Detail view ─────────────────────────────────────────────────────

function DetailView() {
  const { selectedListing, setViewMode, setBookingStep, isActive, checkIn, checkOut } = useBooking();
  if (!selectedListing) return null;

  const listing = selectedListing;
  const picsumUrl = `https://picsum.photos/seed/b${listing.imageSeed}/500/320`;
  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  return (
    <div className={styles.detailView}>
      <div className={styles.detailHero}>
        <div className={styles.detailImage}>
          <img src={picsumUrl} alt={listing.name} className={styles.detailImg} loading="lazy" />
        </div>
        <div className={styles.detailHeroInfo}>
          <button type="button" className={styles.backButton} onClick={() => setViewMode("search")}>
            {"←"} Back
          </button>
          <h3 className={styles.detailName}>{listing.name}</h3>
          <div className={styles.detailMeta}>
            {listing.location} {"·"} {listing.propertyType}
            {listing.superhost && <span className={styles.superhostBadge}>Superhost</span>}
          </div>
          <div className={styles.detailRating}>
            {"★"} {listing.rating} ({listing.reviewCount} reviews)
          </div>
        </div>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.detailLeft}>
          <div className={styles.detailStats}>
            <span>{listing.bedrooms || "Studio"} {listing.bedrooms ? "bed" : ""}</span>
            <span>{"·"}</span>
            <span>{listing.bathrooms} bath</span>
            <span>{"·"}</span>
            <span>{listing.maxGuests} guests</span>
          </div>
          <div className={styles.amenityList}>
            {listing.amenities.map(a => <span key={a} className={styles.amenityChip}>{a}</span>)}
          </div>
          {isActive("availability") && <AvailabilityCalendar listing={listing} />}
        </div>

        <div className={styles.detailRight}>
          <div className={styles.priceBox}>
            <div className={styles.priceBoxHeader}>
              <span className={styles.pricePerNight}>${listing.pricePerNight}</span>
              <span className={styles.pricePerNightLabel}>/ night</span>
            </div>
            {nights > 0 && (
              <>
                <div className={styles.priceDivider} />
                <div className={styles.priceRow}><span>{nights} nights {"×"} ${listing.pricePerNight}</span><span>${nights * listing.pricePerNight}</span></div>
                <div className={styles.priceRow}><span>Cleaning fee</span><span>$75</span></div>
                <div className={styles.priceRow}><span>Service fee</span><span>${Math.round(nights * listing.pricePerNight * 0.15)}</span></div>
                <div className={styles.priceDivider} />
                <div className={styles.priceTotal}><span>Total</span><span>${nights * listing.pricePerNight + 75 + Math.round(nights * listing.pricePerNight * 0.15)}</span></div>
              </>
            )}
            {nights === 0 && (
              <div className={styles.priceHint}>Select dates to see total</div>
            )}
            {isActive("bookingFlow") && nights > 0 && (
              <button type="button" className={styles.bookButton} onClick={() => { setBookingStep(1); setViewMode("booking"); }}>
                Book Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



// ── Booking flow ────────────────────────────────────────────────────

function BookingFlowView() {
  const { bookingStep, setBookingStep, bookingConfirmed, setBookingConfirmed, selectedListing, setViewMode, checkIn, checkOut, guestDetails, setGuestDetails, bookingError, setBookingError, simulateConflict, setSimulateConflict } = useBooking();
  if (!selectedListing) return null;

  const listing = selectedListing;
  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 3;
  const subtotal = nights * listing.pricePerNight;
  const total = subtotal + 75 + Math.round(subtotal * 0.15);

  return (
    <div className={styles.bookingFlow}>
      <div className={styles.bookingProgress}>
        {["Guests", "Payment", "Confirmed"].map((label, i) => (
          <span key={label} className={styles.bookingProgressStep} data-active={bookingStep >= i + 1 ? "true" : undefined} data-current={bookingStep === i + 1 ? "true" : undefined}>
            <span className={styles.progressDot}>{bookingStep > i + 1 ? "✓" : i + 1}</span>
            {label}
          </span>
        ))}
      </div>

      {bookingStep === 1 && (
        <div className={styles.bookingStepContent}>
          <h4 className={styles.bookingStepTitle}>Guest Details</h4>
          <div className={styles.formGrid}>
            <label className={styles.formField}><span>First Name</span><input type="text" placeholder="Jane" value={guestDetails.firstName} onChange={e => setGuestDetails({ ...guestDetails, firstName: e.target.value })} /></label>
            <label className={styles.formField}><span>Last Name</span><input type="text" placeholder="Smith" value={guestDetails.lastName} onChange={e => setGuestDetails({ ...guestDetails, lastName: e.target.value })} /></label>
            <label className={styles.formField}><span>Email</span><input type="email" placeholder="jane@example.com" value={guestDetails.email} onChange={e => setGuestDetails({ ...guestDetails, email: e.target.value })} /></label>
            <label className={styles.formField}><span>Phone</span><input type="tel" placeholder="+1 555-0123" value={guestDetails.phone} onChange={e => setGuestDetails({ ...guestDetails, phone: e.target.value })} /></label>
          </div>
          <div className={styles.bookingActions}>
            <button type="button" className={styles.bookingBackBtn} onClick={() => setViewMode("detail")}>{"←"} Back</button>
            <button type="button" className={styles.bookingNextBtn} onClick={() => setBookingStep(2)}>Continue {"→"}</button>
          </div>
        </div>
      )}

      {bookingStep === 2 && (
        <div className={styles.bookingStepContent}>
          <h4 className={styles.bookingStepTitle}>Payment Summary</h4>
          <div className={styles.bookingSummaryCard}>
            <div className={styles.summaryListing}>{listing.name}</div>
            <div className={styles.summaryDates}>{checkIn || "Jun 15"} {"→"} {checkOut || "Jun 18"} ({nights} nights)</div>
            <div className={styles.priceDivider} />
            <div className={styles.priceRow}><span>{nights} {"×"} ${listing.pricePerNight}</span><span>${subtotal}</span></div>
            <div className={styles.priceRow}><span>Cleaning fee</span><span>$75</span></div>
            <div className={styles.priceRow}><span>Service fee</span><span>${Math.round(subtotal * 0.15)}</span></div>
            <div className={styles.priceDivider} />
            <div className={styles.priceTotal}><span>Total</span><span>${total}</span></div>
          </div>
          <div className={styles.mockCard}>
            <span>{"••••"} {"••••"} {"••••"} 4242</span>
          </div>
          <div className={styles.bookingActions}>
            <button type="button" className={styles.bookingBackBtn} onClick={() => setBookingStep(1)}>{"←"} Back</button>
            <button type="button" className={styles.bookingNextBtn} onClick={() => {
              if (simulateConflict) {
                setBookingError({ type: "conflict", message: "These dates were just booked by another guest.", alternativeDates: checkIn ? (() => { const d = new Date(checkIn); d.setDate(d.getDate() + 3); const ci = d.toISOString().slice(0, 10); d.setDate(d.getDate() + 3); return `${ci} → ${d.toISOString().slice(0, 10)}`; })() : "Jun 18 → Jun 21" });
              } else {
                setBookingError(null);
                setBookingStep(3);
                setBookingConfirmed(true);
              }
            }}>Confirm Booking {"→"}</button>
          </div>
        </div>
      )}

      {bookingError && (
        <div className={styles.bookingStepContent}>
          <div className={styles.conflictPanel}>
            <div className={styles.conflictIcon}>{"✕"}</div>
            <h4 className={styles.conflictTitle}>{bookingError.message}</h4>
            {bookingError.alternativeDates && (
              <div className={styles.conflictAlt}>
                <span className={styles.conflictAltLabel}>Available alternative:</span>
                <span className={styles.conflictAltDates}>{bookingError.alternativeDates}</span>
              </div>
            )}
            <div className={styles.bookingActions}>
              <button type="button" className={styles.bookingBackBtn} onClick={() => { setBookingError(null); setViewMode("detail"); }}>Choose new dates</button>
              <button type="button" className={styles.bookingNextBtn} onClick={() => { setBookingError(null); setSimulateConflict(false); setBookingStep(3); setBookingConfirmed(true); }}>Book alternative</button>
            </div>
          </div>
        </div>
      )}

      {bookingStep === 3 && !bookingError && (
        <div className={styles.bookingStepContent}>
          <div className={styles.confirmationPanel}>
            <div className={styles.confirmCheck}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className={styles.confirmTitle}>Booking Confirmed</h4>
            <div className={styles.confirmCode}>BK-7823AF</div>
            <div className={styles.confirmDetails}>
              <div>{listing.name}</div>
              <div>{checkIn || "Jun 15"} {"→"} {checkOut || "Jun 18"}</div>
              <div className={styles.confirmTotal}>Total: ${total}</div>
            </div>
            <button type="button" className={styles.bookingNextBtn} onClick={() => { setViewMode("search"); setBookingStep(1); setBookingConfirmed(false); }}>
              Back to Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step-specific widgets (below main view)
// ═══════════════════════════════════════════════════════════════════

function StepWidget() {
  const { activeStep } = useBooking();

  switch (activeStep) {
    case 5: return <FilterStatsWidget />;
    case 6: return <DateMathWidget />;
    case 7: return <LoadPriorityWidget />;
    case 8: return <PricingWidget />;
    case 9: return <FunnelWidget />;
    case 10: return <MapStatsWidget />;
    case 11: return <RealtimeWidget />;
    case 12: return <CacheWidget />;
    case 14: return <ErrorWidget />;
    case 15: return <CWVWidget />;
    default: return null;
  }
}

function FilterStatsWidget() {
  const { listings, filteredListings, selectedTypes, isActive } = useBooking();
  const debounced = isActive("searchOptimization");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Filter impact</div>
      <div className={styles.widgetBody}>
        <div className={styles.statRow}><span>Total listings</span><span>{listings.length}</span></div>
        <div className={styles.statRow}><span>After filters</span><span>{filteredListings.length}</span></div>
        <div className={styles.statRow}><span>Active type filters</span><span>{selectedTypes.size || "none"}</span></div>
        <div className={styles.statRow}><span>Search debounce</span><span style={{ color: debounced ? "var(--color-success)" : "var(--color-warning)" }}>{debounced ? "300ms" : "off (instant)"}</span></div>
      </div>
      {!debounced && <div className={styles.widgetNote}>Every keystroke re-filters immediately. At scale, this blocks the main thread. Step 12 adds debounce.</div>}
    </div>
  );
}

function DateMathWidget() {
  const { checkIn, checkOut } = useBooking();
  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Date math</div>
      <div className={styles.widgetBody}>
        <div className={styles.statRow}><span>Check-in</span><span>{checkIn || "—"}</span></div>
        <div className={styles.statRow}><span>Check-out</span><span>{checkOut || "—"}</span></div>
        <div className={styles.statRow}><span>Nights</span><span>{nights || "—"}</span></div>
        <div className={styles.widgetNote}>Timezone: dates are calendar dates in listing timezone, not UTC timestamps.</div>
      </div>
    </div>
  );
}

function LoadPriorityWidget() {
  const priorities = ["Image (LCP)", "Title + Price", "Rating + Badge", "Amenities", "Reviews (lazy)"];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Content loading priority</div>
      <div className={styles.priorityList}>
        {priorities.map((p, i) => (
          <div key={p} className={styles.priorityItem}>
            <span className={styles.priorityNumber}>{i + 1}</span>
            <span>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingWidget() {
  const { selectedListing } = useBooking();
  if (!selectedListing) return null;
  const base = selectedListing.pricePerNight;
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Dynamic pricing</div>
      <div className={styles.widgetBody}>
        <div className={styles.statRow}><span>Weekday base</span><span>${base}</span></div>
        <div className={styles.statRow}><span>Weekend (Fri-Sat)</span><span>${Math.round(base * 1.3)}</span></div>
        <div className={styles.statRow}><span>Peak variance</span><span>+5% per cycle</span></div>
        <div className={styles.widgetNote}>Real platforms use ML models. We use a deterministic formula for the demo.</div>
      </div>
    </div>
  );
}

function FunnelWidget() {
  const { bookingStep } = useBooking();
  const steps = [
    { label: "View listing", pct: 100 },
    { label: "Select dates", pct: 62 },
    { label: "Start checkout", pct: 38 },
    { label: "Enter details", pct: 28 },
    { label: "Confirm booking", pct: 15 },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Conversion funnel</div>
      <div className={styles.funnelList}>
        {steps.map((s, i) => (
          <div key={s.label} className={styles.funnelRow}>
            <div className={styles.funnelBar} style={{ width: `${s.pct}%` }} data-active={i < bookingStep + 1 ? "true" : undefined} />
            <span className={styles.funnelLabel}>{s.label}</span>
            <span className={styles.funnelPct}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapStatsWidget() {
  const { filteredListings } = useBooking();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Map viewport</div>
      <div className={styles.widgetBody}>
        <div className={styles.statRow}><span>Visible markers</span><span>{filteredListings.length}</span></div>
        <div className={styles.statRow}><span>Cluster threshold</span><span>5px overlap</span></div>
        <div className={styles.statRow}><span>Re-query on pan</span><span>debounce 300ms</span></div>
      </div>
    </div>
  );
}

function RealtimeWidget() {
  const { realtimeEvents } = useBooking();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Event stream (live)</div>
      <div className={styles.eventList} role="log" aria-live="polite" aria-label="Realtime price events">
        {realtimeEvents.length === 0 ? (
          <div className={styles.eventRow} data-type="info">
            <span className={styles.eventTime}>—</span>
            <span>Waiting for connection...</span>
          </div>
        ) : (
          realtimeEvents.map((e, i) => (
            <div key={`${e.time}-${i}`} className={styles.eventRow} data-type={e.type}>
              <span className={styles.eventTime}>{e.time}</span>
              <span>{e.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CacheWidget() {
  const rows = [
    { query: "search?location=Bali", status: "HIT", ttl: "4:32" },
    { query: "listings/0", status: "HIT", ttl: "9:15" },
    { query: "listings/0/availability", status: "MISS", ttl: "-" },
    { query: "search?location=Tokyo", status: "MISS", ttl: "-" },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Cache strategy</div>
      <div className={styles.cacheTable}>
        {rows.map((r, i) => (
          <div key={i} className={styles.cacheRow} data-status={r.status}>
            <span className={styles.cacheQuery}>{r.query}</span>
            <span className={styles.cacheStatus}>{r.status}</span>
            <span className={styles.cacheTtl}>{r.ttl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorWidget() {
  const { simulateConflict, setSimulateConflict } = useBooking();
  const errors = [
    { scenario: "Network timeout on search", recovery: "Retry with exponential backoff (1s, 2s, 4s)" },
    { scenario: "Double-booking conflict", recovery: "Show conflict dialog, suggest alternative dates" },
    { scenario: "Payment declined", recovery: "Keep form state, highlight card field, allow retry" },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Error recovery</div>
      <div className={styles.errorList}>
        {errors.map((e, i) => (
          <div key={i} className={styles.errorItem}>
            <div className={styles.errorScenario}>{e.scenario}</div>
            <div className={styles.errorRecovery}>{e.recovery}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.filterChip}
        data-active={simulateConflict ? "true" : undefined}
        aria-pressed={simulateConflict}
        onClick={() => setSimulateConflict(!simulateConflict)}
      >
        {simulateConflict ? "✓ " : ""}Simulate booking conflict
      </button>
    </div>
  );
}

function CWVWidget() {
  const vitals = [
    { label: "LCP", value: "1.8s", target: "< 2.5s", good: true },
    { label: "INP", value: "85ms", target: "< 200ms", good: true },
    { label: "CLS", value: "0.02", target: "< 0.1", good: true },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Core Web Vitals</div>
      <div className={styles.vitalsList}>
        {vitals.map(v => (
          <div key={v.label} className={styles.vitalRow}>
            <span className={styles.vitalLabel}>{v.label}</span>
            <span className={styles.vitalValue} data-good={v.good ? "true" : undefined}>{v.value}</span>
            <span className={styles.vitalTarget}>{v.target}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
