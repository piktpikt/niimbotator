import type { ThemeKey } from "./types";

// OpenMoji subgroup strings (see node_modules/openmoji/data/openmoji.json "subgroups").
const ANIMAL_SUBGROUPS = new Set([
  "animal-mammal", "animal-bird", "animal-amphibian", "animal-reptile", "animal-marine", "animal-bug",
  "cat-face", "monkey-face",
]);
const NATURE_SUBGROUPS = new Set(["plant-flower", "plant-other", "sky-weather"]);
const LOVE_SUBGROUPS = new Set(["heart", "emotion"]); // hearts + love emotion
const PARTY_SUBGROUPS = new Set(["event"]);

// Curated cross-cutting allowlists (uppercase hexcodes, matching openmoji).
const SEASONS_ALLOWLIST = new Set([
  "1F383", "1F384", "2744-FE0F", "2603-FE0F", "26C4", "1F338", "1F342", "1F383", "1F386",
]); // 🎃 🎄 ❄️ ☃️ ⛄ 🌸 🍂 🎆
const CUTE_ALLOWLIST = new Set([
  "1F431", "1F638", "1F639", "1F63B", "1F408", // cats (excluding 1F63A per test)
  "1F430", "1F407", "1F43C", "1F428", "1F984", // rabbit, panda, koala, unicorn
  "1F495", "1F496", "1F497", "1F49E", "1F49D", // sparkly hearts
  "1F423", "1F424", "1F425", "1F426", // baby chicks/birds
]);

/** Map an OpenMoji emoji's group/subgroup + hexcode to one or more theme chips. Cross-cutting themes
 *  ('cute', 'nature-seasons') are added ON TOP of the mechanical theme. Falls back to 'objects'. */
export function themesForEmoji(group: string, subgroups: string, hexcode: string): ThemeKey[] {
  const themes = new Set<ThemeKey>();

  if (ANIMAL_SUBGROUPS.has(subgroups)) themes.add("animals");
  else if (group === "food-drink") themes.add("food");
  else if (LOVE_SUBGROUPS.has(subgroups)) themes.add("love");
  else if (PARTY_SUBGROUPS.has(subgroups)) themes.add("party");
  else if (NATURE_SUBGROUPS.has(subgroups)) themes.add("nature-seasons");
  else if (group === "travel-places") themes.add("travel");
  else if (group === "smileys-emotion") themes.add("smileys");
  else if (group === "objects") themes.add("objects");
  else if (group === "symbols") themes.add("symbols");

  if (SEASONS_ALLOWLIST.has(hexcode)) themes.add("nature-seasons");
  if (CUTE_ALLOWLIST.has(hexcode)) themes.add("cute");

  if (themes.size === 0) themes.add("objects");
  return [...themes];
}
