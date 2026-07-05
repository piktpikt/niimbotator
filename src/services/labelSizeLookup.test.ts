import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("$/services/cloudHttp", () => ({ postApiFormJson: h.post }));

import { lookupLabelSize } from "./labelSizeLookup";

function memoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  };
}

/** A rich, fully-populated cloud response (the shape a real roll returns). */
const richResponse = {
  ok: true,
  status: 200,
  json: {
    code: 0,
    data: {
      width: 40,
      height: 30,
      paperType: 3,
      backgroundImage: "https://oss-print.niimbot.com/public_resources/labels/DN-abc.png",
      rotate: 90,
      margin: [1, 2, 3, 4],
      inputAreas: [{ x: 2, y: 3, w: 34, h: 22, type: "text", areaNumber: 1 }],
    },
  },
};

beforeEach(() => {
  h.post.mockReset();
  vi.stubGlobal("localStorage", memoryLocalStorage());
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupLabelSize", () => {
  it("returns undefined for an empty barcode without hitting the network", async () => {
    expect(await lookupLabelSize("")).toBeUndefined();
    expect(h.post).not.toHaveBeenCalled();
  });

  it("maps the full cloud format (size + background + zones + margin + rotate)", async () => {
    h.post.mockResolvedValue(richResponse);

    const result = await lookupLabelSize("BC123");

    expect(result).toEqual({
      widthMm: 40,
      heightMm: 30,
      paperType: 3,
      backgroundImage: "https://oss-print.niimbot.com/public_resources/labels/DN-abc.png",
      rotate: 90,
      marginMm: [1, 2, 3, 4],
      inputAreas: [{ xMm: 2, yMm: 3, widthMm: 34, heightMm: 22, type: "text", areaNumber: 1 }],
    });
    // sent as a form POST with the oneCode param
    expect(h.post).toHaveBeenCalledWith(
      expect.stringContaining("getCloudTemplateByScanCode"),
      { oneCode: "BC123" },
      expect.objectContaining({ "niimbot-user-agent": "niimbotator" }),
      expect.any(Number),
    );
  });

  it("caches a successful lookup and serves the second call from cache", async () => {
    h.post.mockResolvedValue(richResponse);

    const first = await lookupLabelSize("BC123");
    const second = await lookupLabelSize("BC123");

    expect(second).toEqual(first);
    expect(h.post).toHaveBeenCalledTimes(1);
  });

  it("handles a minimal response (size only) with defaults", async () => {
    h.post.mockResolvedValue({ ok: true, status: 200, json: { data: { width: 50, height: 15 } } });

    expect(await lookupLabelSize("MIN")).toEqual({
      widthMm: 50,
      heightMm: 15,
      paperType: 1, // defaulted
      backgroundImage: undefined,
      rotate: undefined,
      marginMm: undefined,
      inputAreas: undefined,
    });
  });

  it("degrades malformed extras to undefined but keeps a valid size", async () => {
    h.post.mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        data: {
          width: 40,
          height: 30,
          margin: [1, 2, 3], // wrong length → dropped
          backgroundImage: 42, // wrong type → dropped
          inputAreas: [{ x: 1 }], // malformed element → whole array dropped
        },
      },
    });

    const result = await lookupLabelSize("MAL");
    expect(result?.widthMm).toBe(40);
    expect(result?.heightMm).toBe(30);
    expect(result?.marginMm).toBeUndefined();
    expect(result?.backgroundImage).toBeUndefined();
    expect(result?.inputAreas).toBeUndefined();
  });

  it("returns undefined when width/height are missing", async () => {
    h.post.mockResolvedValue({ ok: true, status: 200, json: { data: { paperType: 1 } } });
    expect(await lookupLabelSize("NOSIZE")).toBeUndefined();
  });

  it("returns undefined on a non-ok transport result", async () => {
    h.post.mockResolvedValue({ ok: false, status: 0, json: undefined });
    expect(await lookupLabelSize("ERR")).toBeUndefined();
  });

  it("does not hit the network when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(await lookupLabelSize("OFF")).toBeUndefined();
    expect(h.post).not.toHaveBeenCalled();
  });
});
