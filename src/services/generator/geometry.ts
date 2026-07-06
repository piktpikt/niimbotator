import type { PxBox } from "./types";

/**
 * Local copy of LabelBounds shape from custom_canvas.ts.
 * Only the fields needed for geometry conversion.
 */
interface LabelBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

/**
 * Convert a relative slot rectangle (fractions 0..1) to absolute pixel coordinates
 * within the given label bounds.
 *
 * @param rect [x, y, w, h] fractions of bounds width/height
 * @param bounds Label bounds with startX, startY, width, height
 * @returns PxBox with absolute pixel coordinates
 */
export function slotRectToPx(rect: [number, number, number, number], bounds: LabelBounds): PxBox {
  const [x, y, w, h] = rect;

  return {
    left: bounds.startX + x * bounds.width,
    top: bounds.startY + y * bounds.height,
    width: w * bounds.width,
    height: h * bounds.height,
  };
}
