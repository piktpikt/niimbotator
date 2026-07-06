// src/stores/stickerStore.ts
import { readable, type Readable } from "svelte/store";
import { db, type StickerFavorite, type StickerRecent } from "$/db/schema";

const RECENTS_CAP = 40;

// Simple in-module notifier so the reactive stores refresh after a write (fake-indexeddb has no liveQuery).
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export async function isFavorite(id: string): Promise<boolean> {
  return (await db.stickerFavorites.get(id)) !== undefined;
}

export async function listFavorites(): Promise<string[]> {
  const rows = await db.stickerFavorites.orderBy("addedAt").reverse().toArray();
  return rows.map((r: StickerFavorite) => r.id);
}

export async function toggleFavorite(id: string): Promise<void> {
  if (await isFavorite(id)) await db.stickerFavorites.delete(id);
  else await db.stickerFavorites.put({ id, addedAt: Date.now() });
  notify();
}

export async function pushRecent(id: string): Promise<void> {
  await db.stickerRecents.put({ id, usedAt: Date.now() });
  const all = await db.stickerRecents.orderBy("usedAt").reverse().toArray();
  const overflow = all.slice(RECENTS_CAP);
  if (overflow.length > 0) await db.stickerRecents.bulkDelete(overflow.map((r: StickerRecent) => r.id));
  notify();
}

export async function listRecents(limit = RECENTS_CAP): Promise<string[]> {
  const rows = await db.stickerRecents.orderBy("usedAt").reverse().limit(limit).toArray();
  return rows.map((r: StickerRecent) => r.id);
}

/** Reactive Set of favorite ids (refreshes after any toggle in this tab). */
export const favoriteIds: Readable<Set<string>> = readable(new Set<string>(), (set) => {
  const refresh = () => void listFavorites().then((ids) => set(new Set(ids)));
  listeners.add(refresh);
  refresh();
  return () => listeners.delete(refresh);
});

/** Reactive most-recent-first ids. */
export const recentIds: Readable<string[]> = readable<string[]>([], (set) => {
  const refresh = () => void listRecents().then(set);
  listeners.add(refresh);
  refresh();
  return () => listeners.delete(refresh);
});
