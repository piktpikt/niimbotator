import { describe, expect, it, vi } from "vitest";

// Provide a node-safe PrintError/PrinterErrorCode so the classifier runs without the real
// (browser-oriented) niimbluelib. Shapes mirror @mmote/niimbluelib/packets.
vi.mock("@mmote/niimbluelib", () => {
  class PrintError extends Error {
    reasonId: number;
    constructor(message: string, reasonId: number) {
      super(message);
      this.reasonId = reasonId;
    }
  }
  const PrinterErrorCode = {
    CoverOpen: 1,
    LackPaper: 2,
    LowBattery: 3,
    BatteryException: 4,
    UserCancel: 5,
    Overheat: 7,
    PaperOutException: 8,
    WrongPaper: 16,
    SetPaperFail: 17,
  };
  return { PrintError, PrinterErrorCode };
});

import { PrintError, PrinterErrorCode } from "@mmote/niimbluelib";
import { classifyPrintError, isRetryable } from "$/services/printErrorMap";

const healthy = { connected: true, paperInserted: true, chargeLevel: 4 };

describe("classifyPrintError — structured PrintError (authoritative)", () => {
  it("maps reasonId to the right key even while heartbeat state looks healthy", () => {
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.LackPaper), healthy)).toBe("paper_out");
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.PaperOutException), healthy)).toBe("paper_out");
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.LowBattery), healthy)).toBe("low_battery");
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.BatteryException), healthy)).toBe("low_battery");
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.UserCancel), healthy)).toBe("cancelled");
    // CoverOpen / Overheat are real device faults, surfaced as device_error
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.CoverOpen), healthy)).toBe("device_error");
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.Overheat), healthy)).toBe("device_error");
  });

  it("encode failures still take precedence", () => {
    expect(classifyPrintError(new PrintError("x", PrinterErrorCode.LackPaper), { ...healthy, duringEncode: true })).toBe("encode_failed");
  });
});

describe("classifyPrintError — non-PrintError fallback", () => {
  it("reports disconnected when the link is down", () => {
    expect(classifyPrintError(new Error("x"), { connected: false })).toBe("disconnected");
  });
  it("uses weak heartbeat/message fallbacks when there is no structured error", () => {
    expect(classifyPrintError(new Error("x"), { connected: true, paperInserted: false })).toBe("paper_out");
    expect(classifyPrintError(new Error("x"), { connected: true, chargeLevel: 0 })).toBe("low_battery");
    expect(classifyPrintError(new Error("status poll timed out"), healthy)).toBe("device_error");
  });
});

describe("isRetryable", () => {
  it("retries a transient comms fault while connected", () => {
    expect(isRetryable(new Error("timeout"), { connected: true })).toBe(true);
  });
  it("never retries a structured printer fault (fails fast)", () => {
    expect(isRetryable(new PrintError("cover", PrinterErrorCode.CoverOpen), { connected: true })).toBe(false);
    expect(isRetryable(new PrintError("batt", PrinterErrorCode.LowBattery), { connected: true })).toBe(false);
  });
  it("never retries when disconnected or during encode", () => {
    expect(isRetryable(new Error("x"), { connected: false })).toBe(false);
    expect(isRetryable(new Error("x"), { connected: true, duringEncode: true })).toBe(false);
  });
});
