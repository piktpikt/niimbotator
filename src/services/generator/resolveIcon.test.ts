import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StickerAsset } from "$/services/stickers/types";

// Control the P5 sticker catalog/search collaborators from the tests.
const h = vi.hoisted(() => ({
  loadCatalog: vi.fn(),
  createStickerIndex: vi.fn(),
  searchStickers: vi.fn(),
}));

vi.mock("$/services/stickers/catalog", () => ({
  loadCatalog: h.loadCatalog,
}));
vi.mock("$/services/stickers/search", () => ({
  createStickerIndex: h.createStickerIndex,
  searchStickers: h.searchStickers,
}));

const makeAsset = (id: string, spriteUrl: string): StickerAsset =>
  ({
    id,
    sourceId: "openmoji",
    kind: "emoji-vector",
    hexcode: id,
    glyph: "x",
    spriteUrl,
    tonalOk: true,
    themes: [],
    labelFr: id,
    labelEn: id,
    keywordsFr: [],
    keywordsEn: [],
    license: "CC-BY-SA-4.0",
    attributionRequired: true,
  }) as StickerAsset;

const ASSETS: StickerAsset[] = [makeAsset("cake", "/stickers/openmoji/black/CAKE.svg")];
const FAKE_INDEX = { fake: "index" };

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  h.loadCatalog.mockReset().mockResolvedValue(ASSETS);
  h.createStickerIndex.mockReset().mockReturnValue(FAKE_INDEX);
  h.searchStickers.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveIconSvg", () => {
  it("returns the SVG for the first keyword that hits", async () => {
    const { resolveIconSvg } = await import("./resolveIcon");
    h.searchStickers.mockReturnValue([makeAsset("cake", "/stickers/openmoji/black/CAKE.svg")]);
    fetchMock.mockResolvedValue({ text: async () => "<svg>cake</svg>" });

    const result = await resolveIconSvg(["cake", "candle"]);

    expect(result).toBe("<svg>cake</svg>");
    expect(h.loadCatalog).toHaveBeenCalledTimes(1);
    expect(h.createStickerIndex).toHaveBeenCalledTimes(1);
    expect(h.searchStickers).toHaveBeenCalledWith(FAKE_INDEX, ASSETS, "cake");
    expect(fetchMock).toHaveBeenCalledWith("/stickers/openmoji/black/CAKE.svg");
  });

  it("falls through to the second keyword when the first misses", async () => {
    const { resolveIconSvg } = await import("./resolveIcon");
    h.searchStickers.mockImplementation((_index: unknown, _assets: unknown, query: string) => {
      if (query === "cake") return [];
      if (query === "candle") return [makeAsset("candle", "/stickers/openmoji/black/CANDLE.svg")];
      return [];
    });
    fetchMock.mockResolvedValue({ text: async () => "<svg>candle</svg>" });

    const result = await resolveIconSvg(["cake", "candle"]);

    expect(result).toBe("<svg>candle</svg>");
    expect(h.searchStickers).toHaveBeenCalledWith(FAKE_INDEX, ASSETS, "cake");
    expect(h.searchStickers).toHaveBeenCalledWith(FAKE_INDEX, ASSETS, "candle");
    expect(fetchMock).toHaveBeenCalledWith("/stickers/openmoji/black/CANDLE.svg");
  });

  it("returns null when no keyword matches, without ever fetching", async () => {
    const { resolveIconSvg } = await import("./resolveIcon");
    h.searchStickers.mockReturnValue([]);

    const result = await resolveIconSvg(["cake", "candle"]);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the fetch throws", async () => {
    const { resolveIconSvg } = await import("./resolveIcon");
    h.searchStickers.mockReturnValue([makeAsset("cake", "/stickers/openmoji/black/CAKE.svg")]);
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await resolveIconSvg(["cake"]);

    expect(result).toBeNull();
  });
});
