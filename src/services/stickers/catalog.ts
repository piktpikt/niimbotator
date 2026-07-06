import type { StickerAsset } from "./types";
import { themesForEmoji } from "./taxonomy";

export interface OpenmojiRecord {
  hexcode: string;
  emoji: string;
  group: string;
  subgroups: string;
  annotation: string;
  tags: string; // comma-separated
  skintone: string; // "" for base emoji
}
export interface EmojibaseRecord {
  hexcode: string;
  label: string;
  tags?: string[];
}

const splitTags = (csv: string): string[] =>
  csv.split(",").map((t) => t.trim()).filter((t) => t.length > 0);

/** Pure: join the OpenMoji base set with emojibase FR+EN annotations (by hexcode) into StickerAssets. */
export function buildCatalog(
  openmoji: OpenmojiRecord[],
  en: EmojibaseRecord[],
  fr: EmojibaseRecord[],
): StickerAsset[] {
  const enBy = new Map(en.map((r) => [r.hexcode, r]));
  const frBy = new Map(fr.map((r) => [r.hexcode, r]));

  const out: StickerAsset[] = [];
  for (const om of openmoji) {
    if (om.skintone !== "") continue; // drop skin-tone variants
    const e = enBy.get(om.hexcode);
    const f = frBy.get(om.hexcode);

    const labelEn = e?.label ?? om.annotation;
    const labelFr = f?.label ?? labelEn;
    const keywordsEn = e?.tags && e.tags.length > 0 ? e.tags : splitTags(om.tags);
    const keywordsFr = f?.tags ?? [];

    out.push({
      id: `openmoji:${om.hexcode}`,
      sourceId: "openmoji",
      kind: "emoji-vector",
      hexcode: om.hexcode,
      glyph: om.emoji,
      spriteUrl: `/stickers/openmoji/black/${om.hexcode}.svg`,
      tonalOk: true,
      themes: themesForEmoji(om.group, om.subgroups, om.hexcode),
      labelFr,
      labelEn,
      keywordsFr,
      keywordsEn,
      license: "CC-BY-SA-4.0",
      attributionRequired: true,
    });
  }
  return out;
}

let cached: StickerAsset[] | null = null;

/** Runtime loader: dynamically imports the (large) JSON data so it stays out of the main bundle, builds
 *  the catalog once, and memoizes it. Used by the picker; never in unit tests (which call buildCatalog). */
export async function loadCatalog(): Promise<StickerAsset[]> {
  if (cached) return cached;
  const [om, en, fr] = await Promise.all([
    import("openmoji/data/openmoji.json"),
    import("emojibase-data/en/data.json"),
    import("emojibase-data/fr/data.json"),
  ]);
  cached = buildCatalog(
    om.default as unknown as OpenmojiRecord[],
    en.default as unknown as EmojibaseRecord[],
    fr.default as unknown as EmojibaseRecord[],
  );
  return cached;
}
