<script lang="ts">
  // DEV-only gallery to prove the M3 primitive layer (deep restyle). Reachable at #ui-gallery.
  import Button from "$/components/ui/Button.svelte";
  import Card from "$/components/ui/Card.svelte";

  const variants = ["filled", "tonal", "outlined", "text", "elevated"] as const;
</script>

<div class="min-h-dvh space-y-6 bg-surface-50-950 p-4 text-surface-950-50">
  <h1 class="text-headline-large">M3 primitives</h1>

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Buttons — variants (primary)</h2>
    <div class="flex flex-wrap gap-3">
      {#each variants as v (v)}
        <Button variant={v} icon="print">{v}</Button>
      {/each}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Buttons — colours (filled / tonal)</h2>
    <div class="flex flex-wrap gap-3">
      <Button color="primary" icon="check">Imprimer</Button>
      <Button color="tertiary" variant="tonal" icon="grid_on">Mosaïque</Button>
      <Button color="error" variant="tonal" icon="delete">Supprimer</Button>
      <Button color="warning" variant="outlined" icon="battery_2_bar">Batterie</Button>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Type scale</h2>
    <p class="text-display-large">Display</p>
    <p class="text-headline-medium">Headline medium</p>
    <p class="text-title-large">Title large</p>
    <p class="text-body-large">Body large — le texte courant par défaut.</p>
    <p class="text-label-medium text-surface-500">LABEL MEDIUM</p>
  </section>

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Cards — elevation</h2>
    <Card variant="elevated"><span class="text-title-medium">Elevated</span><p class="text-body-medium text-surface-600-400">shadow-e1, flotte sur le canvas</p></Card>
    <Card variant="filled"><span class="text-title-medium">Filled</span><p class="text-body-medium text-surface-600-400">surface tonale, sans ombre</p></Card>
    <Card variant="outlined"><span class="text-title-medium">Outlined</span><p class="text-body-medium text-surface-600-400">contour, dense</p></Card>
    <Card variant="elevated" onclick={() => {}}><span class="text-title-medium">Cliquable</span><p class="text-body-medium text-surface-600-400">state-layer au survol/appui</p></Card>
  </section>
</div>
