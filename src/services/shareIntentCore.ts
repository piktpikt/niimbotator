// PIKT (Niimbotator): pure helpers for the Android share-target receiver — no native/DOM imports so they
// can be unit-tested DOM-free. Turns a raw SendIntent result into an ordered, image-only list of readable
// file references. The native IO (Filesystem read, plugin calls, batch creation) lives in ./shareIntent.

/** One shared entry as returned by the send-intent plugin. `url` is a `file://` path once the plugin has
 *  copied the shared content into app-private storage (it can also be a web URL for text/link shares). */
export interface SharedItem {
  url?: unknown;
  type?: unknown;
  title?: unknown;
}

/** Result of `SendIntent.checkSendIntentReceived()`: the first item at the top level, the rest (for a
 *  multi-share / ACTION_SEND_MULTIPLE) in `additionalItems`. */
export interface SharedIntent extends SharedItem {
  additionalItems?: unknown;
}

/** A resolved, readable image reference extracted from a share. */
export interface ImageRef {
  /** Decoded `file://` path to hand to the Filesystem plugin. */
  path: string;
  /** Concrete image MIME (never the wildcard `image/*`), so a data URL fabric can decode can be built. */
  mime: string;
}

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * Resolve a concrete image MIME from a filename/path, preferring its extension and falling back to a
 * declared MIME type. Returns `null` when the item is not an image (e.g. a shared web link or plain text,
 * which our `image/*` intent-filter should never deliver — but we guard anyway).
 */
export function imageMime(pathOrName: string, declaredType?: string): string | null {
  const clean = pathOrName.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  const ext = dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
  if (IMAGE_MIME_BY_EXT[ext]) return IMAGE_MIME_BY_EXT[ext];
  if (declaredType && declaredType.startsWith("image/")) {
    // A concrete declared type (image/jpeg…) is trustworthy; the wildcard is not, so pick a safe default.
    return declaredType === "image/*" ? "image/jpeg" : declaredType;
  }
  return null;
}

/**
 * Flatten a SendIntent result into ordered, image-only file references: the top-level item first, then each
 * entry of `additionalItems`. Non-file shares (web URLs, text) and non-image items are dropped.
 */
export function collectImageRefs(intent: SharedIntent | null | undefined): ImageRef[] {
  if (!intent) return [];
  const rawItems: SharedItem[] = [
    intent,
    ...(Array.isArray(intent.additionalItems) ? (intent.additionalItems as SharedItem[]) : []),
  ];

  const refs: ImageRef[] = [];
  for (const item of rawItems) {
    if (!item || typeof item.url !== "string" || item.url.length === 0) continue;

    let path: string;
    try {
      path = decodeURIComponent(item.url);
    } catch {
      path = item.url; // malformed percent-encoding (e.g. a raw text share) — keep as-is, then filter below
    }
    if (!path.startsWith("file://")) continue; // ignore shared web URLs / plain text

    const mime = imageMime(path, typeof item.type === "string" ? item.type : undefined);
    if (!mime) continue;

    refs.push({ path, mime });
  }
  return refs;
}
