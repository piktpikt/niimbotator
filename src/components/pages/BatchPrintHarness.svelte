<script lang="ts">
  // DEV-only proof harness for BatchPrintView (Chantier 3). Reachable at #bpv-harness in dev
  // builds only (tree-shaken from production via import.meta.env.DEV in App.svelte). Lets every
  // print screen be rendered/screenshotted without a printer by feeding a mock PrintProgress.
  import BatchPrintView from "$/components/pages/BatchPrintView.svelte";
  import type { PrintProgress, PrintScreen } from "$/services/batchPrinting";
  import type { PrintOptions } from "$/db/schema";

  let screen = $state<PrintScreen>("confirm");

  const options: PrintOptions = { pauseBetweenLabels: false, pauseBetweenItems: true, numberMosaicTiles: true, interLabelDelayMs: 0 };

  const progress: PrintProgress = {
    phase: "printing",
    unitIndex: 6,
    unitsTotal: 23,
    percent: 30,
    printed: 7,
    pass: 0,
    passesTotal: 1,
    itemIndex: 2,
    itemsTotal: 5,
    itemId: "x",
    itemName: "Photo plage",
    mode: "mosaic",
    gridLabel: "3×3",
    copy: 0,
    copiesTotal: 1,
    tile: 3,
    tilesTotal: 9,
    labelProgress: 60,
  };

  const errored: PrintProgress = { ...progress, phase: "errored", errorKey: "paper_out", printed: 7 };

  const screens: PrintScreen[] = ["confirm", "printing", "paused", "completed", "cancelled", "errored"];
  const noop = () => {};
</script>

<div class="fixed inset-x-0 top-0 z-50 flex flex-wrap gap-1 bg-black/80 p-2">
  {#each screens as s (s)}
    <button
      class="rounded px-2 py-1 text-xs font-semibold {screen === s ? 'bg-primary-500 text-white' : 'bg-surface-700 text-white'}"
      onclick={() => (screen = s)}>{s}</button>
  {/each}
</div>

<div class="pt-10">
  <BatchPrintView
    {screen}
    batchName="Vacances 2026"
    itemsTotal={5}
    labelsTotal={23}
    passages={2}
    {options}
    connected={true}
    progress={screen === "errored" ? errored : progress}
    labelsPrinted={screen === "completed" ? 23 : 7}
    onConfirm={noop}
    onBack={noop}
    onPause={noop}
    onResume={noop}
    onStop={noop}
    onReprintFresh={noop}
    onResumeRun={noop}
    onDone={noop}
    onOptionChange={noop} />
</div>
