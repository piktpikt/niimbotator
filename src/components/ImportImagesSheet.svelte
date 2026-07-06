<script lang="ts">
  // PIKT: In-app multi-image import — pick N photos, choose a NEW or an EXISTING batch, then create one
  // label per photo (centered + contain-fit within the printable zone). Shares the core with the future
  // Android share-target receiver (services/imageImport). Exposes pick() for the caller's button.
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import Button from "$/components/ui/Button.svelte";
  import { batches } from "$/stores/batchStore";
  import { createLabelsFromImages } from "$/services/imageImport";
  import { openBatch } from "$/stores/navigation";
  import { Toasts } from "$/utils/toasts";

  let open = $state(false);
  let files = $state<File[]>([]);
  let busy = $state(false);
  let fileInput = $state<HTMLInputElement>();

  export function pick(): void {
    fileInput?.click();
  }

  function onFiles(e: Event): void {
    const el = e.target as HTMLInputElement;
    files = el.files ? Array.from(el.files) : [];
    el.value = "";
    if (files.length > 0) open = true;
  }

  async function create(target: { batchId?: string }): Promise<void> {
    if (busy || files.length === 0) return;
    busy = true;
    try {
      const { batchId } = await createLabelsFromImages(files, target);
      open = false;
      files = [];
      openBatch(batchId);
    } catch (e) {
      Toasts.error(e);
    } finally {
      busy = false;
    }
  }
</script>

<input bind:this={fileInput} type="file" accept="image/*" multiple class="hidden" onchange={onFiles} />

<BottomSheet bind:open title={$tr("import.title")}>
  <p class="mb-3 text-body-medium text-surface-600-400">
    {$tr("import.count").replace("{n}", String(files.length))}
  </p>
  <div class="flex flex-col gap-2">
    <Button variant="filled" full icon="add" disabled={busy} onclick={() => create({})}>
      {$tr("import.new_batch")}
    </Button>

    {#if $batches && $batches.length > 0}
      <h3 class="mt-3 mb-1 text-label-large text-surface-500">{$tr("import.existing")}</h3>
      <ul class="flex flex-col gap-1">
        {#each $batches as b (b.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-m3-lg bg-surface-200-800/50 p-3 text-left transition-colors hover:bg-surface-200-800 disabled:opacity-50"
              disabled={busy}
              onclick={() => create({ batchId: b.id })}>
              <MdIcon icon="inventory_2" />
              <span class="min-w-0 flex-1 truncate text-body-medium">{b.name}</span>
              <MdIcon icon="chevron_right" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</BottomSheet>
