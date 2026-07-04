<script lang="ts">
  // DEV-only gallery to prove the M3 primitive layer (deep restyle). Reachable at #ui-gallery.
  import Button from "$/components/ui/Button.svelte";
  import Card from "$/components/ui/Card.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import Switch from "$/components/ui/Switch.svelte";
  import Slider from "$/components/ui/Slider.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Select from "$/components/ui/Select.svelte";

  const variants = ["filled", "tonal", "outlined", "text", "elevated"] as const;

  let align = $state<"left" | "center" | "right" | "justify">("left");
  let numbering = $state(true);
  let size = $state(28);
  let content = $state("PIKT");
  let qrVersion = $state<string | number>(0);
  let radius = $state(4);
  let multi = $state("Ligne 1\nLigne 2");
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

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Controls — panneaux d'objet</h2>
    <Card variant="filled" class="space-y-5">
      <div>
        <div class="mb-2 text-label-medium text-surface-600-400">Alignement · SegmentedButton</div>
        <SegmentedButton
          value={align}
          onChange={(v) => (align = v)}
          options={[
            { value: "left", icon: "format_align_left", ariaLabel: "Gauche" },
            { value: "center", icon: "format_align_center", ariaLabel: "Centre" },
            { value: "right", icon: "format_align_right", ariaLabel: "Droite" },
          ]} />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-body-large">Numéroter les tuiles · Switch</span>
        <Switch checked={numbering} onChange={(v) => (numbering = v)} ariaLabel="Numéroter les tuiles" />
      </div>
      <div>
        <div class="mb-2 flex items-center justify-between text-label-medium text-surface-600-400">
          <span>Taille · Slider</span><span class="tabular-nums text-surface-950-50">{size}</span>
        </div>
        <Slider value={size} min={8} max={72} onChange={(v) => (size = v)} ariaLabel="Taille du texte" />
      </div>
      <TextField label="Contenu · TextField" value={content} onChange={(v) => (content = v)} />
    </Card>
  </section>

  <section class="space-y-3">
    <h2 class="text-title-large text-surface-600-400">Nouveaux champs — Select / TextField enrichi</h2>
    <Card variant="filled" class="space-y-5">
      <Select
        label="Version QR · Select"
        leadingIcon="grid_on"
        value={qrVersion}
        onChange={(v) => (qrVersion = v)}
        options={[
          { value: 0, label: "Auto" },
          { value: 1, label: "Version 1" },
          { value: 2, label: "Version 2" },
          { value: 3, label: "Version 3" },
        ]} />
      <TextField
        label="Rayon · TextField (icône de tête)"
        type="number"
        leadingIcon="rounded_corner"
        value={radius}
        min={0}
        onChange={(v) => (radius = Number(v))} />
      <TextField label="Contenu long · TextField multiline" multiline rows={3} value={multi} onChange={(v) => (multi = v)} />
    </Card>
  </section>
</div>
