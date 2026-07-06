import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Control the platform, the native plugins, and the app collaborators from the tests.
const h = vi.hoisted(() => ({
  native: true,
  check: vi.fn(),
  finish: vi.fn(),
  readFile: vi.fn(),
  create: vi.fn(),
  openBatch: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { readFile: h.readFile },
}));
vi.mock("@mindlib-capacitor/send-intent", () => ({
  SendIntent: { checkSendIntentReceived: h.check, finish: h.finish },
}));
vi.mock("$/services/imageImport", () => ({
  createLabelsFromImages: h.create,
}));
vi.mock("$/stores/navigation", () => ({
  openBatch: h.openBatch,
}));

import { handleSharedImages } from "./shareIntent";

const fetchMock = vi.fn();
const lsStore = new Map<string, string>();

beforeEach(() => {
  h.native = true;
  h.check.mockReset();
  h.finish.mockReset();
  h.readFile.mockReset().mockResolvedValue({ data: "AAAA" }); // base64 payload (native returns a string)
  h.create.mockReset().mockResolvedValue({ batchId: "batch-1", itemIds: ["i1"] });
  h.openBatch.mockReset();
  fetchMock.mockReset().mockResolvedValue({ blob: async () => ({ size: 4 }) as Blob });
  lsStore.clear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => lsStore.get(k) ?? null,
    setItem: (k: string, v: string) => void lsStore.set(k, v),
    removeItem: (k: string) => void lsStore.delete(k),
    clear: () => lsStore.clear(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleSharedImages", () => {
  it("is a no-op off-device", async () => {
    h.native = false;
    expect(await handleSharedImages()).toBe(0);
    expect(h.check).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns 0 when this launch is not a share (plugin rejects)", async () => {
    h.check.mockRejectedValue(new Error("No processing needed"));
    expect(await handleSharedImages()).toBe(0);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.openBatch).not.toHaveBeenCalled();
  });

  it("imports a single shared image into a new batch and opens it", async () => {
    h.check.mockResolvedValue({ url: "file:///f/IMG_1.jpg", type: "image/jpeg" });

    expect(await handleSharedImages()).toBe(1);

    expect(h.readFile).toHaveBeenCalledTimes(1);
    expect(h.readFile).toHaveBeenCalledWith({ path: "file:///f/IMG_1.jpg" });
    expect(h.create).toHaveBeenCalledTimes(1);
    const [blobs, target] = h.create.mock.calls[0];
    expect(blobs).toHaveLength(1);
    expect(target).toBeUndefined(); // new, auto-named batch
    expect(h.openBatch).toHaveBeenCalledWith("batch-1");
  });

  it("imports a multi-share (SEND_MULTIPLE) preserving order", async () => {
    h.check.mockResolvedValue({
      url: "file:///f/a.jpg",
      type: "image/*",
      additionalItems: [
        { url: "file:///f/b.png", type: "image/*" },
        { url: "file:///f/c.webp", type: "image/*" },
      ],
    });

    expect(await handleSharedImages()).toBe(3);

    expect(h.readFile.mock.calls.map((c) => c[0].path)).toEqual([
      "file:///f/a.jpg",
      "file:///f/b.png",
      "file:///f/c.webp",
    ]);
    expect(h.create.mock.calls[0][0]).toHaveLength(3);
  });

  it("does not re-import the same share on a receiver reload (signature guard)", async () => {
    h.check.mockResolvedValue({ url: "file:///f/IMG_1.jpg", type: "image/jpeg" });

    expect(await handleSharedImages()).toBe(1);
    expect(await handleSharedImages()).toBe(0); // same intent again → skipped
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("ignores a non-image share", async () => {
    h.check.mockResolvedValue({ url: "https://example.com/page", type: "text/plain" });
    expect(await handleSharedImages()).toBe(0);
    expect(h.readFile).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });
});
