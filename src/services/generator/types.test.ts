import { describe, expect, it } from "vitest";
import { ArchetypeSchema, CategoryRecipeSchema } from "./types";

const VALID_ARCHETYPE = {
  id: "centered-hero",
  slots: [{ role: "text.title", rect: [0.1, 0.1, 0.8, 0.2], align: "center", z: 1 }],
};

const VALID_RECIPE = {
  category: "Birthday",
  archetypeId: "centered-hero",
  labelFr: "Anniversaire",
  labelEn: "Birthday",
  defaults: { "text.title": "Happy Birthday" },
  variables: ["name", "age"],
  iconKeywords: ["cake", "balloon"],
  fontVibe: "festive",
};

describe("ArchetypeSchema", () => {
  it("parses a valid archetype", () => {
    const parsed = ArchetypeSchema.parse(VALID_ARCHETYPE);
    expect(parsed.id).toBe("centered-hero");
    expect(parsed.slots).toHaveLength(1);
    expect(parsed.slots[0].role).toBe("text.title");
    expect(parsed.slots[0].rect).toEqual([0.1, 0.1, 0.8, 0.2]);
  });

  it("rejects a rect value greater than 1", () => {
    const invalid = {
      id: "bad-rect",
      slots: [{ role: "text.title", rect: [0.1, 0.1, 1.5, 0.2] }],
    };
    expect(() => ArchetypeSchema.parse(invalid)).toThrow();
  });

  it("rejects an unknown role string", () => {
    const invalid = {
      id: "bad-role",
      slots: [{ role: "text.made-up", rect: [0.1, 0.1, 0.8, 0.2] }],
    };
    expect(() => ArchetypeSchema.parse(invalid)).toThrow();
  });
});

describe("CategoryRecipeSchema", () => {
  it("parses a valid recipe", () => {
    const parsed = CategoryRecipeSchema.parse(VALID_RECIPE);
    expect(parsed.category).toBe("Birthday");
    expect(parsed.archetypeId).toBe("centered-hero");
    expect(parsed.fontVibe).toBe("festive");
    expect(parsed.variables).toEqual(["name", "age"]);
  });

  it("rejects a bad fontVibe", () => {
    const invalid = { ...VALID_RECIPE, fontVibe: "spooky" };
    expect(() => CategoryRecipeSchema.parse(invalid)).toThrow();
  });
});
