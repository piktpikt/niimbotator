// PIKT: Convert a physical roll format (mm, from the RFID cloud lookup) into editor label pixels (P3).
// Mirrors LabelPropsEditor's mm->px rule exactly: scale by the printer's dpmm, clamp to a 1-dot minimum,
// and trim the print-head axis to a multiple of 8 (the Niimbot byte-packing constraint). The head axis is
// the height for printDirection "left", the width for "top". Kept pure so it is unit-testable and shared
// between the size editor and the RFID "apply format" action.
// Upstream PR candidate: no
import type { PrintDirection } from "@mmote/niimbluelib";

export interface LabelPixelSize {
  width: number;
  height: number;
  dpmm: number;
}

/** Non-printable margins (die-cut safe area), one value per edge. */
export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface PrintableAreaMm {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

function clampInsets(i: EdgeInsets): EdgeInsets {
  return {
    top: Math.max(0, i.top),
    right: Math.max(0, i.right),
    bottom: Math.max(0, i.bottom),
    left: Math.max(0, i.left),
  };
}

function hasInset(i: EdgeInsets): boolean {
  return i.top > 0 || i.right > 0 || i.bottom > 0 || i.left > 0;
}

/**
 * Resolve the non-printable margin (mm) of the loaded roll, in priority order:
 *   1. `inputAreas` — margin = label minus the bounding box of the printable regions.
 *   2. cloud `marginMm` — a 4-tuple [top, right, bottom, left].
 *   3. device `blindZoneMm` — a 4-tuple [top, right, bottom, left].
 * Returns undefined when no source yields a non-zero margin. (The [top,right,bottom,left] tuple order is
 * assumed — it is only confirmable on-device with a roll that actually has margins.)
 */
export function printableMarginMm(
  inputAreas: PrintableAreaMm[] | undefined,
  marginMm: number[] | undefined,
  deviceBlindZoneMm: number[] | undefined,
  labelWidthMm: number,
  labelHeightMm: number,
): EdgeInsets | undefined {
  if (inputAreas && inputAreas.length > 0) {
    const left = Math.min(...inputAreas.map((a) => a.xMm));
    const top = Math.min(...inputAreas.map((a) => a.yMm));
    const right = labelWidthMm - Math.max(...inputAreas.map((a) => a.xMm + a.widthMm));
    const bottom = labelHeightMm - Math.max(...inputAreas.map((a) => a.yMm + a.heightMm));
    const inset = clampInsets({ top, right, bottom, left });
    if (hasInset(inset)) return inset;
  }
  for (const tuple of [marginMm, deviceBlindZoneMm]) {
    if (tuple && tuple.length === 4) {
      const [top, right, bottom, left] = tuple;
      const inset = clampInsets({ top, right, bottom, left });
      if (hasInset(inset)) return inset;
    }
  }
  return undefined;
}

/** Physical roll dimensions (mm) + the printer's resolution → the editor's px label size. */
export function detectedFormatToSize(
  widthMm: number,
  heightMm: number,
  dpmm: number,
  printDirection: PrintDirection,
): LabelPixelSize {
  let width = Math.max(widthMm * dpmm, dpmm);
  let height = Math.max(heightMm * dpmm, dpmm);
  // The print-head axis must be a multiple of 8 dots.
  if (printDirection === "left") {
    height -= height % 8;
  } else {
    width -= width % 8;
  }
  return { width: Math.floor(width), height: Math.floor(height), dpmm };
}
