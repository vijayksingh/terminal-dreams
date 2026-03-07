import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "shahi-tukda",
  title: "Shahi Tukda",
  description: "Royal bread pudding — fried bread soaked in saffron milk, topped with rabri and nuts. Mughal decadence on a plate.",
  meta: {
    category: "sweets",
    prepTime: 15,
    cookTime: 40,
    totalTime: 55,
    servings: 6,
    difficulty: "intermediate",
    cuisine: "Mughlai",
    tags: ["rich", "festive", "royal", "saffron"],
  },
  ingredients: [
    {
      group: "For the bread",
      items: [
        { id: "bread", name: "White bread", amount: 6, unit: "slices", notes: "thick cut, slightly stale" },
        { id: "ghee", name: "Ghee", amount: 0.5, unit: "cup", notes: "for frying" },
      ],
    },
    {
      group: "For the sugar syrup",
      items: [
        { id: "sugar", name: "Sugar", amount: 1, unit: "cup" },
        { id: "water", name: "Water", amount: 0.75, unit: "cup" },
        { id: "cardamom", name: "Elaichi (cardamom) pods", amount: 3, unit: "whole", notes: "crushed" },
        { id: "saffron", name: "Kesar (saffron)", amount: 10, unit: "strands" },
        { id: "rose-water", name: "Rose water", amount: 1, unit: "tsp" },
      ],
    },
    {
      group: "For the rabri (reduced milk)",
      items: [
        { id: "milk", name: "Full-fat milk", amount: 4, unit: "cups" },
        { id: "sugar-rabri", name: "Sugar", amount: 0.25, unit: "cup" },
        { id: "cardamom-rabri", name: "Elaichi powder", amount: 0.25, unit: "tsp" },
        { id: "saffron-rabri", name: "Kesar", amount: 5, unit: "strands", notes: "soaked in 1 tbsp milk" },
      ],
    },
    {
      group: "For garnish",
      items: [
        { id: "almonds", name: "Almonds", amount: 0.25, unit: "cup", notes: "slivered" },
        { id: "pistachios", name: "Pistachios", amount: 0.25, unit: "cup", notes: "slivered" },
        { id: "edible-silver", name: "Vark (edible silver leaf)", amount: 1, unit: "sheet", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "make-rabri",
      title: "Make the rabri (reduced milk)",
      instruction: "In a heavy-bottomed pan, bring milk to a **boil** on **medium-high heat**. Reduce heat to **low**. Simmer, stirring frequently, for `25-30 minutes` until milk reduces to **half** and thickens. Stir from sides and scrape the cream layer back into the milk. Add sugar, cardamom powder, and saffron milk. Cook for `5 more minutes`. Chill.",
      ingredientRefs: ["milk", "sugar-rabri", "cardamom-rabri", "saffron-rabri"],
      timers: [
        { label: "Reduce milk", duration: 1800, type: "active", alert: "Milk reduced by half!" },
        { label: "Final cook", duration: 300, type: "active", alert: "Rabri is ready!" }
      ],
      tip: "Constant stirring prevents burning. The rabri should coat the back of a spoon.",
    },
    {
      id: "make-syrup",
      title: "Make the sugar syrup",
      instruction: "In a pan, combine sugar, water, cardamom, and saffron. Bring to a **boil**, stirring until sugar dissolves. Boil for `5 minutes` until **slightly sticky** (one-thread consistency). Add rose water. Turn off heat. Keep warm.",
      ingredientRefs: ["sugar", "water", "cardamom", "saffron", "rose-water"],
      timers: [
        { label: "Make syrup", duration: 300, type: "active", alert: "Syrup is ready!" }
      ],
      parallel: true,
    },
    {
      id: "fry-bread",
      title: "Fry the bread",
      instruction: "Trim crusts from bread slices. Cut each slice **diagonally** into 2 triangles. Heat ghee in a pan over **medium heat**. Fry bread triangles in batches until **golden and crispy** on both sides, about `2-3 minutes` per side. Drain on paper towels.",
      ingredientRefs: ["bread", "ghee"],
      timers: [
        { label: "Fry bread", duration: 180, type: "active", alert: "Bread is golden!" }
      ],
      tip: "Fry on medium heat — not too hot or bread burns before crisping.",
    },
    {
      id: "soak-bread",
      title: "Soak bread in syrup",
      instruction: "While bread is still **warm**, dip each triangle into the warm sugar syrup for `10-15 seconds` per side. Don't oversoak — bread should absorb syrup but not fall apart. Arrange soaked bread triangles on a serving platter.",
      ingredientRefs: ["bread", "sugar"],
      tip: "Work quickly while bread and syrup are both warm for best absorption.",
    },
    {
      id: "assemble",
      title: "Assemble the shahi tukda",
      instruction: "Pour chilled rabri **generously** over the soaked bread triangles. Garnish with slivered almonds and pistachios. Optionally, place vark (edible silver) on top for that royal touch.",
      ingredientRefs: ["milk", "almonds", "pistachios", "edible-silver"],
    },
    {
      id: "serve",
      title: "Chill and serve",
      instruction: "Refrigerate for **at least 2 hours** (or overnight) before serving. This allows flavors to meld. Serve chilled.",
      ingredientRefs: [],
      timers: [
        { label: "Chill dessert", duration: 7200, type: "passive", alert: "Shahi tukda is ready to serve!" }
      ],
    },
  ],
  notes: [
    "This is a rich, indulgent dessert meant for special occasions. A little goes a long way.",
    "Use slightly stale bread — it absorbs syrup better without falling apart. Fresh bread gets too soggy.",
    "The rabri can be made a day ahead and refrigerated.",
  ],
  variations: [
    {
      title: "Quick Shahi Tukda",
      description: "Skip homemade rabri. Use store-bought condensed milk mixed with cream and cardamom. Not authentic but much faster.",
      swaps: [],
    },
    {
      title: "Double Ka Meetha (Hyderabadi Version)",
      description: "Same concept but use double roti (pav). Hyderabadi style is often served warm with extra nuts.",
      swaps: [{ ingredientId: "bread", replacement: "Pav or double roti (6 pieces)" }],
    },
  ],
};
