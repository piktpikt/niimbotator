<script lang="ts">
  // PIKT: Editor page — wraps the existing Fabric.js editor cluster in the mobile shell (Chantier 0).
  // The editor's internal controls are migrated to bottom-sheet panels in Chantier 0.5.
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TopAppBar from "$/components/navigation/TopAppBar.svelte";
  import { navigate } from "$/stores/navigation";
  import { tr } from "$/utils/i18n";

  let debugStuffShow = $state(false);
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <TopAppBar title={$tr("nav.editor")} showPrinter={false} onBack={() => navigate("home")}>
    {#snippet actions()}
      <button
        type="button"
        aria-label="Debug"
        class="grid size-12 place-items-center rounded-full text-surface-700-300 hover:bg-surface-200-800/60"
        onclick={() => (debugStuffShow = true)}>
        <MdIcon icon="bug_report" />
      </button>
    {/snippet}
  </TopAppBar>

  <main class="flex-1 overflow-y-auto p-3">
    <div class="mb-3">
      <PrinterConnector />
    </div>
    <BrowserWarning />
    <LabelDesigner />
  </main>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}
