// Niimbotator — resumable batch printing engine (Chantier 3).
//
// Prints every unit of a batch over Bluetooth: passages → items → copies → mosaic tiles
// (§7.11, §9.6), one niimbluelib PrintTask per label, with a 3-retry backoff, per-label
// progress, pause/resume/cancel, and a Dexie-persisted cursor so an interrupted run can
// resume at the next unit.
//
// Design note: the run is driven through a Svelte store (`progress`) rather than the
// AsyncIterable sketched in the handoff — the store gives live intra-label progress from
// the printprogress event for free and binds directly in the print screen, whereas an
// AsyncIterable would need an event→queue bridge to stream sub-label updates. Same UX,
// less machinery. All printer logic lives here (services/), never in the component.

import { get, writable, type Readable, type Writable } from "svelte/store";
import { ImageEncoder, LabelType, Utils, type EncodedImage, type PrintProgressEvent, type PrintTaskName } from "@mmote/niimbluelib";
import { connectionState, heartbeatData, printerClient, printerMeta } from "$/stores";
import type { Batch, BatchItem, MosaicConfig, PrintCursor, PrintErrorKey, PrintOptions, PrintSettings } from "$/db/schema";
import { finishPrintRun, getImage, markItemPrinted, setPrintCursor, startPrintRun } from "$/stores/batchStore";
import { compositeLabel, encodeLabel } from "$/utils/labelRender";
import { splitImageIntoTiles } from "$/services/mosaicSplit";
import { classifyPrintError, isRetryable, type PrintErrorContext } from "$/services/printErrorMap";
import type { PostProcessType } from "$/types";

export type PrintPhase = "printing" | "paused" | "completed" | "cancelled" | "errored";

/** Live snapshot of a running batch print, bound by the print screen (WF 10.1). */
export interface PrintProgress {
  phase: PrintPhase;
  /** 0-based index of the current unit among all units. */
  unitIndex: number;
  unitsTotal: number;
  /** Overall completion 0–100 (units finished / total). */
  percent: number;
  pass: number;
  passesTotal: number;
  itemIndex: number;
  itemsTotal: number;
  itemId: string;
  itemName: string;
  mode: BatchItem["mode"];
  /** "cols×rows" for a mosaic item, else undefined. */
  gridLabel?: string;
  copy: number;
  copiesTotal: number;
  tile: number;
  tilesTotal: number;
  /** Current label print/feed progress 0–100 (from niimbluelib). */
  labelProgress: number;
  errorKey?: PrintErrorKey;
  errorDetail?: string;
}

export interface PrintRunResult {
  outcome: "completed" | "cancelled" | "errored";
  labelsPrinted: number;
  labelsTotal: number;
  errorKey?: PrintErrorKey;
  errorDetail?: string;
}

/** Backoff before each retry of a failed print unit (handoff: 3 retries). */
const BACKOFF_MS = [400, 1200, 3000];

interface UnitRef {
  pass: number;
  itemIndex: number;
  itemId: string;
  copy: number;
  tile: number;
}

interface EffectiveSettings {
  printTaskName: PrintTaskName;
  labelType: number;
  density: number;
  speed: 0 | 1;
  postProcess: PostProcessType;
  postProcessInvert: boolean;
  threshold: number;
}

class CancelledError extends Error {}

function tilesForItem(item: BatchItem): number {
  if (item.mode === "mosaic" && item.mosaicConfig) {
    return Math.max(1, Math.round(item.mosaicConfig.rows) * Math.round(item.mosaicConfig.cols));
  }
  return 1;
}

/** Flatten the batch into the ordered list of printable units (passages→items→copies→tiles). */
function buildUnits(items: BatchItem[], passages: number): UnitRef[] {
  const units: UnitRef[] = [];
  for (let pass = 0; pass < passages; pass++) {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      const tiles = tilesForItem(item);
      const copies = Math.max(1, item.copies);
      for (let copy = 0; copy < copies; copy++) {
        for (let tile = 0; tile < tiles; tile++) {
          units.push({ pass, itemIndex, itemId: item.id, copy, tile });
        }
      }
    }
  }
  return units;
}

/** Index of the unit to resume at (one past the last printed). Resolves by itemId, then position. */
function resumeIndex(units: UnitRef[], cursor: PrintCursor): number {
  let match = units.findIndex(
    (u) => u.pass === cursor.pass && u.itemId === cursor.itemId && u.copy === cursor.copy && u.tile === cursor.tile,
  );
  if (match < 0) {
    match = units.findIndex(
      (u) =>
        u.pass === cursor.pass && u.itemIndex === cursor.itemIndex && u.copy === cursor.copy && u.tile === cursor.tile,
    );
  }
  return match < 0 ? 0 : match + 1;
}

