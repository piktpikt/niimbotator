import MiniSearch from "minisearch";
import type { StickerAsset, ThemeKey } from "./types";

const FIELDS = ["labelFr", "labelEn", "keywordsFr", "keywordsEn"];

/** Build a MiniSearch index over both languages. Keyword arrays are flattened to a space-joined string so
 *  a single field indexes all of them; labels are boosted above keywords. */
export function createStickerIndex(assets: StickerAsset[]): MiniSearch<StickerAsset> {
  const index = new MiniSearch<StickerAsset>({
    idField: "id",
    fields: FIELDS,
    extractField: (doc, field) => {
      const v = doc[field as keyof StickerAsset];
      return Array.isArray(v) ? v.join(" ") : (v as string) ?? "";
    },
  });
  index.addAll(assets);
  return index;
}

/** Search-as-you-type. Empty query = all assets (insertion order). `theme` post-filters either path. */
export function searchStickers(
  index: MiniSearch<StickerAsset>,
  assets: StickerAsset[],
  query: string,
  theme?: ThemeKey,
): StickerAsset[] {
  const byTheme = (a: StickerAsset) => (theme ? a.themes.includes(theme) : true);

  const q = query.trim();
  if (q.length === 0) return assets.filter(byTheme);

  const byId = new Map(assets.map((a) => [a.id, a]));
  return index
    .search(q, { prefix: true, fuzzy: 0.2, boost: { labelFr: 2, labelEn: 2 } })
    .map((r) => byId.get(r.id as string))
    .filter((a): a is StickerAsset => !!a && byTheme(a));
}
