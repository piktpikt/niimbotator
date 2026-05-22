<script lang="ts">
  // PIKT: Batches list — empty state until the batch system lands (Chantier 2). (Chantier 0)
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Fab from "$/components/navigation/Fab.svelte";
</script>

<div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
  <span class="grid size-20 place-items-center rounded-full bg-surface-200-800 text-4xl text-surface-500">
    <MdIcon icon="dashboard" />
  </span>
  <h2 class="h4">{$tr("batches.empty.title")}</h2>
  <p class="max-w-xs text-sm text-surface-600-400">{$tr("batches.empty.subtitle")}</p>
</div>

<Fab icon="add" label={$tr("home.new_batch")} />
