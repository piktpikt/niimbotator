import { describe, expect, it } from "vitest";
import { buildCatalog, type OpenmojiRecord, type EmojibaseRecord } from "./catalog";

const OM: OpenmojiRecord[] = [
  { hexcode: "1F436", emoji: "🐶", group: "animals-nature", subgroups: "animal-mammal", annotation: "dog face", tags: "dog, pet", skintone: "" },
  { hexcode: "1F600", emoji: "😀", group: "smileys-emotion", subgroups: "face-smiling", annotation: "grinning face", tags: "smile", skintone: "" },
  { hexcode: "1F44D-1F3FB", emoji: "👍🏻", group: "people-body", subgroups: "hand-fingers-closed", annotation: "thumbs up: light skin tone", tags: "", skintone: "1F3FB" }, // must be dropped
];
const EN: EmojibaseRecord[] = [
  { hexcode: "1F436", label: "dog face", tags: ["dog", "face", "pet", "puppy"] },
  { hexcode: "1F600", label: "grinning face", tags: ["grin", "happy", "smile"] },
];
const FR: EmojibaseRecord[] = [
  { hexcode: "1F436", label: "tête de chien", tags: ["chien", "chiot", "animal"] },
  { hexcode: "1F600", label: "visage rieur", tags: ["sourire", "content"] },
];

describe("buildCatalog", () => {
  it("drops skintone variants", () => {
    const cat = buildCatalog(OM, EN, FR);
    expect(cat.map((a) => a.hexcode)).toEqual(["1F436", "1F600"]);
  });
  it("joins emojibase FR+EN labels and keywords by hexcode", () => {
    const dog = buildCatalog(OM, EN, FR).find((a) => a.hexcode === "1F436")!;
    expect(dog.labelFr).toBe("tête de chien");
    expect(dog.labelEn).toBe("dog face");
    expect(dog.keywordsFr).toContain("chiot");
    expect(dog.keywordsEn).toContain("puppy");
  });
  it("builds a stable id, glyph, spriteUrl and themes", () => {
    const dog = buildCatalog(OM, EN, FR).find((a) => a.hexcode === "1F436")!;
    expect(dog.id).toBe("openmoji:1F436");
    expect(dog.glyph).toBe("🐶");
    expect(dog.spriteUrl).toBe("/stickers/openmoji/black/1F436.svg");
    expect(dog.themes).toContain("animals");
    expect(dog.tonalOk).toBe(true);
  });
  it("falls back to OpenMoji annotation/tags when emojibase has no match", () => {
    const cat = buildCatalog(
      [{ hexcode: "E000", emoji: "⬤", group: "objects", subgroups: "extra", annotation: "custom blob", tags: "blob, thing", skintone: "" }],
      [], [],
    );
    expect(cat[0].labelEn).toBe("custom blob");
    expect(cat[0].labelFr).toBe("custom blob"); // no FR → mirror EN
    expect(cat[0].keywordsEn).toEqual(["blob", "thing"]);
    expect(cat[0].keywordsFr).toEqual([]);
  });
});
