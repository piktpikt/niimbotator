import { describe, it, expect } from "vitest";
import { slotRectToPx } from "./geometry";

/**
 * Local copy of LabelBounds shape (from custom_canvas.ts getLabelBounds).
 * We only need startX, startY, width, height for geometry conversion.
 */
interface LabelBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

describe("slotRectToPx", () => {
  it("converts relative slot rect to pixel box at origin", () => {
    const bounds: LabelBounds = {
      startX: 0,
      startY: 0,
      width: 240,
      height: 96,
    };

    const result = slotRectToPx([0.1, 0.2, 0.5, 0.3], bounds);

    expect(result.left).toBeCloseTo(24, 5); // 0 + 0.1 * 240
    expect(result.top).toBeCloseTo(19.2, 5); // 0 + 0.2 * 96
    expect(result.width).toBeCloseTo(120, 5); // 0.5 * 240
    expect(result.height).toBeCloseTo(28.8, 5); // 0.3 * 96
  });

  it("converts full rect [0,0,1,1] to full bounds", () => {
    const bounds: LabelBounds = {
      startX: 0,
      startY: 0,
      width: 240,
      height: 96,
    };

    const result = slotRectToPx([0, 0, 1, 1], bounds);

    expect(result).toEqual({
      left: 0,
      top: 0,
      width: 240,
      height: 96,
    });
  });

  it("applies startX and startY offsets to the result", () => {
    const bounds: LabelBounds = {
      startX: 10,
      startY: 5,
      width: 240,
      height: 96,
    };

    const result = slotRectToPx([0.1, 0.2, 0.5, 0.3], bounds);

    expect(result.left).toBeCloseTo(34, 5); // 10 + 0.1 * 240
    expect(result.top).toBeCloseTo(24.2, 5); // 5 + 0.2 * 96
    expect(result.width).toBeCloseTo(120, 5); // 0.5 * 240
    expect(result.height).toBeCloseTo(28.8, 5); // 0.3 * 96
  });
});
