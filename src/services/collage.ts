// PIKT: Collage engine (mosaic chantier, phase 3) — N photos → 1 label. Distinct from the split
// (mosaicSplit.ts). Each image is placed as a FabricImage scaled to COVER its layout cell and clipped
// to that cell (absolutePositioned clipPath), so the user can then move/scale each one to frame it —
// native Fabric, no third-party collage lib. Layout adapts to the label's aspect ratio; round labels
// fit inside the circle's inscribed square so nothing spills outside the printable disc.
import * as fabric from "fabric";
import { FileUtils } from "$/utils/file_utils";
import type { LabelProps } from "$/types";

export interface CollageCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Auto grid for 5+ cells: column count derived from the box aspect ratio; a short final row is centred. */
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
    cells.push({ x: gap + rowOffset + c * (cellW + gap), y: gap + r * (cellH + gap), width: cellW, height: cellH });
  }
  return cells;
}

/**
 * Layout for `n` cells in a `w`×`h` box. Dedicated templates for 1–4 (adapting to the box orientation),
 * grid fallback for 5+.
 */
export function collageLayout(w: number, h: number, n: number, gap: number): CollageCell[] {
  const landscape = w >= h;
  const innerW = w - 2 * gap;
  const innerH = h - 2 * gap;

  if (n <= 1) {
    return [{ x: gap, y: gap, width: innerW, height: innerH }];
  }

  if (n === 2) {
    if (landscape) {
      const cw = (w - 3 * gap) / 2;
      return [
        { x: gap, y: gap, width: cw, height: innerH },
        { x: 2 * gap + cw, y: gap, width: cw, height: innerH },
      ];
    }
    const ch = (h - 3 * gap) / 2;
    return [
      { x: gap, y: gap, width: innerW, height: ch },
      { x: gap, y: 2 * gap + ch, width: innerW, height: ch },
    ];
  }

  if (n === 3) {
    // One large cell + two stacked, along the long axis.
    if (landscape) {
      const bigW = (w - 3 * gap) * 0.6;
      const smallW = (w - 3 * gap) * 0.4;
      const smallH = (h - 3 * gap) / 2;
      return [
        { x: gap, y: gap, width: bigW, height: innerH },
        { x: 2 * gap + bigW, y: gap, width: smallW, height: smallH },
        { x: 2 * gap + bigW, y: 2 * gap + smallH, width: smallW, height: smallH },
      ];
    }
    const bigH = (h - 3 * gap) * 0.6;
    const smallH = (h - 3 * gap) * 0.4;
    const smallW = (w - 3 * gap) / 2;
    return [
      { x: gap, y: gap, width: innerW, height: bigH },
      { x: gap, y: 2 * gap + bigH, width: smallW, height: smallH },
      { x: 2 * gap + smallW, y: 2 * gap + bigH, width: smallW, height: smallH },
    ];
  }

  if (n === 4) {
    const cw = (w - 3 * gap) / 2;
    const ch = (h - 3 * gap) / 2;
    return [
      { x: gap, y: gap, width: cw, height: ch },
      { x: 2 * gap + cw, y: gap, width: cw, height: ch },
      { x: gap, y: 2 * gap + ch, width: cw, height: ch },
      { x: 2 * gap + cw, y: 2 * gap + ch, width: cw, height: ch },
    ];
  }

  return collageGrid(w, h, n, gap);
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
  // Clip to the cell. A non-absolute clipPath (relative to the image centre, scaled with the image)
  // renders correctly here; an absolutePositioned one is mis-scaled by the image's own scale in this
  // Fabric build. Since the image is centred on the cell, a centred clip of the cell's size (converted
  // to the image's unscaled local units) crops exactly to the cell.
  img.clipPath = new fabric.Rect({
    originX: "center",
    originY: "center",
    left: 0,
    top: 0,
    width: cell.width / scale,
    height: cell.height / scale,
  });
}

/**
 * Compose the given images into a collage on the current label canvas. Returns the images added so the
 * caller can push an undo step.
 */
export async function composeCollage(
  canvas: fabric.Canvas,
  labelProps: LabelProps,
  files: File[],
): Promise<fabric.FabricImage[]> {
  let boxW = labelProps.size.width;
  let boxH = labelProps.size.height;
  let offsetX = 0;
  let offsetY = 0;

  // Round labels: lay the collage out inside the largest square that fits in the disc, so no cell spills
  // outside the printable circle.
  if (labelProps.shape === "circle") {
    const side = Math.min(boxW, boxH) / Math.SQRT2;
    offsetX = (boxW - side) / 2;
    offsetY = (boxH - side) / 2;
    boxW = side;
    boxH = side;
  }

  const gap = Math.max(2, Math.round(Math.min(boxW, boxH) * 0.02));
  const cells = collageLayout(boxW, boxH, files.length, gap);

  const added: fabric.FabricImage[] = [];
  for (let i = 0; i < files.length; i++) {
    const cell = cells[i];
    const url = await FileUtils.blobToDataUrl(files[i]);
    const img = await fabric.FabricImage.fromURL(url);
    fitImageToCell(img, { x: cell.x + offsetX, y: cell.y + offsetY, width: cell.width, height: cell.height });
    canvas.add(img);
    added.push(img);
  }
  canvas.requestRenderAll();
  return added;
}
