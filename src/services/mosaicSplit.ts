// PIKT: Mosaic split — crop a source image and split it into N×M label-shaped tiles (Chantier 4).
// The crop is *always* locked to the label ratio × grid (mosaic-crop-ratio invariant).
import type { MosaicConfig } from "$/db/schema";

/** Aspect ratio the crop must be locked to for a given label + grid. */
export function mosaicAspectRatio(labelWidthMm: number, labelHeightMm: number, cols: number, rows: number): number {
  return (cols * labelWidthMm) / (rows * labelHeightMm);
}

/** Draw a small "n/total" tag in a corner (for the "Numéroter les étiquettes" option). */
function stampNumber(ctx: CanvasRenderingContext2D, n: number, total: number): void {
  const label = `${n}/${total}`;
  ctx.save();
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "bottom";
  const pad = 4;
  const w = ctx.measureText(label).width + pad * 2;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(pad, ctx.canvas.height - 16, w, 14);
  ctx.fillStyle = "#000";
  ctx.fillText(label, pad + 2, ctx.canvas.height - pad);
  ctx.restore();
}

/**
 * Split the source image (already cropped or full) into N×M tiles at the target resolution.
 * Reading order: row by row, left to right.
 */
export async function splitImageIntoTiles(
  source: HTMLImageElement | HTMLCanvasElement,
  config: MosaicConfig,
  outputResolution: { width: number; height: number },
): Promise<HTMLCanvasElement[]> {
  const { rows, cols, cropRect, numbering } = config;
  const tileW = outputResolution.width / cols;
  const tileH = outputResolution.height / rows;

  const cropped = document.createElement("canvas");
  cropped.width = outputResolution.width;
  cropped.height = outputResolution.height;
  const cropCtx = cropped.getContext("2d");
  if (!cropCtx) throw new Error("no 2d context");
  cropCtx.drawImage(
    source,
    cropRect.x,
    cropRect.y,
    cropRect.width || (source instanceof HTMLImageElement ? source.naturalWidth : source.width),
    cropRect.height || (source instanceof HTMLImageElement ? source.naturalHeight : source.height),
    0,
    0,
    outputResolution.width,
    outputResolution.height,
  );

  const tiles: HTMLCanvasElement[] = [];
  const total = rows * cols;
  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement("canvas");
      tile.width = tileW;
      tile.height = tileH;
      const tctx = tile.getContext("2d");
      if (!tctx) throw new Error("no 2d context");
      tctx.drawImage(cropped, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
      if (numbering) stampNumber(tctx, ++index, total);
      tiles.push(tile);
    }
  }
  return tiles;
}
