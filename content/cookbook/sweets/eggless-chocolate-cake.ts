import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "eggless-chocolate-cake",
  title: "Eggless Chocolate Cake (Bakery Style)",
  description: "Moist, rich chocolate cake without eggs. The one every Indian bakery makes, but homemade.",
  meta: {
    category: "sweets",
    prepTime: 15,
    cookTime: 35,
    totalTime: 50,
    servings: 8,
    difficulty: "beginner",
    cuisine: "Indian Bakery",
    tags: ["eggless", "chocolate", "cake", "baking"],
  },
  ingredients: [
    {
      group: "For the cake",
      items: [
        { id: "flour", name: "All-purpose flour (maida)", amount: 1.5, unit: "cups" },
        { id: "sugar", name: "Sugar", amount: 1, unit: "cup" },
        { id: "cocoa", name: "Cocoa powder", amount: 0.5, unit: "cup", notes: "unsweetened" },
        { id: "baking-soda", name: "Baking soda", amount: 1, unit: "tsp" },
        { id: "salt", name: "Salt", amount: 0.25, unit: "tsp" },
        { id: "oil", name: "Vegetable oil", amount: 0.5, unit: "cup" },
        { id: "yogurt", name: "Dahi (yogurt)", amount: 0.5, unit: "cup", notes: "thick" },
        { id: "milk", name: "Milk", amount: 0.75, unit: "cup" },
        { id: "vanilla", name: "Vanilla extract", amount: 1, unit: "tsp" },
        { id: "vinegar", name: "White vinegar", amount: 1, unit: "tbsp", notes: "don't skip!" },
        { id: "coffee", name: "Instant coffee powder", amount: 1, unit: "tsp", notes: "dissolved in 2 tbsp hot water", optional: true },
      ],
    },
    {
      group: "For the frosting (optional)",
      items: [
        { id: "butter", name: "Butter", amount: 100, unit: "g", notes: "softened" },
        { id: "cocoa-frosting", name: "Cocoa powder", amount: 0.5, unit: "cup" },
        { id: "powdered-sugar", name: "Powdered sugar", amount: 2, unit: "cups" },
        { id: "milk-frosting", name: "Milk", amount: 3, unit: "tbsp" },
        { id: "vanilla-frosting", name: "Vanilla extract", amount: 1, unit: "tsp" },
      ],
    },
  ],
  steps: [
    {
      id: "preheat",
      title: "Preheat and prep pan",
      instruction: "Preheat oven to `350°F (180°C)`. Grease an 8-inch round cake pan and line the bottom with parchment paper. Dust with flour or cocoa powder.",
      ingredientRefs: [],
      tip: "Lining with parchment ensures the cake releases cleanly.",
    },
    {
      id: "mix-dry",
      title: "Mix dry ingredients",
      instruction: "In a large bowl, sift together flour, sugar, cocoa powder, baking soda, and salt. Whisk well to combine and remove lumps.",
      ingredientRefs: ["flour", "sugar", "cocoa", "baking-soda", "salt"],
      tip: "Sifting cocoa powder prevents lumps in the batter.",
    },
    {
      id: "mix-wet",
      title: "Mix wet ingredients",
      instruction: "In another bowl, whisk together oil, yogurt, milk, vanilla, and coffee (if using). Whisk until **smooth and emulsified**. Add vinegar last and whisk quickly — it will fizz (that's the magic!).",
      ingredientRefs: ["oil", "yogurt", "milk", "vanilla", "coffee", "vinegar"],
      tip: "Vinegar + baking soda reaction makes the cake light and fluffy. Don't skip the vinegar!",
    },
    {
      id: "combine-batter",
      title: "Combine to make batter",
      instruction: "Pour wet ingredients into dry ingredients. **Fold gently** with a spatula until **just combined**. Don't overmix — some small lumps are fine. The batter should be **thin and pourable** (like thick pancake batter).",
      ingredientRefs: [],
      tip: "Overmixing develops gluten = dense cake. Mix just until no dry flour remains.",
    },
    {
      id: "bake",
      title: "Bake the cake",
      instruction: "Pour batter into prepared pan. Tap the pan gently on the counter to release air bubbles. Bake for `30-35 minutes` until a toothpick inserted in the center comes out **clean or with a few moist crumbs** (not wet batter).",
      ingredientRefs: [],
      timers: [
        { label: "Bake cake", duration: 2100, type: "passive", alert: "Check cake with toothpick!" }
      ],
      tip: "Don't open the oven door before 25 minutes — the cake can sink.",
    },
    {
      id: "cool",
      title: "Cool the cake",
      instruction: "Let cake cool in the pan for `10 minutes`, then turn out onto a wire rack to cool **completely** before frosting (if frosting).",
      ingredientRefs: [],
      timers: [
        { label: "Cool in pan", duration: 600, type: "passive", alert: "Turn cake out onto rack!" }
      ],
      tip: "Frosting a warm cake = melted frosting disaster. Be patient.",
    },
    {
      id: "make-frosting",
      title: "Make chocolate frosting (optional)",
      instruction: "Beat softened butter until creamy. Sift in cocoa powder and powdered sugar alternately with milk. Add vanilla. Beat on **high speed** for `3-4 minutes` until **light and fluffy**. Adjust consistency with more milk or sugar.",
      ingredientRefs: ["butter", "cocoa-frosting", "powdered-sugar", "milk-frosting", "vanilla-frosting"],
      timers: [
        { label: "Beat frosting", duration: 240, type: "active", alert: "Frosting is fluffy!" }
      ],
      parallel: true,
    },
    {
      id: "frost-serve",
      title: "Frost and serve",
      instruction: "Spread frosting over the cooled cake. Slice and serve. Or skip frosting and dust with powdered sugar — bakery style.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "This cake stays moist for days. Store covered at room temperature for 3 days or refrigerate for up to a week.",
    "The vinegar is crucial — it reacts with baking soda to leaven the cake. You won't taste it in the final cake.",
    "For a two-layer cake, double the recipe and bake in two pans for 25-30 minutes.",
  ],
  variations: [
    {
      title: "Chocolate Cupcakes",
      description: "Same batter, bake in cupcake liners for 18-20 minutes. Makes 12 cupcakes.",
      swaps: [],
    },
    {
      title: "Chocolate Marble Cake",
      description: "Make half the batter plain (skip cocoa). Layer chocolate and plain batter in the pan, swirl with a knife.",
      swaps: [],
    },
  ],
};
