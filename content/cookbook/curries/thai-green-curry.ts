import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "thai-green-curry",
  title: "Thai Green Curry (Indian Style)",
  description: "Fragrant green curry with coconut milk, Thai basil, and an Indian twist. East meets East in the best way.",
  meta: {
    category: "curries",
    prepTime: 20,
    cookTime: 30,
    totalTime: 50,
    servings: 4,
    difficulty: "intermediate",
    cuisine: "Thai-Indian Fusion",
    tags: ["coconut", "aromatic", "vegetables", "fusion"],
  },
  ingredients: [
    {
      group: "For the curry",
      items: [
        { id: "oil", name: "Oil", amount: 2, unit: "tbsp" },
        { id: "green-curry-paste", name: "Thai green curry paste", amount: 3, unit: "tbsp", notes: "store-bought or homemade" },
        { id: "coconut-milk", name: "Coconut milk", amount: 400, unit: "ml", notes: "1 can, thick part separated" },
        { id: "vegetables", name: "Mixed vegetables", amount: 3, unit: "cups", notes: "bell peppers, zucchini, bamboo shoots" },
        { id: "tofu", name: "Firm tofu", amount: 200, unit: "g", notes: "cubed, or chicken", optional: true },
        { id: "thai-basil", name: "Thai basil", amount: 0.5, unit: "cup", notes: "fresh leaves" },
        { id: "curry-leaves", name: "Curry leaves", amount: 10, unit: "leaves", notes: "Indian touch" },
        { id: "green-chili", name: "Hari mirch", amount: 2, unit: "whole", notes: "slit" },
        { id: "fish-sauce", name: "Fish sauce", amount: 2, unit: "tbsp", notes: "or soy sauce for vegetarian" },
        { id: "palm-sugar", name: "Palm sugar", amount: 1, unit: "tbsp", notes: "or brown sugar" },
        { id: "lime-juice", name: "Lime juice", amount: 2, unit: "tbsp" },
        { id: "kaffir-lime", name: "Kaffir lime leaves", amount: 4, unit: "leaves", notes: "torn", optional: true },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
      ],
    },
  ],
  steps: [
    {
      id: "bloom-paste",
      title: "Bloom the curry paste",
      instruction: "Heat oil in a wok or deep pan over **medium-high heat**. Add green curry paste. Stir-fry for `2-3 minutes` until **fragrant** and the oil starts to separate. This releases the flavors.",
      ingredientRefs: ["oil", "green-curry-paste"],
      timers: [
        { label: "Bloom curry paste", duration: 180, type: "active", alert: "Paste is fragrant!" }
      ],
      tip: "The paste should smell aromatic, not raw. Don't skip this step — it's crucial.",
    },
    {
      id: "add-coconut-cream",
      title: "Add coconut cream",
      instruction: "Add the **thick part** of the coconut milk (from the top of the can). Stir and cook for `3-4 minutes` until it thickens and oil glistens on top. The curry base should look thick and glossy.",
      ingredientRefs: ["coconut-milk"],
      timers: [
        { label: "Cook coconut cream", duration: 240, type: "active", alert: "Cream is thick and glossy!" }
      ],
      tip: "Refrigerate the coconut milk can overnight — the thick cream separates nicely.",
    },
    {
      id: "add-protein",
      title: "Add protein (if using)",
      instruction: "If using tofu or chicken, add now. Stir-fry for `3-4 minutes` until lightly coated with the curry paste and starting to cook.",
      ingredientRefs: ["tofu"],
      timers: [
        { label: "Cook protein", duration: 240, type: "active", alert: "Protein is coated!" }
      ],
      parallel: true,
    },
    {
      id: "add-liquids",
      title: "Add remaining coconut milk and seasonings",
      instruction: "Pour in the rest of the coconut milk (the thin part). Add fish sauce, palm sugar, curry leaves, green chilies, and kaffir lime leaves. Stir well. Bring to a **gentle boil**, then reduce to simmer.",
      ingredientRefs: ["coconut-milk", "fish-sauce", "palm-sugar", "curry-leaves", "green-chili", "kaffir-lime"],
    },
    {
      id: "cook-vegetables",
      title: "Add vegetables and simmer",
      instruction: "Add mixed vegetables. Simmer on **medium-low heat** for `8-10 minutes` until vegetables are tender but still have bite. Stir occasionally. Add salt to taste.",
      ingredientRefs: ["vegetables", "salt"],
      timers: [
        { label: "Simmer curry", duration: 600, type: "passive", alert: "Vegetables should be tender!" }
      ],
      tip: "Don't overcook vegetables — they should be vibrant and slightly crunchy.",
    },
    {
      id: "finish",
      title: "Finish with basil and lime",
      instruction: "Turn off heat. Stir in Thai basil leaves and lime juice. The basil wilts in the residual heat. Taste and adjust seasoning — you want sweet, salty, sour, and spicy balanced.",
      ingredientRefs: ["thai-basil", "lime-juice"],
    },
    {
      id: "serve",
      title: "Serve hot",
      instruction: "Serve immediately with **jasmine rice** or **steamed rice**. Garnish with extra basil leaves and a lime wedge.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "The curry leaves are an Indian touch — not traditional Thai, but they add a beautiful aroma that bridges both cuisines.",
    "For authentic Thai flavor, use Thai basil (not Italian basil). Indian tulsi/holy basil works in a pinch.",
    "Vegetarian version: Skip fish sauce, use soy sauce + a pinch of seaweed for umami.",
  ],
  variations: [
    {
      title: "Thai Red Curry",
      description: "Use red curry paste instead of green. Add tomatoes for body. The flavor is earthier and spicier.",
      swaps: [{ ingredientId: "green-curry-paste", replacement: "Thai red curry paste (3 tbsp)" }],
    },
    {
      title: "Chicken Green Curry",
      description: "Replace tofu with chicken thighs (500g, cubed). Brown chicken first, then proceed with the recipe.",
      swaps: [{ ingredientId: "tofu", replacement: "Chicken thighs (500g)" }],
    },
  ],
};
