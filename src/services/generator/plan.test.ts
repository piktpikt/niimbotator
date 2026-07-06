import { describe, it, expect } from "vitest";
import { planLabel } from "./plan";
import { RECIPES } from "./recipes";
import { DEFAULT_LABEL_PROPS } from "$/defaults";
import type { CategoryRecipe } from "./types";

function recipeFor(category: string): CategoryRecipe {
  const recipe = RECIPES.find((r) => r.category === category);
  if (!recipe) throw new Error(`Recipe not found: ${category}`);
  return recipe;
}

describe("planLabel", () => {
  it("substitutes variables end-to-end for the IDName recipe", () => {
    const recipe = recipeFor("IDName");

    const descriptors = planLabel(recipe, { name: "Léa" }, DEFAULT_LABEL_PROPS);

    const textDescriptors = descriptors.filter((d) => d.kind === "text");
    expect(textDescriptors.length).toBeGreaterThan(0);
    expect(textDescriptors.some((d) => d.kind === "text" && d.text.includes("Léa"))).toBe(true);
  });

  it("produces icon + text descriptors for the Birthday recipe, all boxes within label bounds", () => {
    const recipe = recipeFor("Birthday");

    const descriptors = planLabel(recipe, { name: "Léa" }, DEFAULT_LABEL_PROPS);

    const iconDescriptors = descriptors.filter((d) => d.kind === "icon");
    const textDescriptors = descriptors.filter((d) => d.kind === "text");
    expect(iconDescriptors.length).toBeGreaterThan(0);
    expect(iconDescriptors.every((d) => d.kind === "icon" && d.keywords === recipe.iconKeywords)).toBe(true);
    expect(textDescriptors.length).toBeGreaterThan(0);

    const { width, height } = DEFAULT_LABEL_PROPS.size;
    for (const d of descriptors) {
      expect(d.box.left).toBeGreaterThanOrEqual(0);
      expect(d.box.left).toBeLessThanOrEqual(width);
      expect(d.box.top).toBeGreaterThanOrEqual(0);
      expect(d.box.top).toBeLessThanOrEqual(height);
    }
  });

  it("orders descriptors by ascending slot z (frames/background under text)", () => {
    // name-badge archetype: i.hero/d.separator have z:1, text.name/text.contact have z:2.
    const recipe = recipeFor("IDName");

    const descriptors = planLabel(recipe, { name: "Léa", role: "Dev" }, DEFAULT_LABEL_PROPS);

    const heroIndex = descriptors.findIndex((d) => d.kind === "icon" && d.role === "i.hero");
    const nameIndex = descriptors.findIndex((d) => d.kind === "text" && d.role === "text.name");

    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(nameIndex).toBeGreaterThanOrEqual(0);
    expect(heroIndex).toBeLessThan(nameIndex);
  });

  it("never returns null entries in the descriptor array", () => {
    for (const recipe of RECIPES) {
      const descriptors = planLabel(recipe, {}, DEFAULT_LABEL_PROPS);
      expect(descriptors.every((d) => d !== null)).toBe(true);
    }
  });

  it("returns an empty array when the recipe's archetypeId does not exist", () => {
    const recipe = recipeFor("IDName");
    const badRecipe: CategoryRecipe = { ...recipe, archetypeId: "does-not-exist" };

    const descriptors = planLabel(badRecipe, { name: "Léa" }, DEFAULT_LABEL_PROPS);

    expect(descriptors).toEqual([]);
  });
});
