import { describe, expect, it, vi } from "vitest";

// resolveMetrics is pure; mock $/stores so importing the module doesn't pull the heavy niimbluelib graph.
vi.mock("$/stores", async () => {
  const { writable } = await import("svelte/store");
  return { printerInfo: writable(undefined), printerMeta: writable(undefined) };
});

import { DEFAULT_METRICS, resolveMetrics } from "$/stores/printerMetrics";
import type { DeviceEntry } from "$/services/deviceCatalog";

const CATALOG: DeviceEntry[] = [
  { codes: [6912], name: "B2 Pro", dpi: 300, dpmm: 300 / 25.4, maxLabelWidthMm: 48, densityMin: 1, densityMax: 5, densityDefault: 3 },
];

describe("resolveMetrics", () => {
  it("prefers the cloud catalog match", () => {
    const m = resolveMetrics({ modelId: 6912, catalog: CATALOG });
    expect(m.source).toBe("cloud");
    expect(m.dpmm).toBeCloseTo(11.811, 3);
    expect(m.maxLabelWidthMm).toBe(48);
    expect(m.densityDefault).toBe(3);
  });

  it("falls back to niimbluelib meta when the catalog misses", () => {
    const m = resolveMetrics({ modelId: 9999, meta: { dpi: 203, printheadPixels: 384 }, catalog: [] });
    expect(m.source).toBe("niimbluelib");
    expect(m.dpi).toBe(203);
    expect(m.dpmm).toBeCloseTo(7.992, 3);
    expect(m.maxLabelWidthMm).toBeCloseTo(384 / (203 / 25.4), 2);
  });

  it("matches the catalog by niimbluelib codes when modelId is absent", () => {
    const m = resolveMetrics({ meta: { id: [6912] }, catalog: CATALOG });
    expect(m.source).toBe("cloud");
  });

  it("uses persisted metrics when nothing else resolves", () => {
    const persisted = { ...DEFAULT_METRICS, dpmm: 11.811, dpi: 300, source: "cloud" as const };
    const m = resolveMetrics({ catalog: [], persisted });
    expect(m.source).toBe("persisted");
    expect(m.dpmm).toBeCloseTo(11.811, 3);
  });

  it("falls back to the default (203 dpi) when disconnected and unknown", () => {
    const m = resolveMetrics({ catalog: [] });
    expect(m).toEqual(DEFAULT_METRICS);
    expect(m.dpmm).toBe(8);
  });
});
