// PIKT: Active-printer metrics (Roadmap P1). Resolves the print resolution + limits of the connected
// printer so nothing hardcodes a DPI. Priority:
//   1. devices.json catalog (bundled + cached + live) — vendor source of truth, future-proof.
//   2. niimbluelib's compiled model library — tertiary offline net (always present when connected).
//   3. last-known metrics persisted from a previous connection — for an offline editor.
//   4. a safe default.
// Upstream PR candidate: no
import { derived } from "svelte/store";
import { printerInfo, printerMeta } from "$/stores";
import { deviceCatalog, matchDevice, refreshCatalogForModel, type DeviceEntry } from "$/services/deviceCatalog";
import { DEFAULT_DPMM } from "$/defaults";

const MM_PER_INCH = 25.4;
const PERSIST_KEY = "niimbotator_last_printer_metrics";

export type MetricsSource = "cloud" | "niimbluelib" | "persisted" | "default";

export interface PrinterMetrics {
  /** Dots per mm — the print resolution. Everything mm<->px goes through this. */
  dpmm: number;
  dpi?: number;
  maxLabelWidthMm?: number;
  densityMin: number;
  densityMax: number;
  densityDefault: number;
  source: MetricsSource;
}

export const DEFAULT_METRICS: PrinterMetrics = {
  dpmm: DEFAULT_DPMM,
  densityMin: 1,
  densityMax: 5,
  densityDefault: 3,
  source: "default",
};

/** niimbluelib's PrinterModelMeta, narrowed to the fields we read (structural for testing). */
export interface ModelMetaLike {
  id?: number[];
  dpi?: number;
  printheadPixels?: number;
  densityMin?: number;
  densityMax?: number;
  densityDefault?: number;
}

export interface ResolveMetricsInput {
  modelId?: number;
  meta?: ModelMetaLike;
  catalog: DeviceEntry[];
  persisted?: PrinterMetrics;
}

/** Pure resolver — see the file header for the priority order. */
export function resolveMetrics({ modelId, meta, catalog, persisted }: ResolveMetricsInput): PrinterMetrics {
  const cloud = matchDevice(modelId, catalog, meta?.id ?? []);
  if (cloud && cloud.dpmm > 0) {
    return {
      dpmm: cloud.dpmm,
      dpi: cloud.dpi,
      maxLabelWidthMm: cloud.maxLabelWidthMm,
      densityMin: cloud.densityMin,
      densityMax: cloud.densityMax,
      densityDefault: cloud.densityDefault,
      source: "cloud",
    };
  }

  if (meta?.dpi && meta.dpi > 0) {
    const dpmm = meta.dpi / MM_PER_INCH;
    return {
      dpmm,
      dpi: meta.dpi,
      maxLabelWidthMm: meta.printheadPixels ? meta.printheadPixels / dpmm : undefined,
      densityMin: meta.densityMin ?? 1,
      densityMax: meta.densityMax ?? 5,
      densityDefault: meta.densityDefault ?? 3,
      source: "niimbluelib",
    };
  }

  if (persisted && persisted.dpmm > 0) return { ...persisted, source: "persisted" };

  return DEFAULT_METRICS;
}

function readPersisted(): PrinterMetrics | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PrinterMetrics) : undefined;
  } catch {
    return undefined;
  }
}

function writePersisted(m: PrinterMetrics): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(m));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * The connected printer's print metrics (reactive). Remembers the last real resolution across
 * disconnects so an offline editor still uses the right DPI for a printer seen on this install.
 */
export const activePrinterMetrics = derived([printerMeta, printerInfo, deviceCatalog], ([$meta, $info, $catalog]) =>
  resolveMetrics({ modelId: $info?.modelId, meta: $meta, catalog: $catalog, persisted: readPersisted() }),
);

// Persist the last real resolution so an offline editor uses the right DPI for a printer seen on this
// install. This eager, app-lifetime subscription keeps the derived warm too, so persistence runs on
// every connect regardless of which screen is mounted — App.svelte loads this module at startup.
activePrinterMetrics.subscribe((m) => {
  if (m.source === "cloud" || m.source === "niimbluelib") writePersisted(m);
});

// "Lecture si absent de la base": a newly connected model our local catalog doesn't know triggers a
// one-shot live fetch, so its real metrics replace the niimbluelib/default fallback once it lands.
printerInfo.subscribe(($info) => {
  void refreshCatalogForModel($info?.modelId);
});
