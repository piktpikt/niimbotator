import { describe, expect, it } from "vitest";
import { detectedFormatToSize, printableMarginMm } from "./labelFormat";

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

  it("never collapses the head axis to 0 for a tiny/degenerate size at a sub-8 dpmm (203 dpi ≈ 7.99)", () => {
    // Regression: 7.99 - (7.99 % 8) == 0 before the re-clamp. Head axis must stay a positive multiple of 8.
    const left = detectedFormatToSize(40, 0, 7.99, "left");
    expect(left.height).toBe(8);
    const top = detectedFormatToSize(0, 30, 7.99, "top");
    expect(top.width).toBe(8);
  });
});

describe("printableMarginMm", () => {
  const area = (xMm: number, yMm: number, widthMm: number, heightMm: number) => ({ xMm, yMm, widthMm, heightMm });

  it("derives the margin from the inputAreas bounding box (label minus printable area)", () => {
    // 40x30 label, one printable region inset 2mm left/top, 3mm right, 4mm bottom
    const inset = printableMarginMm([area(2, 2, 35, 24)], undefined, undefined, 40, 30);
    expect(inset).toEqual({ top: 2, right: 40 - 37, bottom: 30 - 26, left: 2 });
  });

  it("unions multiple input areas before computing the margin", () => {
    const inset = printableMarginMm([area(2, 2, 10, 5), area(20, 10, 15, 15)], undefined, undefined, 40, 30);
    // union bbox: left 2, top 2, right edge 35, bottom edge 25
    expect(inset).toEqual({ top: 2, right: 5, bottom: 5, left: 2 });
  });

  it("falls back to the cloud margin tuple [top,right,bottom,left]", () => {
    expect(printableMarginMm(undefined, [1, 2, 3, 4], undefined, 40, 30)).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it("falls back to the device blind zone when no roll margin exists", () => {
    expect(printableMarginMm(undefined, undefined, [0.5, 0.5, 0.5, 0.5], 40, 30)).toEqual({
      top: 0.5, right: 0.5, bottom: 0.5, left: 0.5,
    });
  });

  it("returns undefined when every source is absent or all-zero (e.g. B2 Pro)", () => {
    expect(printableMarginMm(undefined, undefined, undefined, 40, 30)).toBeUndefined();
    expect(printableMarginMm(undefined, [0, 0, 0, 0], [0, 0, 0, 0], 40, 30)).toBeUndefined();
    expect(printableMarginMm([], undefined, undefined, 40, 30)).toBeUndefined();
  });

  it("clamps negative margins (printable area larger than the nominal label) to zero", () => {
    const inset = printableMarginMm([area(-1, 0, 42, 30)], undefined, undefined, 40, 30);
    expect(inset).toBeUndefined(); // all edges <= 0
  });
});
