import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "old-monk-old-fashioned",
  title: "Old Monk Old Fashioned",
  description: "Classic whiskey cocktail, reimagined with India's beloved dark rum. Bitters, sugar, and nostalgia in a glass.",
  meta: {
    category: "drinks",
    prepTime: 5,
    cookTime: 0,
    totalTime: 5,
    servings: 1,
    difficulty: "beginner",
    cuisine: "Cocktail",
    tags: ["rum", "cocktail", "classic", "indian"],
  },
  ingredients: [
    {
      items: [
        { id: "old-monk", name: "Old Monk rum", amount: 60, unit: "ml", notes: "2 oz" },
        { id: "sugar", name: "Sugar cube or syrup", amount: 1, unit: "cube", notes: "or 1 tsp simple syrup" },
        { id: "bitters", name: "Angostura bitters", amount: 3, unit: "dashes" },
        { id: "water", name: "Water", amount: 1, unit: "tsp", notes: "for muddling sugar" },
        { id: "orange-peel", name: "Orange peel", amount: 1, unit: "strip", notes: "for garnish" },
        { id: "ice", name: "Ice cube", amount: 1, unit: "large cube", notes: "or 3-4 regular cubes" },
        { id: "cherry", name: "Maraschino cherry", amount: 1, unit: "whole", notes: "optional garnish" },
      ],
    },
  ],
  steps: [
    {
      id: "muddle-sugar",
      title: "Muddle the sugar",
      instruction: "In an old fashioned glass, place the sugar cube. Add 3 dashes of bitters and 1 tsp of water. **Muddle** (crush and stir) until sugar dissolves, about `30 seconds`. If using simple syrup, just stir with bitters.",
      ingredientRefs: ["sugar", "bitters", "water"],
      timers: [
        { label: "Muddle sugar", duration: 30, type: "active", alert: "Sugar dissolved!" }
      ],
      tip: "A proper muddle releases the bitters into the sugar. Don't skip this — it's the flavor foundation.",
    },
    {
      id: "add-ice-rum",
      title: "Add ice and rum",
      instruction: "Place a **large ice cube** in the glass (or fill with regular ice). Pour in the Old Monk rum. **Stir gently** with a bar spoon for `20-30 seconds` to chill and dilute slightly.",
      ingredientRefs: ["ice", "old-monk"],
      timers: [
        { label: "Stir cocktail", duration: 30, type: "active", alert: "Cocktail is chilled!" }
      ],
      tip: "Stir, don't shake. An Old Fashioned should be spirit-forward and smooth, not aerated.",
    },
    {
      id: "express-garnish",
      title: "Express the orange peel",
      instruction: "Take the orange peel strip. Hold it over the glass, peel side down. **Twist/pinch it firmly** to release the oils over the drink — you should see a fine mist. Rub the peel around the rim of the glass, then drop it into the drink.",
      ingredientRefs: ["orange-peel"],
      tip: "Expressing the peel adds aromatic oils, not juice. The citrus aroma is key to an Old Fashioned.",
    },
    {
      id: "garnish-serve",
      title: "Garnish and serve",
      instruction: "Optionally add a maraschino cherry. Serve immediately. Sip slowly — this is a contemplative drink.",
      ingredientRefs: ["cherry"],
    },
  ],
  notes: [
    "Old Monk's vanilla-caramel notes work beautifully in an Old Fashioned. It's sweeter and smoother than whiskey versions.",
    "The large ice cube melts slowly, keeping the drink cold without over-diluting. If using regular cubes, drink faster.",
    "This is a strong, spirit-forward drink. Sip, don't shoot.",
  ],
  variations: [
    {
      title: "Smoky Old Monk Fashioned",
      description: "Before adding rum, use a smoking gun or burnt cinnamon stick to add smoke to the glass. Cover with coaster for 30 seconds.",
      swaps: [],
    },
    {
      title: "Spiced Old Fashioned",
      description: "Add a pinch of garam masala or cardamom powder while muddling. Indian spices meet classic cocktail.",
      swaps: [],
    },
    {
      title: "Whiskey Old Fashioned (Traditional)",
      description: "Replace Old Monk with 60ml of bourbon or rye whiskey. Classic version.",
      swaps: [{ ingredientId: "old-monk", replacement: "Bourbon or rye whiskey (60ml)" }],
    },
  ],
};
