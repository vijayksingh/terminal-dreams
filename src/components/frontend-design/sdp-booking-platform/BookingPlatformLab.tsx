"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  BookingProvider,
  useBooking,
  getPhase,
  SCOPE_ITEMS,
  TOTAL_STEPS,
  API_ENDPOINTS,
  DATA_MODELS,
  FEATURE_UNLOCK,
  MONTH_NAMES,
  PROPERTY_TYPES,
  generateMonthDays,
  type Listing,
  type TypeDef,
} from "./booking-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { BOOKING_PLATFORM_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./BookingPlatformLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function BookingPlatformLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <BookingProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
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
    <div className={styles.stepBar}>
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
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

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useBooking();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter(s => scopeEnabled.has(s.id))
      .map(s => s.label.replace("?", ""))
      .join(" + ");
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
    </div>
  );
}

// ── Step 2: API Design ──────────────────────────────────────────────

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs}>
        <button type="button" className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>Endpoints</button>
        <button type="button" className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>Types</button>
      </div>
      {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
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
          <button
            key={key}
            type="button"
            className={styles.endpointCard}
            data-expanded={isOpen ? "true" : undefined}
            onClick={() => setExpanded(isOpen ? null : key)}
          >
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </div>
            <div className={styles.endpointDesc}>{ep.description}</div>
            <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
            {isOpen && (
              <div className={styles.endpointDetail}>
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
          </button>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <MetricsBar />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <StepControls />
        </motion.div>
      </AnimatePresence>

      <BookingView />

      <AnimatePresence mode="wait">
        <motion.div
          key={`widget-${activeStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <StepWidget />
        </motion.div>
      </AnimatePresence>

      <StateInspector entries={stateEntries} title="Booking State" />
    </div>
  );
}

// ── Metrics bar ─────────────────────────────────────────────────────

function MetricsBar() {
  const { metrics } = useBooking();
  return (
    <div className={styles.metricsBar}>
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
    case 4: return <StepMessage text="8 listings. Basic card grid. No interactivity yet." />;
    case 5: return <StepMessage text="Search bar and filters appear. Type or filter to narrow results." />;
    case 6: return <StepMessage text="Date picker opens. Select check-in and check-out dates." />;
    case 7: return <StepMessage text="Click a listing card to see the detail panel." />;
    case 8: return <StepMessage text="Availability calendar shows per-day pricing." />;
    case 9: return <StepMessage text="Click 'Book Now' to enter the checkout flow." />;
    case 10: return <StepMessage text="Map appears alongside the listing grid." />;
    case 11: return <StepMessage text="Live indicators: price changes, booking activity." severity="warning" />;
    case 12: return <StepMessage text="Search debounce, skeleton loading, cached results." />;
    case 13: return <StepMessage text="Layout adapts to mobile breakpoint." />;
    case 14: return <StepMessage text="Error states: network failure, booking conflicts." severity="warning" />;
    case 15: return <StepMessage text="Production: i18n, currency, performance budgets." />;
    default: return null;
  }
}

function StepMessage({ text, severity }: { text: string; severity?: "warning" }) {
  return <div className={styles.stepMessage} data-severity={severity}>{text}</div>;
}

// ── Main booking view ───────────────────────────────────────────────

function BookingView() {
  const { viewMode, isActive } = useBooking();

  return (
    <div className={styles.bookingContainer}>
      {isActive("filters") && <SearchBarUI />}
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
  const { searchQuery, setSearchQuery, guestCount, setGuestCount, checkIn, checkOut, calendarOpen, setCalendarOpen, isActive, setDateRange } = useBooking();

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Where to?"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button
          type="button"
          className={styles.searchDateBtn}
          onClick={() => setCalendarOpen(!calendarOpen)}
        >
          {checkIn && checkOut ? `${checkIn.slice(5)} → ${checkOut.slice(5)}` : "Dates"}
        </button>
        <div className={styles.guestControl}>
          <button type="button" className={styles.guestBtn} onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>-</button>
          <span className={styles.guestCount}>{guestCount}</span>
          <button type="button" className={styles.guestBtn} onClick={() => setGuestCount(Math.min(10, guestCount + 1))}>+</button>
        </div>
      </div>

      {calendarOpen && isActive("datePicker") && <MiniCalendar />}
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

// ── Mini calendar ───────────────────────────────────────────────────

function MiniCalendar() {
  const { checkIn, checkOut, setDateRange, selectedListing, listings } = useBooking();
  const [viewMonth, setViewMonth] = useState(5);
  const listing = selectedListing || listings[0];

  const days = useMemo(
    () => listing ? generateMonthDays(2026, viewMonth, listing) : [],
    [viewMonth, listing]
  );
  const firstDayOffset = new Date(2026, viewMonth, 1).getDay();
  const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleDayClick = useCallback((dateStr: string, available: boolean) => {
    if (!available) return;
    if (!checkIn || checkOut) {
      setDateRange(dateStr, null);
    } else if (dateStr > checkIn) {
      setDateRange(checkIn, dateStr);
    } else {
      setDateRange(dateStr, null);
    }
  }, [checkIn, checkOut, setDateRange]);

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarNav}>
        <button type="button" onClick={() => setViewMonth(m => Math.max(5, m - 1))} className={styles.calendarArrow}>{"◀"}</button>
        <span className={styles.calendarMonth}>{MONTH_NAMES[viewMonth]} 2026</span>
        <button type="button" onClick={() => setViewMonth(m => Math.min(11, m + 1))} className={styles.calendarArrow}>{"▶"}</button>
      </div>
      <div className={styles.calendarDayNames}>
        {DAY_NAMES.map(d => <span key={d} className={styles.dayNameCell}>{d}</span>)}
      </div>
      <div className={styles.calendarGrid}>
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} className={styles.dayEmpty} />)}
        {days.map(day => {
          const inRange = checkIn && checkOut && day.date >= checkIn && day.date <= checkOut;
          const isCheckIn = day.date === checkIn;
          const isCheckOut = day.date === checkOut;
          return (
            <button
              key={day.date}
              type="button"
              className={styles.dayCell}
              data-blocked={!day.available ? "true" : undefined}
              data-selected={inRange ? "true" : undefined}
              data-checkin={isCheckIn ? "true" : undefined}
              data-checkout={isCheckOut ? "true" : undefined}
              onClick={() => handleDayClick(day.date, day.available)}
              disabled={!day.available}
            >
              <span className={styles.dayNumber}>{day.day}</span>
              <span className={styles.dayPrice}>${day.price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Search results view ─────────────────────────────────────────────

const PICSUM_LIMIT = 24;

function SearchResultsView() {
  const { filteredListings, loadedSet, isActive, selectListing, setViewMode, hoveredMarker, setHoveredMarker } = useBooking();
  const showMap = isActive("mapView");
  const showSkeleton = isActive("searchOptimization");

  return (
    <div className={showMap ? styles.splitLayout : styles.gridLayout}>
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

function ListingCard({ listing, highlighted, onClick, onHover }: {
  listing: Listing;
  highlighted: boolean;
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
      onClick={onClick}
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
          <span className={styles.cardPrice}>${listing.pricePerNight}<span>/night</span></span>
          <span className={styles.cardRating}>{"★"} {listing.rating}</span>
        </div>
      </div>
    </div>
  );
}

// ── Mini map ────────────────────────────────────────────────────────

function MiniMap() {
  const { filteredListings, hoveredMarker, setHoveredMarker, selectListing, setViewMode, isActive } = useBooking();

  return (
    <div className={styles.mapContainer}>
      <svg viewBox="0 0 400 300" className={styles.mapSvg}>
        <rect x="0" y="0" width="400" height="300" fill="var(--color-surface)" rx="4" />
        {/* Grid lines */}
        {[100, 200, 300].map(x => <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="300" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />)}
        {[75, 150, 225].map(y => <line key={`gy${y}`} x1="0" y1={y} x2="400" y2={y} stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />)}

        {filteredListings.map(listing => {
          const isHovered = hoveredMarker === listing.id;
          return (
            <g
              key={listing.id}
              onMouseEnter={() => setHoveredMarker(listing.id)}
              onMouseLeave={() => setHoveredMarker(null)}
              onClick={() => {
                if (isActive("detailView")) {
                  selectListing(listing);
                  setViewMode("detail");
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={listing.mapX}
                cy={listing.mapY}
                r={isHovered ? 8 : 5}
                fill={isHovered ? "var(--color-accent)" : "var(--diagram-layer-5)"}
                stroke="var(--color-bg)"
                strokeWidth="2"
                style={{ transition: "all 150ms ease" }}
              />
              {isHovered && (
                <g>
                  <rect
                    x={listing.mapX - 30}
                    y={listing.mapY - 22}
                    width="60"
                    height="16"
                    rx="3"
                    fill="var(--color-surface-2)"
                    stroke="var(--color-border)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={listing.mapX}
                    y={listing.mapY - 11}
                    textAnchor="middle"
                    fill="var(--color-text)"
                    fontSize="8"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    ${listing.pricePerNight}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
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
      <button type="button" className={styles.backButton} onClick={() => setViewMode("search")}>
        {"←"} Back to search
      </button>

      <div className={styles.detailImage}>
        <img src={picsumUrl} alt={listing.name} className={styles.detailImg} loading="lazy" />
      </div>

      <div className={styles.detailHeader}>
        <h3 className={styles.detailName}>{listing.name}</h3>
        <div className={styles.detailMeta}>
          {listing.location} {"·"} {listing.propertyType}
          {listing.superhost && <span className={styles.superhostBadge}>Superhost</span>}
        </div>
        <div className={styles.detailRating}>
          {"★"} {listing.rating} ({listing.reviewCount} reviews)
        </div>
      </div>

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

      {isActive("bookingFlow") && nights > 0 && (
        <div className={styles.priceBox}>
          <div className={styles.priceRow}><span>{nights} nights {"×"} ${listing.pricePerNight}</span><span>${nights * listing.pricePerNight}</span></div>
          <div className={styles.priceRow}><span>Cleaning fee</span><span>$75</span></div>
          <div className={styles.priceRow}><span>Service fee</span><span>${Math.round(nights * listing.pricePerNight * 0.15)}</span></div>
          <div className={styles.priceDivider} />
          <div className={styles.priceTotal}><span>Total</span><span>${nights * listing.pricePerNight + 75 + Math.round(nights * listing.pricePerNight * 0.15)}</span></div>
          <button type="button" className={styles.bookButton} onClick={() => { setBookingStep(1); setViewMode("booking"); }}>
            Book Now
          </button>
        </div>
      )}
    </div>
  );
}

function AvailabilityCalendar({ listing }: { listing: Listing }) {
  const { checkIn, checkOut, setDateRange } = useBooking();
  const [viewMonth, setViewMonth] = useState(5);

  const days = useMemo(() => generateMonthDays(2026, viewMonth, listing), [viewMonth, listing]);
  const firstDayOffset = new Date(2026, viewMonth, 1).getDay();
  const maxPrice = Math.max(...days.map(d => d.price));
  const minPrice = Math.min(...days.filter(d => d.available).map(d => d.price));

  const handleDayClick = useCallback((dateStr: string, available: boolean) => {
    if (!available) return;
    if (!checkIn || checkOut) {
      setDateRange(dateStr, null);
    } else if (dateStr > checkIn) {
      setDateRange(checkIn, dateStr);
    } else {
      setDateRange(dateStr, null);
    }
  }, [checkIn, checkOut, setDateRange]);

  return (
    <div className={styles.availCalendar}>
      <div className={styles.calendarNav}>
        <button type="button" onClick={() => setViewMonth(m => Math.max(5, m - 1))} className={styles.calendarArrow}>{"◀"}</button>
        <span className={styles.calendarMonth}>{MONTH_NAMES[viewMonth]} 2026</span>
        <button type="button" onClick={() => setViewMonth(m => Math.min(11, m + 1))} className={styles.calendarArrow}>{"▶"}</button>
      </div>
      <div className={styles.calendarDayNames}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d} className={styles.dayNameCell}>{d}</span>)}
      </div>
      <div className={styles.calendarGrid}>
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} className={styles.dayEmpty} />)}
        {days.map(day => {
          const inRange = checkIn && checkOut && day.date >= checkIn && day.date <= checkOut;
          const priceTier = day.available
            ? day.price > minPrice + (maxPrice - minPrice) * 0.6 ? "high" : day.price > minPrice + (maxPrice - minPrice) * 0.3 ? "mid" : "low"
            : "blocked";
          return (
            <button
              key={day.date}
              type="button"
              className={styles.dayCell}
              data-blocked={!day.available ? "true" : undefined}
              data-selected={inRange ? "true" : undefined}
              data-checkin={day.date === checkIn ? "true" : undefined}
              data-checkout={day.date === checkOut ? "true" : undefined}
              data-price-tier={priceTier}
              onClick={() => handleDayClick(day.date, day.available)}
              disabled={!day.available}
            >
              <span className={styles.dayNumber}>{day.day}</span>
              <span className={styles.dayPrice}>${day.price}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.priceLegend}>
        <span data-tier="low">$ Low</span>
        <span data-tier="mid">$$ Mid</span>
        <span data-tier="high">$$$ Peak</span>
        <span data-tier="blocked">Blocked</span>
      </div>
    </div>
  );
}

// ── Booking flow ────────────────────────────────────────────────────

function BookingFlowView() {
  const { bookingStep, setBookingStep, bookingConfirmed, setBookingConfirmed, selectedListing, setViewMode, checkIn, checkOut } = useBooking();
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
            <label className={styles.formField}><span>First Name</span><input type="text" placeholder="Jane" readOnly /></label>
            <label className={styles.formField}><span>Last Name</span><input type="text" placeholder="Smith" readOnly /></label>
            <label className={styles.formField}><span>Email</span><input type="email" placeholder="jane@example.com" readOnly /></label>
            <label className={styles.formField}><span>Phone</span><input type="tel" placeholder="+1 555-0123" readOnly /></label>
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
            <button type="button" className={styles.bookingNextBtn} onClick={() => { setBookingStep(3); setBookingConfirmed(true); }}>Confirm Booking {"→"}</button>
          </div>
        </div>
      )}

      {bookingStep === 3 && (
        <div className={styles.bookingStepContent}>
          <div className={styles.confirmationPanel}>
            <div className={styles.confirmCheck}>{"✓"}</div>
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
  const { listings, filteredListings, selectedTypes } = useBooking();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Filter impact</div>
      <div className={styles.widgetBody}>
        <div className={styles.statRow}><span>Total listings</span><span>{listings.length}</span></div>
        <div className={styles.statRow}><span>After filters</span><span>{filteredListings.length}</span></div>
        <div className={styles.statRow}><span>Active type filters</span><span>{selectedTypes.size || "none"}</span></div>
      </div>
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
  const events = [
    { time: "0.0s", label: "WS connected", type: "info" },
    { time: "1.2s", label: "Price change: Tuscan Farmhouse $210 → $235", type: "price" },
    { time: "2.8s", label: "Booked: Glass Cabin (Jun 20-23)", type: "booking" },
    { time: "4.1s", label: "Price change: Cave Suite $275 → $260", type: "price" },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Event stream</div>
      <div className={styles.eventList}>
        {events.map((e, i) => (
          <div key={i} className={styles.eventRow} data-type={e.type}>
            <span className={styles.eventTime}>{e.time}</span>
            <span>{e.label}</span>
          </div>
        ))}
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
