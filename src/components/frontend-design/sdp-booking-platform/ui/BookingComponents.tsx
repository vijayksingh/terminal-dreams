import React, { useState, useMemo, useCallback } from "react";
import { useBooking, MONTH_NAMES } from "../booking-context";
import { generateMonthDays } from "../engine/booking-helpers";
import styles from "../BookingPlatformLab.module.css";
import type { Listing } from "../booking-context";

// ── Mini calendar ───────────────────────────────────────────────────

export function MiniCalendar() {
  const { checkIn, checkOut, setDateRange, selectedListing, listings } = useBooking();
  const [viewMonth, setViewMonth] = useState(5);
  const listing = selectedListing || listings[0];

  const days = useMemo(
    () => (listing ? generateMonthDays(2026, viewMonth, listing) : []),
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
    <div className={styles.calendar} role="group" aria-label="Date picker">
      <div className={styles.calendarNav}>
        <button type="button" onClick={() => setViewMonth(m => Math.max(5, m - 1))} className={styles.calendarArrow} aria-label="Previous month">{"◀"}</button>
        <span className={styles.calendarMonth}>{MONTH_NAMES[viewMonth]} 2026</span>
        <button type="button" onClick={() => setViewMonth(m => Math.min(11, m + 1))} className={styles.calendarArrow} aria-label="Next month">{"▶"}</button>
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
              aria-label={`${MONTH_NAMES[viewMonth]} ${day.day}, $${day.price} per night${!day.available ? ", unavailable" : ""}${isCheckIn ? ", check-in" : ""}${isCheckOut ? ", check-out" : ""}`}
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

// ── Mini map ────────────────────────────────────────────────────────

export function MiniMap() {
  const { filteredListings, hoveredMarker, setHoveredMarker, selectListing, setViewMode, isActive } = useBooking();

  return (
    <div className={styles.mapContainer}>
      <svg viewBox="0 0 400 300" className={styles.mapSvg} role="img" aria-label="Map showing listing locations">
        <rect x="0" y="0" width="400" height="300" fill="var(--color-surface)" rx="4" />
        {[100, 200, 300].map(x => <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="300" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />)}
        {[75, 150, 225].map(y => <line key={`gy${y}`} x1="0" y1={y} x2="400" y2={y} stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />)}

        {filteredListings.map(listing => {
          const isHovered = hoveredMarker === listing.id;
          return (
            <g
              key={listing.id}
              role="button"
              tabIndex={0}
              aria-label={`${listing.name}, $${listing.pricePerNight}`}
              onMouseEnter={() => setHoveredMarker(listing.id)}
              onMouseLeave={() => setHoveredMarker(null)}
              onFocus={() => setHoveredMarker(listing.id)}
              onBlur={() => setHoveredMarker(null)}
              onClick={() => {
                if (isActive("detailView")) {
                  selectListing(listing);
                  setViewMode("detail");
                }
              }}
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === " ") && isActive("detailView")) {
                  e.preventDefault();
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

// ── Availability Calendar ───────────────────────────────────────────

export function AvailabilityCalendar({ listing }: { listing: Listing }) {
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
    <div className={styles.availCalendar} role="group" aria-label="Availability calendar">
      <div className={styles.calendarNav}>
        <button type="button" onClick={() => setViewMonth(m => Math.max(5, m - 1))} className={styles.calendarArrow} aria-label="Previous month">{"◀"}</button>
        <span className={styles.calendarMonth}>{MONTH_NAMES[viewMonth]} 2026</span>
        <button type="button" onClick={() => setViewMonth(m => Math.min(11, m + 1))} className={styles.calendarArrow} aria-label="Next month">{"▶"}</button>
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
              aria-label={`${MONTH_NAMES[viewMonth]} ${day.day}, $${day.price} per night${!day.available ? ", unavailable" : ""}${day.date === checkIn ? ", check-in" : ""}${day.date === checkOut ? ", check-out" : ""}`}
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
