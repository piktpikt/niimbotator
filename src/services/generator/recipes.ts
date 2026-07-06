import type { CategoryRecipe } from "./types";
import { CategoryRecipeSchema } from "./types";

/**
 * Hand-authored content recipes (Phase 1 subset of the ~48 categories targeted in Phase 3).
 * Each recipe's `defaults` only sets roles that exist among its archetype's slots — enforced
 * by `recipes.test.ts`. Validated against {@link CategoryRecipeSchema} at module load.
 */
const RAW_RECIPES: CategoryRecipe[] = [
  {
    category: "Birthday",
    archetypeId: "centred-hero",
    labelFr: "Anniversaire",
    labelEn: "Birthday",
    defaults: {
      "text.title": "Happy Birthday {name}",
    },
    variables: ["name", "age", "message"],
    iconKeywords: ["cake", "candle", "balloon", "gift", "confetti"],
    fontVibe: "festive",
  },
  {
    category: "Price",
    archetypeId: "price-tag",
    labelFr: "Prix",
    labelEn: "Price",
    defaults: {
      "text.name": "{product}",
      "text.price": "{price}",
      "text.caption": "{sku}",
    },
    variables: ["product", "price", "unit", "sku"],
    iconKeywords: ["tag", "price-tag", "shopping"],
    fontVibe: "retail",
  },
  {
    category: "Jam",
    archetypeId: "full-image-caption",
    labelFr: "Confiture",
    labelEn: "Jam",
    defaults: {
      "text.caption": "{fruit} Jam — Handcrafted Preserves",
    },
    variables: ["fruit", "date", "netWeight"],
    iconKeywords: ["jar", "strawberry", "fruit", "bee"],
    fontVibe: "handmade",
  },
  {
    category: "IDName",
    archetypeId: "name-badge",
    labelFr: "Nom & identité",
    labelEn: "ID / Name",
    defaults: {
      "text.name": "{name}",
      "text.contact": "{role}",
    },
    variables: ["name", "role", "company"],
    iconKeywords: ["person", "badge"],
    fontVibe: "clean",
  },
  {
    category: "Pets",
    archetypeId: "centred-hero",
    labelFr: "Animaux",
    labelEn: "Pets",
    defaults: {
      "text.title": "{name}",
    },
    variables: ["name", "contact"],
    iconKeywords: ["cat", "dog", "paw", "bone", "fish"],
    fontVibe: "festive",
  },
  {
    category: "FoodStorage",
    archetypeId: "name-badge",
    labelFr: "Conservation alimentaire",
    labelEn: "Food Storage",
    defaults: {
      "text.name": "{product}",
      "text.contact": "Best before {date}",
    },
    variables: ["product", "date", "batch"],
    iconKeywords: ["box", "fridge", "calendar", "leaf"],
    fontVibe: "clean",
  },
];

export const RECIPES: CategoryRecipe[] = RAW_RECIPES.map((recipe) => CategoryRecipeSchema.parse(recipe));
