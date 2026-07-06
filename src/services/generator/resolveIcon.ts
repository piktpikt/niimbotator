import type MiniSearch from "minisearch";
import { loadCatalog } from "$/services/stickers/catalog";
import { createStickerIndex, searchStickers } from "$/services/stickers/search";
import type { StickerAsset } from "$/services/stickers/types";

let assetsCache: StickerAsset[] | null = null;
let indexCache: MiniSearch<StickerAsset> | null = null;

/** Lazily builds and memoizes the sticker catalog + search index (once per module lifetime). */
async function getIndex(): Promise<{ assets: StickerAsset[]; index: MiniSearch<StickerAsset> }> {
  if (!assetsCache || !indexCache) {
    assetsCache = await loadCatalog();
    indexCache = createStickerIndex(assetsCache);
  }
  return { assets: assetsCache, index: indexCache };
}

/**
 * Resolves a hero/accent icon SVG from the P5 sticker catalog by trying each keyword in order
 * (first result of the first keyword that hits wins). Returns null if no keyword matches or if
 * anything fails (catalog load, search, fetch) so a bad lookup never throws to the caller.
 */
export async function resolveIconSvg(keywords: string[]): Promise<string | null> {
  try {
    const { assets, index } = await getIndex();

    for (const keyword of keywords) {
      const [hit] = searchStickers(index, assets, keyword);
      if (hit) {
        const response = await fetch(hit.spriteUrl);
        return await response.text();
      }
    }

    return null;
  } catch {
    return null;
  }
}
