// PIKT: Mosaïque entry orchestration (Chantier Mosaïque, phase 1).
// A mosaic-découpe IS a batch (one stored object that expands into N addressable print units), so
// "Découper" from the editor reuses createBatch/addBatchItem + the existing MosaicConfigurator and the
// tile-by-tile batch print engine — no separate pipeline. Upstream PR candidate: no
import { addImage, createBatch, addBatchItem } from "$/stores/batchStore";
import { openMosaicConfigurator } from "$/stores/navigation";

/**
 * Découper: 1 image → N recomposable tiles. Stores the image, creates a new batch holding a single
 * mosaic item that references it, then opens the configurator to set the grid/crop.
 */
export async function startMosaicDecoupe(file: File): Promise<void> {
  const imageId = await addImage(file, file.name);
  const name = file.name.replace(/\.[^./\\]+$/, "").trim();
  const batchId = await createBatch(name || undefined);
  const itemId = await addBatchItem(batchId, { sourceImageId: imageId, mode: "mosaic" });
  openMosaicConfigurator(itemId);
}
