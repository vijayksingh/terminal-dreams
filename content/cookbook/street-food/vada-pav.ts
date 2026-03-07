import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "vada-pav",
  title: "Vada Pav (Mumbai's Burger)",
  description: "Spiced potato fritter in a soft bun with fiery chutneys. Mumbai's soul food, perfected on the streets.",
  meta: {
    category: "street-food",
    prepTime: 25,
    cookTime: 20,
    totalTime: 45,
    servings: 6,
    difficulty: "intermediate",
    cuisine: "Mumbai Street Food",
    tags: ["vegetarian", "fried", "spicy", "iconic"],
  },
  ingredients: [
    {
      group: "For the vada (potato filling)",
      items: [
        { id: "potatoes", name: "Potatoes", amount: 4, unit: "large", notes: "boiled, peeled, mashed" },
        { id: "oil-filling", name: "Oil", amount: 2, unit: "tbsp" },
        { id: "mustard", name: "Rai (mustard seeds)", amount: 1, unit: "tsp" },
        { id: "curry-leaves", name: "Curry leaves", amount: 10, unit: "leaves" },
        { id: "asafoetida", name: "Hing (asafoetida)", amount: 0.25, unit: "tsp" },
        { id: "turmeric", name: "Haldi", amount: 0.5, unit: "tsp" },
        { id: "green-chili", name: "Hari mirch", amount: 3, unit: "whole", notes: "finely chopped" },
        { id: "ginger", name: "Ginger", amount: 1, unit: "inch", notes: "grated" },
        { id: "garlic", name: "Garlic", amount: 4, unit: "cloves", notes: "minced" },
        { id: "cilantro", name: "Cilantro", amount: 3, unit: "tbsp", notes: "chopped" },
        { id: "lemon-juice", name: "Lemon juice", amount: 1, unit: "tbsp" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
      ],
    },
    {
      group: "For the besan coating",
      items: [
        { id: "besan", name: "Besan (chickpea flour)", amount: 1, unit: "cup" },
        { id: "rice-flour", name: "Rice flour", amount: 2, unit: "tbsp", notes: "for crispiness" },
        { id: "turmeric-batter", name: "Haldi", amount: 0.25, unit: "tsp" },
        { id: "red-chili", name: "Lal mirch", amount: 0.5, unit: "tsp" },
        { id: "baking-soda", name: "Baking soda", amount: 0.25, unit: "tsp", notes: "tiny pinch" },
        { id: "salt-batter", name: "Salt", amount: 0.5, unit: "tsp" },
        { id: "water", name: "Water", amount: 0.75, unit: "cup", notes: "adjust for consistency" },
      ],
    },
    {
      group: "For serving",
      items: [
        { id: "pav", name: "Pav (soft dinner rolls)", amount: 6, unit: "buns" },
        { id: "butter", name: "Butter", amount: 2, unit: "tbsp", notes: "for toasting pav" },
        { id: "green-chutney", name: "Green chutney", amount: 0.5, unit: "cup", notes: "cilantro-mint-chili" },
        { id: "tamarind-chutney", name: "Sweet tamarind chutney", amount: 0.5, unit: "cup", optional: true },
        { id: "dry-garlic-chutney", name: "Dry garlic chutney", amount: 3, unit: "tbsp", notes: "lal chutney" },
        { id: "fried-chili", name: "Fried green chilies", amount: 6, unit: "whole", notes: "tempering for garnish" },
        { id: "oil-frying", name: "Oil", amount: 2, unit: "cups", notes: "for deep frying" },
      ],
    },
  ],
  steps: [
    {
      id: "prepare-filling",
      title: "Prepare the potato filling",
      instruction: "Heat 2 tbsp oil in a pan. Add mustard seeds — let them crackle. Add curry leaves, hing, turmeric. Then add ginger, garlic, green chilies. Sauté for `1 minute`. Add mashed potatoes, salt, cilantro, and lemon juice. Mix well. Cook for `2-3 minutes`. Let cool.",
      ingredientRefs: ["oil-filling", "mustard", "curry-leaves", "asafoetida", "turmeric", "ginger", "garlic", "green-chili", "potatoes", "salt", "cilantro", "lemon-juice"],
      timers: [
        { label: "Cook potato filling", duration: 240, type: "active", alert: "Filling is ready!" }
      ],
      tip: "The filling should be dry, not wet. If too moist, it will break in the batter.",
    },
    {
      id: "shape-vadas",
      title: "Shape the vadas",
      instruction: "Divide potato filling into 6 equal portions. Roll each into a **smooth, crack-free ball**. Set aside. Cracks = oil seeping in during frying.",
      ingredientRefs: ["potatoes"],
      tip: "Wet your palms slightly while shaping to prevent sticking.",
    },
    {
      id: "make-batter",
      title: "Make the besan batter",
      instruction: "In a bowl, mix besan, rice flour, turmeric, red chili powder, salt, and baking soda. Add water gradually to make a **smooth, flowing batter** — consistency of thick pancake batter. No lumps.",
      ingredientRefs: ["besan", "rice-flour", "turmeric-batter", "red-chili", "salt-batter", "baking-soda", "water"],
      tip: "Batter should coat the back of a spoon but flow off smoothly. Too thick = heavy vada, too thin = won't coat.",
    },
    {
      id: "fry-vadas",
      title: "Fry the vadas",
      instruction: "Heat oil for deep frying to **medium-high heat** (`180°C`). Dip each potato ball in batter to coat completely. Gently slide into hot oil. Fry `3-4 vadas` at a time (don't crowd). Fry for `4-5 minutes`, turning occasionally, until **golden and crispy**. Drain on paper towels.",
      ingredientRefs: ["oil-frying", "potatoes", "besan"],
      timers: [
        { label: "Fry vadas", duration: 300, type: "active", alert: "Vadas should be golden!" }
      ],
      tip: "Oil should be hot but not smoking. Test with a drop of batter — it should rise immediately but not burn.",
    },
    {
      id: "toast-pav",
      title: "Toast the pav",
      instruction: "Slice pav horizontally (don't cut through). Heat butter on a griddle. Toast pav cut-side down until **golden and crispy**, about `2 minutes`. The buttery crunch is essential.",
      ingredientRefs: ["pav", "butter"],
      timers: [
        { label: "Toast pav", duration: 120, type: "active", alert: "Pav is golden!" }
      ],
      parallel: true,
    },
    {
      id: "assemble",
      title: "Assemble the vada pav",
      instruction: "On the bottom half of pav, spread green chutney generously. Sprinkle dry garlic chutney. Place hot vada. Add a fried green chili on the side. Optionally add a drizzle of sweet tamarind chutney. Close with the top pav.",
      ingredientRefs: ["pav", "green-chutney", "dry-garlic-chutney", "fried-chili", "tamarind-chutney"],
    },
    {
      id: "serve",
      title: "Serve immediately",
      instruction: "Serve hot with extra fried chilies on the side. Best eaten right away while the vada is crispy and the pav is warm.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "The magic triangle: crispy vada + soft buttery pav + fiery chutneys. Don't skip any element.",
    "Dry garlic chutney (lal chutney) is the soul of vada pav. It's made with red chilies, garlic, peanuts, and salt — ground to a coarse powder.",
    "For authentic Mumbai experience, serve with fried salted green chilies (batata wadas are often served with them).",
  ],
  variations: [
    {
      title: "Cheese Vada Pav",
      description: "Add a slice of processed cheese on top of the vada before closing the pav. Popular Mumbai variation.",
      swaps: [],
    },
    {
      title: "Samosa Pav",
      description: "Replace vada with a crushed samosa in the pav. Another street food mashup.",
      swaps: [{ ingredientId: "potatoes", replacement: "Samosa (1 per pav)" }],
    },
  ],
};
