<script lang="ts">
  // PIKT: Batches list backed by Dexie (Chantier 2). Tapping a batch opens the Batch Manager (next slice).
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Fab from "$/components/navigation/Fab.svelte";
  import { batches, itemCounts, createBatch, deleteBatch } from "$/stores/batchStore";
  import { openBatch } from "$/stores/navigation";

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  async function onDelete(id: string, name: string) {
    if (confirm($tr("batches.delete.confirm").replace("{name}", name))) {
      await deleteBatch(id);
    }
  }
</script>

{#if $batches && $batches.length > 0}
  <div class="mx-auto w-full max-w-2xl space-y-2 p-4 pb-28">
    {#each $batches as b (b.id)}
      <div class="card flex items-center gap-3 bg-surface-100-900 p-4 transition-colors hover:bg-surface-200-800/60">
        <button
          type="button"
          class="flex flex-1 items-center gap-3 text-left"
          onclick={() => openBatch(b.id)}>
          <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-500">
            <MdIcon icon="dashboard" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium">{b.name}</div>
            <div class="text-sm text-surface-600-400">
              {$itemCounts?.[b.id] ?? 0}
              {$tr("batches.items")} · {fmtDate(b.modifiedAt)}
            </div>
          </div>
        </button>
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-surface-500 transition-colors hover:bg-surface-200-800/60 hover:text-error-500"
          aria-label={$tr("editor.delete")}
          onclick={() => onDelete(b.id, b.name)}>
          <MdIcon icon="delete" />
        </button>
      </div>
    {/each}
  </div>
{:else}
  <div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
    <span class="grid size-20 place-items-center rounded-full bg-surface-200-800 text-4xl text-surface-500">
      <MdIcon icon="dashboard" />
    </span>
    <h2 class="h4">{$tr("batches.empty.title")}</h2>
    <p class="max-w-xs text-sm text-surface-600-400">{$tr("batches.empty.subtitle")}</p>
  </div>
{/if}

<Fab icon="add" label={$tr("home.new_batch")} onclick={() => createBatch()} />
