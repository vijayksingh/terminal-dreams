import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "kerala-fish-curry",
  title: "Kerala Fish Curry (Meen Moilee)",
  description: "Delicate coconut milk curry with firm white fish, curry leaves, and a hint of tang. Kerala's coastal magic in a bowl.",
  meta: {
    category: "curries",
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Kerala",
    tags: ["fish", "coconut", "mild", "coastal"],
  },
  ingredients: [
    {
      items: [
        { id: "fish", name: "White fish fillets", amount: 500, unit: "g", notes: "pomfret, kingfish, or cod" },
        { id: "turmeric", name: "Haldi (turmeric)", amount: 0.5, unit: "tsp", notes: "for marinating" },
        { id: "salt-fish", name: "Salt", amount: 0.25, unit: "tsp", notes: "for marinating" },
        { id: "coconut-oil", name: "Coconut oil", amount: 3, unit: "tbsp" },
        { id: "mustard", name: "Rai (mustard seeds)", amount: 1, unit: "tsp" },
        { id: "curry-leaves", name: "Curry leaves", amount: 15, unit: "leaves", notes: "fresh" },
        { id: "onion", name: "Onions", amount: 2, unit: "medium", notes: "thinly sliced" },
        { id: "green-chili", name: "Hari mirch (green chilies)", amount: 3, unit: "whole", notes: "slit" },
        { id: "ginger", name: "Ginger", amount: 1, unit: "inch", notes: "julienned" },
        { id: "garlic", name: "Garlic", amount: 4, unit: "cloves", notes: "sliced" },
        { id: "turmeric-curry", name: "Haldi powder", amount: 0.5, unit: "tsp" },
        { id: "kashmiri-mirch", name: "Kashmiri lal mirch", amount: 0.5, unit: "tsp", notes: "mild, for color" },
        { id: "coconut-milk", name: "Coconut milk", amount: 400, unit: "ml", notes: "1 can" },
        { id: "tamarind", name: "Tamarind pulp", amount: 1, unit: "tsp", notes: "or kokum" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "cilantro", name: "Cilantro", amount: 2, unit: "tbsp", notes: "chopped" },
      ],
    },
  ],
  steps: [
    {
      id: "marinate-fish",
      title: "Marinate the fish",
      instruction: "Rub fish fillets with turmeric and salt. Let sit for `10 minutes` while you prep other ingredients. This removes the fishy smell and adds flavor.",
      ingredientRefs: ["fish", "turmeric", "salt-fish"],
      timers: [
        { label: "Marinate fish", duration: 600, type: "passive", alert: "Fish is marinated!" }
      ],
      tip: "Pat fish dry before marinating — helps the spices stick better.",
    },
    {
      id: "temper",
      title: "Temper the spices",
      instruction: "Heat coconut oil in a wide pan over **medium heat**. Add mustard seeds — they should splutter immediately. Add curry leaves (careful, they splatter). Let sizzle for `20 seconds`.",
      ingredientRefs: ["coconut-oil", "mustard", "curry-leaves"],
      timers: [
        { label: "Temper spices", duration: 20, type: "active", alert: "Tempering done!" }
      ],
      tip: "Fresh curry leaves are essential for authentic Kerala flavor. Dried ones don't compare.",
    },
    {
      id: "cook-aromatics",
      title: "Cook the aromatics",
      instruction: "Add sliced onions, green chilies, ginger, and garlic. Sauté on **medium heat** until onions turn **translucent**, about `5-6 minutes`. Don't brown them — we want a light gravy.",
      ingredientRefs: ["onion", "green-chili", "ginger", "garlic"],
      timers: [
        { label: "Sauté aromatics", duration: 360, type: "active", alert: "Onions should be translucent!" }
      ],
    },
    {
      id: "add-spices",
      title: "Add spices and coconut milk",
      instruction: "Add turmeric and Kashmiri mirch. Stir for `30 seconds`. Pour in coconut milk, add tamarind pulp and salt. Stir well and bring to a **gentle simmer**.",
      ingredientRefs: ["turmeric-curry", "kashmiri-mirch", "coconut-milk", "tamarind", "salt"],
      timers: [
        { label: "Bring to simmer", duration: 180, type: "passive", alert: "Gravy is simmering!" }
      ],
      tip: "Don't boil coconut milk too hard — it can split. Keep it at a gentle simmer.",
    },
    {
      id: "cook-fish",
      title: "Cook the fish",
      instruction: "Gently slide fish pieces into the simmering gravy. Cook uncovered on **low heat** for `8-10 minutes` until fish is cooked through but still firm. Don't stir — fish is delicate. Gently shake the pan instead.",
      ingredientRefs: ["fish"],
      timers: [
        { label: "Cook fish", duration: 600, type: "active", alert: "Fish should be cooked through!" }
      ],
      tip: "Fish is done when it flakes easily with a fork but doesn't fall apart.",
    },
    {
      id: "finish",
      title: "Finish and serve",
      instruction: "Turn off heat. Garnish with chopped cilantro. Serve hot with **steamed rice** or **appam**. The gravy should be thin and soupy.",
      ingredientRefs: ["cilantro"],
    },
  ],
  notes: [
    "This is a mild curry. If you want more heat, add more green chilies or a pinch of black pepper.",
    "Kokum (fish tamarind) is traditional in Kerala. It adds a unique sour note. If unavailable, regular tamarind works.",
    "Don't skip the coconut oil — it's integral to the flavor profile.",
  ],
  variations: [
    {
      title: "Prawn Moilee",
      description: "Replace fish with large prawns/shrimp. Cook for 4-5 minutes only until pink.",
      swaps: [{ ingredientId: "fish", replacement: "Prawns (500g, peeled and deveined)" }],
    },
    {
      title: "Spicy Meen Curry",
      description: "Add 1 tsp red chili powder and 1 tsp coriander powder for a spicier, more robust version.",
      swaps: [],
    },
  ],
};
