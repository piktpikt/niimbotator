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
