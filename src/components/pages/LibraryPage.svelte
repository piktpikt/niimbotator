<script lang="ts">
  // PIKT: Library. The primary tab is the user's SAVED LABELS (like the official app's "Storage") — tap to
  // reopen one in the editor, or delete it. Images/Stickers/Templates remain shells for later chantiers.
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { openSavedLabel } from "$/stores/navigation";
  import { Toasts } from "$/utils/toasts";
  import { confirmM3 } from "$/utils/confirm";
  import type { ExportedLabelTemplate } from "$/types";

  const tabs = [
    { id: "labels", label: "library.tab.labels" },
    { id: "images", label: "library.tab.images" },
    { id: "stickers", label: "library.tab.stickers" },
    { id: "templates", label: "library.tab.templates" },
  ] as const;

  let active = $state<(typeof tabs)[number]["id"]>("labels");
  let savedLabels = $state<ExportedLabelTemplate[]>([]);

  function refresh() {
    try {
      savedLabels = LocalStoragePersistence.loadLabels();
    } catch (e) {
      Toasts.error(e);
      savedLabels = [];
    }
  }
  refresh();

  async function onDelete(index: number) {
    if (!(await confirmM3($tr("library.label.delete_confirm")))) return;
    LocalStoragePersistence.saveLabels(savedLabels.filter((_, i) => i !== index));
    refresh();
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex gap-1 overflow-x-auto border-b border-surface-200-800 px-2">
    {#each tabs as t (t.id)}
      <button
        type="button"
        class="relative shrink-0 px-4 py-3 text-sm font-medium {active === t.id ? 'text-primary-500' : 'text-surface-600-400'}"
        onclick={() => (active = t.id)}>
        {$tr(t.label)}
        {#if active === t.id}
          <span class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-500"></span>
        {/if}
      </button>
    {/each}
  </div>

  {#if active === "labels"}
    {#if savedLabels.length > 0}
      <div class="grid grid-cols-3 gap-2 overflow-y-auto p-3">
        {#each savedLabels as label, i (label.id ?? label.timestamp ?? i)}
          <div class="flex flex-col overflow-hidden rounded-xl border border-surface-200-800 bg-surface-100-900">
            <button
              type="button"
              class="flex aspect-square items-center justify-center bg-white p-2 text-surface-400"
              onclick={() => openSavedLabel(label)}
              aria-label={label.title || $tr("library.label.open")}>
              {#if label.thumbnailBase64}
                <img src={label.thumbnailBase64} alt={label.title ?? ""} class="max-h-full max-w-full object-contain" />
              {:else}
                <MdIcon icon="image" />
              {/if}
            </button>
            <div class="flex items-center gap-1 px-2 py-1.5">
              <span class="min-w-0 flex-1 truncate text-xs text-surface-700-300">
                {label.title || $tr("library.label.untitled")}
              </span>
              <button
                type="button"
                class="grid size-7 shrink-0 place-items-center rounded-full text-surface-500 hover:bg-surface-200-800"
                onclick={() => onDelete(i)}
                aria-label={$tr("library.label.delete")}>
                <MdIcon icon="delete" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <span class="grid size-20 place-items-center rounded-full bg-surface-200-800 text-4xl text-surface-500">
          <MdIcon icon="save" />
        </span>
        <h2 class="h4">{$tr("library.labels.empty.title")}</h2>
        <p class="max-w-xs text-sm text-surface-600-400">{$tr("library.labels.empty.subtitle")}</p>
      </div>
    {/if}
  {:else}
    <div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span class="grid size-20 place-items-center rounded-full bg-surface-200-800 text-4xl text-surface-500">
        <MdIcon icon="photo_library" />
      </span>
      <h2 class="h4">{$tr("library.empty.title")}</h2>
      <p class="max-w-xs text-sm text-surface-600-400">{$tr("library.empty.subtitle")}</p>
    </div>
  {/if}
</div>
