"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecipeCard } from "./RecipeCard";
import type { CategoryInfo, CookbookRecipe } from "@/lib/cookbook-types";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// SVG Illustrations for each category
function CurriesIllustration({ accentColor, reducedMotion }: { accentColor: string; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" fill="none">
      {/* Spice mandala with steam wisps */}
      <motion.circle
        cx="100"
        cy="100"
        r="60"
        stroke={accentColor}
        strokeWidth="2"
        fill="none"
        initial={{ rotate: 0 }}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={reducedMotion ? {} : { duration: 20, repeat: Infinity, ease: "linear" }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <motion.path
          key={angle}
          d={`M ${100 + 40 * Math.cos((angle * Math.PI) / 180)} ${
            100 + 40 * Math.sin((angle * Math.PI) / 180)
          } L ${100 + 60 * Math.cos((angle * Math.PI) / 180)} ${
            100 + 60 * Math.sin((angle * Math.PI) / 180)
          }`}
          stroke={accentColor}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ opacity: 0.3 }}
          animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.3, 0.8, 0.3] }}
          transition={reducedMotion ? {} : { duration: 2, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
      {/* Steam wisps */}
      {[30, 90, 150].map((x, i) => (
        <motion.path
          key={x}
          d={`M ${x} 180 Q ${x + 10} 160, ${x} 140 T ${x} 100`}
          stroke={accentColor}
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          initial={{ y: 0 }}
          animate={reducedMotion ? {} : { y: [-10, 10, -10] }}
          transition={reducedMotion ? {} : { duration: 3, delay: i * 0.5, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function StreetFoodIllustration({ accentColor, reducedMotion }: { accentColor: string; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" fill="none">
      {/* Street food cart */}
      <rect x="50" y="120" width="100" height="60" fill={accentColor} opacity="0.2" rx="4" />
      <motion.circle
        cx="70"
        cy="180"
        r="15"
        fill={accentColor}
        initial={{ rotate: 0 }}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={reducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.circle
        cx="130"
        cy="180"
        r="15"
        fill={accentColor}
        initial={{ rotate: 0 }}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={reducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {/* Chaat elements */}
      <motion.circle
        cx="80"
        cy="80"
        r="20"
        fill={accentColor}
        opacity="0.6"
        animate={reducedMotion ? {} : { scale: [1, 1.1, 1] }}
        transition={reducedMotion ? {} : { duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="120"
        cy="70"
        r="25"
        fill={accentColor}
        opacity="0.4"
        animate={reducedMotion ? {} : { scale: [1, 1.15, 1] }}
        transition={reducedMotion ? {} : { duration: 2.5, delay: 0.3, repeat: Infinity }}
      />
      <motion.circle
        cx="100"
        cy="50"
        r="15"
        fill={accentColor}
        opacity="0.7"
        animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }}
        transition={reducedMotion ? {} : { duration: 1.8, delay: 0.6, repeat: Infinity }}
      />
    </svg>
  );
}

function DrinksIllustration({ accentColor, reducedMotion }: { accentColor: string; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" fill="none">
      {/* Cocktail glass with liquid pour */}
      <motion.path
        d="M 60 80 L 100 140 L 140 80 Z"
        stroke={accentColor}
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={reducedMotion ? { pathLength: 1 } : { pathLength: 1 }}
        transition={reducedMotion ? {} : { duration: 2, repeat: Infinity }}
      />
      <rect x="95" y="140" width="10" height="40" fill={accentColor} opacity="0.6" />
      {/* Bubbles */}
      {[70, 90, 110, 130].map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={150}
          r={4 + i}
          fill={accentColor}
          opacity="0.5"
          initial={{ y: 0, opacity: 0.5 }}
          animate={reducedMotion ? {} : { y: [-20, -40, -60], opacity: [0.5, 0.3, 0] }}
          transition={reducedMotion ? {} : {
            duration: 3,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      {/* Liquid fill */}
      <motion.path
        d="M 70 90 Q 100 110, 130 90 L 110 130 L 90 130 Z"
        fill={accentColor}
        opacity="0.3"
        initial={{ scaleY: 0 }}
        animate={reducedMotion ? { scaleY: 1 } : { scaleY: 1 }}
        transition={reducedMotion ? {} : { duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        style={{ transformOrigin: "100px 130px" }}
      />
    </svg>
  );
}

function SweetsIllustration({ accentColor, reducedMotion }: { accentColor: string; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" fill="none">
      {/* Mithai/sweet with sugar dust particles */}
      <motion.circle
        cx="100"
        cy="100"
        r="50"
        fill={accentColor}
        opacity="0.3"
        animate={reducedMotion ? {} : { scale: [1, 1.05, 1] }}
        transition={reducedMotion ? {} : { duration: 2, repeat: Infinity }}
      />
      <circle cx="100" cy="100" r="40" fill={accentColor} opacity="0.5" />
      <circle cx="100" cy="100" r="30" fill={accentColor} opacity="0.7" />
      {/* Sugar dust particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 360) / 12;
        const distance = 70 + Math.random() * 20;
        return (
          <motion.circle
            key={i}
            cx={100 + distance * Math.cos((angle * Math.PI) / 180)}
            cy={100 + distance * Math.sin((angle * Math.PI) / 180)}
            r={2 + Math.random() * 2}
            fill={accentColor}
            opacity="0.6"
            initial={{ scale: 0, opacity: 0 }}
            animate={reducedMotion ? { scale: 1, opacity: 0.6 } : {
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={reducedMotion ? {} : {
              duration: 2,
              delay: i * 0.15,
              repeat: Infinity,
            }}
          />
        );
      })}
    </svg>
  );
}

function QuickMealsIllustration({ accentColor, reducedMotion }: { accentColor: string; reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" fill="none">
      {/* Clock with speed lines */}
      <circle cx="100" cy="100" r="50" stroke={accentColor} strokeWidth="3" fill="none" />
      <motion.line
        x1="100"
        y1="100"
        x2="100"
        y2="60"
        stroke={accentColor}
        strokeWidth="3"
        strokeLinecap="round"
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={reducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />
      <motion.line
        x1="100"
        y1="100"
        x2="130"
        y2="100"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={reducedMotion ? {} : { duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />
      {/* Speed lines */}
      {[30, 50, 70].map((y, i) => (
        <motion.line
          key={y}
          x1="160"
          y1={y}
          x2="180"
          y2={y}
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
          initial={{ x: 0 }}
          animate={reducedMotion ? {} : { x: [0, 10, 0] }}
          transition={reducedMotion ? {} : {
            duration: 1.5,
            delay: i * 0.2,
            repeat: Infinity,
          }}
        />
      ))}
    </svg>
  );
}

function getCategoryIllustration(categorySlug: string, accentColor: string, reducedMotion: boolean) {
  switch (categorySlug) {
    case "curries":
      return <CurriesIllustration accentColor={accentColor} reducedMotion={reducedMotion} />;
    case "street-food":
      return <StreetFoodIllustration accentColor={accentColor} reducedMotion={reducedMotion} />;
    case "drinks":
      return <DrinksIllustration accentColor={accentColor} reducedMotion={reducedMotion} />;
    case "sweets":
      return <SweetsIllustration accentColor={accentColor} reducedMotion={reducedMotion} />;
    case "quick-meals":
      return <QuickMealsIllustration accentColor={accentColor} reducedMotion={reducedMotion} />;
    default:
      return null;
  }
}

interface CategoryCardProps {
  category: CategoryInfo;
  recipeCount: number;
  recipes: CookbookRecipe[];
}

export function CategoryCard({ category, recipeCount, recipes }: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      layout
      className="group relative overflow-hidden rounded-2xl border bg-[var(--color-surface-2)] shadow-sm transition-shadow hover:shadow-lg"
      style={{
        borderColor: category.accentColor,
        borderWidth: "1px",
      }}
    >
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 text-left"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2
              className="mb-2 text-2xl font-bold"
              style={{ color: category.accentColor }}
            >
              {category.name}
            </h2>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {category.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <span
                className="rounded-full px-3 py-1 font-medium"
                style={{
                  backgroundColor: `${category.accentColor}20`,
                  color: category.accentColor,
                }}
              >
                {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
              </span>
            </div>
          </div>

          <div className="transition-transform group-hover:scale-110">
            {getCategoryIllustration(category.slug, category.accentColor, prefersReducedMotion)}
          </div>
        </div>

        <motion.div
          className="mt-2 text-sm"
          style={{ color: category.accentColor }}
          animate={{ opacity: isExpanded ? 0 : 1 }}
        >
          {isExpanded ? "▲ Collapse" : "▼ Explore recipes"}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t"
            style={{ borderColor: category.accentColor }}
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} accentColor={category.accentColor} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
