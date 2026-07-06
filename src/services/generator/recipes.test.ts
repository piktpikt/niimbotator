import { describe, expect, it } from "vitest";
import { ARCHETYPES, archetypeById } from "./archetypes";
import { RECIPES } from "./recipes";
import { ArchetypeSchema, CategoryRecipeSchema } from "./types";

describe("ARCHETYPES", () => {
  it("has exactly 5 archetypes", () => {
    expect(ARCHETYPES).toHaveLength(5);
  });

  it("every archetype validates against ArchetypeSchema", () => {
    for (const archetype of ARCHETYPES) {
      expect(() => ArchetypeSchema.parse(archetype)).not.toThrow();
    }
  });

  it("has unique ids", () => {
    const ids = ARCHETYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("RECIPES", () => {
  it("has exactly 6 recipes", () => {
    expect(RECIPES).toHaveLength(6);
  });

  it("every recipe validates against CategoryRecipeSchema", () => {
    for (const recipe of RECIPES) {
      expect(() => CategoryRecipeSchema.parse(recipe)).not.toThrow();
    }
  });

  it("every recipe's archetypeId resolves to a known archetype", () => {
    for (const recipe of RECIPES) {
      const archetype = archetypeById(recipe.archetypeId);
      expect(archetype, `archetypeId "${recipe.archetypeId}" for category "${recipe.category}"`).toBeDefined();
    }
  });

  it("every defaults key is a Role present in that recipe's archetype's slots", () => {
    for (const recipe of RECIPES) {
      const archetype = archetypeById(recipe.archetypeId);
      if (!archetype) continue; // covered by prior test
      const archetypeRoles = new Set(archetype.slots.map((s) => s.role));
      for (const role of Object.keys(recipe.defaults)) {
        expect(
          archetypeRoles.has(role as never),
          `recipe "${recipe.category}" defaults role "${role}" not found in archetype "${archetype.id}" slots`
        ).toBe(true);
      }
    }
  });

  it("covers the expected 6 categories", () => {
    const categories = RECIPES.map((r) => r.category).sort();
    expect(categories).toEqual(["Birthday", "FoodStorage", "IDName", "Jam", "Pets", "Price"].sort());
  });
});

describe("archetypeById", () => {
  it("returns undefined for an unknown id", () => {
    expect(archetypeById("does-not-exist")).toBeUndefined();
  });

  it("returns the matching archetype for a known id", () => {
    const found = archetypeById("centred-hero");
    expect(found?.id).toBe("centred-hero");
  });
});
