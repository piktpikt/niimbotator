<script lang="ts">
  // PIKT: Batch Manager (Chantier 2). Renames + lists items + add/edit/delete + copies stepper +
  // passages multiplier + a per-item Mosaïque toggle entry (opens the configurator in the editor).
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
  } from "$/stores/batchStore";
  import {
    currentBatchId,
    currentPage,
    navigate,
    openEditor,
  } from "$/stores/navigation";
  import type { Batch, BatchItem } from "$/db/schema";
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
    $currentBatchId;
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

  async function onEdit(item: BatchItem) {
    openEditor(item.id);
  }

  async function onDelete(item: BatchItem) {
    if (confirm($tr("batches.item.delete.confirm").replace("{name}", item.name))) {
      await deleteBatchItem(item.id);
    }
  }

  async function onCopies(item: BatchItem, delta: number) {
    await setItemCopies(item.id, item.copies + delta);
  }

  async function onToggleMosaic(item: BatchItem) {
    // Toggle single <-> mosaic. Mosaic default 2×2; the configurator (opened via edit) refines it.
    if (item.mode === "mosaic") {
      await setItemMode(item.id, "single");
    } else {
      await setItemMode(item.id, "mosaic", {
        rows: 2,
        cols: 2,
        cropRect: { x: 0, y: 0, width: 0, height: 0 },
        numbering: false,
        marginMm: 0,
      });
    }
  }

  async function onPassages(delta: number) {
    if (!batch) return;
    await setBatchPassages(batch.id, batch.passages + delta);
    await refresh();
  }

  async function onDeleteBatch() {
    if (!batch) return;
    if (confirm($tr("batches.delete.confirm").replace("{name}", batch.name))) {
      await deleteBatch(batch.id);
      currentPage.set("batches");
    }
  }

  function back() {
    currentPage.set("batches");
  }

  const totalPerPass = $derived(($items ?? []).reduce((sum: number, it: BatchItem) => {
    if (it.status === "skipped") return sum;
    const tiles = it.mode === "mosaic" && it.mosaicConfig ? it.mosaicConfig.rows * it.mosaicConfig.cols : 1;
    return sum + tiles * it.copies;
  }, 0));
  const grandTotal = $derived(totalPerPass * (batch?.passages ?? 1));
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
    <div class="mx-auto w-full max-w-2xl space-y-4 p-4 pb-28">
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
          <div class="flex items-center gap-1">
            <button class="tool-action" onclick={() => onPassages(-1)} aria-label="-">
              <MdIcon icon="remove" />
            </button>
            <span class="w-8 text-center tabular-nums">{batch?.passages ?? 1}</span>
            <button class="tool-action" onclick={() => onPassages(1)} aria-label="+">
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
            <div class="card flex items-center gap-3 bg-surface-100-900 p-3">
              <button
                type="button"
                class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-200-800 text-surface-500"
                onclick={() => onEdit(item)}
                aria-label={$tr("editor.edit")}>
                {#if item.thumbnail}
                  <img src={item.thumbnail} alt="" class="h-full w-full object-cover" />
                {:else}
                  <MdIcon icon="image" />
                {/if}
              </button>
              <div class="min-w-0 flex-1">
                <button type="button" class="block w-full truncate text-left font-medium" onclick={() => onEdit(item)}>
                  {item.name}
                </button>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-600-400">
                  {#if item.mode === "mosaic" && item.mosaicConfig}
                    <span class="rounded-full bg-tertiary-500/15 px-2 py-0.5 text-tertiary-500">
                      {item.mosaicConfig.rows}×{item.mosaicConfig.cols} {$tr("batches.mode.mosaic")}
                    </span>
                    <span>= {item.mosaicConfig.rows * item.mosaicConfig.cols * item.copies}
                      {$tr("batches.impressions")}</span>
                  {:else}
                    <span>{$tr("batches.mode.single")}</span>
                  {/if}
                </div>
                <div class="mt-2 flex items-center gap-1">
                  <button class="tool-action" onclick={() => onCopies(item, -1)} aria-label="-">
                    <MdIcon icon="remove" />
                  </button>
                  <span class="w-8 text-center tabular-nums text-sm">×{item.copies}</span>
                  <button class="tool-action" onclick={() => onCopies(item, 1)} aria-label="+">
                    <MdIcon icon="add" />
                  </button>
                  <button
                    class="tool-action {item.mode === 'mosaic' ? 'tool-action-active' : ''}"
                    onclick={() => onToggleMosaic(item)}>
                    <MdIcon icon="grid_on" /><span>{$tr("batches.mode.mosaic")}</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="grid size-10 shrink-0 place-items-center rounded-full text-surface-500 transition-colors hover:bg-error-500/15 hover:text-error-500"
                aria-label={$tr("editor.delete")}
                onclick={() => onDelete(item)}>
                <MdIcon icon="delete" />
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-300-700 p-8 text-center text-surface-500">
          <MdIcon icon="inventory_2" />
          <span class="text-sm">{$tr("batches.item.empty")}</span>
        </div>
      {/if}
    </div>
  </main>
</div>

<Fab icon="add" label={$tr("batches.item.add")} onclick={onAdd} />
