<script lang="ts">
  // PIKT: Batch Manager (Chantier 2) — polished per the design pass.
  // Item card: two-row grid, compact pill copies stepper, segmented mode, disabled/enabled Mosaïque
  // action depending on `sourceImageId`. FAB is "Imprimer le batch"; a docked bar carries "Ajouter".
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Fab from "$/components/navigation/Fab.svelte";
  import TopAppBar from "$/components/navigation/TopAppBar.svelte";
  import {
    batchItems,
    getBatch,
    addBatchItem,
    deleteBatchItem,
    setItemCopies,
    setItemMode,
    setBatchPassages,
    renameBatch,
    deleteBatch,
    updateBatchItem,
    addImage,
  } from "$/stores/batchStore";
  import {
    currentBatchId,
    currentPage,
    openEditor,
    openMosaicConfigurator,
    openBatchPrint,
  } from "$/stores/navigation";
  import type { Batch, BatchItem } from "$/db/schema";
  import { confirmM3 } from "$/utils/confirm";
  import { onMount } from "svelte";

  let batch = $state<Batch | undefined>(undefined);
  let editingName = $state(false);
  let nameInput = $state("");

  const items = $derived($currentBatchId ? batchItems($currentBatchId) : undefined);

  async function refresh() {
    if ($currentBatchId) batch = await getBatch($currentBatchId);
    else batch = undefined;
  }
  onMount(refresh);
  $effect(() => {
    void $currentBatchId; // re-run when the open batch changes
    refresh();
  });

  async function onRename() {
    if (!batch || !nameInput.trim()) {
      editingName = false;
      return;
    }
    await renameBatch(batch.id, nameInput);
    editingName = false;
    await refresh();
  }

  async function onAdd() {
    if (!$currentBatchId) return;
    const id = await addBatchItem($currentBatchId);
    openEditor(id);
  }

  function onEdit(item: BatchItem) {
    openEditor(item.id);
  }

  async function onDelete(item: BatchItem) {
    if (await confirmM3($tr("batches.item.delete.confirm").replace("{name}", item.name), { danger: true })) {
      await deleteBatchItem(item.id);
    }
  }

  async function onCopies(item: BatchItem, delta: number) {
    await setItemCopies(item.id, item.copies + delta);
  }

  async function onModeChange(item: BatchItem, mode: "single" | "mosaic") {
    if (item.mode === mode) return;
    if (mode === "single") {
      await setItemMode(item.id, "single");
    } else {
      await setItemMode(item.id, "mosaic", item.mosaicConfig ?? {
        rows: 2, cols: 2, cropRect: { x: 0, y: 0, width: 0, height: 0 }, numbering: false, marginMm: 0,
      });
    }
  }

  // File picker for the mosaic source image (humane single-flow: pick → configurator).
  let fileInput = $state<HTMLInputElement | null>(null);
  let pickForItemId = $state<string | undefined>(undefined);

  function launchPickerFor(item: BatchItem) {
    pickForItemId = item.id;
    fileInput?.click();
  }
  async function onFilePicked(e: Event) {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = ""; // allow reselecting the same file next time
    if (!file || !pickForItemId) return;
    const imageId = await addImage(file, file.name);
    await updateBatchItem(pickForItemId, { sourceImageId: imageId, mode: "mosaic" });
    const id = pickForItemId;
    pickForItemId = undefined;
    openMosaicConfigurator(id);
  }

  function onMosaicAction(item: BatchItem) {
    if (item.sourceImageId) openMosaicConfigurator(item.id);
    else launchPickerFor(item);
  }

  async function onPassages(delta: number) {
    if (!batch) return;
    await setBatchPassages(batch.id, batch.passages + delta);
    await refresh();
  }

  async function onDeleteBatch() {
    if (!batch) return;
    if (await confirmM3($tr("batches.delete.confirm").replace("{name}", batch.name), { danger: true })) {
      await deleteBatch(batch.id);
      currentPage.set("batches");
    }
  }

  function back() {
    currentPage.set("batches");
  }

  function onPrint() {
    if ($currentBatchId) openBatchPrint($currentBatchId);
  }

  const totalPerPass = $derived(($items ?? []).reduce((sum: number, it: BatchItem) => {
    if (it.status === "skipped") return sum;
    const tiles = it.mode === "mosaic" && it.mosaicConfig ? it.mosaicConfig.rows * it.mosaicConfig.cols : 1;
    return sum + tiles * it.copies;
  }, 0));
  const grandTotal = $derived(totalPerPass * (batch?.passages ?? 1));
  const isEmpty = $derived(($items ?? []).length === 0);
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <TopAppBar title={batch?.name ?? $tr("batches.empty.title")} showPrinter={false} onBack={back}>
    {#snippet actions()}
      <button
        type="button"
        class="grid size-12 place-items-center rounded-full text-surface-700-300 hover:bg-error-500/15 hover:text-error-500"
        aria-label={$tr("editor.delete")}
        onclick={onDeleteBatch}>
        <MdIcon icon="delete" />
      </button>
    {/snippet}
  </TopAppBar>

  <main class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-2xl space-y-4 p-4 pb-52">
      <!-- Resume banner: an interrupted print left a cursor (Chantier 3) -->
      {#if batch?.printCursor}
        <section class="card flex items-center gap-3 border border-warning-500/30 bg-warning-500/10 p-3">
          <MdIcon icon="history" class="text-warning-500" />
          <div class="min-w-0 flex-1 text-sm font-semibold">{$tr("print.resume_banner.title")}</div>
          <button
            type="button"
            class="shrink-0 rounded-full bg-warning-500/20 px-4 py-2 text-sm font-semibold text-warning-500"
            onclick={() => $currentBatchId && openBatchPrint($currentBatchId)}>
            {$tr("print.resume_banner.resume")}
          </button>
        </section>
      {/if}

      <!-- Header: rename + counts + passages -->
      <section class="card space-y-3 bg-surface-100-900 p-4">
        {#if editingName}
          <div class="flex gap-2">
            <input
              class="flex-1 rounded-lg bg-surface-200-800 px-3 py-2"
              bind:value={nameInput}
              onkeydown={(e) => e.key === "Enter" && onRename()} />
            <button class="tool-primary" onclick={onRename}>{$tr("editor.toolbar.save")}</button>
          </div>
        {:else}
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2"
            onclick={() => {
              nameInput = batch?.name ?? "";
              editingName = true;
            }}>
            <span class="truncate text-left text-base font-semibold">{batch?.name ?? ""}</span>
            <MdIcon icon="edit" class="text-surface-500" />
          </button>
        {/if}

        <div class="text-sm text-surface-600-400">
          {($items ?? []).length}
          {$tr("batches.items")} · {totalPerPass} {$tr("batches.impressions_per_pass")}
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">{$tr("batches.passages")}</span>
          <div class="inline-flex h-10 items-center rounded-full bg-surface-200-800">
            <button class="grid size-10 place-items-center rounded-full" onclick={() => onPassages(-1)} aria-label="-">
              <MdIcon icon="remove" />
            </button>
            <span class="w-8 text-center text-sm font-semibold tabular-nums">×{batch?.passages ?? 1}</span>
            <button class="grid size-10 place-items-center rounded-full" onclick={() => onPassages(1)} aria-label="+">
              <MdIcon icon="add" />
            </button>
          </div>
        </div>

        {#if (batch?.passages ?? 1) > 1}
          <div class="text-sm font-medium">
            {$tr("batches.grand_total").replace("{n}", String(grandTotal))}
          </div>
        {/if}
      </section>

      <!-- Items -->
      {#if $items && $items.length > 0}
        <div class="space-y-2">
          {#each $items as item (item.id)}
            {@const mosaicImpressions = item.mode === "mosaic" && item.mosaicConfig
              ? item.mosaicConfig.rows * item.mosaicConfig.cols * item.copies
              : item.copies}
            <div class="card grid grid-cols-[72px_1fr] gap-3 bg-surface-100-900 p-3 transition-transform active:scale-[0.99]">
              <button
                type="button"
                class="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-200-800 text-surface-500"
                onclick={() => onEdit(item)}
                aria-label={$tr("editor.edit")}>
                {#if item.thumbnail}
                  <img src={item.thumbnail} alt="" class="h-full w-full object-cover" />
                {:else}
                  <MdIcon icon="image" />
                {/if}
              </button>

              <div class="min-w-0 flex flex-col gap-2">
                <!-- Row A: name + delete -->
                <div class="flex items-start justify-between gap-2">
                  <button type="button" class="truncate text-left text-base font-semibold" onclick={() => onEdit(item)}>
                    {item.name}
                  </button>
                  <button
                    type="button"
                    class="grid size-10 shrink-0 place-items-center rounded-full text-surface-500 hover:bg-error-500/15 hover:text-error-500"
                    aria-label={$tr("editor.delete")}
                    onclick={() => onDelete(item)}>
                    <MdIcon icon="delete" />
                  </button>
                </div>

                <!-- Row B: meta line -->
                <div class="flex flex-wrap items-center gap-1.5 text-xs text-surface-600-400">
                  <span
                    class="size-2 rounded-full
                      {item.status === 'ready' ? 'bg-success-500' : item.status === 'edited' ? 'bg-primary-500' : item.status === 'skipped' ? 'bg-surface-400-600' : 'bg-tertiary-500'}">
                  </span>
                  {#if item.mode === "mosaic" && item.mosaicConfig}
                    <span class="rounded-full bg-tertiary-500/15 px-2 py-0.5 text-tertiary-500">
                      🔲 {item.mosaicConfig.rows}×{item.mosaicConfig.cols}
                    </span>
                  {:else}
                    <span class="rounded-full bg-primary-500/12 px-2 py-0.5 text-primary-500">
                      {$tr("batches.item.mode.single_x").replace("{n}", String(item.copies))}
                    </span>
                  {/if}
                  <span>· {mosaicImpressions} {$tr("batches.impressions_short")}</span>
                </div>

                <!-- Row C: controls -->
                <div class="flex flex-wrap items-center gap-2">
                  <div class="inline-flex h-10 items-center rounded-full bg-surface-200-800">
                    <button class="grid size-10 place-items-center rounded-full" onclick={() => onCopies(item, -1)} aria-label="-">
                      <MdIcon icon="remove" />
                    </button>
                    <span class="w-8 text-center text-sm font-semibold tabular-nums">×{item.copies}</span>
                    <button class="grid size-10 place-items-center rounded-full" onclick={() => onCopies(item, 1)} aria-label="+">
                      <MdIcon icon="add" />
                    </button>
                  </div>

                  <!-- Segmented mode switch -->
                  <div class="inline-flex h-10 items-center rounded-full bg-surface-200-800 p-1">
                    <button
                      class="h-8 rounded-full px-3 text-xs font-semibold transition-colors
                        {item.mode === 'single' ? 'bg-primary-500 text-primary-contrast-500' : 'text-surface-600-400'}"
                      onclick={() => onModeChange(item, "single")}>
                      {$tr("batches.mode.single")}
                    </button>
                    <button
                      class="h-8 rounded-full px-3 text-xs font-semibold transition-colors
                        {item.mode === 'mosaic' ? 'bg-tertiary-500 text-tertiary-contrast-500' : 'text-surface-600-400'}"
                      onclick={() => onModeChange(item, "mosaic")}>
                      {$tr("batches.mode.mosaic")}
                    </button>
                  </div>
                </div>

                {#if item.mode === "mosaic"}
                  <button
                    type="button"
                    class="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-tertiary-500/15 text-sm font-semibold text-tertiary-500 transition-colors hover:bg-tertiary-500/25"
                    onclick={() => onMosaicAction(item)}>
                    <MdIcon icon={item.sourceImageId ? "grid_on" : "add_photo_alternate"} />
                    {item.sourceImageId ? $tr("batches.item.configure_mosaic") : $tr("batches.item.pick_image")}
                    <MdIcon icon="chevron_right" />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-surface-300-700 p-8 text-center text-surface-500">
          <MdIcon icon="inventory_2" />
          <span class="text-sm">{$tr("batches.item.empty")}</span>
          <button class="tool-primary" onclick={onAdd}>
            <MdIcon icon="add" /><span>{$tr("batches.item.add")}</span>
          </button>
        </div>
      {/if}
    </div>
  </main>

  <!-- Hidden file input for the mosaic source-image single-flow -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={onFilePicked} />

  {#if !isEmpty}
    <!-- Docked "Ajouter" bar stacked ABOVE the FAB (was bottom-24, collided with the FAB) -->
    <div
      class="pointer-events-none fixed inset-x-0 bottom-40 z-30 flex justify-center px-4">
      <button
        type="button"
        class="pointer-events-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-500/12 px-5 text-sm font-semibold text-primary-500 shadow-md backdrop-blur transition-colors hover:bg-primary-500/20"
        onclick={onAdd}>
        <MdIcon icon="add" />{$tr("batches.item.add")}
      </button>
    </div>

    <!-- Primary FAB: print. Opens the confirm screen even when disconnected (review + options);
         the confirm button there is gated on connection. -->
    <Fab icon="print" label={$tr("batches.print.action")} onclick={onPrint} />
  {/if}
</div>