function resolveSettings(item: BatchItem, batch: Batch): EffectiveSettings {
  const g: PrintSettings = batch.globalPrintSettings ?? {};
  const p: PrintSettings = item.printSettings ?? {};
  const client = get(printerClient);
  const meta = get(printerMeta);
  return {
    printTaskName: (p.printTaskName ?? g.printTaskName ?? client?.getPrintTaskType() ?? "B1") as PrintTaskName,
    labelType: p.labelType ?? g.labelType ?? LabelType.WithGaps,
    density: p.density ?? g.density ?? meta?.densityDefault ?? 3,
    speed: p.speed ?? g.speed ?? 1,
    postProcess: p.postProcess ?? g.postProcess ?? "threshold",
    postProcessInvert: p.postProcessInvert ?? g.postProcessInvert ?? false,
    threshold: p.threshold ?? g.threshold ?? 140,
  };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("cannot load mosaic source image"));
    };
    img.src = url;
  });
}

/**
 * Encode one printable unit to the printer bitmap. Single items render from the Fabric
 * canvasState via labelRender; mosaic items split the source image on demand (cached per
 * item across copies) then post-process + encode the current tile.
 */
async function encodeUnit(
  item: BatchItem,
  tile: number,
  settings: EffectiveSettings,
  options: PrintOptions,
  tileCache: Map<string, HTMLCanvasElement[]>,
): Promise<EncodedImage> {
  if (item.mode === "mosaic" && item.mosaicConfig && item.sourceImageId) {
    const tiles = await getMosaicTiles(item, options, tileCache);
    const tileCanvas = tiles[tile];
    if (!tileCanvas) throw new Error(`mosaic tile ${tile} out of range`);
    const ctx = tileCanvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context for mosaic tile");
    const source = ctx.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
    const bitmap = compositeLabel(source, {
      postProcess: settings.postProcess,
      postProcessInvert: settings.postProcessInvert,
      threshold: settings.threshold,
    });
    return ImageEncoder.encodeCanvas(bitmap, item.labelProps.printDirection);
  }

  return encodeLabel(item.labelProps, item.canvasState, {
    postProcess: settings.postProcess,
    postProcessInvert: settings.postProcessInvert,
    threshold: settings.threshold,
  });
}

async function getMosaicTiles(
  item: BatchItem,
  options: PrintOptions,
  cache: Map<string, HTMLCanvasElement[]>,
): Promise<HTMLCanvasElement[]> {
  const cached = cache.get(item.id);
  if (cached) return cached;
  if (!item.mosaicConfig || !item.sourceImageId) throw new Error("mosaic item missing config or source image");

  const stored = await getImage(item.sourceImageId);
  if (!stored) throw new Error("mosaic source image not found");

  const img = await loadImage(stored.blob);
  const cols = Math.round(item.mosaicConfig.cols);
  const rows = Math.round(item.mosaicConfig.rows);
  const outputResolution = {
    width: Math.round(item.labelProps.size.width) * cols,
    height: Math.round(item.labelProps.size.height) * rows,
  };
  const config: MosaicConfig = {
    ...item.mosaicConfig,
    numbering: options.numberMosaicTiles || item.mosaicConfig.numbering,
  };
  const tiles = await splitImageIntoTiles(img, config, outputResolution);
  cache.set(item.id, tiles);
  return tiles;
}

/**
 * A single resumable batch-print run. Construct with the batch + ordered items, then
 * `start()`; the caller binds `progress` and wires the pause/resume/cancel controls.
 */
export class BatchPrintJob {
  readonly #batch: Batch;
  readonly #items: BatchItem[];
  readonly #options: PrintOptions;
  readonly #units: UnitRef[];
  readonly #startIndex: number;
  readonly #startedAt = Date.now();
  readonly #tileCache = new Map<string, HTMLCanvasElement[]>();
  readonly #lastUnitByItem = new Map<string, number>();
  readonly #progress: Writable<PrintProgress>;

  #currentIndex: number;
  #labelProgress = 0;
  #printedCount = 0;
  #paused = false;
  #cancelled = false;
  #started = false;
  #wake?: () => void;

  constructor(input: { batch: Batch; items: BatchItem[]; options: PrintOptions; resumeFrom?: PrintCursor }) {
    this.#batch = input.batch;
    this.#items = input.items;
    this.#options = input.options;
    this.#units = buildUnits(input.items, Math.max(1, Math.round(input.batch.passages)));
    this.#units.forEach((u, i) => this.#lastUnitByItem.set(u.itemId, i));
    this.#startIndex = input.resumeFrom ? resumeIndex(this.#units, input.resumeFrom) : 0;
    this.#currentIndex = Math.min(this.#startIndex, Math.max(0, this.#units.length - 1));
    this.#progress = writable(this.#snapshot("printing"));
  }

