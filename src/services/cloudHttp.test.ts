import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Control the platform + the native HTTP client from the tests.
const h = vi.hoisted(() => ({
  native: false,
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native },
  CapacitorHttp: { get: h.get, post: h.post },
}));

import { getStaticDataUrl, getStaticJson, postApiFormJson } from "./cloudHttp";

const fetchMock = vi.fn();

beforeEach(() => {
  h.native = false;
  h.get.mockReset();
  h.post.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStaticJson (web)", () => {
  it("does a header-less GET and returns parsed json", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [{ a: 1 }] });

    const res = await getStaticJson("https://oss/x.json");

    expect(res).toEqual({ ok: true, status: 200, json: [{ a: 1 }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oss/x.json");
    // No custom headers on a static GET (would trigger a CORS preflight the bucket can't answer).
    expect((init as RequestInit).headers).toBeUndefined();
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it("returns ok:false with no json on a non-2xx response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    expect(await getStaticJson("https://oss/x.json")).toEqual({ ok: false, status: 404, json: undefined });
  });

  it("swallows network errors into a non-ok result", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await getStaticJson("https://oss/x.json")).toEqual({ ok: false, status: 0, json: undefined });
  });
});

describe("getStaticJson (native)", () => {
  it("routes through CapacitorHttp.get and normalizes the response", async () => {
    h.native = true;
    h.get.mockResolvedValue({ status: 200, data: [{ a: 1 }], headers: {} });

    const res = await getStaticJson("https://oss/x.json");

    expect(res).toEqual({ ok: true, status: 200, json: [{ a: 1 }] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.get).toHaveBeenCalledWith(expect.objectContaining({ url: "https://oss/x.json" }));
  });

  it("parses a stringified JSON body from the native layer", async () => {
    h.native = true;
    h.get.mockResolvedValue({ status: 200, data: '[{"a":1}]', headers: {} });
    expect((await getStaticJson("https://oss/x.json")).json).toEqual([{ a: 1 }]);
  });
});

describe("postApiFormJson", () => {
  it("web: POSTs a form-encoded body with the required headers", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { width: 40 } }) });

    const res = await postApiFormJson(
      "https://print/api/x",
      { oneCode: "AB 12" },
      { "niimbot-user-agent": "niimbotator", languageCode: "en" },
    );

    expect(res.json).toEqual({ data: { width: 40 } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://print/api/x");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("oneCode=AB%2012");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
      "niimbot-user-agent": "niimbotator",
      languageCode: "en",
    });
  });

  it("native: routes through CapacitorHttp.post with a form-ENCODED STRING body", async () => {
    h.native = true;
    h.post.mockResolvedValue({ status: 200, data: { data: { width: 40 } } });

    const res = await postApiFormJson("https://print/api/x", { oneCode: "AB 12" }, { "niimbot-user-agent": "ua" });

    expect(res).toEqual({ ok: true, status: 200, json: { data: { width: 40 } } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://print/api/x",
        data: "oneCode=AB%2012", // encoded string, not a JS object
        headers: expect.objectContaining({ "niimbot-user-agent": "ua" }),
      }),
    );
  });

  it("returns a non-ok result when the request throws", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    expect(await postApiFormJson("https://print/api/x", { oneCode: "X" })).toEqual({
      ok: false,
      status: 0,
      json: undefined,
    });
  });
});

describe("getStaticDataUrl", () => {
  it("web: fetches the image and returns a same-origin data URL", async () => {
    const png = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob([png], { type: "image/png" }),
    });

    const url = await getStaticDataUrl("https://oss/bg.png");

    expect(url).toBe(`data:image/png;base64,${btoa(String.fromCharCode(1, 2, 3, 4))}`);
  });

  it("native: builds the data URL from the base64 body + content-type header", async () => {
    h.native = true;
    h.get.mockResolvedValue({ status: 200, data: "AQIDBA==", headers: { "Content-Type": "image/png" } });

    expect(await getStaticDataUrl("https://oss/bg.png")).toBe("data:image/png;base64,AQIDBA==");
  });

  it("returns undefined on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await getStaticDataUrl("https://oss/bg.png")).toBeUndefined();
  });
});
