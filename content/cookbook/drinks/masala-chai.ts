import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "masala-chai",
  title: "Masala Chai (The Perfect Cup)",
  description: "Spiced milk tea with cardamom, ginger, and love. India's daily ritual, perfected over centuries.",
  meta: {
    category: "drinks",
    prepTime: 5,
    cookTime: 10,
    totalTime: 15,
    servings: 2,
    difficulty: "beginner",
    cuisine: "Indian",
    tags: ["tea", "spiced", "comfort", "morning"],
  },
  ingredients: [
    {
      items: [
        { id: "water", name: "Water", amount: 1.5, unit: "cups" },
        { id: "milk", name: "Milk", amount: 1, unit: "cup", notes: "whole milk for richness" },
        { id: "tea-leaves", name: "Black tea leaves", amount: 2, unit: "tsp", notes: "Assam or CTC" },
        { id: "ginger", name: "Ginger", amount: 1, unit: "inch", notes: "crushed" },
        { id: "cardamom", name: "Elaichi (green cardamom)", amount: 3, unit: "pods", notes: "lightly crushed" },
        { id: "cloves", name: "Laung (cloves)", amount: 2, unit: "whole", optional: true },
        { id: "cinnamon", name: "Dalchini stick", amount: 0.5, unit: "inch", optional: true },
        { id: "black-pepper", name: "Black peppercorns", amount: 3, unit: "whole", optional: true },
        { id: "sugar", name: "Sugar", amount: 2, unit: "tsp", notes: "or to taste" },
      ],
    },
  ],
  steps: [
    {
      id: "boil-water",
      title: "Boil water with spices",
      instruction: "In a small pot, add water, crushed ginger, cardamom pods, and any other whole spices you're using. Bring to a **rolling boil** on **high heat**. Boil for `2 minutes` to extract spice flavors.",
      ingredientRefs: ["water", "ginger", "cardamom", "cloves", "cinnamon", "black-pepper"],
      timers: [
        { label: "Boil spices", duration: 120, type: "active", alert: "Spices infused!" }
      ],
      tip: "The longer you boil spices, the stronger the chai. Adjust to taste.",
    },
    {
      id: "add-tea",
      title: "Add tea leaves",
      instruction: "Reduce heat to **medium**. Add tea leaves. Let them steep for `2 minutes`, stirring occasionally. The water should turn dark amber.",
      ingredientRefs: ["tea-leaves"],
      timers: [
        { label: "Steep tea", duration: 120, type: "active", alert: "Tea is steeped!" }
      ],
      tip: "CTC (crush-tear-curl) tea gives stronger, darker chai than loose leaf.",
    },
    {
      id: "add-milk-sugar",
      title: "Add milk and sugar",
      instruction: "Pour in the milk and add sugar. Stir well. Increase heat to **medium-high**. Bring to a **frothy boil** — it will rise up the sides of the pot. **Just before it overflows**, remove from heat. Let it settle, then return to heat. Repeat this **2-3 times**. This froths the chai and develops flavor.",
      ingredientRefs: ["milk", "sugar"],
      timers: [
        { label: "Boil chai", duration: 180, type: "active", alert: "Chai is frothed!" }
      ],
      tip: "Watch closely! Chai boils over quickly. The frothy boil is what makes it special.",
    },
    {
      id: "strain-serve",
      title: "Strain and serve",
      instruction: "Strain chai into cups through a fine sieve. Serve **immediately** while hot and frothy. Optionally top with a pinch of cardamom powder.",
      ingredientRefs: ["cardamom"],
    },
  ],
  notes: [
    "The ratio of water to milk determines chai style. More water = lighter 'cutting chai'. More milk = creamier 'doodh patti'.",
    "Ginger and cardamom are essential. Other spices are optional — customize your blend.",
    "For monsoon chai, add a tiny pinch of black pepper and tulsi (holy basil) leaves.",
  ],
  variations: [
    {
      title: "Cutting Chai",
      description: "Half the serving size. Use 2 parts water to 1 part milk. Serve in small glasses. The street-style version.",
      swaps: [],
    },
    {
      title: "Kashmiri Kahwa",
      description: "Skip milk. Use green tea instead of black. Add saffron strands, almonds, and a cinnamon stick. Sweeten with honey.",
      swaps: [
        { ingredientId: "tea-leaves", replacement: "Green tea (1 tsp)" },
        { ingredientId: "milk", replacement: "No milk" },
      ],
    },
  ],
};
