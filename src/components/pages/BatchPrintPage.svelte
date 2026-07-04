<script lang="ts">
  // Container for the batch print flow (Chantier 3). Owns the BatchPrintJob, loads the batch +
  // items, tracks the screen from the job's progress, and wires the controls. All printer logic
  // lives in $/services/batchPrinting; this component only orchestrates UI state.
  import { onDestroy } from "svelte";
  import { batchItems, getBatch, resumePoint, DEFAULT_PRINT_OPTIONS } from "$/stores/batchStore";
  import { currentBatchId, currentPage, openBatch } from "$/stores/navigation";
  import { connectionState } from "$/stores";
  import { BatchPrintJob, countLabels, type PrintProgress, type PrintScreen } from "$/services/batchPrinting";
  import type { Batch, PrintOptions } from "$/db/schema";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import BatchPrintView from "$/components/pages/BatchPrintView.svelte";

  let batch = $state<Batch | undefined>(undefined);
  let screen = $state<PrintScreen>("confirm");
  let progress = $state<PrintProgress | undefined>(undefined);
  let options = $state<PrintOptions>({ ...DEFAULT_PRINT_OPTIONS });

  let job: BatchPrintJob | undefined;
  let unsub: (() => void) | undefined;

  const items = $derived($currentBatchId ? batchItems($currentBatchId) : undefined);
  const itemsArr = $derived($items ?? []);
  const labelsTotal = $derived(countLabels(itemsArr, batch?.passages ?? 1));
  const connected = $derived($connectionState === "connected");
  const labelsPrinted = $derived(progress?.printed ?? 0);
  // An interrupted run left a cursor: the confirm action resumes instead of reprinting.
  const canResume = $derived(!!batch?.printCursor);

  $effect(() => {
    const id = $currentBatchId;
    if (!id) return;
    getBatch(id).then((b) => {
      batch = b;
      if (b?.printOptions) options = { ...b.printOptions };
    });
  });

  async function run(resume: boolean) {
    if (!batch || job) return;
    const cursor = resume ? await resumePoint(batch.id) : undefined;
    const j = new BatchPrintJob({ batch, items: itemsArr, options, resumeFrom: cursor });
    job = j;
    unsub?.();
    unsub = j.progress.subscribe((p) => {
      progress = p;
      screen = p.phase;
    });
    screen = "printing";
    const result = await j.start();
    job = undefined;
    if (result.outcome === "completed") {
      Toasts.message($tr("print.completed.summary").replace("{n}", String(result.labelsPrinted)));
    }
  }

  const onConfirm = () => run(canResume);
  const onReprintFresh = () => run(false);
  const onResumeRun = () => run(true);
  const onPause = () => job?.pause();
  const onResume = () => job?.resume();
  const onStop = () => job?.cancel();
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
    {onConfirm}
    {onBack}
    {onPause}
    {onResume}
    {onStop}
    {onReprintFresh}
    {onResumeRun}
    onDone={onBack}
    {onOptionChange} />
{/if}
