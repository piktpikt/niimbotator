// PIKT: promise-based M3 confirm/prompt (deep restyle). Native confirm()/prompt() FREEZE the
// Capacitor WebView, so route them through an M3 ui/Dialog rendered by ConfirmHost (mounted once at
// app root). Call sites become `if (await confirmM3(msg)) {…}` / `await promptM3(msg, def)`.
import { writable } from "svelte/store";

interface BaseRequest {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Render the confirm action in the error colour (destructive). */
  danger?: boolean;
}
export interface ConfirmRequest extends BaseRequest {
  kind: "confirm";
  resolve: (ok: boolean) => void;
}
export interface PromptRequest extends BaseRequest {
  kind: "prompt";
  value: string;
  resolve: (value: string | null) => void;
}
export type DialogRequest = ConfirmRequest | PromptRequest;

/** The active request, or null. ConfirmHost renders it; the helpers below set it. */
export const dialogRequest = writable<DialogRequest | null>(null);

type ConfirmOpts = Omit<BaseRequest, "message">;

/** M3 replacement for window.confirm — resolves true on confirm, false on cancel/dismiss. */
export function confirmM3(message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  return new Promise((resolve) => {
    dialogRequest.set({ kind: "confirm", message, ...opts, resolve });
  });
}

/** M3 replacement for window.prompt — resolves the text on confirm, null on cancel/dismiss. */
export function promptM3(message: string, value = "", opts: ConfirmOpts = {}): Promise<string | null> {
  return new Promise((resolve) => {
    dialogRequest.set({ kind: "prompt", message, value, ...opts, resolve });
  });
}
