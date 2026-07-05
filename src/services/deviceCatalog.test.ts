import { describe, expect, it } from "vitest";
import {
  extractBlindZone,
  matchDevice,
  normalizeDevice,
  parseBlindZone,
  parseCatalog,
  type DeviceEntry,
} from "$/services/deviceCatalog";

// A trimmed raw entry shaped like the live devices.json / APK DevicesModule (verified fields).
const B2_PRO_RAW = {
  codes: [6912],
  name: "B2 Pro",
  paccuracyName: "300",
  widthSetEnd: 48,
  solubilitySetStart: 1,
  solubilitySetEnd: 5,
  solubilitySetDefault: 3,
  rfidType: 1,
  isSupportWifi: false,
  thumb: null,
  consumables: JSON.stringify([
    { parentProperty: { code: 3 }, childProperties: [{ code: 1, blindZone: "0.0|0.0|0.0|0.0" }] },
  ]),
};

const B2_203_RAW = {
  codes: [1234],
  name: "B2",
  paccuracyName: "203",
  widthSetEnd: 50,
  solubilitySetStart: 1,
  solubilitySetEnd: 5,
  solubilitySetDefault: 3,
};

describe("parseBlindZone", () => {
  it("parses four pipe-separated numbers", () => expect(parseBlindZone("0.0|1|2|3")).toEqual([0, 1, 2, 3]));
  it("rejects the wrong count", () => expect(parseBlindZone("1|2|3")).toBeUndefined());
  it("rejects non-numeric parts", () => expect(parseBlindZone("a|b|c|d")).toBeUndefined());
  it("rejects non-strings", () => expect(parseBlindZone(null)).toBeUndefined());
});

describe("extractBlindZone", () => {
  it("reads the first blindZone from a stringified consumables field", () =>
    expect(extractBlindZone(B2_PRO_RAW.consumables)).toEqual([0, 0, 0, 0]));
  it("reads from an already-parsed array", () =>
    expect(extractBlindZone([{ childProperties: [{ blindZone: "1|2|3|4" }] }])).toEqual([1, 2, 3, 4]));
  it("returns undefined when absent", () => expect(extractBlindZone("nope")).toBeUndefined());
});

describe("normalizeDevice", () => {
  it("derives dpi + dpmm from paccuracyName (B2 Pro = 300)", () => {
    const e = normalizeDevice(B2_PRO_RAW);
    expect(e.dpi).toBe(300);
    expect(e.dpmm).toBeCloseTo(11.811, 3);
    expect(e.maxLabelWidthMm).toBe(48);
    expect(e.densityDefault).toBe(3);
    expect(e.blindZoneMm).toEqual([0, 0, 0, 0]);
    expect(e.codes).toEqual([6912]);
  });
  it("handles a 203-dpi model", () => {
    const e = normalizeDevice(B2_203_RAW);
    expect(e.dpi).toBe(203);
    expect(e.dpmm).toBeCloseTo(7.992, 3);
  });
  it("yields dpi/dpmm 0 when resolution is unknown", () => {
    const e = normalizeDevice({ codes: [1], name: "X" });
    expect(e.dpi).toBe(0);
    expect(e.dpmm).toBe(0);
  });
});

describe("parseCatalog", () => {
  it("normalizes an array and drops entries without codes / non-objects", () => {
    const out = parseCatalog([B2_PRO_RAW, { name: "no codes", paccuracyName: "300" }, "garbage"]);
    expect(out).toHaveLength(1);
    expect(out[0].codes).toEqual([6912]);
  });
  it("returns [] for non-arrays", () => expect(parseCatalog({})).toEqual([]));
});

describe("matchDevice", () => {
  const entries: DeviceEntry[] = parseCatalog([B2_PRO_RAW, B2_203_RAW]);
  it("matches by modelId", () => expect(matchDevice(6912, entries)?.name).toBe("B2 Pro"));
  it("falls back to niimbluelib codes", () => expect(matchDevice(undefined, entries, [1234])?.name).toBe("B2"));
  it("returns undefined for unknown ids", () => expect(matchDevice(9999, entries)).toBeUndefined());
});