  get progress(): Readable<PrintProgress> {
    return this.#progress;
  }

  pause(): void {
    if (this.#cancelled) return;
    this.#paused = true;
    this.#emit("paused");
  }

  resume(): void {
    this.#paused = false;
    this.#wake?.();
    this.#wake = undefined;
  }

  cancel(): void {
    this.#cancelled = true;
    this.#paused = false;
    this.#wake?.();
    this.#wake = undefined;
  }

  async start(): Promise<PrintRunResult> {
    if (this.#started) throw new Error("BatchPrintJob already started");
    this.#started = true;

    if (this.#units.length === 0) return this.#finish("completed");

    const client = get(printerClient);
    if (!client || get(connectionState) !== "connected") {
      return this.#fail("disconnected", "printer not connected");
    }

    // Outer guard: any unexpected throw (startPrintRun / cursor / item-status writes failing on
    // a broken IndexedDB) must still land in a terminal phase, never leave the UI stuck "printing".
    try {
      await startPrintRun(this.#batch.id, this.#options, this.#batch.globalPrintSettings, this.#startIndex > 0);

      for (let i = this.#startIndex; i < this.#units.length; i++) {
        if (this.#cancelled) return this.#finish("cancelled");
        await this.#waitWhilePaused();
        if (this.#cancelled) return this.#finish("cancelled");

        const unit = this.#units[i];
        const item = this.#items[unit.itemIndex];
        this.#currentIndex = i;
        this.#labelProgress = 0;
        this.#emit("printing");

        const settings = resolveSettings(item, this.#batch);

        let encoded: EncodedImage;
        try {
          encoded = await encodeUnit(item, unit.tile, settings, this.#options, this.#tileCache);
        } catch (e) {
          return this.#fail("encode_failed", String(e));
        }

        try {
          await this.#printWithRetry(encoded, settings);
        } catch (e) {
          if (e instanceof CancelledError) return this.#finish("cancelled");
          return this.#fail(classifyPrintError(e, this.#errorContext()), String(e));
        }

        // Unit printed: advance counters, persist the resume cursor, mark item done if last.
        this.#printedCount++;
        this.#labelProgress = 100;
        const cursor: PrintCursor = {
          pass: unit.pass,
          itemIndex: unit.itemIndex,
          itemId: unit.itemId,
          copy: unit.copy,
          tile: unit.tile,
          updatedAt: Date.now(),
        };
        await setPrintCursor(this.#batch.id, cursor);
        if (this.#lastUnitByItem.get(unit.itemId) === i) await markItemPrinted(unit.itemId);
        this.#emit("printing");

        await this.#interLabel(i);
        if (this.#cancelled) return this.#finish("cancelled");
      }

      return this.#finish("completed");
    } catch (e) {
      if (e instanceof CancelledError) return this.#finish("cancelled");
      return this.#fail(classifyPrintError(e, this.#errorContext()), String(e));
    }
  }

  /** Print one already-encoded unit, retrying transient device errors with backoff. */
  async #printWithRetry(encoded: EncodedImage, settings: EffectiveSettings): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      if (this.#cancelled) throw new CancelledError();
      try {
        await this.#printOnce(encoded, settings);
        return;
      } catch (e) {
        if (this.#cancelled || attempt >= BACKOFF_MS.length || !isRetryable(e, this.#errorContext())) throw e;
        // Heartbeat is already restored by #printOnce; wait out the cancel-aware backoff.
        await this.#interruptibleSleep(BACKOFF_MS[attempt]);
      }
    }
  }

  /** One print attempt with heartbeat bracketing: stop before, always restart after. */
  async #printOnce(encoded: EncodedImage, settings: EffectiveSettings): Promise<void> {
    const client = get(printerClient);
    try {
      client.stopHeartbeat();
      const task = client.abstraction.newPrintTask(settings.printTaskName, {
        totalPages: 1,
        density: settings.density,
        speed: settings.speed,
        labelType: settings.labelType,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
      });
      const listener = (e: PrintProgressEvent) => {
        this.#labelProgress = Math.floor((e.pagePrintProgress + e.pageFeedProgress) / 2);
        this.#emit("printing");
      };
      client.on("printprogress", listener);
      try {
        await task.printInit();
        await task.printPage(encoded, 1);
        await task.waitForFinished();
      } finally {
        client.off("printprogress", listener);
        try {
          await task.printEnd();
        } catch {
          /* best-effort teardown */
        }
      }
    } finally {
      client.startHeartbeat();
    }
  }

  /** Honour the between-labels / between-items pause option, or the auto delay. */
  async #interLabel(i: number): Promise<void> {
    if (i >= this.#units.length - 1) return;
    const next = this.#units[i + 1];
    const cur = this.#units[i];
    const itemChanged = next.itemIndex !== cur.itemIndex || next.pass !== cur.pass;

    if (this.#options.pauseBetweenLabels || (this.#options.pauseBetweenItems && itemChanged)) {
      this.#paused = true;
      this.#emit("paused");
      await this.#waitWhilePaused();
    } else if (this.#options.interLabelDelayMs > 0) {
      await this.#interruptibleSleep(this.#options.interLabelDelayMs);
    }
  }

  async #waitWhilePaused(): Promise<void> {
    while (this.#paused && !this.#cancelled) {
      await new Promise<void>((resolve) => {
        this.#wake = resolve;
      });
    }
  }

  /** Sleep that resolves early when pause()/resume()/cancel() fire, so cancel is prompt. */
  async #interruptibleSleep(ms: number): Promise<void> {
    if (ms <= 0 || this.#cancelled) return;
    await Promise.race([
      Utils.sleep(ms),
      new Promise<void>((resolve) => {
        this.#wake = resolve;
      }),
    ]);
    this.#wake = undefined;
  }

  #errorContext(): PrintErrorContext {
    const hb = get(heartbeatData);
    return {
      connected: get(connectionState) === "connected",
      paperInserted: hb?.paperInserted,
      chargeLevel: hb?.chargeLevel,
    };
  }

  async #fail(errorKey: PrintErrorKey, detail: string): Promise<PrintRunResult> {
    // Persist best-effort; the terminal phase must be emitted even if the history write fails.
    try {
      await finishPrintRun(this.#batch.id, {
        outcome: "errored",
        startedAt: this.#startedAt,
        labelsPrinted: this.#printedCount,
        labelsTotal: this.#units.length,
        errorKey,
      });
    } catch (e) {
      console.error("finishPrintRun failed while handling a print error", e);
    }
    this.#emit("errored", { errorKey, errorDetail: detail });
    return { outcome: "errored", labelsPrinted: this.#printedCount, labelsTotal: this.#units.length, errorKey, errorDetail: detail };
  }

  async #finish(outcome: "completed" | "cancelled"): Promise<PrintRunResult> {
    try {
      await finishPrintRun(this.#batch.id, {
        outcome,
        startedAt: this.#startedAt,
        labelsPrinted: this.#printedCount,
        labelsTotal: this.#units.length,
      });
    } catch (e) {
      console.error("finishPrintRun failed while finishing the run", e);
    }
    this.#emit(outcome);
    return { outcome, labelsPrinted: this.#printedCount, labelsTotal: this.#units.length };
  }

  #emit(phase: PrintPhase, extra?: Partial<PrintProgress>): void {
    this.#progress.set({ ...this.#snapshot(phase), ...extra });
  }

  #snapshot(phase: PrintPhase): PrintProgress {
    const total = this.#units.length;
    if (total === 0) {
      return {
        phase,
        unitIndex: 0,
        unitsTotal: 0,
        percent: 100,
        pass: 0,
        passesTotal: Math.max(1, this.#batch.passages),
        itemIndex: 0,
        itemsTotal: this.#items.length,
        itemId: "",
        itemName: "",
        mode: "single",
        copy: 0,
        copiesTotal: 1,
        tile: 0,
        tilesTotal: 1,
        labelProgress: this.#labelProgress,
      };
    }
    const idx = Math.min(Math.max(this.#currentIndex, 0), total - 1);
    const unit = this.#units[idx];
    const item = this.#items[unit.itemIndex];
    const grid =
      item.mode === "mosaic" && item.mosaicConfig
        ? `${Math.round(item.mosaicConfig.cols)}×${Math.round(item.mosaicConfig.rows)}`
        : undefined;
    return {
      phase,
      unitIndex: idx,
      unitsTotal: total,
      percent: Math.floor((this.#printedCount / total) * 100),
      pass: unit.pass,
      passesTotal: Math.max(1, this.#batch.passages),
      itemIndex: unit.itemIndex,
      itemsTotal: this.#items.length,
      itemId: item.id,
      itemName: item.name,
      mode: item.mode,
      gridLabel: grid,
      copy: unit.copy,
      copiesTotal: Math.max(1, item.copies),
      tile: unit.tile,
      tilesTotal: tilesForItem(item),
      labelProgress: this.#labelProgress,
    };
  }
}

/** Total number of physical labels a run will print (for the confirmation screen). */
export function countLabels(items: BatchItem[], passages: number): number {
  const perPass = items.reduce((sum, it) => sum + Math.max(1, it.copies) * tilesForItem(it), 0);
  return perPass * Math.max(1, Math.round(passages));
}
