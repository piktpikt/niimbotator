import { beforeEach, describe, expect, it } from "vitest";
import { db } from "$/db/schema";
import {
  addBatchItem,
  clearPrintCursor,
  createBatch,
  finishPrintRun,
  getBatch,
  getItem,
  getPrintHistory,
  markItemPrinted,
  resumePoint,
  setPrintCursor,
  startPrintRun,
} from "$/stores/batchStore";
import { DEFAULT_PRINT_OPTIONS } from "$/stores/batchStore";
import type { PrintCursor } from "$/db/schema";

beforeEach(async () => {
  await db.batches.clear();
  await db.items.clear();
  await db.printHistory.clear();
});

function cursor(itemId: string, over: Partial<PrintCursor> = {}): PrintCursor {
  return { pass: 0, itemIndex: 0, itemId, copy: 0, tile: 0, updatedAt: 1000, ...over };
}

describe("startPrintRun", () => {
  it("marks the batch printing and records options; fresh run clears any stale cursor", async () => {
    const id = await createBatch("B");
    await setPrintCursor(id, cursor("stale"));
    await startPrintRun(id, DEFAULT_PRINT_OPTIONS);
    const b = await getBatch(id);
    expect(b?.status).toBe("printing");
    expect(b?.printOptions).toEqual(DEFAULT_PRINT_OPTIONS);
    expect(b?.printStartedAt).toBeTypeOf("number");
    expect(b?.printCursor).toBeUndefined();
  });

  it("resume=true keeps the existing cursor", async () => {
    const id = await createBatch("B");
    await setPrintCursor(id, cursor("keep", { copy: 2 }));
    await startPrintRun(id, DEFAULT_PRINT_OPTIONS, undefined, true);
    expect((await getBatch(id))?.printCursor?.itemId).toBe("keep");
  });
});

describe("setPrintCursor", () => {
  it("persists the cursor + lastPrintedAt WITHOUT bumping modifiedAt (list must not reorder mid-print)", async () => {
    const id = await createBatch("B");
    const itemId = await addBatchItem(id);
    const before = await getBatch(id);
    const modifiedAt = before!.modifiedAt;

    await setPrintCursor(id, cursor(itemId, { copy: 1, tile: 2, updatedAt: 4242 }));

    const after = await getBatch(id);
    expect(after?.printCursor).toMatchObject({ itemId, copy: 1, tile: 2 });
    expect(after?.lastPrintedAt).toBe(4242);
    expect(after?.modifiedAt).toBe(modifiedAt);
  });
});

describe("resumePoint / clearPrintCursor", () => {
  it("reads back the persisted cursor and clears it", async () => {
    const id = await createBatch("B");
    await setPrintCursor(id, cursor("x", { itemIndex: 3 }));
    expect((await resumePoint(id))?.itemIndex).toBe(3);
    await clearPrintCursor(id);
    expect(await resumePoint(id)).toBeUndefined();
  });
});

describe("finishPrintRun", () => {
  it("completed: clears cursor, marks batch+items printed, writes a history entry", async () => {
    const id = await createBatch("B");
    const i1 = await addBatchItem(id);
    const i2 = await addBatchItem(id);
    await startPrintRun(id, DEFAULT_PRINT_OPTIONS);
    await setPrintCursor(id, cursor(i2));

    await finishPrintRun(id, { outcome: "completed", startedAt: 500, labelsPrinted: 5, labelsTotal: 5 });

    const b = await getBatch(id);
    expect(b?.status).toBe("printed");
    expect(b?.printCursor).toBeUndefined();
    expect((await getItem(i1))?.status).toBe("printed");
    expect((await getItem(i2))?.status).toBe("printed");

    const history = await getPrintHistory(id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ outcome: "completed", labelsPrinted: 5, labelsTotal: 5, batchName: "B" });
  });

  it("errored: keeps cursor for resume, reverts to draft, records the error key", async () => {
    const id = await createBatch("B");
    const i1 = await addBatchItem(id);
    await startPrintRun(id, DEFAULT_PRINT_OPTIONS);
    await setPrintCursor(id, cursor(i1, { copy: 3 }));

    await finishPrintRun(id, { outcome: "errored", startedAt: 500, labelsPrinted: 2, labelsTotal: 9, errorKey: "paper_out" });

    const b = await getBatch(id);
    expect(b?.status).toBe("draft");
    expect(b?.printCursor?.copy).toBe(3); // kept
    expect((await getItem(i1))?.status).not.toBe("printed");
    expect((await getPrintHistory(id))[0]).toMatchObject({ outcome: "errored", errorKey: "paper_out" });
  });

  it("history is returned most-recent first", async () => {
    const id = await createBatch("B");
    await finishPrintRun(id, { outcome: "completed", startedAt: 1, labelsPrinted: 1, labelsTotal: 1 });
    await finishPrintRun(id, { outcome: "cancelled", startedAt: 2, labelsPrinted: 0, labelsTotal: 1 });
    const history = await getPrintHistory(id);
    expect(history).toHaveLength(2);
    expect(history[0].finishedAt).toBeGreaterThanOrEqual(history[1].finishedAt);
  });
});

describe("markItemPrinted", () => {
  it("sets a single item's status to printed", async () => {
    const id = await createBatch("B");
    const itemId = await addBatchItem(id);
    await markItemPrinted(itemId);
    expect((await getItem(itemId))?.status).toBe("printed");
  });
});
