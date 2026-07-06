import { describe, expect, it } from "vitest";
import { themesForEmoji } from "./taxonomy";

describe("themesForEmoji", () => {
  it("maps the food-drink group to 'food'", () => {
    expect(themesForEmoji("food-drink", "food-prepared", "1F355")).toEqual(["food"]); // 🍕
  });
  it("maps animal subgroups to 'animals'", () => {
    expect(themesForEmoji("animals-nature", "animal-mammal", "1F436")).toEqual(["animals"]); // 🐶
  });
  it("routes cat/monkey faces (in smileys group) to 'animals'", () => {
    expect(themesForEmoji("smileys-emotion", "cat-face", "1F63A")).toEqual(["animals"]); // 😺
  });
  it("maps face-smiling to 'smileys'", () => {
    expect(themesForEmoji("smileys-emotion", "face-smiling", "1F600")).toEqual(["smileys"]); // 😀
  });
  it("maps the heart subgroup to 'love'", () => {
    expect(themesForEmoji("smileys-emotion", "heart", "2764-FE0F")).toEqual(["love"]); // ❤️
  });
  it("does NOT treat the 'emotion' subgroup as love (it's anger/collision/etc., not hearts)", () => {
    // 1F4A2 = anger symbol, smileys-emotion/emotion (real openmoji hexcode)
    expect(themesForEmoji("smileys-emotion", "emotion", "1F4A2")).toEqual(["smileys"]);
  });
  it("maps the event subgroup to 'party'", () => {
    expect(themesForEmoji("activities", "event", "1F389")).toEqual(["party"]); // 🎉
  });
  it("maps plants and weather to 'nature-seasons'", () => {
    expect(themesForEmoji("animals-nature", "plant-flower", "1F338")).toEqual(["nature-seasons"]); // 🌸
    expect(themesForEmoji("travel-places", "sky-weather", "2744")).toContain("nature-seasons"); // ❄️ (real openmoji hexcode, no -FE0F)
  });
  it("keeps travel-places (minus weather) as 'travel'", () => {
    expect(themesForEmoji("travel-places", "place-map", "1F5FA-FE0F")).toEqual(["travel"]); // 🗺️
  });
  it("adds 'nature-seasons' for a seasonal hexcode even from another group", () => {
    // 🎃 jack-o-lantern is in activities/event but is seasonal
    const t = themesForEmoji("activities", "event", "1F383");
    expect(t).toContain("nature-seasons");
    expect(t).toContain("party");
  });
  it("matches the SEASONS_ALLOWLIST snowman using its real openmoji hexcode (no -FE0F selector)", () => {
    // ☃️ snowman = 2603, travel-places/sky-weather (real openmoji hexcode)
    const t = themesForEmoji("travel-places", "sky-weather", "2603");
    expect(t).toContain("nature-seasons");
  });
  it("adds 'cute' for a curated hexcode on top of its mechanical theme", () => {
    const t = themesForEmoji("animals-nature", "animal-mammal", "1F431"); // 🐱 cat face
    expect(t).toContain("animals");
    expect(t).toContain("cute");
  });
  it("falls back to 'objects' when nothing matches", () => {
    expect(themesForEmoji("some-unknown-group", "whatever", "0000")).toEqual(["objects"]);
  });
});
