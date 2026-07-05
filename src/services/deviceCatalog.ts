// PIKT: Niimbot printer catalog (Roadmap P1). Single source of truth for per-printer print metrics
// — real DPI, density range, max label width, non-printable margins — so nothing hardcodes a DPI and
// the app supports every model.
//
// Architecture (agreed with the user): 100% driven by Niimbot's official, no-auth catalog, with a
// committed offline snapshot so the app is usable offline from first launch, plus a live read when a
// connected model is absent from the local base (future-proof for new printers):
//   1. src/data/deviceCatalog.json — bundled snapshot (OUR normalised, factual spec table,
//      regenerated from the live API; the official app itself ships the same catalog offline).
//   2. localStorage cache — refreshed from the live API on startup, overrides the bundle.
//   3. live refetch — triggered when a connected model isn't in 1/2.
// Only factual specs + the `thumb` URL are stored; model IMAGES are fetched at runtime from the URL,
// never committed (licensing guardrail). Upstream PR candidate: no
import { get, writable } from "svelte/store";
import bundledCatalog from "$/data/deviceCatalog.json";
import { getStaticJson } from "$/services/cloudHttp";

const CATALOG_URL = "https://oss-print.niimbot.com/public_resources/static_resources/devices.json";
const CACHE_KEY = "niimbotator_device_catalog";
const TIMEOUT_MS = 8000;
const STALE_MS = 30 * 24 * 60 * 60 * 1000; // refetch monthly
const MM_PER_INCH = 25.4;

/** Normalized, app-facing printer spec. */
export interface DeviceEntry {
  /** Hardware ids reported by the printer (PrinterInfo.modelId) — the match key. */
  codes: number[];
  name: string;
  /** Real resolution in DPI (from paccuracyName, e.g. B2 Pro = 300). 0 when unknown. */
  dpi: number;
  /** Dots per mm = dpi / 25.4. 0 when dpi unknown. */
  dpmm: number;
  /** Max label WIDTH in mm (widthSetEnd — the real physical constraint, not maxPrintWidth=200). */
  maxLabelWidthMm?: number;
  densityMin: number;
  densityMax: number;
  densityDefault: number;
  rfidType?: number;
  supportsWifi?: boolean;
  /** Model image URL (Niimbot CDN). Currently null across the catalog; fetched at runtime, not committed. */
  thumbUrl?: string | null;
  /** Non-printable margins (mm) as the raw 4-tuple from blindZone "a|b|c|d". Side order is resolved
   *  in P3 (all-zero for B2 Pro, so unused here). */
  blindZoneMm?: number[];
}

/** The committed offline baseline (see file header). Cast: our own generated file conforms by construction. */
const BUNDLED_CATALOG = bundledCatalog as unknown as DeviceEntry[];

// --- Pure parsing / matching (unit-tested; no I/O) ---

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/** Parse a `blindZone` "a|b|c|d" string to a 4-number tuple (mm). Undefined if malformed. */
export function parseBlindZone(raw: unknown): number[] | undefined {
  if (typeof raw !== "string") return undefined;
  const nums = raw.split("|").map((s) => Number(s.trim()));
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) return undefined;
  return nums;
}

/** Pull the first defined blindZone out of the (stringified or array) `consumables` field. */
export function extractBlindZone(consumables: unknown): number[] | undefined {
  let arr: unknown = consumables;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(arr)) return undefined;
  for (const parent of arr) {
    const kids = (parent as { childProperties?: unknown } | null)?.childProperties;
    if (!Array.isArray(kids)) continue;
    for (const kid of kids) {
      const bz = parseBlindZone((kid as { blindZone?: unknown } | null)?.blindZone);
      if (bz) return bz;
    }
  }
  return undefined;
}

/** Normalize one raw catalog entry (defensive — external data is not trusted to match a schema). */
export function normalizeDevice(raw: Record<string, unknown>): DeviceEntry {
  const dpi = num(raw.paccuracyName) ?? 0;
  const safeDpi = dpi > 0 ? dpi : 0;
  const codes = Array.isArray(raw.codes) ? raw.codes.filter((c): c is number => typeof c === "number") : [];
  return {
    codes,
    name: typeof raw.name === "string" ? raw.name : "",
    dpi: safeDpi,
    dpmm: safeDpi > 0 ? safeDpi / MM_PER_INCH : 0,
    maxLabelWidthMm: num(raw.widthSetEnd),
    densityMin: num(raw.solubilitySetStart) ?? 1,
    densityMax: num(raw.solubilitySetEnd) ?? 5,
    densityDefault: num(raw.solubilitySetDefault) ?? 3,
    rfidType: num(raw.rfidType),
    supportsWifi: typeof raw.isSupportWifi === "boolean" ? raw.isSupportWifi : undefined,
    thumbUrl: typeof raw.thumb === "string" ? raw.thumb : null,
    blindZoneMm: extractBlindZone(raw.consumables),
  };
}

