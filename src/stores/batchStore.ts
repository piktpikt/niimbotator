// PIKT: Batch system store + operations (Chantier 2). See docs/ARCHITECTURE.md §6.5.
import { liveQuery, type Observable } from "dexie";
import { db, type Batch, type BatchItem, type ItemMode, type MosaicConfig } from "$/db/schema";
import { DEFAULT_LABEL_PROPS } from "$/defaults";

/** Live list of batches, most recently modified first (Svelte-store compatible via $). */
export const batches: Observable<Batch[]> = liveQuery(() =>
  db.batches.orderBy("modifiedAt").reverse().toArray(),
);

/** Live count of items per batch id, for list summaries. */
export const itemCounts: Observable<Record<string, number>> = liveQuery(async () => {
  const items = await db.items.toArray();
  const counts: Record<string, number> = {};
  for (const it of items) counts[it.batchId] = (counts[it.batchId] ?? 0) + 1;
  return counts;
});

function defaultBatchName(now: number): string {
  return `Batch ${new Date(now).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`;
}

export async function createBatch(name?: string): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.batches.add({
    id,
    name: name?.trim() || defaultBatchName(now),
    createdAt: now,
    modifiedAt: now,
    passages: 1,
    status: "draft",
    itemsOrder: [],
  });
  return id;
}

export async function renameBatch(id: string, name: string): Promise<void> {
  await db.batches.update(id, { name: name.trim(), modifiedAt: Date.now() });
}

export async function deleteBatch(id: string): Promise<void> {
  await db.transaction("rw", db.batches, db.items, async () => {
    await db.items.where("batchId").equals(id).delete();
    await db.batches.delete(id);
  });
}

/** Items of a batch, ordered by position (live). */
export function batchItems(batchId: string): Observable<BatchItem[]> {
  return liveQuery(() => db.items.where("batchId").equals(batchId).sortBy("position"));
}

/** Get a batch by id (one-shot). */
export async function getBatch(id: string): Promise<Batch | undefined> {
  return db.batches.get(id);
}

/** Get an item by id (one-shot). */
export async function getItem(id: string): Promise<BatchItem | undefined> {
  return db.items.get(id);
}

/** Create a new item in a batch. Returns its id. */
export async function addBatchItem(
  batchId: string,
  init: Partial<Omit<BatchItem, "id" | "batchId" | "createdAt" | "modifiedAt">> = {},
): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const position = await db.items.where("batchId").equals(batchId).count();
  const batch = await db.batches.get(batchId);
  const labelProps = init.labelProps ?? batch?.defaultLabelProps ?? DEFAULT_LABEL_PROPS;
  await db.transaction("rw", db.batches, db.items, async () => {
    await db.items.add({
      id,
      batchId,
      name: init.name?.trim() || `Étiquette ${position + 1}`,
      position,
      labelProps,
      canvasState: init.canvasState ?? ({} as BatchItem["canvasState"]),
      mode: init.mode ?? "single",
      copies: init.copies ?? 1,
      mosaicConfig: init.mosaicConfig,
      sourceImageId: init.sourceImageId,
      thumbnail: init.thumbnail,
      status: init.status ?? "ready",
      createdAt: now,
      modifiedAt: now,
    });
    await db.batches.update(batchId, { modifiedAt: now });
  });
  return id;
}

/** Update fields on a batch item. */
export async function updateBatchItem(id: string, patch: Partial<BatchItem>): Promise<void> {
  const now = Date.now();
  const item = await db.items.get(id);
  if (!item) return;
  // PIKT: Dexie's UpdateSpec triggers a circular type on FabricJson; a runtime-safe cast avoids it.
  const update = { ...patch, modifiedAt: now } as Record<string, unknown>;
  await db.transaction("rw", db.batches, db.items, async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.items as any).update(id, update);
    await db.batches.update(item.batchId, { modifiedAt: now });
  });
}

export async function deleteBatchItem(id: string): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  await db.transaction("rw", db.batches, db.items, async () => {
    await db.items.delete(id);
    await db.batches.update(item.batchId, { modifiedAt: Date.now() });
  });
}

/** Set the item copies (1–99). */
export async function setItemCopies(id: string, copies: number): Promise<void> {
  const c = Math.max(1, Math.min(99, Math.round(copies)));
  await updateBatchItem(id, { copies: c });
}

/** Toggle an item between single/mosaic modes (mosaic keeps its config if any). */
export async function setItemMode(id: string, mode: ItemMode, mosaicConfig?: MosaicConfig): Promise<void> {
  await updateBatchItem(id, { mode, mosaicConfig });
}

/** Change the batch passages (1–10). */
export async function setBatchPassages(id: string, passages: number): Promise<void> {
  const p = Math.max(1, Math.min(10, Math.round(passages)));
  await db.batches.update(id, { passages: p, modifiedAt: Date.now() });
}

/** Store an image blob and return its id (used by the mosaic image picker). */
export async function addImage(blob: Blob, filename?: string): Promise<string> {
  const id = crypto.randomUUID();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("cannot load image"));
    img.src = dataUrl;
  });
  await db.images.add({
    id,
    blob,
    thumbnailDataUrl: dataUrl,
    mimeType: blob.type || "image/png",
    width: dims.width,
    height: dims.height,
    filename,
    importedAt: Date.now(),
  });
  return id;
}

export async function getImage(id: string): Promise<import("$/db/schema").StoredImage | undefined> {
  return db.images.get(id);
}

/** Position of an item in its batch (0-indexed). Returns -1 if not found. */
export async function itemPosition(itemId: string): Promise<{ position: number; total: number; batchId?: string }> {
  const item = await db.items.get(itemId);
  if (!item) return { position: -1, total: 0 };
  const siblings = await db.items.where("batchId").equals(item.batchId).sortBy("position");
  const index = siblings.findIndex((it) => it.id === itemId);
  return { position: index, total: siblings.length, batchId: item.batchId };
}

/** Neighbour item ids (prev/next) in the batch. Undefined if none. */
export async function itemNeighbours(itemId: string): Promise<{ prev?: string; next?: string }> {
  const item = await db.items.get(itemId);
  if (!item) return {};
  const siblings = await db.items.where("batchId").equals(item.batchId).sortBy("position");
  const i = siblings.findIndex((it) => it.id === itemId);
  return { prev: siblings[i - 1]?.id, next: siblings[i + 1]?.id };
}
