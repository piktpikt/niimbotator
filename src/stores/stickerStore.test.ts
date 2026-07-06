// src/stores/stickerStore.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "$/db/schema";
import { toggleFavorite, isFavorite, listFavorites, pushRecent, listRecents } from "./stickerStore";

beforeEach(async () => {
  await db.stickerFavorites.clear();
  await db.stickerRecents.clear();
});

describe("sticker favorites", () => {
  it("toggles a favorite on and off", async () => {
    expect(await isFavorite("openmoji:1F436")).toBe(false);
    await toggleFavorite("openmoji:1F436");
    expect(await isFavorite("openmoji:1F436")).toBe(true);
    expect(await listFavorites()).toEqual(["openmoji:1F436"]);
    await toggleFavorite("openmoji:1F436");
    expect(await isFavorite("openmoji:1F436")).toBe(false);
    expect(await listFavorites()).toEqual([]);
  });
});

describe("sticker recents", () => {
  it("keeps most-recent-first, de-duplicated, capped", async () => {
    await pushRecent("a");
    await new Promise((r) => setTimeout(r, 1));
    await pushRecent("b");
    await new Promise((r) => setTimeout(r, 1));
    await pushRecent("a"); // re-use bumps 'a' to front, no duplicate
    expect(await listRecents()).toEqual(["a", "b"]);
  });
  it("caps recents to the requested limit", async () => {
    for (const id of ["a", "b", "c", "d"]) await pushRecent(id);
    expect(await listRecents(2)).toEqual(["d", "c"]);
  });
});
