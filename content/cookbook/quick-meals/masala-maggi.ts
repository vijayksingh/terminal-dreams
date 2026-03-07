import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "masala-maggi",
  title: "Masala Maggi",
  description: "Instant noodles, elevated. Onions, tomatoes, spices, and nostalgia in 5 minutes. India's midnight snack.",
  meta: {
    category: "quick-meals",
    prepTime: 5,
    cookTime: 7,
    totalTime: 12,
    servings: 1,
    difficulty: "beginner",
    cuisine: "Indian Street Food",
    tags: ["instant", "quick", "comfort-food", "nostalgia"],
  },
  ingredients: [
    {
      items: [
        { id: "maggi", name: "Maggi noodles", amount: 1, unit: "pack", notes: "or any instant noodles" },
        { id: "water", name: "Water", amount: 1.5, unit: "cups" },
        { id: "butter", name: "Butter", amount: 1, unit: "tbsp" },
        { id: "onion", name: "Onions", amount: 0.25, unit: "cup", notes: "finely chopped" },
        { id: "tomato", name: "Tomatoes", amount: 0.25, unit: "cup", notes: "finely chopped" },
        { id: "green-chili", name: "Hari mirch (green chili)", amount: 1, unit: "whole", notes: "finely chopped" },
        { id: "capsicum", name: "Capsicum (bell pepper)", amount: 0.25, unit: "cup", notes: "finely chopped", optional: true },
        { id: "maggi-masala", name: "Maggi tastemaker", amount: 1, unit: "sachet", notes: "from the pack" },
        { id: "extra-spices", name: "Extra masala", amount: 0.5, unit: "tsp", notes: "chaat masala or pav bhaji masala", optional: true },
        { id: "lemon-juice", name: "Lemon juice", amount: 0.5, unit: "tsp", optional: true },
        { id: "cilantro", name: "Cilantro", amount: 1, unit: "tbsp", notes: "chopped", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "saute-vegetables",
      title: "Sauté the vegetables",
      instruction: "Heat butter in a small pot over **medium-high heat**. Add chopped onions and green chili. Sauté for `1-2 minutes` until onions turn **translucent**. Add tomatoes and capsicum (if using). Cook for another `1 minute` until tomatoes soften slightly.",
      ingredientRefs: ["butter", "onion", "green-chili", "tomato", "capsicum"],
      timers: [
        { label: "Sauté vegetables", duration: 120, type: "active", alert: "Vegetables are ready!" }
      ],
      tip: "Don't overcook vegetables — they should retain some crunch. This isn't a curry.",
    },
    {
      id: "add-water-noodles",
      title: "Add water and noodles",
      instruction: "Pour in water. Bring to a **rolling boil**. Break the noodle cake and add it to the boiling water. Add the Maggi tastemaker (masala sachet). Stir gently to separate noodles.",
      ingredientRefs: ["water", "maggi", "maggi-masala"],
      tip: "Breaking the noodle cake helps it cook faster and makes it easier to eat.",
    },
    {
      id: "cook-noodles",
      title: "Cook the noodles",
      instruction: "Cook on **medium-high heat** for `2-3 minutes`, stirring occasionally. The noodles should be **cooked but not mushy**, and most of the water should be absorbed. Maggi should be **moist but not soupy**.",
      ingredientRefs: ["maggi"],
      timers: [
        { label: "Cook noodles", duration: 180, type: "active", alert: "Maggi is almost ready!" }
      ],
      tip: "Taste a strand at 2 minutes. Noodles continue cooking off heat, so slightly undercook.",
    },
    {
      id: "finish",
      title: "Finish with extras",
      instruction: "Turn off heat. If using, sprinkle extra masala (chaat masala or pav bhaji masala) and a squeeze of lemon juice. Toss well. Garnish with cilantro.",
      ingredientRefs: ["extra-spices", "lemon-juice", "cilantro"],
      tip: "The extra masala and lemon juice are the secret to restaurant/hostel-style Maggi.",
    },
    {
      id: "serve",
      title: "Serve immediately",
      instruction: "Transfer to a plate or eat straight from the pot (the authentic way). Serve hot with **bread** or just by itself.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "This is the way Maggi is made in college hostels, railway stations, and street stalls across India.",
    "The butter is essential — don't use oil. It adds richness that oil can't match.",
    "Some people add cheese on top. Some add an egg cracked directly into the noodles. Customize away.",
  ],
  variations: [
    {
      title: "Egg Maggi",
      description: "When noodles are half-cooked, crack an egg directly into the pot. Stir gently or let it poach on top. Protein boost.",
      swaps: [],
    },
    {
      title: "Cheese Maggi",
      description: "After cooking, add a slice of processed cheese. Stir until melted. Indulgent and creamy.",
      swaps: [],
    },
    {
      title: "Veggie-Loaded Maggi",
      description: "Add more vegetables: carrots, peas, corn, beans. Cook them with onions. Healthier version (relatively).",
      swaps: [],
    },
  ],
};
