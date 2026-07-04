import { beforeEach, describe, expect, it, vi } from "vitest";

// The engine talks to browser-heavy modules (real stores, Fabric render, Dexie). We mock
// them so the test proves the ORCHESTRATION — call order, heartbeat pairing, retry/backoff,
// resume, pause/cancel, cursor persistence — against a fake printer, in a DOM-free Node env.
vi.mock("$/stores", async () => {
  const { writable } = await import("svelte/store");
  return {
    printerClient: writable(undefined),
    connectionState: writable("connected"),
    heartbeatData: writable({ paperInserted: true, chargeLevel: 4 }),
    printerMeta: writable({ densityDefault: 3 }),
  };
});
vi.mock("$/stores/batchStore", () => ({
  startPrintRun: vi.fn(async () => {}),
  setPrintCursor: vi.fn(async () => {}),
  finishPrintRun: vi.fn(async () => {}),
  markItemPrinted: vi.fn(async () => {}),
  getImage: vi.fn(async () => undefined),
}));
vi.mock("$/utils/labelRender", () => ({
  encodeLabel: vi.fn(async () => ({ cols: 1, rows: 1, rowsData: [] })),
  compositeLabel: vi.fn(() => ({})),
}));
vi.mock("$/services/mosaicSplit", () => ({ splitImageIntoTiles: vi.fn(async () => []) }));
// Full-mock niimbluelib: deterministic, and Utils.sleep is a no-op so backoff is instant.
vi.mock("@mmote/niimbluelib", () => {
  class PrintError extends Error {
    reasonId: number;
    constructor(message: string, reasonId: number) {
      super(message);
      this.reasonId = reasonId;
    }
  }
  const PrinterErrorCode = { CoverOpen: 1, LackPaper: 2, LowBattery: 3, UserCancel: 5, Overheat: 7, PaperOutException: 8 };
  return {
    ImageEncoder: { encodeCanvas: () => ({ cols: 1, rows: 1, rowsData: [] }) },
    LabelType: { WithGaps: 1 },
    Utils: { sleep: async () => {} },
    PrintError,
    PrinterErrorCode,
  };
});

import { PrintError, PrinterErrorCode } from "@mmote/niimbluelib";
import { connectionState, printerClient } from "$/stores";
import { finishPrintRun, markItemPrinted, setPrintCursor, startPrintRun } from "$/stores/batchStore";
import { BatchPrintJob, countLabels, type PrintProgress } from "$/services/batchPrinting";
import type { Batch, BatchItem, PrintCursor } from "$/db/schema";

// --- Fake printer that records the exact call sequence ---
class FakePrinter {
  log: string[] = [];
  #listeners = new Set<(e: unknown) => void>();
  #attempt = 0;
  failFirst = 0; // number of print attempts to fail (with a transient error) before succeeding
  failWith?: Error; // if set, waitForFinished always throws this (e.g. a structured PrintError)
  onWait?: () => void; // side effect during waitForFinished (e.g. simulate disconnect)

  getPrintTaskType() {
    return "B1";
  }
  stopHeartbeat() {
    this.log.push("stopHeartbeat");
  }
  startHeartbeat() {
    this.log.push("startHeartbeat");
  }
  on(ev: string, cb: (e: unknown) => void) {
    if (ev === "printprogress") this.#listeners.add(cb);
  }
  off(ev: string, cb: (e: unknown) => void) {
    if (ev === "printprogress") this.#listeners.delete(cb);
  }
  get abstraction() {
    return {
      newPrintTask: (name: string) => {
        this.log.push(`newPrintTask:${name}`);
        return {
          printInit: async () => {
            this.log.push("printInit");
          },
          printPage: async (_encoded: unknown, qty: number) => {
            this.log.push(`printPage:${qty}`);
          },
          waitForFinished: async () => {
            this.#attempt++;
            this.#listeners.forEach((cb) => cb({ page: 0, pagesTotal: 1, pagePrintProgress: 100, pageFeedProgress: 100 }));
            this.onWait?.();
            if (this.failWith) {
              this.log.push("waitForFinished:FAIL");
              throw this.failWith;
            }
            if (this.#attempt <= this.failFirst) {
              this.log.push("waitForFinished:FAIL");
              throw new Error("transient device glitch");
            }
            this.log.push("waitForFinished:OK");
          },
          printEnd: async () => {
            this.log.push("printEnd");
            return true;
          },
        };
      },
    };
  }
}

function makeItem(id: string, over: Partial<BatchItem> = {}): BatchItem {
  return {
    id,
    batchId: "b",
    name: id,
    position: 0,
    labelProps: { size: { width: 100, height: 50 }, printDirection: "top" } as BatchItem["labelProps"],
    canvasState: {} as BatchItem["canvasState"],
    mode: "single",
    copies: 1,
    status: "ready",
    createdAt: 0,
    modifiedAt: 0,
    ...over,
  };
}
function makeBatch(over: Partial<Batch> = {}): Batch {
  return { id: "b", name: "Batch", createdAt: 0, modifiedAt: 0, passages: 1, status: "draft", itemsOrder: [], ...over };
}
const OPTS = { pauseBetweenLabels: false, pauseBetweenItems: false, numberMosaicTiles: false, interLabelDelayMs: 0 };

