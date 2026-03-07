// Cookbook recipe loader and registry
// Follows the pattern established in recipes.ts

import type { CategoryInfo, CookbookCategory, CookbookRecipe } from "./cookbook-types";

// Category metadata with visual identity information
export const CATEGORIES: CategoryInfo[] = [
  {
    slug: "curries",
    name: "Curries & Gravies",
    description: "The heart of Indian cooking — rich, aromatic, soul-warming gravies",
    accentColor: "#E8B339", // Saffron/turmeric yellow
    textColor: "#1A1512",
  },
  {
    slug: "street-food",
    name: "Street Food & Snacks",
    description: "Bold, quick, soul-satisfying bites from the streets of India",
    accentColor: "#D64933", // Chaat masala orange/red
    textColor: "#FDF6EC",
  },
  {
    slug: "drinks",
    name: "Cocktails & Drinks",
    description: "From masala chai to craft cocktails — beverages with character",
    accentColor: "#5B4A87", // Deep jewel amethyst
    textColor: "#FDF6EC",
  },
  {
    slug: "sweets",
    name: "Sweets & Baking",
    description: "Mithai meets modern baking — indulgent, aromatic, celebration-worthy",
    accentColor: "#D896A0", // Rose pink
    textColor: "#1A1512",
  },
  {
    slug: "quick-meals",
    name: "Quick Meals",
    description: "Weeknight staples under 30 minutes — when you need comfort fast",
    accentColor: "#7FA548", // Bright lime/cilantro green
    textColor: "#1A1512",
  },
];

// Recipe registry maps slugs to their module loaders.
// Add a new entry here when creating a new recipe file in content/cookbook/.
const recipeLoaders: Record<string, () => Promise<{ recipe: CookbookRecipe }>> = {
  "butter-chicken": () => import("../../content/cookbook/curries/butter-chicken"),
  "chole": () => import("../../content/cookbook/curries/chole"),
  "kerala-fish-curry": () => import("../../content/cookbook/curries/kerala-fish-curry"),
  "thai-green-curry": () => import("../../content/cookbook/curries/thai-green-curry"),
  "vada-pav": () => import("../../content/cookbook/street-food/vada-pav"),
  "bombay-sandwich": () => import("../../content/cookbook/street-food/bombay-sandwich"),
  "keema-pav": () => import("../../content/cookbook/street-food/keema-pav"),
  "pani-puri": () => import("../../content/cookbook/street-food/pani-puri"),
  "masala-chai": () => import("../../content/cookbook/drinks/masala-chai"),
  "mango-lassi": () => import("../../content/cookbook/drinks/mango-lassi"),
  "filter-coffee": () => import("../../content/cookbook/drinks/filter-coffee"),
  "old-monk-old-fashioned": () => import("../../content/cookbook/drinks/old-monk-old-fashioned"),
  "kokum-sharbat": () => import("../../content/cookbook/drinks/kokum-sharbat"),
  "gulab-jamun": () => import("../../content/cookbook/sweets/gulab-jamun"),
  "masala-chai-cookies": () => import("../../content/cookbook/sweets/masala-chai-cookies"),
  "eggless-chocolate-cake": () => import("../../content/cookbook/sweets/eggless-chocolate-cake"),
  "shahi-tukda": () => import("../../content/cookbook/sweets/shahi-tukda"),
  "egg-bhurji": () => import("../../content/cookbook/quick-meals/egg-bhurji"),
  "tadka-dal": () => import("../../content/cookbook/quick-meals/tadka-dal"),
  "jeera-rice": () => import("../../content/cookbook/quick-meals/jeera-rice"),
  "masala-maggi": () => import("../../content/cookbook/quick-meals/masala-maggi"),
};

/**
 * Get all recipe slugs from the registry
 */
export function getAllRecipeSlugs(): string[] {
  return Object.keys(recipeLoaders);
}

/**
 * Get a single recipe by its slug
 */
export async function getRecipeBySlug(slug: string): Promise<CookbookRecipe | null> {
  const loader = recipeLoaders[slug];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.recipe ?? null;
  } catch {
    return null;
  }
}

/**
 * Get all recipes (loads all from the registry)
 */
export async function getAllRecipes(): Promise<CookbookRecipe[]> {
  const slugs = getAllRecipeSlugs();
  const recipes = await Promise.all(slugs.map((slug) => getRecipeBySlug(slug)));
  return recipes.filter((recipe): recipe is CookbookRecipe => recipe !== null);
}

/**
 * Get recipes filtered by category
 */
export async function getRecipesByCategory(category: CookbookCategory): Promise<CookbookRecipe[]> {
  const allRecipes = await getAllRecipes();
  return allRecipes.filter((recipe) => recipe.meta.category === category);
}

/**
 * Get all category metadata
 */
export function getCategories(): CategoryInfo[] {
  return CATEGORIES;
}

/**
 * Get category info by slug
 */
export function getCategoryBySlug(slug: CookbookCategory): CategoryInfo | undefined {
  return CATEGORIES.find((cat) => cat.slug === slug);
}

/**
 * Get recipe count by category (async - requires loading all recipes)
 */
export async function getRecipeCountByCategory(category: CookbookCategory): Promise<number> {
  const recipes = await getRecipesByCategory(category);
  return recipes.length;
}
