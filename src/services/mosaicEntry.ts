// PIKT: Mosaïque entry orchestration (Chantier Mosaïque, phase 1).
// A mosaic-découpe IS a batch (one stored object that expands into N addressable print units), so
// "Découper" from the editor reuses createBatch/addBatchItem + the existing MosaicConfigurator and the
// tile-by-tile batch print engine — no separate pipeline. Upstream PR candidate: no
import { get } from "svelte/store";
import { addImage, createBatch, addBatchItem } from "$/stores/batchStore";
import { openMosaicConfigurator } from "$/stores/navigation";
import { activePrinterMetrics } from "$/stores/printerMetrics";
import { DEFAULT_DPMM, DEFAULT_LABEL_PROPS } from "$/defaults";

/**
 * Découper: 1 image → N recomposable tiles. Stores the image, creates a new batch holding a single
 * mosaic item that references it, then opens the configurator to set the grid/crop.
 */
export async function startMosaicDecoupe(file: File): Promise<void> {
  const imageId = await addImage(file, file.name);
  const name = file.name.replace(/\.[^./\\]+$/, "").trim();
  const batchId = await createBatch(name || undefined);
  // Give the mosaic label the active printer's resolution, but PRESERVE the default's physical size
  // (30×12 mm): scale the px by the printer's dpmm so the tile is the same physical size on every
  // printer while the baked bitmap matches the real DPI — not a hardcoded constant (Roadmap P1).
  const dpmm = get(activePrinterMetrics).dpmm;
  const base = DEFAULT_LABEL_PROPS.size;
  const baseDpmm = base.dpmm ?? DEFAULT_DPMM;
  const labelProps = {
    ...DEFAULT_LABEL_PROPS,
    size: {
      width: Math.round((base.width / baseDpmm) * dpmm),
      height: Math.round((base.height / baseDpmm) * dpmm),
      dpmm,
    },
  };
  const itemId = await addBatchItem(batchId, { sourceImageId: imageId, mode: "mosaic", labelProps });
  openMosaicConfigurator(itemId);
}
