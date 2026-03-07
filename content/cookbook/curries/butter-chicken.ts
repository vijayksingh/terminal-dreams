import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "butter-chicken",
  title: "Butter Chicken (Murgh Makhani)",
  description: "Silky, aromatic tomato-cream curry with tender chicken. The dish that made Indian food famous worldwide.",
  meta: {
    category: "curries",
    prepTime: 20,
    cookTime: 40,
    totalTime: 60,
    servings: 4,
    difficulty: "intermediate",
    cuisine: "North Indian",
    tags: ["chicken", "curry", "tomato", "cream", "restaurant-style"],
  },
  ingredients: [
    {
      group: "For the marinade",
      items: [
        { id: "chicken", name: "Chicken thighs", amount: 750, unit: "g", notes: "boneless, cut into chunks" },
        { id: "yogurt", name: "Dahi (yogurt)", amount: 0.5, unit: "cup", notes: "thick, hung yogurt works best" },
        { id: "ginger-garlic", name: "Ginger-garlic paste", amount: 1, unit: "tbsp" },
        { id: "kashmiri-mirch", name: "Kashmiri lal mirch", amount: 1, unit: "tsp", notes: "for color" },
        { id: "salt-marinade", name: "Salt", amount: 0.5, unit: "tsp" },
      ],
    },
    {
      group: "For the gravy",
      items: [
        { id: "butter", name: "Butter", amount: 4, unit: "tbsp", notes: "divided" },
        { id: "oil", name: "Oil", amount: 2, unit: "tbsp" },
        { id: "bay-leaf", name: "Tej patta (bay leaf)", amount: 2, unit: "leaves" },
        { id: "cinnamon", name: "Dalchini (cinnamon)", amount: 1, unit: "inch stick" },
        { id: "cardamom", name: "Elaichi (green cardamom)", amount: 3, unit: "pods", notes: "lightly crushed" },
        { id: "onion", name: "Onions", amount: 2, unit: "large", notes: "finely chopped" },
        { id: "tomato", name: "Tomatoes", amount: 4, unit: "large", notes: "pureed" },
        { id: "ginger-garlic-gravy", name: "Ginger-garlic paste", amount: 1, unit: "tbsp" },
        { id: "kashmiri-mirch-gravy", name: "Kashmiri lal mirch", amount: 1.5, unit: "tsp" },
        { id: "garam-masala", name: "Garam masala", amount: 1, unit: "tsp" },
        { id: "kasuri-methi", name: "Kasuri methi (dried fenugreek)", amount: 2, unit: "tsp", notes: "crushed between palms" },
        { id: "cream", name: "Heavy cream", amount: 0.75, unit: "cup" },
        { id: "sugar", name: "Sugar", amount: 1, unit: "tsp", notes: "balances acidity" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
      ],
    },
  ],
  steps: [
    {
      id: "marinate",
      title: "Marinate the chicken",
      instruction: "In a bowl, mix chicken with yogurt, ginger-garlic paste, Kashmiri mirch, and salt. Coat well. Cover and refrigerate for **at least 2 hours** (overnight is even better). The yogurt tenderizes the meat.",
      ingredientRefs: ["chicken", "yogurt", "ginger-garlic", "kashmiri-mirch", "salt-marinade"],
      timers: [
        { label: "Marinate chicken", duration: 7200, type: "passive", alert: "Chicken is marinated and ready!" }
      ],
      tip: "Room temperature chicken cooks more evenly. Take it out of the fridge 30 minutes before cooking.",
    },
    {
      id: "cook-chicken",
      title: "Cook the chicken",
      instruction: "Heat 2 tbsp butter in a large pan over **medium-high heat**. Add marinated chicken (discard excess marinade). Cook until **lightly charred** on edges and just cooked through, about `8-10 minutes`. Remove and set aside.",
      ingredientRefs: ["chicken", "butter"],
      timers: [
        { label: "Cook chicken", duration: 600, type: "active", alert: "Chicken should be lightly charred!" }
      ],
      tip: "Don't crowd the pan — cook in batches if needed. The char adds depth.",
    },
    {
      id: "bloom-spices",
      title: "Bloom the whole spices",
      instruction: "In the same pan, add 2 tbsp butter and oil. Add bay leaves, cinnamon, and cardamom. Sauté for `30 seconds` until **fragrant**. The oil should smell aromatic.",
      ingredientRefs: ["butter", "oil", "bay-leaf", "cinnamon", "cardamom"],
      timers: [
        { label: "Bloom spices", duration: 30, type: "active", alert: "Spices are fragrant!" }
      ],
    },
    {
      id: "caramelize-onions",
      title: "Caramelize the onions",
      instruction: "Add chopped onions. Cook on **medium heat**, stirring occasionally, until **deep golden brown**, about `12-15 minutes`. Don't rush this — caramelized onions = sweet, complex gravy.",
      ingredientRefs: ["onion"],
      timers: [
        { label: "Caramelize onions", duration: 900, type: "active", alert: "Onions should be deep golden!" }
      ],
      tip: "If onions start sticking, add a splash of water and keep going.",
    },
    {
      id: "cook-tomatoes",
      title: "Cook the tomato base",
      instruction: "Add ginger-garlic paste, sauté for `1 minute`. Add pureed tomatoes, Kashmiri mirch, salt, and sugar. Cook on **medium heat** until oil separates from the masala, about `15-20 minutes`. The gravy should be thick and rich.",
      ingredientRefs: ["ginger-garlic-gravy", "tomato", "kashmiri-mirch-gravy", "salt", "sugar"],
      timers: [
        { label: "Cook tomato masala", duration: 1200, type: "active", alert: "Oil should be separating from masala!" }
      ],
      tip: "Stir frequently to prevent burning. The gravy will darken and thicken.",
    },
    {
      id: "finish-gravy",
      title: "Finish the gravy",
      instruction: "Add garam masala and kasuri methi. Stir for `30 seconds`. Pour in the cream and mix well. Add the cooked chicken back. Simmer for `5 minutes` to let flavors meld. Adjust salt.",
      ingredientRefs: ["garam-masala", "kasuri-methi", "cream", "chicken"],
      timers: [
        { label: "Simmer curry", duration: 300, type: "passive", alert: "Butter chicken is ready!" }
      ],
    },
    {
      id: "serve",
      title: "Serve hot",
      instruction: "Garnish with a drizzle of cream and a cube of butter. Serve with **naan, roti, or jeera rice**. This is best eaten immediately while the gravy is silky.",
      ingredientRefs: ["butter", "cream"],
    },
  ],
  notes: [
    "The secret to restaurant-style butter chicken is the kasuri methi — don't skip it.",
    "For smoky flavor, char a coal and place it in a small bowl in the pan. Pour ghee over it, cover immediately for 5 minutes (dhungar technique).",
    "Leftovers taste even better the next day as flavors deepen.",
  ],
  variations: [
    {
      title: "Paneer Butter Masala",
      description: "Replace chicken with paneer cubes. Skip the marinade, lightly fry paneer until golden, then add to gravy.",
      swaps: [{ ingredientId: "chicken", replacement: "Paneer (500g, cubed)" }],
    },
    {
      title: "Vegan Butter Chickpeas",
      description: "Use chickpeas instead of chicken, coconut cream instead of dairy cream, and vegan butter.",
      swaps: [
        { ingredientId: "chicken", replacement: "Chickpeas (2 cans, drained)" },
        { ingredientId: "cream", replacement: "Coconut cream" },
        { ingredientId: "butter", replacement: "Vegan butter" },
      ],
    },
  ],
};