function cursorsFrom(): PrintCursor[] {
  return vi.mocked(setPrintCursor).mock.calls.map((c) => c[1]);
}
function waitForPhase(job: BatchPrintJob, phase: PrintProgress["phase"]): Promise<void> {
  return new Promise((resolve) => {
    const unsub = job.progress.subscribe((p) => {
      if (p.phase === phase) setTimeout(() => (unsub(), resolve()), 0);
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  connectionState.set("connected");
});

describe("BatchPrintJob — happy path", () => {
  it("prints every unit once, in order, with heartbeat bracketing and quantity 1 per label", async () => {
    const printer = new FakePrinter();
    printerClient.set(printer as never);
    const items = [makeItem("i0", { copies: 2 }), makeItem("i1", { copies: 1 })];
    const job = new BatchPrintJob({ batch: makeBatch(), items, options: OPTS });

    const res = await job.start();

    expect(res).toMatchObject({ outcome: "completed", labelsPrinted: 3, labelsTotal: 3 });
    // Per-unit sequence repeated 3× (2 copies of i0 + 1 of i1), one PrintTask per label.
    expect(printer.log).toEqual([
      ...["stopHeartbeat", "newPrintTask:B1", "printInit", "printPage:1", "waitForFinished:OK", "printEnd", "startHeartbeat"],
      ...["stopHeartbeat", "newPrintTask:B1", "printInit", "printPage:1", "waitForFinished:OK", "printEnd", "startHeartbeat"],
      ...["stopHeartbeat", "newPrintTask:B1", "printInit", "printPage:1", "waitForFinished:OK", "printEnd", "startHeartbeat"],
    ]);
    expect(startPrintRun).toHaveBeenCalledOnce();
    expect(finishPrintRun).toHaveBeenCalledWith("b", expect.objectContaining({ outcome: "completed", labelsPrinted: 3 }));
    // item is marked printed only on its final unit
    expect(markItemPrinted).toHaveBeenCalledWith("i0");
    expect(markItemPrinted).toHaveBeenCalledWith("i1");
  });

  it("persists a cursor after each unit in passages→items→copies order (last-done)", async () => {
    printerClient.set(new FakePrinter() as never);
    const items = [makeItem("i0", { copies: 2 }), makeItem("i1", { copies: 1 })];
    await new BatchPrintJob({ batch: makeBatch({ passages: 2 }), items, options: OPTS }).start();

    const seq = cursorsFrom().map((c) => `${c.pass}/${c.itemId}/${c.copy}`);
    expect(seq).toEqual([
      "0/i0/0", "0/i0/1", "0/i1/0", // pass 0: i0×2 then i1
      "1/i0/0", "1/i0/1", "1/i1/0", // pass 1
    ]);
  });
});

describe("BatchPrintJob — retry / backoff", () => {
  it("retries a transient device error then succeeds, persisting the cursor only once", async () => {
    const printer = new FakePrinter();
    printer.failFirst = 2; // fail twice, succeed on the 3rd attempt
    printerClient.set(printer as never);
    const job = new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS });

    const res = await job.start();

    expect(res.outcome).toBe("completed");
    expect(printer.log.filter((l) => l === "waitForFinished:FAIL")).toHaveLength(2);
    expect(printer.log.filter((l) => l === "waitForFinished:OK")).toHaveLength(1);
    // heartbeat restored on every attempt (3 print attempts → 3 stop/start pairs)
    expect(printer.log.filter((l) => l === "stopHeartbeat")).toHaveLength(3);
    expect(printer.log.filter((l) => l === "startHeartbeat")).toHaveLength(3);
    expect(setPrintCursor).toHaveBeenCalledTimes(1); // only after the successful print
  });

  it("gives up after 3 retries and reports errored, keeping the cursor for resume", async () => {
    const printer = new FakePrinter();
    printer.failFirst = 99; // never succeeds
    printerClient.set(printer as never);
    const job = new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS });

    const res = await job.start();

    expect(res.outcome).toBe("errored");
    expect(res.errorKey).toBe("device_error");
    expect(printer.log.filter((l) => l === "waitForFinished:FAIL")).toHaveLength(4); // initial + 3 retries
    expect(finishPrintRun).toHaveBeenCalledWith("b", expect.objectContaining({ outcome: "errored", errorKey: "device_error" }));
    expect(setPrintCursor).not.toHaveBeenCalled();
  });
});

describe("BatchPrintJob — fatal errors fail fast", () => {
  it("classifies a mid-run disconnect and stops immediately without retrying", async () => {
    const printer = new FakePrinter();
    printer.failFirst = 99;
    printer.onWait = () => connectionState.set("disconnected"); // link drops during the print
    printerClient.set(printer as never);
    const job = new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS });

    const res = await job.start();

    expect(res.outcome).toBe("errored");
    expect(res.errorKey).toBe("disconnected");
    expect(printer.log.filter((l) => l === "waitForFinished:FAIL")).toHaveLength(1); // no retry
    expect(printer.log.filter((l) => l === "startHeartbeat")).toHaveLength(1); // heartbeat still restored
  });

  it("refuses to start when the printer is not connected", async () => {
    printerClient.set(new FakePrinter() as never);
    connectionState.set("disconnected");
    const res = await new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS }).start();
    expect(res).toMatchObject({ outcome: "errored", errorKey: "disconnected", labelsPrinted: 0 });
    expect(startPrintRun).not.toHaveBeenCalled();
  });
});

