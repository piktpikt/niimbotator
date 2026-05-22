// PIKT: Dexie (IndexedDB) schema for the batch system (Chantier 2). See docs/ARCHITECTURE.md §5.2.
// Structured/heavy data (batches, items, images) lives here; light prefs stay in LocalStorage.
import Dexie, { type Table } from "dexie";
import type { FabricJson, LabelProps } from "$/types";

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

  constructor() {
    super("niimbotator");
    this.version(1).stores({
      batches: "id, name, createdAt, modifiedAt, status, *tags",
      items: "id, batchId, position, status, modifiedAt",
      images: "id, importedAt, isFavorite, *tags",
    });
  }
}

export const db = new NiimbotatorDB();
