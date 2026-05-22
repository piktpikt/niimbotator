<script lang="ts">
  // PIKT: M3 bottom navigation — Home / Batches / Library / Settings with a pill indicator. (Chantier 0)
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { currentPage, navigate } from "$/stores/navigation";

  const items = [
    { page: "home", icon: "home", label: "nav.home" },
    { page: "batches", icon: "dashboard", label: "nav.batches" },
    { page: "library", icon: "photo_library", label: "nav.library" },
    { page: "settings", icon: "settings", label: "nav.settings" },
  ] as const;
</script>

<nav
  class="sticky bottom-0 z-30 flex h-20 items-stretch border-t border-surface-200-800 bg-surface-100-900 px-2 pb-[env(safe-area-inset-bottom)]">
  {#each items as item (item.page)}
    {@const active = $currentPage === item.page}
    <button
      type="button"
      class="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors {active
        ? 'text-primary-500'
        : 'text-surface-600-400'}"
      onclick={() => navigate(item.page)}>
      <span
        class="grid h-8 w-16 place-items-center rounded-full transition-colors {active ? 'bg-primary-500/15' : ''}">
        <MdIcon icon={item.icon} />
      </span>
      {$tr(item.label)}
    </button>
  {/each}
</nav>
