<script lang="ts">
  // Container for the batch print flow (Chantier 3). Owns the BatchPrintJob, loads the batch +
  // items, tracks the screen from the job's progress, wires the controls, and drives out-of-app
  // feedback (haptics + a live notification). All printer logic lives in $/services/batchPrinting.
  import { onDestroy } from "svelte";
  import { batchItems, getBatch, resumePoint, DEFAULT_PRINT_OPTIONS } from "$/stores/batchStore";
  import { currentBatchId, currentPage, openBatch } from "$/stores/navigation";
  import { connectionState, heartbeatData } from "$/stores";
  import { BatchPrintJob, countLabels, shouldWarnLowBattery, type PrintProgress, type PrintScreen } from "$/services/batchPrinting";
  import * as feedback from "$/services/printFeedback";
  import type { Batch, PrintOptions } from "$/db/schema";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import BatchPrintView from "$/components/pages/BatchPrintView.svelte";

  let batch = $state<Batch | undefined>(undefined);
  let screen = $state<PrintScreen>("confirm");
  let progress = $state<PrintProgress | undefined>(undefined);
  let options = $state<PrintOptions>({ ...DEFAULT_PRINT_OPTIONS });
  let batteryWarning = $state(false);

  let job: BatchPrintJob | undefined;
  let unsub: (() => void) | undefined;
  let batteryOverride = false;
  let pendingResume = false;
  let notifiedPrinted = -1;

  const items = $derived($currentBatchId ? batchItems($currentBatchId) : undefined);
  const itemsArr = $derived($items ?? []);
  const labelsTotal = $derived(countLabels(itemsArr, batch?.passages ?? 1));
  const connected = $derived($connectionState === "connected");
  const labelsPrinted = $derived(progress?.printed ?? 0);
  const canResume = $derived(!!batch?.printCursor);
  const chargeLevel = $derived($heartbeatData?.chargeLevel);

  const t = (key: string, vars: Record<string, string | number> = {}): string => {
    let s = $tr(key as Parameters<typeof $tr>[0]);
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };

  $effect(() => {
    const id = $currentBatchId;
    if (!id) return;
    getBatch(id).then((b) => {
      batch = b;
      if (b?.printOptions) options = { ...b.printOptions };
    });
  });

  /** Gate the start on a low-battery warning (§12.6), unless already acknowledged. */
  function tryStart(resume: boolean): void {
    if (!batteryOverride && shouldWarnLowBattery(chargeLevel, labelsTotal)) {
      pendingResume = resume;
      batteryWarning = true;
      return;
    }
    run(resume);
  }

  async function run(resume: boolean): Promise<void> {
    if (!batch || job) return;
    batteryWarning = false;
    notifiedPrinted = -1;
    await feedback.ensureNotificationPermission();

    const cursor = resume ? await resumePoint(batch.id) : undefined;
    const j = new BatchPrintJob({ batch, items: itemsArr, options, resumeFrom: cursor });
    job = j;
    feedback.hapticStart();

    unsub?.();
    unsub = j.progress.subscribe((p) => {
      progress = p;
      screen = p.phase;
      // Refresh the ongoing notification once per finished label (not per sub-label tick).
      if (p.phase === "printing" && p.printed !== notifiedPrinted) {
        notifiedPrinted = p.printed;
        feedback.notifyPrinting(t("print.notif.title"), t("print.errored.progress", { done: p.printed, total: p.unitsTotal }));
      }
    });
    screen = "printing";

    const result = await j.start();
    job = undefined;

    if (result.outcome === "completed") {
      feedback.hapticSuccess();
      const msg = t("print.completed.summary", { n: result.labelsPrinted });
      feedback.notifyDone(t("print.completed.title"), msg);
      Toasts.message(msg);
    } else if (result.outcome === "errored") {
      feedback.hapticError();
      feedback.notifyDone(t("print.errored.title"), result.errorKey ? t(`print.error.${result.errorKey}`) : "");
    } else {
      feedback.clearNotification();
    }
  }

  const onConfirm = () => tryStart(canResume);
  const onReprintFresh = () => tryStart(false);
  const onResumeRun = () => tryStart(true);
  const onPause = () => job?.pause();
  const onResume = () => job?.resume();
  const onStop = () => job?.cancel();
  const onBatteryProceed = () => {
    batteryOverride = true;
    batteryWarning = false;
    run(pendingResume);
  };
  const onBatteryCancel = () => (batteryWarning = false);
  const onBack = () => {
    if ($currentBatchId) openBatch($currentBatchId);
    else currentPage.set("batches");
  };
  const onOptionChange = (patch: Partial<PrintOptions>) => {
    options = { ...options, ...patch };
  };

  onDestroy(() => {
    job?.cancel();
    unsub?.();
  });
</script>

{#if batch}
  <BatchPrintView
    {screen}
    batchName={batch.name}
    itemsTotal={itemsArr.length}
    {labelsTotal}
    passages={batch.passages}
    {options}
    {connected}
    resumeMode={canResume}
    {progress}
    {labelsPrinted}
    {batteryWarning}
    {onConfirm}
    {onBack}
    {onPause}
    {onResume}
    {onStop}
    {onReprintFresh}
    {onResumeRun}
    onDone={onBack}
    {onOptionChange}
    {onBatteryProceed}
    {onBatteryCancel} />
{/if}
