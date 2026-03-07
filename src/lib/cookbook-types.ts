// Cookbook DSL TypeScript Types
// Based on the Kitchen Recipe Playground specification

export type CookbookCategory = "curries" | "street-food" | "drinks" | "sweets" | "quick-meals";

export type RecipeMeta = {
  category: CookbookCategory;
  prepTime: number;       // minutes
  cookTime: number;       // minutes
  totalTime: number;      // minutes
  servings: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  cuisine?: string;
  tags?: string[];
  image?: string;         // hero image path
};

export type Ingredient = {
  id: string;              // unique ref, e.g., "spaghetti"
  name: string;            // "Spaghetti"
  amount: number;
  unit: string;            // "g", "cups", "cloves", "tbsp"
  notes?: string;          // "al dente", "finely minced"
  optional?: boolean;
};

export type IngredientGroup = {
  group?: string;          // e.g., "For the sauce", "For the pasta"
  items: Ingredient[];
};

export type StepTimer = {
  label: string;           // "Boil pasta", "Rest the dough"
  duration: number;        // seconds
  type: "active" | "passive";  // active = you're doing something, passive = waiting
  alert?: string;          // Custom message when timer ends: "Pasta should be al dente!"
};

export type CookbookStep = {
  id: string;
  title: string;           // Short heading: "Boil the pasta"
  instruction: string;     // Full text (supports markdown-light: bold, italic, inline-code for temperatures)
  ingredientRefs?: string[]; // IDs of ingredients used in this step
  timers?: StepTimer[];
  tip?: string;            // Optional chef's tip for this step
  technique?: string;      // Link to technique explanation (future)
  parallel?: boolean;      // Can this step run in parallel with the previous?
};

export type RecipeVariation = {
  title: string;
  description: string;
  swaps: { ingredientId: string; replacement: string }[];
};

export type CookbookRecipe = {
  slug: string;
  title: string;
  description: string;
  meta: RecipeMeta;
  ingredients: IngredientGroup[];
  steps: CookbookStep[];
  notes?: string[];            // Chef's tips, shown at the end
  variations?: RecipeVariation[];  // "Try it with..." suggestions
};

// Category metadata for the index page
export type CategoryInfo = {
  slug: CookbookCategory;
  name: string;              // Display name: "Curries & Gravies"
  description: string;       // Brief description for the category card
  accentColor: string;       // Hex color for the category theme
  textColor?: string;        // Optional text color for accessibility
};
