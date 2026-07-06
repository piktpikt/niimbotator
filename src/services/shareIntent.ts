// PIKT (Niimbotator): Android share-target receiver. When photos are shared into the app (Google Photos →
// "Share" → Niimbotator), turn each one into a label in a new batch and open it — reusing the same headless
// core as the in-app importer (services/imageImport). Device-only: a no-op on web/dev.
//
// The @mindlib-capacitor/send-intent plugin ships a dedicated `SendIntentActivity` (registered in
// AndroidManifest.xml with the SEND / SEND_MULTIPLE + image/* intent-filter). Each share opens a *fresh*
// instance of that activity — its own WebView + app bootstrap — so a single check at startup covers both
// cold-start and warm shares; no resume listener is needed. Shared files arrive as `file://` paths that the
// plugin has already copied into app-private storage, so no runtime storage permission is required.
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { SendIntent } from "@mindlib-capacitor/send-intent";
import { createLabelsFromImages } from "$/services/imageImport";
import { openBatch } from "$/stores/navigation";
import { Toasts } from "$/utils/toasts";
import { collectImageRefs, type ImageRef, type SharedIntent } from "$/services/shareIntentCore";

// Dedup guard: once a share has imported successfully we remember its signature (the ordered file paths) so
// a WebView reload — which keeps the same intent and would otherwise re-run the import — becomes a no-op.
// The signature is written ONLY after a successful import: a failed import is deliberately left un-consumed
// so a reload or a re-share of the same photos can retry it. (Writing it up-front would be worse: the plugin
// copies to stable paths, so the signature is identical on every re-share — a single transient failure would
// then block those photos forever.) The failure itself is surfaced to the user via a toast instead.
const LAST_SIG_KEY = "niimbotator.share.lastSig";

/** Read one shared image (native `file://` path) into a Blob via the Filesystem plugin. */
async function readImageBlob(ref: ImageRef): Promise<Blob> {
  const { data } = await Filesystem.readFile({ path: ref.path });
  const base64 = typeof data === "string" ? data : await blobToBase64(data);
  const res = await fetch(`data:${ref.mime};base64,${base64}`);
  return res.blob();
}

/** Web-only fallback (native readFile returns base64 directly): encode a Blob to a base64 string. */
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Ingest any pending Android share into a new batch and open it. Safe no-op off-device or when this launch
 * isn't a share. Returns the number of images imported (0 = nothing to do).
 */
export async function handleSharedImages(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;

  let intent: SharedIntent;
  try {
    intent = (await SendIntent.checkSendIntentReceived()) as SharedIntent;
  } catch {
    return 0; // the plugin rejects with "No processing needed" when this launch isn't a share
  }

  const refs = collectImageRefs(intent);
  if (refs.length === 0) return 0;

  const signature = refs.map((r) => r.path).join("|");
  if (localStorage.getItem(LAST_SIG_KEY) === signature) return 0; // this exact share was already imported

  try {
    const blobs: Blob[] = [];
    for (const ref of refs) blobs.push(await readImageBlob(ref));

    const { batchId } = await createLabelsFromImages(blobs); // new, auto-named batch — same as the in-app import
    localStorage.setItem(LAST_SIG_KEY, signature); // consumed only on success — see LAST_SIG_KEY note above
    openBatch(batchId);
    return blobs.length;
  } catch (e) {
    Toasts.error(e); // surface the failure (parity with the in-app importer) rather than failing silently
    return 0;
  }
}

/**
 * Bootstrap hook — call once at app startup. Because every share opens a fresh SendIntentActivity (its own
 * app instance), one startup check handles cold-start and warm shares alike. Errors are swallowed (logged)
 * so a bad share never blocks app launch.
 */
export function initShareIntent(): void {
  void handleSharedImages().catch((e) => console.error("[shareIntent] import failed:", e));
}
