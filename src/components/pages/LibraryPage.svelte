<script lang="ts">
  // PIKT: Library — tabbed shell with empty states; content arrives in Chantiers 2/5. (Chantier 0)
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  const tabs = [
    { id: "images", label: "library.tab.images" },
    { id: "stickers", label: "library.tab.stickers" },
    { id: "templates", label: "library.tab.templates" },
  ] as const;

  let active = $state<(typeof tabs)[number]["id"]>("images");
</script>

<div class="flex h-full flex-col">
  <div class="flex gap-1 border-b border-surface-200-800 px-2">
    {#each tabs as t (t.id)}
      <button
        type="button"
        class="relative px-4 py-3 text-sm font-medium {active === t.id ? 'text-primary-500' : 'text-surface-600-400'}"
        onclick={() => (active = t.id)}>
        {$tr(t.label)}
        {#if active === t.id}
          <span class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-500"></span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
    <span class="grid size-20 place-items-center rounded-full bg-surface-200-800 text-4xl text-surface-500">
      <MdIcon icon="photo_library" />
    </span>
    <h2 class="h4">{$tr("library.empty.title")}</h2>
    <p class="max-w-xs text-sm text-surface-600-400">{$tr("library.empty.subtitle")}</p>
  </div>
</div>
