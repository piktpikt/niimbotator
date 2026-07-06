import { z } from "zod";

/** The user-facing theme chips (labels live in i18n as stickers.theme.<key>). */
export type ThemeKey =
  | "cute"
  | "animals"
  | "food"
  | "nature-seasons"
  | "party"
  | "love"
  | "travel"
  | "smileys"
  | "objects"
  | "symbols";

export const THEME_KEYS: ThemeKey[] = [
  "cute", "animals", "food", "nature-seasons", "party", "love", "travel", "smileys", "objects", "symbols",
];

/** Unified decorative-asset record. Phase 1 only produces offline OpenMoji-black emoji assets. */
export interface StickerAsset {
  id: string; // `${sourceId}:${hexcode}`
  sourceId: "openmoji";
  kind: "emoji-vector";
  hexcode: string; // uppercase, hyphen-joined for multi-codepoint (matches the SVG filename)
  glyph: string; // e.g. "🐶"
  spriteUrl: string; // "/stickers/openmoji/black/<hexcode>.svg"
  tonalOk: boolean;
  themes: ThemeKey[];
  labelFr: string;
  labelEn: string;
  keywordsFr: string[];
  keywordsEn: string[];
  license: "CC-BY-SA-4.0";
  attributionRequired: true;
}

export const StickerAssetSchema = z.object({
  id: z.string(),
  sourceId: z.literal("openmoji"),
  kind: z.literal("emoji-vector"),
  hexcode: z.string(),
  glyph: z.string(),
  spriteUrl: z.string(),
  tonalOk: z.boolean(),
  themes: z.array(z.enum(THEME_KEYS as [ThemeKey, ...ThemeKey[]])),
  labelFr: z.string(),
  labelEn: z.string(),
  keywordsFr: z.array(z.string()),
  keywordsEn: z.array(z.string()),
  license: z.literal("CC-BY-SA-4.0"),
  attributionRequired: z.literal(true),
});
