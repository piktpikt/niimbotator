// PIKT: Batch system store + operations (Chantier 2). See docs/ARCHITECTURE.md §6.5.
import { liveQuery, type Observable } from "dexie";
import { db, type Batch, type BatchItem } from "$/db/schema";

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
