import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "tadka-dal",
  title: "Tadka Dal (Yellow Lentil Curry)",
  description: "Simple, comforting lentils finished with a smoking hot tempering. The backbone of everyday Indian meals.",
  meta: {
    category: "quick-meals",
    prepTime: 10,
    cookTime: 25,
    totalTime: 35,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Indian",
    tags: ["lentils", "vegetarian", "comfort-food", "protein"],
  },
  ingredients: [
    {
      group: "For the dal",
      items: [
        { id: "toor-dal", name: "Toor dal (pigeon pea lentils)", amount: 1, unit: "cup" },
        { id: "water-dal", name: "Water", amount: 3, unit: "cups" },
        { id: "turmeric", name: "Haldi (turmeric)", amount: 0.5, unit: "tsp" },
        { id: "tomato", name: "Tomatoes", amount: 1, unit: "medium", notes: "chopped" },
        { id: "green-chili", name: "Hari mirch (green chili)", amount: 1, unit: "whole", notes: "slit" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "lemon-juice", name: "Lemon juice", amount: 1, unit: "tbsp", optional: true },
      ],
    },
    {
      group: "For the tadka (tempering)",
      items: [
        { id: "ghee", name: "Ghee", amount: 2, unit: "tbsp" },
        { id: "cumin", name: "Jeera (cumin seeds)", amount: 1, unit: "tsp" },
        { id: "mustard", name: "Rai (mustard seeds)", amount: 0.5, unit: "tsp" },
        { id: "asafoetida", name: "Hing (asafoetida)", amount: 0.25, unit: "tsp" },
        { id: "dried-chili", name: "Whole dried red chilies", amount: 2, unit: "whole" },
        { id: "garlic", name: "Garlic", amount: 4, unit: "cloves", notes: "thinly sliced" },
        { id: "curry-leaves", name: "Curry leaves", amount: 8, unit: "leaves", optional: true },
      ],
    },
    {
      group: "For garnish",
      items: [
        { id: "cilantro", name: "Cilantro", amount: 2, unit: "tbsp", notes: "chopped" },
      ],
    },
  ],
  steps: [
    {
      id: "rinse-dal",
      title: "Rinse and soak dal",
      instruction: "Rinse toor dal in a sieve under cold water until water runs clear. Soak in water for `10 minutes` while you prep other ingredients. This reduces cooking time.",
      ingredientRefs: ["toor-dal"],
      timers: [
        { label: "Soak dal", duration: 600, type: "passive", alert: "Dal is ready to cook!" }
      ],
      tip: "Soaking is optional but helps dal cook faster and more evenly.",
    },
    {
      id: "cook-dal",
      title: "Cook the dal",
      instruction: "In a pot or pressure cooker, add drained dal, water, turmeric, chopped tomato, and green chili. **Pressure cooker**: Cook for `3 whistles` or `10 minutes` on high. **Stovetop**: Bring to boil, then simmer covered for `20-25 minutes` until dal is **soft and mushy**.",
      ingredientRefs: ["toor-dal", "water-dal", "turmeric", "tomato", "green-chili"],
      timers: [
        { label: "Cook dal", duration: 1500, type: "passive", alert: "Dal should be soft!" }
      ],
      tip: "Dal is ready when you can easily mash a grain between your fingers.",
    },
    {
      id: "mash-season",
      title: "Mash and season",
      instruction: "Once cooked, **mash the dal lightly** with a whisk or back of a ladle — keep some texture. Add salt and lemon juice (if using). Adjust consistency with water if needed — dal should be **pourable but not thin**. Keep warm on low heat.",
      ingredientRefs: ["salt", "lemon-juice", "water-dal"],
      tip: "Dal thickens as it cools. Keep it slightly thinner than your target consistency.",
    },
    {
      id: "make-tadka",
      title: "Make the tadka (tempering)",
      instruction: "Heat ghee in a small pan over **medium-high heat** until **very hot** (almost smoking). Add cumin and mustard seeds — they should **crackle immediately**. Add hing, dried red chilies, curry leaves (careful, they splatter!), and sliced garlic. Fry for `30-40 seconds` until garlic is **golden** and everything is **aromatic**.",
      ingredientRefs: ["ghee", "cumin", "mustard", "asafoetida", "dried-chili", "garlic", "curry-leaves"],
      timers: [
        { label: "Make tadka", duration: 40, type: "active", alert: "Tadka is ready!" }
      ],
      tip: "Tadka should be HOT — that sizzle when it hits the dal is essential. Don't burn the garlic.",
    },
    {
      id: "temper-dal",
      title: "Pour tadka over dal",
      instruction: "**Immediately** pour the hot tadka over the dal — it should **sizzle and splutter**. Cover immediately for `30 seconds` to trap the flavors. Uncover, mix gently, and garnish with chopped cilantro.",
      ingredientRefs: ["cilantro"],
      timers: [
        { label: "Infuse tadka", duration: 30, type: "passive", alert: "Dal is ready!" }
      ],
      tip: "The sizzling sound when tadka hits dal is the most satisfying sound in cooking.",
    },
    {
      id: "serve",
      title: "Serve hot",
      instruction: "Serve immediately with **steamed rice** or **roti**. Dal tastes even better the next day as flavors meld.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "This is the most basic dal. You can add ginger-garlic paste, more spices, or vegetables to customize.",
    "The tadka makes the dal. Don't skip it or use less ghee — that aromatic sizzle is the soul of dal.",
    "Leftover dal? Add water and reheat. Use in dal chawal, dal paratha, or even as a soup.",
  ],
  variations: [
    {
      title: "Dal Fry",
      description: "Before the tadka, sauté onions, ginger-garlic paste, and tomatoes in ghee until soft. Add dal and cook together for 5 minutes. Then add tadka. Richer, restaurant-style.",
      swaps: [],
    },
    {
      title: "Mixed Dal",
      description: "Use a mix of lentils: 1/2 cup toor dal + 1/4 cup moong dal + 1/4 cup masoor dal. More complex flavor and texture.",
      swaps: [],
    },
  ],
};
