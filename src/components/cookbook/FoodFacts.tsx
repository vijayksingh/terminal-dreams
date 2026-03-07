"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { CookbookRecipe } from "@/lib/cookbook-types";

interface FoodFactsProps {
  recipes: CookbookRecipe[];
}

export function FoodFacts({ recipes }: FoodFactsProps) {
  const prepTimeChartRef = useRef<SVGSVGElement>(null);
  const spiceHeatRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!prepTimeChartRef.current || recipes.length === 0) return;

    // Prep Time Distribution Chart
    const svg = d3.select(prepTimeChartRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    // Group recipes by time buckets
    const timeBuckets = [
      { label: "<15m", min: 0, max: 15, count: 0 },
      { label: "15-30m", min: 15, max: 30, count: 0 },
      { label: "30-45m", min: 30, max: 45, count: 0 },
      { label: "45-60m", min: 45, max: 60, count: 0 },
      { label: "60m+", min: 60, max: Infinity, count: 0 },
    ];

    recipes.forEach((recipe) => {
      const time = recipe.meta.totalTime;
      const bucket = timeBuckets.find((b) => time >= b.min && time < b.max);
      if (bucket) bucket.count++;
    });

    const x = d3
      .scaleBand()
      .domain(timeBuckets.map((d) => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(timeBuckets, (d) => d.count) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Add axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr("class", "text-[var(--color-text-secondary)]");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr("class", "text-[var(--color-text-secondary)]");

    // Add bars with animation
    svg
      .selectAll("rect")
      .data(timeBuckets)
      .join("rect")
      .attr("x", (d) => x(d.label) || 0)
      .attr("y", height - margin.bottom)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", "#7FA548")
      .attr("opacity", 0.7)
      .transition()
      .duration(800)
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => height - margin.bottom - y(d.count));

    // Add labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("class", "text-sm font-semibold fill-[var(--color-text)]")
      .text("Prep Time Distribution");
  }, [recipes]);

  useEffect(() => {
    if (!spiceHeatRef.current) return;

    // Spice Heat Scale (decorative visualization)
    const svg = d3.select(spiceHeatRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 150;

    const spiceData = [
      { name: "Mild", heat: 1, color: "#7FA548" },
      { name: "Medium", heat: 3, color: "#E8B339" },
      { name: "Hot", heat: 5, color: "#D64933" },
      { name: "Extra Hot", heat: 7, color: "#8B2635" },
    ];

    const x = d3
      .scaleLinear()
      .domain([0, 8])
      .range([50, width - 50]);

    // Draw scale line
    svg
      .append("line")
      .attr("x1", x(0))
      .attr("x2", x(8))
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .attr("stroke", "var(--color-border)")
      .attr("stroke-width", 2);

    // Add spice markers
    spiceData.forEach((spice, i) => {
      const cx = x(spice.heat);
      const cy = height / 2;

      // Pepper icon (circle with flame)
      svg
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 0)
        .attr("fill", spice.color)
        .attr("opacity", 0.7)
        .transition()
        .delay(i * 200)
        .duration(500)
        .attr("r", 15);

      // Label
      svg
        .append("text")
        .attr("x", cx)
        .attr("y", cy + 35)
        .attr("text-anchor", "middle")
        .attr("class", "text-xs fill-[var(--color-text-secondary)]")
        .attr("opacity", 0)
        .text(spice.name)
        .transition()
        .delay(i * 200 + 200)
        .duration(300)
        .attr("opacity", 1);
    });

    // Title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("class", "text-sm font-semibold fill-[var(--color-text)]")
      .text("Spice Heat Scale");
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
      <h2 className="mb-4 text-center text-xl font-bold text-[var(--color-text)]">
        Food Facts & Trivia
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Prep Time Chart */}
        <div className="flex flex-col items-center">
          <svg
            ref={prepTimeChartRef}
            width="100%"
            height="200"
            viewBox="0 0 400 200"
            className="overflow-visible"
          />
          <p className="mt-2 text-center text-sm italic text-[var(--color-text-secondary)]">
            Most recipes take 15-45 minutes — perfect for weeknight cooking
          </p>
        </div>

        {/* Spice Heat Scale */}
        <div className="flex flex-col items-center">
          <svg
            ref={spiceHeatRef}
            width="100%"
            height="150"
            viewBox="0 0 300 150"
            className="overflow-visible"
          />
          <p className="mt-2 text-center text-sm italic text-[var(--color-text-secondary)]">
            🌶️ Adjust chili levels to your preference — cooking is personal
          </p>
        </div>
      </div>

      {/* Additional food facts */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-[var(--color-surface)] p-4 text-center">
          <div className="mb-2 text-3xl font-bold text-[#E8B339]">{recipes.length}</div>
          <div className="text-sm text-[var(--color-text-secondary)]">Recipes & counting</div>
        </div>

        <div className="rounded-lg bg-[var(--color-surface)] p-4 text-center">
          <div className="mb-2 text-3xl font-bold text-[#D64933]">5</div>
          <div className="text-sm text-[var(--color-text-secondary)]">Distinct categories</div>
        </div>

        <div className="rounded-lg bg-[var(--color-surface)] p-4 text-center">
          <div className="mb-2 text-3xl font-bold text-[#7FA548]">
            {Math.round(
              recipes.reduce((sum, r) => sum + r.meta.totalTime, 0) / recipes.length
            )}m
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">Average cook time</div>
        </div>
      </div>

      {/* Fun fact */}
      <div className="mt-6 rounded-lg border-l-4 border-[#E8B339] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          <strong className="text-[var(--color-text)]">Did you know?</strong> Turmeric, the golden
          spice in many curries, has been used in Indian cooking for over 4,000 years. It&apos;s not
          just flavor — it&apos;s tradition in a jar.
        </p>
      </div>
    </div>
  );
}
