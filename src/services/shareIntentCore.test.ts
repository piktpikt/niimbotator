import { describe, expect, it } from "vitest";
import { collectImageRefs, imageMime, type SharedIntent } from "./shareIntentCore";

describe("imageMime", () => {
  it("resolves by file extension, case-insensitively", () => {
    expect(imageMime("IMG_1234.jpg")).toBe("image/jpeg");
    expect(imageMime("photo.JPEG")).toBe("image/jpeg");
    expect(imageMime("a.PNG")).toBe("image/png");
    expect(imageMime("b.webp")).toBe("image/webp");
    expect(imageMime("c.heic")).toBe("image/heic");
  });

  it("ignores a trailing query/hash when reading the extension", () => {
    expect(imageMime("file:///x/photo.jpg?v=1")).toBe("image/jpeg");
    expect(imageMime("photo.png#frag")).toBe("image/png");
  });

  it("falls back to a concrete declared type when the extension is unknown", () => {
    expect(imageMime("blob-with-no-ext", "image/webp")).toBe("image/webp");
    expect(imageMime("file.dat", "image/png")).toBe("image/png");
  });

  it("maps the image/* wildcard to a safe default", () => {
    expect(imageMime("no-ext", "image/*")).toBe("image/jpeg");
  });

  it("returns null for non-images", () => {
    expect(imageMime("document.pdf")).toBeNull();
    expect(imageMime("note.txt", "text/plain")).toBeNull();
    expect(imageMime("no-ext")).toBeNull();
  });
});

describe("collectImageRefs", () => {
  it("returns [] for empty input", () => {
    expect(collectImageRefs(null)).toEqual([]);
    expect(collectImageRefs(undefined)).toEqual([]);
    expect(collectImageRefs({})).toEqual([]);
  });

  it("extracts a single shared image", () => {
    const intent: SharedIntent = { url: "file:///data/user/0/app/files/IMG_1.jpg", type: "image/jpeg" };
    expect(collectImageRefs(intent)).toEqual([{ path: "file:///data/user/0/app/files/IMG_1.jpg", mime: "image/jpeg" }]);
  });

  it("percent-decodes the file path", () => {
    const intent: SharedIntent = { url: "file:///data/My%20Photo.png", type: "image/*" };
    expect(collectImageRefs(intent)).toEqual([{ path: "file:///data/My Photo.png", mime: "image/png" }]);
  });

  it("flattens a multi-share (top-level first, then additionalItems, order preserved)", () => {
    const intent: SharedIntent = {
      url: "file:///f/a.jpg",
      type: "image/*",
      additionalItems: [
        { url: "file:///f/b.png", type: "image/*" },
        { url: "file:///f/c.webp", type: "image/*" },
      ],
    };
    expect(collectImageRefs(intent)).toEqual([
      { path: "file:///f/a.jpg", mime: "image/jpeg" },
      { path: "file:///f/b.png", mime: "image/png" },
      { path: "file:///f/c.webp", mime: "image/webp" },
    ]);
  });

  it("drops shared web URLs and text (non-file:// urls)", () => {
    expect(collectImageRefs({ url: "https://example.com/x", type: "text/plain" })).toEqual([]);
    expect(collectImageRefs({ url: "hello world", type: "text/plain" })).toEqual([]);
  });

  it("drops non-image files even when shared as file://", () => {
    expect(collectImageRefs({ url: "file:///f/report.pdf", type: "application/pdf" })).toEqual([]);
  });

  it("skips items with a missing/empty url and ignores a non-array additionalItems", () => {
    const intent: SharedIntent = {
      url: "file:///f/keep.jpg",
      type: "image/jpeg",
      additionalItems: [{ url: "" }, { type: "image/png" }, "garbage" as unknown],
    };
    expect(collectImageRefs(intent)).toEqual([{ path: "file:///f/keep.jpg", mime: "image/jpeg" }]);
    expect(collectImageRefs({ url: "file:///f/x.jpg", type: "image/jpeg", additionalItems: "not-an-array" })).toEqual([
      { path: "file:///f/x.jpg", mime: "image/jpeg" },
    ]);
  });

  it("keeps only the image when an image and a web link are shared together", () => {
    const intent: SharedIntent = {
      url: "file:///f/pic.jpg",
      type: "image/jpeg",
      additionalItems: [{ url: "https://example.com", type: "text/plain" }],
    };
    expect(collectImageRefs(intent)).toEqual([{ path: "file:///f/pic.jpg", mime: "image/jpeg" }]);
  });
});
