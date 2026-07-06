import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { createStickerIndex, searchStickers } from "./search";

// Integration proof against the REAL installed OpenMoji + emojibase data (not fixtures).
// Closes the "FR/EN symmetry on the real corpus" open item from the Task 3 review.
describe("sticker catalog — real corpus", () => {
  it("builds the full OpenMoji base catalog and searches it bilingually", async () => {
    const cat = await loadCatalog();

    // ~2465 non-skintone OpenMoji base emoji.
    expect(cat.length).toBeGreaterThan(2000);

    // Every asset has the required searchable + renderable fields.
    const dog = cat.find((a) => a.hexcode === "1F436");
    expect(dog).toBeDefined();
    expect(dog!.spriteUrl).toBe("/stickers/openmoji/black/1F436.svg");
    expect(dog!.labelFr).toBe("tête de chien");
    expect(dog!.labelEn).toBe("dog face");
    expect(dog!.themes).toContain("animals");

    const index = createStickerIndex(cat);

    // FR/EN symmetry: both terms find the dog on the real corpus.
    expect(searchStickers(index, cat, "chien").map((a) => a.hexcode)).toContain("1F436");
    expect(searchStickers(index, cat, "dog").map((a) => a.hexcode)).toContain("1F436");
    // FR keyword (CLDR annotation) works.
    expect(searchStickers(index, cat, "chiot").map((a) => a.hexcode)).toContain("1F436");
    // Prefix (search-as-you-type).
    expect(searchStickers(index, cat, "chien".slice(0, 4)).map((a) => a.hexcode)).toContain("1F436");

    // Theme filter narrows the corpus.
    const animals = searchStickers(index, cat, "", "animals");
    expect(animals.length).toBeGreaterThan(20);
    expect(animals.every((a) => a.themes.includes("animals"))).toBe(true);
  });
});
