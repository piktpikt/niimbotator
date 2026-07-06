// PIKT: Multi-image import — turn N photos into N batch labels, one photo per label, centered and
// contain-fit within the printable zone (ratio preserved), headless (no editor). This is the shared core
// for the in-app "import images" flow and (later, on-device) the Android share-target receiver.
import * as fabric from "fabric";
import { get } from "svelte/store";
import { CustomCanvas } from "$/fabric-object/custom_canvas";
import { CanvasUtils } from "$/utils/canvas_utils";
import { FileUtils } from "$/utils/file_utils";
import { createBatch, addBatchItem } from "$/stores/batchStore";
import { activePrinterMetrics } from "$/stores/printerMetrics";
import { detectedLabel } from "$/stores";
import { printableMarginMm } from "$/services/labelFormat";
import { LocalStoragePersistence } from "$/utils/persistence";
import { DEFAULT_DPMM, DEFAULT_LABEL_PROPS } from "$/defaults";
import type { LabelProps, FabricJson } from "$/types";

export interface ImageImportTarget {
  /** Existing batch to append to, or undefined to create a new batch. */
  batchId?: string;
  /** Name for the new batch (ignored when batchId is set). */
  name?: string;
}

type MarginPx = { top: number; right: number; bottom: number; left: number };

/** Resolve the label size + printable-zone inset (px) to use for imported photos, once per import.
 *  Size = the last-authored label (or the default); the printable margin comes from the loaded roll
 *  (P3 inputAreas/margin) or the connected printer's blindZone, in that order. */
function resolveLabelContext(): { labelProps: LabelProps; marginPx?: MarginPx } {
  const labelProps = LocalStoragePersistence.loadLastLabelProps() ?? DEFAULT_LABEL_PROPS;
  const dpmm = labelProps.size.dpmm ?? DEFAULT_DPMM;
  const roll = get(detectedLabel);
  const insetsMm = printableMarginMm(
    roll?.inputAreas,
    roll?.marginMm,
    get(activePrinterMetrics).blindZoneMm,
    labelProps.size.width / dpmm,
    labelProps.size.height / dpmm,
  );
  const marginPx: MarginPx | undefined = insetsMm
    ? { top: insetsMm.top * dpmm, right: insetsMm.right * dpmm, bottom: insetsMm.bottom * dpmm, left: insetsMm.left * dpmm }
    : undefined;
  return { labelProps, marginPx };
}

/** Build a one-photo label headlessly: the image centered + contain-fit within the printable zone. */
async function buildLabelFromImage(
  blob: Blob,
  labelProps: LabelProps,
  marginPx?: MarginPx,
): Promise<{ canvasState: FabricJson; thumbnail: string }> {
  const canvas = new CustomCanvas(undefined, { width: labelProps.size.width, height: labelProps.size.height });
  canvas.setLabelProps(labelProps);
  canvas.setCustomBackground(false); // no editor guides in the captured state/thumbnail
  try {
    const img = await fabric.FabricImage.fromURL(await FileUtils.blobToDataUrl(blob));
    // Contain-fit + centre, inset by the printable margin (fitObjectIntoCanvas takes a symmetric x/y margin).
    const xMargin = marginPx ? (marginPx.left + marginPx.right) / 2 : 0;
    const yMargin = marginPx ? (marginPx.top + marginPx.bottom) / 2 : 0;
    CanvasUtils.fitObjectIntoCanvas(canvas, img, xMargin, yMargin);
    canvas.add(img);
    canvas.renderAll();
    const canvasState = canvas.toObject() as unknown as FabricJson;
    const longest = Math.max(labelProps.size.width, labelProps.size.height, 1);
    const thumbnail = canvas.toDataURL({ format: "png", multiplier: 64 / longest });
    return { canvasState, thumbnail };
  } finally {
    canvas.dispose();
  }
}

/**
 * Create one single-mode batch item per image — each photo centered + contain-fit within the printable
 * zone, ratio preserved — into a NEW batch or the given existing one. Returns the batch id + item ids.
 */
export async function createLabelsFromImages(
  images: Blob[],
  target: ImageImportTarget = {},
): Promise<{ batchId: string; itemIds: string[] }> {
  const { labelProps, marginPx } = resolveLabelContext();
  const batchId = target.batchId ?? (await createBatch(target.name));
  const itemIds: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const { canvasState, thumbnail } = await buildLabelFromImage(images[i], labelProps, marginPx);
    const id = await addBatchItem(batchId, {
      name: `Photo ${i + 1}`,
      labelProps,
      canvasState,
      thumbnail,
      mode: "single",
      copies: 1,
    });
    itemIds.push(id);
  }
  return { batchId, itemIds };
}
