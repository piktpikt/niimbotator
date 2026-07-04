// Niimbotator — classify a print failure into a stable PrintErrorKey + decide retryability.
//
// niimbluelib rejects a print with a structured `PrintError` carrying a `reasonId`
// (PrinterErrorCode) — the authoritative signal. We classify off that first; a bare
// Error (BLE timeout / dropped packet) is treated as a transient device fault. Heartbeat
// fields are only a weak fallback because the heartbeat is stopped during a print, so
// they are frozen at their pre-print values.

import { PrintError, PrinterErrorCode } from "@mmote/niimbluelib";
import type { PrintErrorKey } from "$/db/schema";

export interface PrintErrorContext {
  /** connectionState === "connected" at the moment of failure (not heartbeat-derived, reliable). */
  connected: boolean;
  /** HeartbeatData.paperInserted — stale during a print; weak fallback only. */
  paperInserted?: boolean;
  /** HeartbeatData.chargeLevel (0 = empty) — stale during a print; weak fallback only. */
  chargeLevel?: number;
  /** The failure happened while rasterizing/encoding, not while printing. */
  duringEncode?: boolean;
}

/**
 * Retry only transient faults: a rejection that is NOT a structured PrintError, while still
 * connected (e.g. a status-poll timeout or a dropped BLE packet). A PrintError means the
 * printer reported a definite condition (cover open, no paper, flat battery, overheat…) that
 * retrying cannot clear, so it fails fast. Encode failures are deterministic — never retried.
 */
export function isRetryable(error: unknown, ctx: PrintErrorContext): boolean {
  if (ctx.duringEncode) return false;
  if (!ctx.connected) return false;
  if (error instanceof PrintError) return false;
  return true;
}

export function classifyPrintError(error: unknown, ctx: PrintErrorContext): PrintErrorKey {
  if (ctx.duringEncode) return "encode_failed";

  if (error instanceof PrintError) {
    switch (error.reasonId) {
      case PrinterErrorCode.UserCancel:
        return "cancelled";
      case PrinterErrorCode.LowBattery:
      case PrinterErrorCode.BatteryException:
        return "low_battery";
      case PrinterErrorCode.LackPaper:
      case PrinterErrorCode.PaperOutException:
      case PrinterErrorCode.WrongPaper:
      case PrinterErrorCode.SetPaperFail:
        return "paper_out";
      default:
        // CoverOpen, Overheat, NoRibbon, PrinterBusy, head faults, … — a real device fault.
        return "device_error";
    }
  }

  if (!ctx.connected) return "disconnected";
  if (ctx.paperInserted === false) return "paper_out";
  if (ctx.chargeLevel !== undefined && ctx.chargeLevel <= 0) return "low_battery";

  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  if (message.includes("disconnect") || message.includes("not connected")) return "disconnected";
  if (message.includes("paper")) return "paper_out";
  return "device_error";
}