/** Validate + normalize a whole catalog payload. Bad/code-less entries are dropped, never fatal. */
export function parseCatalog(payload: unknown): DeviceEntry[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map(normalizeDevice)
    .filter((e) => e.codes.length > 0);
}

/** Find the catalog entry whose `codes` contains the connected printer's model id. */
export function matchDevice(
  modelId: number | undefined,
  entries: DeviceEntry[],
  fallbackCodes: number[] = [],
): DeviceEntry | undefined {
  const ids = [modelId, ...fallbackCodes].filter((x): x is number => typeof x === "number");
  for (const id of ids) {
    const hit = entries.find((e) => e.codes.includes(id));
    if (hit) return hit;
  }
  return undefined;
}

// --- Runtime fetch + cache (localStorage; guarded for DOM-free contexts) ---

interface CacheShape {
  fetchedAt: number;
  entries: DeviceEntry[];
}

function readCache(): CacheShape | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(entries: DeviceEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), entries } satisfies CacheShape));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Best catalog available synchronously: the live cache if present, else the bundled snapshot. */
function localCatalog(): DeviceEntry[] {
  const cache = readCache();
  return cache?.entries?.length ? cache.entries : BUNDLED_CATALOG;
}

/** Live catalog for reactive consumers. Seeded from cache-or-bundle so it is never empty. */
export const deviceCatalog = writable<DeviceEntry[]>(localCatalog());

async function fetchCatalog(): Promise<DeviceEntry[] | undefined> {
  // Header-less GET via the shared transport: the `niimbot-user-agent` header (needed only for the
  // /api/* endpoints) would make this a non-simple request and trigger a CORS preflight the static OSS
  // resource doesn't answer — breaking the live refresh in the browser/WebView (verified). The OSS file
  // needs no header and is CORS-readable as a simple GET.
  const res = await getStaticJson(CATALOG_URL, TIMEOUT_MS);
  if (!res.ok) return undefined;
  const entries = parseCatalog(res.json);
  return entries.length ? entries : undefined;
}

/** Coalesces overlapping fetches (the startup warm + a concurrent connect) into one live request. */
let inFlightFetch: Promise<DeviceEntry[]> | undefined;

/**
 * Warm the catalog from cache/bundle, then refresh from the live API if the cache is missing or
 * stale. Fire-and-forget at app startup so the catalog is cached for offline use. Never throws.
 */
export async function ensureDeviceCatalog(force = false): Promise<DeviceEntry[]> {
  const cache = readCache();
  deviceCatalog.set(cache?.entries?.length ? cache.entries : BUNDLED_CATALOG);

  const fresh = cache !== undefined && Date.now() - cache.fetchedAt < STALE_MS;
  if (cache?.entries?.length && fresh && !force) return cache.entries;

  if (!inFlightFetch) {
    inFlightFetch = (async () => {
      try {
        const fetched = await fetchCatalog();
        if (fetched) {
          writeCache(fetched);
          deviceCatalog.set(fetched);
          return fetched;
        }
        return get(deviceCatalog);
      } finally {
        inFlightFetch = undefined;
      }
    })();
  }
  return inFlightFetch;
}

/** Models we've already done a one-shot live refresh for this session (so an unknown/offline model
 *  isn't refetched on every reconnect). Cleared on app restart. */
const refreshedModels = new Set<number>();

/** Future-proof: a connected model absent from the local base triggers a one-shot live refresh. */
export async function refreshCatalogForModel(modelId: number | undefined): Promise<void> {
  if (modelId === undefined) return;
  if (matchDevice(modelId, get(deviceCatalog))) return;
  if (refreshedModels.has(modelId)) return;
  refreshedModels.add(modelId);
  await ensureDeviceCatalog(true);
}
