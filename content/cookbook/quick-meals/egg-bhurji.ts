import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "egg-bhurji",
  title: "Egg Bhurji (Indian Scrambled Eggs)",
  description: "Spiced scrambled eggs with onions, tomatoes, and chilies. India's answer to scrambled eggs, but infinitely better.",
  meta: {
    category: "quick-meals",
    prepTime: 5,
    cookTime: 10,
    totalTime: 15,
    servings: 2,
    difficulty: "beginner",
    cuisine: "Indian",
    tags: ["eggs", "quick", "breakfast", "protein"],
  },
  ingredients: [
    {
      items: [
        { id: "eggs", name: "Eggs", amount: 4, unit: "large" },
        { id: "oil", name: "Oil or butter", amount: 2, unit: "tbsp" },
        { id: "cumin", name: "Jeera (cumin seeds)", amount: 0.5, unit: "tsp" },
        { id: "onion", name: "Onions", amount: 1, unit: "medium", notes: "finely chopped" },
        { id: "green-chili", name: "Hari mirch (green chili)", amount: 1, unit: "whole", notes: "finely chopped" },
        { id: "ginger", name: "Ginger", amount: 0.5, unit: "inch", notes: "grated" },
        { id: "tomato", name: "Tomatoes", amount: 1, unit: "medium", notes: "finely chopped" },
        { id: "turmeric", name: "Haldi (turmeric)", amount: 0.25, unit: "tsp" },
        { id: "red-chili", name: "Lal mirch (red chili powder)", amount: 0.25, unit: "tsp" },
        { id: "coriander-powder", name: "Dhania powder", amount: 0.5, unit: "tsp", optional: true },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "cilantro", name: "Cilantro", amount: 2, unit: "tbsp", notes: "chopped" },
        { id: "pav-bhaji-masala", name: "Pav bhaji masala", amount: 0.5, unit: "tsp", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "beat-eggs",
      title: "Beat the eggs",
      instruction: "In a bowl, beat eggs with a pinch of salt until **well combined** — whites and yolks should be fully mixed. Set aside.",
      ingredientRefs: ["eggs", "salt"],
      tip: "Beating eggs well before cooking makes the bhurji fluffy and even.",
    },
    {
      id: "cook-onions",
      title: "Cook the onion base",
      instruction: "Heat oil in a pan over **medium heat**. Add cumin seeds — let them sizzle for `10 seconds`. Add chopped onions, green chili, and grated ginger. Sauté until onions turn **translucent**, about `3-4 minutes`.",
      ingredientRefs: ["oil", "cumin", "onion", "green-chili", "ginger"],
      timers: [
        { label: "Sauté onions", duration: 240, type: "active", alert: "Onions are translucent!" }
      ],
    },
    {
      id: "add-tomatoes",
      title: "Add tomatoes and spices",
      instruction: "Add chopped tomatoes, turmeric, red chili powder, and coriander powder (if using). Cook until tomatoes **soften and break down**, about `2-3 minutes`. The masala should look thick, not watery.",
      ingredientRefs: ["tomato", "turmeric", "red-chili", "coriander-powder"],
      timers: [
        { label: "Cook tomatoes", duration: 180, type: "active", alert: "Tomatoes are soft!" }
      ],
      tip: "Cook tomatoes well — raw tomato taste ruins bhurji.",
    },
    {
      id: "scramble-eggs",
      title: "Scramble the eggs",
      instruction: "Pour beaten eggs into the pan. **Reduce heat to low**. Let eggs sit for `20-30 seconds` undisturbed, then gently scramble with a spatula, breaking into **large, soft curds**. Cook until eggs are **just set** but still moist, about `2-3 minutes`. Don't overcook — they continue cooking in residual heat.",
      ingredientRefs: ["eggs"],
      timers: [
        { label: "Scramble eggs", duration: 180, type: "active", alert: "Eggs are almost set!" }
      ],
      tip: "Low heat + gentle scrambling = soft, fluffy bhurji. High heat = rubbery eggs.",
    },
    {
      id: "finish",
      title: "Finish and serve",
      instruction: "Turn off heat. Sprinkle pav bhaji masala (if using) and chopped cilantro. Mix gently. Serve **immediately** with **toast, pav, or paratha**.",
      ingredientRefs: ["pav-bhaji-masala", "cilantro"],
    },
  ],
  notes: [
    "The secret is low heat and undercooking slightly — eggs finish cooking off heat.",
    "Pav bhaji masala is optional but adds a Mumbai street-food flavor that's hard to beat.",
    "Eat immediately. Reheated bhurji is never as good as fresh.",
  ],
  variations: [
    {
      title: "Paneer Bhurji",
      description: "Replace eggs with crumbled paneer (300g). Same recipe, cook paneer for 2-3 minutes in the masala. Vegetarian version.",
      swaps: [{ ingredientId: "eggs", replacement: "Paneer (300g, crumbled)" }],
    },
    {
      title: "Masala Omelette",
      description: "Don't scramble — let the egg mixture set as a flat omelette. Flip once. Fold and serve.",
      swaps: [],
    },
  ],
};
