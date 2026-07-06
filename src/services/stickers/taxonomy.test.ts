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
  it("maps the event subgroup to 'party'", () => {
    expect(themesForEmoji("activities", "event", "1F389")).toEqual(["party"]); // 🎉
  });
  it("maps plants and weather to 'nature-seasons'", () => {
    expect(themesForEmoji("animals-nature", "plant-flower", "1F338")).toEqual(["nature-seasons"]); // 🌸
    expect(themesForEmoji("travel-places", "sky-weather", "2744-FE0F")).toContain("nature-seasons"); // ❄️
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
  it("adds 'cute' for a curated hexcode on top of its mechanical theme", () => {
    const t = themesForEmoji("animals-nature", "animal-mammal", "1F431"); // 🐱 cat face
    expect(t).toContain("animals");
    expect(t).toContain("cute");
  });
  it("falls back to 'objects' when nothing matches", () => {
    expect(themesForEmoji("some-unknown-group", "whatever", "0000")).toEqual(["objects"]);
  });
});
