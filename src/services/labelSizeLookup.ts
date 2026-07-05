// PIKT: Resolve a label's physical size (mm) from its RFID barcode (Chantier 2).
// Online: Niimbot cloud API; offline: local cache; otherwise: undefined (manual fallback).
// Endpoint + header discovered from the official app traffic (no auth needed, just the UA header).
// The cross-origin POST goes through the shared transport so it works from the native WebView (P3).
import { z } from "zod";
import { postApiFormJson } from "$/services/cloudHttp";

/** A printable/editable zone of the roll, in millimeters (from the cloud `inputAreas`). */
export interface RollInputArea {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Niimbot area type tag (e.g. "text"), when provided. */
  type?: string | number;
  areaNumber?: number;
}

export interface DetectedLabel {
  widthMm: number;
  heightMm: number;
  /** Niimbot paperType id (1 = gap, etc.) — maps to the printer's consumablesType. */
  paperType: number;
  // --- P3: the exact format beyond size (editor-only; roll-specific; never persisted in LabelProps) ---
  /** Pre-printed roll motif — a PNG URL on the Niimbot OSS. Rendered as an editor preview, never printed. */
  backgroundImage?: string;
  /** Printable/editable zones (mm) the cloud reports for this roll. */
  inputAreas?: RollInputArea[];
  /** Non-printable margin (mm), 4-tuple as returned by the cloud, when present. */
  marginMm?: number[];
  /** Design rotation in degrees (background/orientation hint), when present. */
  rotate?: number;
}

// Runtime validation of the (untrusted, partly undocumented) cloud response. Only width/height are
// required; every richer field degrades to undefined via `.catch()` so a malformed extra never discards
// a valid size. The exact populated shape is only verifiable on-device with a real roll — parse defensively.
const CloudInputAreaSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  type: z.union([z.string(), z.number()]).optional(),
  areaNumber: z.number().optional(),
});

const CloudDataSchema = z.object({
  width: z.number(),
  height: z.number(),
  paperType: z.number().catch(1),
  backgroundImage: z.string().optional().catch(undefined),
  rotate: z.number().optional().catch(undefined),
  margin: z.array(z.number()).length(4).optional().catch(undefined),
  inputAreas: z.array(CloudInputAreaSchema).optional().catch(undefined),
});

const CloudResponseSchema = z.object({ data: CloudDataSchema.optional() });

const ROLL_ASSET_HOST = "https://oss-print.niimbot.com/";

/** Security guard: only load a roll's background image from Niimbot's static OSS host, over https, so a
 *  cloud response can't point the editor preview at an arbitrary URL. The trailing slash blocks
 *  look-alike hosts (e.g. oss-print.niimbot.com.evil.com). */
export function isTrustedRollAssetUrl(url: string | undefined): url is string {
  return typeof url === "string" && url.startsWith(ROLL_ASSET_HOST);
}

const CACHE_KEY = "niimbotator_label_cache";
const API_URL = "https://print.niimbot.com/api/template/getCloudTemplateByScanCode";
const TIMEOUT_MS = 6000;

function readCache(): Record<string, DetectedLabel> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, DetectedLabel>;
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, DetectedLabel>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

async function fetchFromCloud(barcode: string): Promise<DetectedLabel | undefined> {
  // Native routes through CapacitorHttp (no WebView CORS); web uses fetch. See `services/cloudHttp`.
  const res = await postApiFormJson(
    API_URL,
    { oneCode: barcode },
    { "niimbot-user-agent": "niimbotator", languageCode: "en" },
    TIMEOUT_MS,
  );
  if (!res.ok) return undefined;
  const parsed = CloudResponseSchema.safeParse(res.json);
  if (!parsed.success || !parsed.data.data) return undefined;
  const d = parsed.data.data;
  return {
    widthMm: d.width,
    heightMm: d.height,
    paperType: d.paperType,
    backgroundImage: d.backgroundImage,
    rotate: d.rotate,
    marginMm: d.margin,
    inputAreas: d.inputAreas?.map((a) => ({
      xMm: a.x,
      yMm: a.y,
      widthMm: a.w,
      heightMm: a.h,
      type: a.type,
      areaNumber: a.areaNumber,
    })),
  };
}

/**
 * Resolve a label's physical size from its RFID barcode.
 * Resolution order: local cache → Niimbot cloud (when online) → undefined (manual fallback).
 * Successful cloud results are cached so the size is available offline afterwards.
 */
export async function lookupLabelSize(barcode: string): Promise<DetectedLabel | undefined> {
  if (!barcode) return undefined;

  const cache = readCache();
  if (cache[barcode]) return cache[barcode];

  if (typeof navigator !== "undefined" && navigator.onLine === false) return undefined;

  const result = await fetchFromCloud(barcode);
  if (result) {
    cache[barcode] = result;
    writeCache(cache);
  }
  return result;
}
