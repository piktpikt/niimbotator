<script lang="ts">
  // PIKT: App shell (Chantier 0). Store-based navigation between top-level pages with a persistent
  // top app bar + bottom navigation. The editor is a focused full-screen page.
  import { currentPage } from "$/stores/navigation";
  import { tr } from "$/utils/i18n";
  import TopAppBar from "$/components/navigation/TopAppBar.svelte";
  import BottomNavigation from "$/components/navigation/BottomNavigation.svelte";
  import HomePage from "$/components/pages/HomePage.svelte";
  import EditorPage from "$/components/pages/EditorPage.svelte";
  import BatchesListPage from "$/components/pages/BatchesListPage.svelte";
  import BatchManager from "$/components/pages/BatchManager.svelte";
  import BatchPrintPage from "$/components/pages/BatchPrintPage.svelte";
  import MosaicConfiguratorPage from "$/components/pages/MosaicConfiguratorPage.svelte";
  import LibraryPage from "$/components/pages/LibraryPage.svelte";
  import SettingsPage from "$/components/pages/SettingsPage.svelte";

  const titles = {
    home: "nav.home",
    editor: "nav.editor",
    batches: "nav.batches",
    "batch-manager": "nav.batches",
    "batch-print": "nav.batches",
    "mosaic-configurator": "nav.batches",
    library: "nav.library",
    settings: "nav.settings",
  } as const;
</script>

{#if $currentPage === "editor"}
  <EditorPage />
{:else if $currentPage === "batch-manager"}
  <BatchManager />
{:else if $currentPage === "batch-print"}
  <BatchPrintPage />
{:else if $currentPage === "mosaic-configurator"}
  <MosaicConfiguratorPage />
{:else}
  <div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
    <TopAppBar title={$tr(titles[$currentPage])} />

    <main class="relative flex-1 overflow-y-auto">
      {#if $currentPage === "home"}
        <HomePage />
      {:else if $currentPage === "batches"}
        <BatchesListPage />
      {:else if $currentPage === "library"}
        <LibraryPage />
      {:else if $currentPage === "settings"}
        <SettingsPage />
      {/if}
    </main>

    <BottomNavigation />
  </div>
{/if}
