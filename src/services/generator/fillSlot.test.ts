import { describe, it, expect } from "vitest";
import { fillSlot, substitute } from "./fillSlot";
import type { CategoryRecipe, Slot } from "./types";

/**
 * Local copy of LabelBounds shape (from custom_canvas.ts getLabelBounds).
 * We only need startX, startY, width, height for geometry conversion.
 */
interface LabelBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const bounds: LabelBounds = { startX: 0, startY: 0, width: 240, height: 96 };
const dpmm = 8;

function makeRecipe(overrides: Partial<CategoryRecipe> = {}): CategoryRecipe {
  return {
    category: "test",
    archetypeId: "test-archetype",
    labelFr: "Test",
    labelEn: "Test",
    defaults: {},
    variables: [],
    iconKeywords: ["gift"],
    fontVibe: "festive",
    ...overrides,
  };
}

describe("substitute", () => {
  it("replaces {key} placeholders with variable values", () => {
    expect(substitute("Happy {name}", { name: "Léa" })).toBe("Happy Léa");
  });

  it("leaves unknown {key} placeholders untouched", () => {
    expect(substitute("Happy {name} the {adjective}", { name: "Léa" })).toBe("Happy Léa the {adjective}");
  });

  it("returns the string unchanged when there are no placeholders", () => {
    expect(substitute("Static text", {})).toBe("Static text");
  });
});

describe("fillSlot", () => {
  it("fills a text.title slot with substituted text and tier-based sizePx", () => {
    const slot: Slot = { role: "text.title", rect: [0.1, 0.1, 0.8, 0.3], align: "center" };
    const recipe = makeRecipe({ defaults: { "text.title": "Happy {name}" } });

    const result = fillSlot(slot, recipe, { name: "Léa" }, bounds, dpmm);

    expect(result?.kind).toBe("text");
    expect(result).toMatchObject({
      kind: "text",
      role: "text.title",
      text: "Happy Léa",
      sizePx: 72, // 9mm tier * dpmm(8)
      align: "center",
    });
    expect(result?.box.left).toBeCloseTo(24, 5);
    expect(result?.box.top).toBeCloseTo(9.6, 5);
    expect(result?.box.width).toBeCloseTo(192, 5);
    expect(result?.box.height).toBeCloseTo(28.8, 5);
  });

  it("defaults align to center when the slot has no align", () => {
    const slot: Slot = { role: "text.body", rect: [0, 0, 1, 1] };
    const recipe = makeRecipe({ defaults: { "text.body": "Body text" } });

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "text", align: "center" });
  });

  it("uses recipe.textSizesMm override instead of the tier default", () => {
    const slot: Slot = { role: "text.title", rect: [0, 0, 1, 1] };
    const recipe = makeRecipe({
      defaults: { "text.title": "Sale" },
      textSizesMm: { "text.title": 15 },
    });

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ sizePx: 120 }); // 15mm * 8dpmm
  });

  it("falls back to empty string when recipe.defaults has no entry for the role", () => {
    const slot: Slot = { role: "text.caption", rect: [0, 0, 1, 1] };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "text", text: "" });
  });

  it("fills an i.hero slot with icon descriptor and recipe.iconKeywords", () => {
    const slot: Slot = { role: "i.hero", rect: [0.2, 0.2, 0.6, 0.6], repeat: "perimeter" };
    const recipe = makeRecipe({ iconKeywords: ["cake", "balloon"] });

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({
      kind: "icon",
      role: "i.hero",
      keywords: ["cake", "balloon"],
      repeat: "perimeter",
    });
    expect(result?.box.left).toBeCloseTo(48, 5);
    expect(result?.box.top).toBeCloseTo(19.2, 5);
    expect(result?.box.width).toBeCloseTo(144, 5);
    expect(result?.box.height).toBeCloseTo(57.6, 5);
  });

  it("fills an i.background slot as icon", () => {
    const slot: Slot = { role: "i.background", rect: [0, 0, 1, 1] };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "icon", role: "i.background" });
  });

  it("fills a d.accent slot as icon", () => {
    const slot: Slot = { role: "d.accent", rect: [0, 0, 1, 1], repeat: 4 };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "icon", role: "d.accent", repeat: 4 });
  });

  it("fills a d.frame slot as shape rect", () => {
    const slot: Slot = { role: "d.frame", rect: [0, 0, 1, 1] };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toEqual({
      kind: "shape",
      role: "d.frame",
      shape: "rect",
      box: { left: 0, top: 0, width: 240, height: 96 },
    });
  });

  it("fills a d.separator slot as shape line", () => {
    const slot: Slot = { role: "d.separator", rect: [0, 0.5, 1, 0.02] };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "shape", shape: "line" });
  });

  it("fills a highlight-band slot as shape band", () => {
    const slot: Slot = { role: "highlight-band", rect: [0, 0.4, 1, 0.2] };
    const recipe = makeRecipe();

    const result = fillSlot(slot, recipe, {}, bounds, dpmm);

    expect(result).toMatchObject({ kind: "shape", shape: "band" });
  });

  it("returns null for a d.corner slot (ornament, Phase 3)", () => {
    const slot: Slot = { role: "d.corner", rect: [0, 0, 0.2, 0.2] };
    const recipe = makeRecipe();

    expect(fillSlot(slot, recipe, {}, bounds, dpmm)).toBeNull();
  });

  it("returns null for an f.qr slot (code objects, Phase 4)", () => {
    const slot: Slot = { role: "f.qr", rect: [0, 0, 0.3, 0.3] };
    const recipe = makeRecipe();

    expect(fillSlot(slot, recipe, {}, bounds, dpmm)).toBeNull();
  });

  it("returns null for f.barcode, f.date, f.serial slots as well", () => {
    const recipe = makeRecipe();
    for (const role of ["f.barcode", "f.date", "f.serial"] as const) {
      const slot: Slot = { role, rect: [0, 0, 0.3, 0.3] };
      expect(fillSlot(slot, recipe, {}, bounds, dpmm)).toBeNull();
    }
  });
});
