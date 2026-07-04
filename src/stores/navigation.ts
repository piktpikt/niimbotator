// PIKT: store-based page navigation (no router dependency, per the approved stack). (Chantier 0)
import { writable } from "svelte/store";

export type Page =
  | "home"
  | "editor"
  | "batches"
  | "batch-manager"
  | "batch-print"
  | "mosaic-configurator"
  | "library"
  | "settings";

/** The currently displayed top-level page. */
export const currentPage = writable<Page>("home");

/** Batch currently open in the BatchManager (Chantier 2). */
export const currentBatchId = writable<string | undefined>(undefined);

/** Item currently being edited in the Editor (undefined = standalone edit). (Chantier 2) */
export const currentItemId = writable<string | undefined>(undefined);

/** Item currently open in the Mosaic Configurator (Chantier 4). */
export const currentMosaicItemId = writable<string | undefined>(undefined);

export function navigate(page: Page): void {
  currentPage.set(page);
}

/** Open a batch's manager view. */
export function openBatch(batchId: string): void {
  currentBatchId.set(batchId);
  currentPage.set("batch-manager");
}

/** Open the editor bound to a batch item (or standalone if item is undefined). */
export function openEditor(itemId?: string): void {
  currentItemId.set(itemId);
  currentPage.set("editor");
}

/** Open the mosaic configurator for a batch item. */
export function openMosaicConfigurator(itemId: string): void {
  currentMosaicItemId.set(itemId);
  currentPage.set("mosaic-configurator");
}

/** Open the batch print flow for a batch (Chantier 3). */
export function openBatchPrint(batchId: string): void {
  currentBatchId.set(batchId);
  currentPage.set("batch-print");
}
