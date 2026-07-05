import { describe, expect, it } from "vitest";
import { detectedFormatToSize } from "./labelFormat";

describe("detectedFormatToSize", () => {
  it("scales mm by dpmm (clean at 203 dpi / dpmm 8)", () => {
    expect(detectedFormatToSize(40, 30, 8, "left")).toEqual({ width: 320, height: 240, dpmm: 8 });
  });

  it("trims the head axis to a multiple of 8 — height for printDirection 'left'", () => {
    const r = detectedFormatToSize(40, 30, 11.811, "left");
    expect(r.height % 8).toBe(0);
    expect(r.width).toBe(Math.floor(40 * 11.811)); // non-head axis is not trimmed
    expect(r.dpmm).toBe(11.811);
  });

  it("trims the head axis to a multiple of 8 — width for printDirection 'top'", () => {
    const r = detectedFormatToSize(40, 30, 11.811, "top");
    expect(r.width % 8).toBe(0);
    expect(r.height).toBe(Math.floor(30 * 11.811));
  });

  it("keeps clean multiples at dpmm 8 for the 'top' head axis", () => {
    expect(detectedFormatToSize(50, 15, 8, "top")).toEqual({ width: 400, height: 120, dpmm: 8 });
  });

  it("clamps a degenerate zero size to a 1-dot minimum", () => {
    const r = detectedFormatToSize(0, 0, 8, "left");
    expect(r.width).toBe(8);
    expect(r.height % 8).toBe(0);
  });
});
