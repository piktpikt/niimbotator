// PIKT: Collage engine (mosaic chantier, phase 3) — N photos → 1 label. Distinct from the split
// (mosaicSplit.ts). Each image is placed as a FabricImage scaled to COVER its layout cell and clipped
// to that cell (absolutePositioned clipPath), so the user can then move/scale each one to frame it —
// native Fabric, no third-party collage lib. Layout cells adapt to the label's aspect ratio.
import * as fabric from "fabric";
import { FileUtils } from "$/utils/file_utils";
import type { LabelProps } from "$/types";

export interface CollageCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Auto grid layout for `n` cells inside a `w`×`h` box (label px), separated by `gap`. Column count is
 * derived from the box aspect ratio so a wide label gets more columns and a tall one more rows. A short
 * final row is centred.
 */
export function collageGrid(w: number, h: number, n: number, gap: number): CollageCell[] {
  const count = Math.max(1, n);
  const aspect = w / h;
  let cols = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * aspect))));
  const rows = Math.ceil(count / cols);
  cols = Math.ceil(count / rows); // rebalance so the grid isn't wider than needed

  const cellW = (w - gap * (cols + 1)) / cols;
  const cellH = (h - gap * (rows + 1)) / rows;

  const cells: CollageCell[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const inThisRow = Math.min(cols, count - r * cols);
    const rowOffset = ((cols - inThisRow) * (cellW + gap)) / 2;
    cells.push({
      x: gap + rowOffset + c * (cellW + gap),
      y: gap + r * (cellH + gap),
      width: cellW,
      height: cellH,
    });
  }
  return cells;
}

/** Scale + centre a FabricImage to cover its cell, clipped to the cell so it can be re-framed in place. */
function fitImageToCell(img: fabric.FabricImage, cell: CollageCell): void {
  const iw = img.width ?? 1;
  const ih = img.height ?? 1;
  const scale = Math.max(cell.width / iw, cell.height / ih);
  img.set({
    originX: "center",
    originY: "center",
    left: cell.x + cell.width / 2,
    top: cell.y + cell.height / 2,
    scaleX: scale,
    scaleY: scale,
    snapAngle: 10,
  });
  img.clipPath = new fabric.Rect({
    left: cell.x,
    top: cell.y,
    width: cell.width,
    height: cell.height,
    absolutePositioned: true,
  });
}

/**
 * Compose the given images into a grid collage on the current label canvas. Returns the images added
 * (already selected-able) so the caller can push an undo step.
 */
export async function composeCollage(
  canvas: fabric.Canvas,
  labelProps: LabelProps,
  files: File[],
): Promise<fabric.FabricImage[]> {
  const w = labelProps.size.width;
  const h = labelProps.size.height;
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const cells = collageGrid(w, h, files.length, gap);

  const added: fabric.FabricImage[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await FileUtils.blobToDataUrl(files[i]);
    const img = await fabric.FabricImage.fromURL(url);
    fitImageToCell(img, cells[i]);
    canvas.add(img);
    added.push(img);
  }
  canvas.requestRenderAll();
  return added;
}
