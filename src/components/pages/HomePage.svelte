<script lang="ts">
  // PIKT: Home dashboard (wireframe 4.1) — now surfaces the real batches store: last active batch
  // in "Reprendre", last-edited items in "Récents". Templates remain a "Bientôt" chip until Ch.5.
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Fab from "$/components/navigation/Fab.svelte";
  import { navigate, openBatch, openEditor } from "$/stores/navigation";
  import { batches, itemCounts, createBatch } from "$/stores/batchStore";
  import { liveQuery, type Observable } from "dexie";
  import { db, type BatchItem } from "$/db/schema";

  const recentItems: Observable<BatchItem[]> = liveQuery(() =>
    db.items.orderBy("modifiedAt").reverse().limit(6).toArray(),
  );

  async function onFirstBatch() {
    const id = await createBatch();
    openBatch(id);
  }
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 pb-28">
  <!-- Reprendre -->
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.resume")}</h2>
    {#if $batches && $batches.length > 0}
      {@const b = $batches[0]}
      <button
        type="button"
        class="card flex w-full items-center gap-3 bg-surface-100-900 p-4 text-left transition active:scale-[0.99]"
        onclick={() => openBatch(b.id)}>
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-500">
          <MdIcon icon="dashboard" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">{b.name}</div>
          <div class="text-sm text-surface-600-400">
            {$itemCounts?.[b.id] ?? 0}
            {$tr("batches.items")}
          </div>
        </div>
        <span class="inline-flex h-8 items-center rounded-full bg-primary-500/12 px-3 text-xs font-semibold text-primary-500">
          {$tr("home.resume.action")}
        </span>
      </button>
    {:else}
      <div class="card flex items-center justify-between gap-3 bg-surface-100-900 p-4">
        <div class="flex items-center gap-3 text-surface-500">
          <MdIcon icon="inventory_2" />
          <span class="text-sm">{$tr("home.empty.resume")}</span>
        </div>
        <button class="tool-primary" onclick={onFirstBatch}>
          <MdIcon icon="add" /><span>{$tr("home.new_batch")}</span>
        </button>
      </div>
    {/if}
  </section>

  <!-- Actions rapides -->
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.quick_actions")}</h2>
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="card flex flex-col items-start gap-3 bg-surface-100-900 p-4 text-left transition active:scale-[0.98]"
        onclick={() => navigate("batches")}>
        <span class="grid size-10 place-items-center rounded-full bg-primary-500/15 text-primary-500">
          <MdIcon icon="add" />
        </span>
        <span class="font-medium">{$tr("home.new_batch")}</span>
      </button>
      <button
        type="button"
        class="card flex flex-col items-start gap-3 bg-surface-100-900 p-4 text-left transition active:scale-[0.98]"
        onclick={() => navigate("editor")}>
        <span class="grid size-10 place-items-center rounded-full bg-tertiary-500/15 text-tertiary-500">
          <MdIcon icon="add_photo_alternate" />
        </span>
        <span class="font-medium">{$tr("home.import_image")}</span>
      </button>
    </div>
  </section>

  <!-- Récents -->
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.recents")}</h2>
    {#if $recentItems && $recentItems.length > 0}
      <div class="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1">
        {#each $recentItems as it (it.id)}
          <button
            type="button"
            class="flex w-24 shrink-0 snap-start flex-col items-center gap-1 text-left"
            onclick={() => openEditor(it.id)}>
            <span class="grid size-24 place-items-center overflow-hidden rounded-lg bg-surface-100-900 text-surface-500">
              {#if it.thumbnail}
                <img src={it.thumbnail} alt="" class="h-full w-full object-cover" />
              {:else}
                <MdIcon icon="image" />
              {/if}
            </span>
            <span class="w-full truncate text-xs font-medium">{it.name}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="card flex items-center gap-3 bg-surface-100-900 p-4 text-surface-500">
        <MdIcon icon="image" />
        <span class="text-sm">{$tr("home.empty.recents")}</span>
      </div>
    {/if}
  </section>

  <!-- Modèles -->
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.templates")}</h2>
    <div class="card flex items-center justify-between gap-3 bg-surface-100-900 p-4 text-surface-500">
      <div class="flex items-center gap-3">
        <MdIcon icon="style" />
        <span class="text-sm">{$tr("home.empty.templates")}</span>
      </div>
      <span class="inline-flex h-6 items-center rounded-full bg-surface-200-800 px-2 text-[11px] font-medium text-surface-600-400">
        {$tr("home.templates.coming_soon")}
      </span>
    </div>
  </section>
</div>

<Fab icon="bolt" label={$tr("home.express")} onclick={() => navigate("editor")} />
