import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "mango-lassi",
  title: "Mango Lassi",
  description: "Creamy yogurt smoothie with ripe mangoes. Summer in a glass, the Punjab way.",
  meta: {
    category: "drinks",
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    servings: 2,
    difficulty: "beginner",
    cuisine: "North Indian",
    tags: ["mango", "yogurt", "cold", "summer"],
  },
  ingredients: [
    {
      items: [
        { id: "mango", name: "Ripe mangoes", amount: 2, unit: "medium", notes: "Alphonso or any sweet variety" },
        { id: "yogurt", name: "Dahi (yogurt)", amount: 1, unit: "cup", notes: "thick, chilled" },
        { id: "milk", name: "Milk", amount: 0.5, unit: "cup", notes: "chilled" },
        { id: "sugar", name: "Sugar", amount: 2, unit: "tbsp", notes: "adjust to mango sweetness" },
        { id: "cardamom", name: "Elaichi powder", amount: 0.25, unit: "tsp", optional: true },
        { id: "ice", name: "Ice cubes", amount: 6, unit: "cubes" },
        { id: "saffron", name: "Kesar (saffron)", amount: 3, unit: "strands", notes: "for garnish", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "prep-mango",
      title: "Prep the mangoes",
      instruction: "Peel and dice the mangoes. Remove any fibrous parts. You should have about `2 cups` of mango chunks. If using canned mango pulp, use `1 cup` of pulp and skip blending.",
      ingredientRefs: ["mango"],
      tip: "Overripe mangoes make the sweetest lassi. Alphonso is ideal but any sweet variety works.",
    },
    {
      id: "blend",
      title: "Blend everything",
      instruction: "In a blender, combine mango chunks, yogurt, milk, sugar, cardamom (if using), and ice cubes. Blend on **high speed** for `30-45 seconds` until **smooth and frothy**. The lassi should be thick but pourable.",
      ingredientRefs: ["mango", "yogurt", "milk", "sugar", "cardamom", "ice"],
      timers: [
        { label: "Blend lassi", duration: 45, type: "active", alert: "Lassi is smooth!" }
      ],
      tip: "Don't over-blend — you want it frothy, not aerated. 30-45 seconds is enough.",
    },
    {
      id: "adjust",
      title: "Taste and adjust",
      instruction: "Taste the lassi. Add more sugar if mangoes are tart, or more milk if it's too thick. Blend for another `10 seconds` to mix.",
      ingredientRefs: ["sugar", "milk"],
      timers: [
        { label: "Quick blend", duration: 10, type: "active", alert: "Ready to serve!" }
      ],
    },
    {
      id: "serve",
      title: "Serve chilled",
      instruction: "Pour into tall glasses. Garnish with saffron strands or a sprinkle of cardamom powder. Serve **immediately** while cold and frothy.",
      ingredientRefs: ["saffron", "cardamom"],
    },
  ],
  notes: [
    "The ratio is key: 2 parts mango, 1 part yogurt, 0.5 part milk. Adjust based on thickness preference.",
    "For restaurant-style thick lassi, use less milk and more yogurt. For lighter version, add more milk.",
    "Lassi tastes best when all ingredients are pre-chilled. It stays frothy longer.",
  ],
  variations: [
    {
      title: "Sweet Lassi (Plain)",
      description: "Skip the mango. Use just yogurt, milk, sugar, and cardamom. Classic Punjabi lassi.",
      swaps: [{ ingredientId: "mango", replacement: "No mango" }],
    },
    {
      title: "Salted Lassi (Namkeen)",
      description: "Skip mango and sugar. Add 1 tsp roasted cumin powder, 0.5 tsp salt, and a pinch of black salt. Savory lassi.",
      swaps: [],
    },
    {
      title: "Strawberry Lassi",
      description: "Replace mangoes with 2 cups of fresh or frozen strawberries.",
      swaps: [{ ingredientId: "mango", replacement: "Strawberries (2 cups)" }],
    },
  ],
};
