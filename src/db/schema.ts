// PIKT: Dexie (IndexedDB) schema for the batch system (Chantier 2). See docs/ARCHITECTURE.md §5.2.
// Structured/heavy data (batches, items, images) lives here; light prefs stay in LocalStorage.
import Dexie, { type Table } from "dexie";
import type { FabricJson, LabelProps, PostProcessType } from "$/types";

export type ItemMode = "single" | "mosaic";
export type ItemStatus = "ready" | "edited" | "skipped" | "printed";
export type BatchStatus = "draft" | "printing" | "printed" | "archived";

export interface MosaicConfig {
  rows: number;
  cols: number;
  /** Crop rectangle in source-image pixel coordinates. */
  cropRect: { x: number; y: number; width: number; height: number };
  cropRotation?: number;
  numbering: boolean;
  marginMm: number;
}

// PIKT: batch printing flow (Chantier 3 — schema v2). See docs/FEATURES-DELTA.md §7,§9,§11,§12.

/** Failure categories surfaced to the user; mapped to messages in $/services/printErrorMap. */
export type PrintErrorKey =
  | "disconnected"
  | "paper_out"
  | "low_battery"
  | "device_error"
  | "encode_failed"
  | "cancelled";

/**
 * Printer settings captured for a print run. Held batch-wide (Batch.globalPrintSettings)
 * and optionally overridden per item (BatchItem.printSettings). Primitive types keep the
 * schema decoupled from niimbluelib enums (printTaskName: PrintTaskName, labelType: LabelType).
 */
export interface PrintSettings {
  printTaskName?: string;
  labelType?: number;
  density?: number;
  speed?: 0 | 1;
  postProcess?: PostProcessType;
  postProcessInvert?: boolean;
  threshold?: number;
}

/** User choices from the print confirmation screen (§11.3, §12.8). */
export interface PrintOptions {
  /** Wait for a manual tap after each printed label. */
  pauseBetweenLabels: boolean;
  /** Wait for a manual tap when moving to the next item. */
  pauseBetweenItems: boolean;
  /** Stamp "n/total" on mosaic tiles. */
  numberMosaicTiles: boolean;
  /** Automatic delay between labels, 0–30000 ms (0 = none). */
  interLabelDelayMs: number;
}

/**
 * Resumable print position. Nesting order is passages → items → copies → tiles
 * (§7.11, §9.6). Points at the LAST successfully printed unit; resume advances to the
 * next. `itemId` is the primary resolver (positions can shift); `itemIndex` is a fallback.
 */
export interface PrintCursor {
  /** 0-based passage index (< batch.passages). */
  pass: number;
  /** 0-based item order index within the batch. */
  itemIndex: number;
  /** Item id at that index when the cursor was written. */
  itemId: string;
  /** 0-based copy index within the item (< item.copies). */
  copy: number;
  /** 0-based mosaic tile index (0 for single-mode items). */
  tile: number;
  updatedAt: number;
}

/** One record per completed/aborted print run. Feeds the v2 history gallery (§17.1). */
export interface PrintHistoryEntry {
  id: string;
  batchId: string;
  /** Denormalized so history survives batch rename/delete. */
  batchName: string;
  startedAt: number;
  finishedAt: number;
  outcome: "completed" | "cancelled" | "errored";
  labelsPrinted: number;
  labelsTotal: number;
  passages: number;
  errorKey?: PrintErrorKey;
}

export interface Batch {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  /** Whole-batch repetitions. */
  passages: number;
  status: BatchStatus;
  /** Ordered item ids. */
  itemsOrder: string[];
  /** Default label props applied to new items. */
  defaultLabelProps?: LabelProps;
  tags?: string[];

  // Batch printing flow (v2) — all optional for back-compat with v1 rows.
  /** Printer settings captured for the run (per-item overrides live on BatchItem). */
  globalPrintSettings?: PrintSettings;
  /** Confirmation-screen choices for the current/last run. */
  printOptions?: PrintOptions;
  /** Resume position; present iff a run was interrupted. Absence = not started / finished. */
  printCursor?: PrintCursor;
  printStartedAt?: number;
  lastPrintedAt?: number;
}

export interface BatchItem {
  id: string;
  batchId: string;
  name: string;
  position: number;
  labelProps: LabelProps;
  canvasState: FabricJson;
  mode: ItemMode;
  /** Identical copies of this item. */
  copies: number;
  mosaicConfig?: MosaicConfig;
  sourceImageId?: string;
  thumbnail?: string;
  status: ItemStatus;
  /** Per-item printer settings overriding Batch.globalPrintSettings (v2). */
  printSettings?: PrintSettings;
  createdAt: number;
  modifiedAt: number;
}

export interface StoredImage {
  id: string;
  blob: Blob;
  thumbnailDataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  filename?: string;
  importedAt: number;
  tags?: string[];
  isFavorite?: boolean;
}

export class NiimbotatorDB extends Dexie {
  batches!: Table<Batch, string>;
  items!: Table<BatchItem, string>;
  images!: Table<StoredImage, string>;
  printHistory!: Table<PrintHistoryEntry, string>;

  constructor() {
    super("niimbotator");
    this.version(1).stores({
      batches: "id, name, createdAt, modifiedAt, status, *tags",
      items: "id, batchId, position, status, modifiedAt",
      images: "id, importedAt, isFavorite, *tags",
    });
    // v2: batch printing flow. New printHistory table; the new Batch/BatchItem fields are
    // non-indexed and optional, so no data migration is needed (old rows read undefined).
    this.version(2).stores({
      batches: "id, name, createdAt, modifiedAt, status, *tags",
      items: "id, batchId, position, status, modifiedAt",
      images: "id, importedAt, isFavorite, *tags",
      printHistory: "id, batchId, startedAt, finishedAt, outcome",
    });
  }
}

export const db = new NiimbotatorDB();
