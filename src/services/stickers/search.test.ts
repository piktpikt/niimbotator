import { describe, expect, it } from "vitest";
import { createStickerIndex, searchStickers } from "./search";
import type { StickerAsset } from "./types";

const mk = (over: Partial<StickerAsset>): StickerAsset => ({
  id: "openmoji:X", sourceId: "openmoji", kind: "emoji-vector", hexcode: "X", glyph: "?",
  spriteUrl: "/x.svg", tonalOk: true, themes: ["objects"], labelFr: "", labelEn: "",
  keywordsFr: [], keywordsEn: [], license: "CC-BY-SA-4.0", attributionRequired: true, ...over,
});

const DOG = mk({ id: "openmoji:1F436", hexcode: "1F436", labelEn: "dog face", labelFr: "tête de chien", keywordsEn: ["puppy", "pet"], keywordsFr: ["chien", "chiot"], themes: ["animals", "cute"] });
const PIZZA = mk({ id: "openmoji:1F355", hexcode: "1F355", labelEn: "pizza", labelFr: "pizza", keywordsEn: ["food"], keywordsFr: ["nourriture"], themes: ["food"] });
const ASSETS = [DOG, PIZZA];

describe("searchStickers", () => {
  it("finds a sticker by its FR term", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "chien").map((a) => a.id)).toEqual(["openmoji:1F436"]);
  });
  it("finds the SAME sticker by its EN term", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "dog").map((a) => a.id)).toEqual(["openmoji:1F436"]);
  });
  it("matches keyword prefixes (search-as-you-type)", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "chio").map((a) => a.id)).toContain("openmoji:1F436"); // "chio" → chiot
  });
  it("tolerates a typo (fuzzy)", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "puppp").map((a) => a.id)).toContain("openmoji:1F436");
  });
  it("returns all assets for an empty query, filtered by theme when given", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "").map((a) => a.id)).toEqual(["openmoji:1F436", "openmoji:1F355"]);
    expect(searchStickers(idx, ASSETS, "", "food").map((a) => a.id)).toEqual(["openmoji:1F355"]);
  });
  it("applies the theme filter on top of a text query", () => {
    const idx = createStickerIndex(ASSETS);
    expect(searchStickers(idx, ASSETS, "pizza", "animals")).toEqual([]);
  });
});
