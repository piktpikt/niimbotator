<script lang="ts">
  // PIKT: Editor page (Chantier 2). When `currentItemId` is set, wraps LabelDesigner in batch-item
  // mode — loads the item on mount, debounces canvas changes into an auto-save with a fresh 64 px
  // thumbnail, exposes a counter ("Étiquette n / total") + prev/next navigation + back-to-manager.
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { navigate, currentItemId, currentBatchId } from "$/stores/navigation";
  import { tr } from "$/utils/i18n";
  import { getItem, updateBatchItem, itemNeighbours } from "$/stores/batchStore";
  import type { BatchItem } from "$/db/schema";
  import { untrack } from "svelte";

  let debugStuffShow = $state(false);
  let designer = $state<{ getSnapshot: () => { labelProps: unknown; canvasState: unknown; thumbnail?: string } } | undefined>(undefined);

  let item = $state<BatchItem | undefined>(undefined);
  let itemIndex = $state<number>(-1);
  let itemTotal = $state<number>(0);
  let prevId = $state<string | undefined>(undefined);
  let nextId = $state<string | undefined>(undefined);
  type SaveStatus = "idle" | "saving" | "saved";
  let saveStatus = $state<SaveStatus>("idle");
  let savedAt = $state<number | undefined>(undefined);
  let saveTimer: number | undefined;

  async function loadItem(id: string | undefined) {
    if (!id) {
      item = undefined;
      itemIndex = -1;
      itemTotal = 0;
      prevId = nextId = undefined;
      return;
    }
    const it = await getItem(id);
    item = it;
    if (!it) return;
    // Position + neighbours
    const { prev, next } = await itemNeighbours(id);
    prevId = prev;
    nextId = next;
    // Compute index + total via the batch's ordering.
    const { itemPosition } = await import("$/stores/batchStore");
    const p = await itemPosition(id);
    itemIndex = p.position;
    itemTotal = p.total;
  }

  $effect(() => {
    const id = $currentItemId;
    untrack(() => loadItem(id));
  });

  function scheduleSave() {
    if (!$currentItemId || !designer) return;
    saveStatus = "saving";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      if (!$currentItemId || !designer) return;
      const snap = designer.getSnapshot();
      await updateBatchItem($currentItemId, {
        labelProps: snap.labelProps as BatchItem["labelProps"],
        canvasState: snap.canvasState as BatchItem["canvasState"],
        thumbnail: snap.thumbnail,
        status: "edited",
      });
      savedAt = Date.now();
      saveStatus = "saved";
    }, 400);
  }

  function back() {
    if ($currentBatchId) navigate("batch-manager");
    else navigate("home");
    currentItemId.set(undefined);
  }

  function goPrev() {
    if (prevId) currentItemId.set(prevId);
  }
  function goNext() {
    if (nextId) currentItemId.set(nextId);
  }

  const inBatch = $derived(!!$currentItemId && !!item);
  const title = $derived(inBatch ? (item?.name ?? "") : $tr("nav.editor"));
  const counter = $derived(
    inBatch && itemTotal > 0
      ? $tr("editor.item.counter").replace("{n}", String(itemIndex + 1)).replace("{total}", String(itemTotal))
      : "",
  );
  const statusText = $derived(
    saveStatus === "saving"
      ? $tr("editor.autosave.saving")
      : saveStatus === "saved"
        ? $tr("editor.autosave.saved")
        : "",
  );
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <!-- Custom two-line header for batch-item mode; standalone mode gets a single title. -->
  <header
    class="sticky top-0 z-30 flex items-start gap-1 border-b border-surface-200-800 bg-surface-50-950/90 px-2 pt-2 pb-1 backdrop-blur"
    style:min-height="{inBatch ? 88 : 64}px">
    <button
      type="button"
      aria-label={$tr("editor.autosave.saved")}
      class="grid size-12 shrink-0 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60"
      onclick={back}>
      <MdIcon icon="chevron_left" />
    </button>

    <div class="min-w-0 flex-1 py-2">
      <div class="truncate text-lg font-semibold">{title}</div>
      {#if inBatch}
        <div class="mt-0.5 flex items-center gap-2">
          {#if itemTotal > 0}
            <span class="inline-flex h-6 items-center rounded-full bg-surface-200-800 px-2 text-[11px] font-medium text-surface-700-300 tabular-nums">
              {counter}
            </span>
          {/if}
          {#if statusText}
            <span
              class="inline-flex items-center gap-1 text-[11px] font-medium
                {saveStatus === 'saved' ? 'text-success-500' : 'text-warning-500'}">
              <span class="size-1.5 rounded-full {saveStatus === 'saved' ? 'bg-success-500' : 'bg-warning-500'}"></span>
              {statusText}
            </span>
          {/if}
        </div>
      {/if}
    </div>

    {#if inBatch}
      <button
        type="button"
        aria-label={$tr("editor.nav.prev")}
        disabled={!prevId}
        class="grid size-12 shrink-0 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60 disabled:opacity-30"
        onclick={goPrev}>
        <MdIcon icon="chevron_left" class="r-90" />
      </button>
      <button
        type="button"
        aria-label={$tr("editor.nav.next")}
        disabled={!nextId}
        class="grid size-12 shrink-0 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60 disabled:opacity-30"
        onclick={goNext}>
        <MdIcon icon="chevron_right" />
      </button>
    {/if}
    <button
      type="button"
      aria-label="Debug"
      class="grid size-12 shrink-0 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60"
      onclick={() => (debugStuffShow = true)}>
      <MdIcon icon="bug_report" />
    </button>
  </header>

  <main class="flex-1 overflow-y-auto p-3">
    <div class="mb-3">
      <PrinterConnector />
    </div>
    <BrowserWarning />
    {#key $currentItemId}
      <LabelDesigner
        bind:this={designer}
        initialItem={item ? { labelProps: item.labelProps, canvasState: item.canvasState } : undefined}
        onDirty={scheduleSave} />
    {/key}
  </main>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}
