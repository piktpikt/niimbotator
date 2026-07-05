// PIKT: Platform-aware cloud HTTP transport (Roadmap P3).
// Why: the Niimbot `/api/*` endpoints require a custom `niimbot-user-agent` header, which turns the
// cross-origin POST into a non-simple request → a CORS preflight the server never answers for a
// browser origin. From the Capacitor WebView a plain `fetch` therefore fails on-device. On native we
// route through CapacitorHttp (built into `@capacitor/core` since Capacitor 4 — NO extra dependency),
// which runs the request in the native layer where CORS does not apply. On web/dev we use `fetch`.
// Static OSS resources stay a header-less GET on both platforms (a custom header would itself trigger a
// preflight the static bucket can't answer — see `deviceCatalog`).
// Upstream PR candidate: no
import { Capacitor, CapacitorHttp } from "@capacitor/core";

export interface HttpJsonResult {
  ok: boolean;
  status: number;
  /** Parsed JSON body (unknown — every caller validates its own shape). Undefined on failure. */
  json: unknown;
}

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";
const DEFAULT_STATIC_TIMEOUT_MS = 8000;
const DEFAULT_API_TIMEOUT_MS = 6000;

function encodeForm(form: Record<string, string>): string {
  return Object.entries(form)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/** CapacitorHttp already parses JSON responses to objects; a plain-text body stays a string. Normalize. */
function parseMaybeJson(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function headerValue(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

/** Base64-encode raw bytes into a same-origin data URL (browser + Node friendly; no FileReader). */
function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** GET a static OSS resource as JSON. Header-less on both platforms (avoids the CORS preflight). */
export async function getStaticJson(url: string, timeoutMs = DEFAULT_STATIC_TIMEOUT_MS): Promise<HttpJsonResult> {
  try {
    if (isNative()) {
      const res = await CapacitorHttp.get({ url, readTimeout: timeoutMs, connectTimeout: timeoutMs });
      const ok = res.status >= 200 && res.status < 300;
      return { ok, status: res.status, json: ok ? parseMaybeJson(res.data) : undefined };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : undefined };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, status: 0, json: undefined };
  }
}

/**
 * POST form-encoded to a Niimbot `/api/*` endpoint (custom header required). Native routes through
 * CapacitorHttp to bypass the WebView CORS preflight; web/dev uses `fetch`.
 */
export async function postApiFormJson(
  url: string,
  form: Record<string, string>,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
): Promise<HttpJsonResult> {
  const allHeaders = { "Content-Type": FORM_CONTENT_TYPE, ...headers };
  try {
    if (isNative()) {
      // CapacitorHttp form-encodes the `data` object when the content-type is form-urlencoded.
      const res = await CapacitorHttp.post({
        url,
        headers: allHeaders,
        data: form,
        readTimeout: timeoutMs,
        connectTimeout: timeoutMs,
      });
      const ok = res.status >= 200 && res.status < 300;
      return { ok, status: res.status, json: ok ? parseMaybeJson(res.data) : undefined };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: allHeaders,
        body: encodeForm(form),
        signal: controller.signal,
      });
      return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : undefined };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, status: 0, json: undefined };
  }
}

/**
 * GET a static image and return it as a same-origin `data:` URL, so it can be drawn onto the Fabric
 * canvas WITHOUT tainting it (a tainted canvas would break the editor's `toDataURL` thumbnailing).
 * Used for the editor-only roll-background preview. Undefined on failure.
 */
export async function getStaticDataUrl(url: string, timeoutMs = DEFAULT_STATIC_TIMEOUT_MS): Promise<string | undefined> {
  try {
    if (isNative()) {
      const res = await CapacitorHttp.get({
        url,
        responseType: "blob", // CapacitorHttp returns the body as a raw base64 string
        readTimeout: timeoutMs,
        connectTimeout: timeoutMs,
      });
      if (res.status < 200 || res.status >= 300 || typeof res.data !== "string") return undefined;
      const mime = headerValue(res.headers, "content-type") ?? "image/png";
      return `data:${mime};base64,${res.data}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return undefined;
      const blob = await res.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return bytesToDataUrl(bytes, blob.type || "image/png");
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return undefined;
  }
}
