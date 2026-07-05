// PIKT: Resolve a label's physical size (mm) from its RFID barcode (Chantier 2).
// Online: Niimbot cloud API; offline: local cache; otherwise: undefined (manual fallback).
// Endpoint + header discovered from the official app traffic (no auth needed, just the UA header).
// The cross-origin POST goes through the shared transport so it works from the native WebView (P3).
import { postApiFormJson } from "$/services/cloudHttp";

export interface DetectedLabel {
  widthMm: number;
  heightMm: number;
  /** Niimbot paperType id (1 = gap, etc.) — maps to the printer's consumablesType. */
  paperType: number;
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
  const json = res.json as { code?: number; data?: { width?: number; height?: number; paperType?: number } };
  const d = json?.data;
  if (!d || typeof d.width !== "number" || typeof d.height !== "number") return undefined;
  return { widthMm: d.width, heightMm: d.height, paperType: d.paperType ?? 1 };
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
