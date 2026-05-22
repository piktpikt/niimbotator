<script lang="ts">
  // PIKT: Home dashboard (wireframe 4.1). Empty states shown until batches/templates exist
  // (those arrive in Chantiers 2/5). (Chantier 0)
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import Fab from "$/components/navigation/Fab.svelte";
  import { navigate } from "$/stores/navigation";
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4 pb-28">
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.resume")}</h2>
    <div class="card flex items-center gap-3 bg-surface-100-900 p-4 text-surface-500">
      <MdIcon icon="inventory_2" />
      <span class="text-sm">{$tr("home.empty.resume")}</span>
    </div>
  </section>

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

  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.recents")}</h2>
    <div class="card flex items-center gap-3 bg-surface-100-900 p-4 text-surface-500">
      <MdIcon icon="image" />
      <span class="text-sm">{$tr("home.empty.recents")}</span>
    </div>
  </section>

  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("home.templates")}</h2>
    <div class="card flex items-center gap-3 bg-surface-100-900 p-4 text-surface-500">
      <MdIcon icon="style" />
      <span class="text-sm">{$tr("home.empty.templates")}</span>
    </div>
  </section>
</div>

<Fab icon="bolt" label={$tr("home.express")} onclick={() => navigate("editor")} />