describe("BatchPrintJob — pause / cancel", () => {
  it("pauses between labels and can be cancelled while paused, keeping the cursor", async () => {
    printerClient.set(new FakePrinter() as never);
    const items = [makeItem("i0"), makeItem("i1")];
    const job = new BatchPrintJob({ batch: makeBatch(), items, options: { ...OPTS, pauseBetweenLabels: true } });

    const done = job.start();
    await waitForPhase(job, "paused"); // paused after the first label
    job.cancel();
    const res = await done;

    expect(res).toMatchObject({ outcome: "cancelled", labelsPrinted: 1 });
    expect(setPrintCursor).toHaveBeenCalledTimes(1); // only the first unit printed
    expect(finishPrintRun).toHaveBeenCalledWith("b", expect.objectContaining({ outcome: "cancelled" }));
  });

  it("cancel before start prints nothing", async () => {
    printerClient.set(new FakePrinter() as never);
    const job = new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS });
    job.cancel();
    const res = await job.start();
    expect(res).toMatchObject({ outcome: "cancelled", labelsPrinted: 0 });
  });
});

describe("BatchPrintJob — resume", () => {
  it("resumes at the unit after the persisted cursor", async () => {
    const printer = new FakePrinter();
    printerClient.set(printer as never);
    const items = [makeItem("i0", { copies: 2 }), makeItem("i1", { copies: 1 })]; // units: i0/0, i0/1, i1/0
    const resumeFrom: PrintCursor = { pass: 0, itemIndex: 0, itemId: "i0", copy: 1, tile: 0, updatedAt: 1 };
    const job = new BatchPrintJob({ batch: makeBatch(), items, options: OPTS, resumeFrom });

    const res = await job.start();

    // Only the last unit (i1/0) remained; one label printed.
    expect(res.labelsPrinted).toBe(1);
    expect(printer.log.filter((l) => l === "waitForFinished:OK")).toHaveLength(1);
    expect(cursorsFrom().map((c) => `${c.itemId}/${c.copy}`)).toEqual(["i1/0"]);
    expect(startPrintRun).toHaveBeenCalledWith("b", OPTS, undefined, true); // resume=true
  });
});

describe("BatchPrintJob — structured printer errors fail fast", () => {
  it("does not retry a structured PrintError, and maps its reason to a key", async () => {
    const printer = new FakePrinter();
    printer.failWith = new PrintError("Print error 1: CoverOpen", PrinterErrorCode.CoverOpen);
    printerClient.set(printer as never);
    const res = await new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS }).start();
    expect(res).toMatchObject({ outcome: "errored", errorKey: "device_error" });
    expect(printer.log.filter((l) => l === "waitForFinished:FAIL")).toHaveLength(1); // fail fast, no retry
  });

  it("maps a low-battery PrintError to low_battery", async () => {
    const printer = new FakePrinter();
    printer.failWith = new PrintError("Print error 3: LowBattery", PrinterErrorCode.LowBattery);
    printerClient.set(printer as never);
    const res = await new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS }).start();
    expect(res.errorKey).toBe("low_battery");
    expect(printer.log.filter((l) => l === "waitForFinished:FAIL")).toHaveLength(1);
  });
});

describe("BatchPrintJob — never leaves the UI stuck", () => {
  it("reaches a terminal errored phase even if a store write throws mid-run", async () => {
    printerClient.set(new FakePrinter() as never);
    vi.mocked(setPrintCursor).mockRejectedValueOnce(new Error("indexeddb blocked"));
    const job = new BatchPrintJob({ batch: makeBatch(), items: [makeItem("i0")], options: OPTS });

    let lastPhase = "";
    const unsub = job.progress.subscribe((p) => (lastPhase = p.phase));
    const res = await job.start();
    unsub();

    expect(res.outcome).toBe("errored"); // not a hang / unhandled rejection
    expect(lastPhase).toBe("errored");
    expect(finishPrintRun).toHaveBeenCalledWith("b", expect.objectContaining({ outcome: "errored" }));
  });
});

describe("countLabels", () => {
  it("counts copies × tiles × passages", () => {
    const items = [
      makeItem("a", { copies: 3 }),
      makeItem("b", { copies: 1, mode: "mosaic", mosaicConfig: { rows: 3, cols: 3, cropRect: { x: 0, y: 0, width: 0, height: 0 }, numbering: false, marginMm: 0 } }),
    ];
    expect(countLabels(items, 1)).toBe(3 + 9); // 3 copies of a + 9 tiles of b
    expect(countLabels(items, 2)).toBe((3 + 9) * 2);
  });
});
