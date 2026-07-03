<script lang="ts">
  // PIKT: Mosaic configurator (Chantier 4). Presets/custom grid + orientation + Cropper.js v2 with
  // the crop aspect ratio ALWAYS locked to (cols·labelWidth)/(rows·labelHeight) — the mosaic-crop-ratio
  // invariant. See docs/ARCHITECTURE.md §6.7. This component is bootstrapped: the picker + preview
  // computes result dimensions; Cropper.js integration lives here so it isn't reintroduced piecemeal.
  import "cropperjs";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { mosaicAspectRatio } from "$/services/mosaicSplit";
  import type { MosaicConfig } from "$/db/schema";

  interface Props {
    initial?: MosaicConfig;
    labelWidthMm: number;
    labelHeightMm: number;
    imageSrc: string;
    onSave: (config: MosaicConfig) => void;
    onCancel: () => void;
  }

  let { initial, labelWidthMm, labelHeightMm, imageSrc, onSave, onCancel }: Props = $props();

  const presets = [
    { cols: 2, rows: 2, label: "2×2" },
    { cols: 3, rows: 3, label: "3×3" },
    { cols: 4, rows: 4, label: "4×4" },
    { cols: 6, rows: 4, label: "6×4" },
  ];

  let cols = $state(initial?.cols ?? 3);
  let rows = $state(initial?.rows ?? 3);
  let numbering = $state(initial?.numbering ?? false);
  let marginMm = $state(initial?.marginMm ?? 0);

  const aspectRatio = $derived(mosaicAspectRatio(labelWidthMm, labelHeightMm, cols, rows));
  const totalW = $derived(cols * labelWidthMm);
  const totalH = $derived(rows * labelHeightMm);
  const tileCount = $derived(cols * rows);

  let selectionEl = $state<HTMLElement | null>(null);
  let imageEl = $state<HTMLElement | null>(null);

  // Keep the Cropper.js selection's aspect ratio in sync with the grid.
  $effect(() => {
    if (selectionEl) selectionEl.setAttribute("aspect-ratio", String(aspectRatio));
  });

  function save() {
    // Read cropperjs selection bounds. cropperjs v2 exposes a getter on <cropper-selection>.
    const sel = selectionEl as unknown as { $getSelection?: () => { x: number; y: number; width: number; height: number } } | null;
    const bounds = sel?.$getSelection?.() ?? { x: 0, y: 0, width: 0, height: 0 };
    onSave({
      rows,
      cols,
      cropRect: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      numbering,
      marginMm,
    });
  }
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-surface-200-800 bg-surface-50-950/90 px-2 backdrop-blur">
    <button class="grid size-12 place-items-center rounded-full" aria-label="Annuler" onclick={onCancel}>
      <MdIcon icon="close" />
    </button>
    <h1 class="h4 flex-1 truncate font-semibold">{$tr("mosaic.title")}</h1>
    <button class="tool-primary" onclick={save}>{$tr("editor.toolbar.save")}</button>
  </header>

  <main class="flex-1 overflow-y-auto p-4">
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <!-- Grid presets -->
      <section class="card space-y-2 bg-surface-100-900 p-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.grid")}</h2>
        <div class="flex flex-wrap gap-1">
          {#each presets as p (p.label)}
            <button
              class="tool-action {p.cols === cols && p.rows === rows ? 'tool-action-active' : ''}"
              onclick={() => {
                cols = p.cols;
                rows = p.rows;
              }}>
              {p.label}
            </button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-sm">
            {$tr("mosaic.cols")}
            <input type="number" min="1" max="10" bind:value={cols} class="w-16 rounded-lg bg-surface-200-800 px-2 py-1 text-center" />
          </label>
          <label class="flex items-center gap-2 text-sm">
            {$tr("mosaic.rows")}
            <input type="number" min="1" max="10" bind:value={rows} class="w-16 rounded-lg bg-surface-200-800 px-2 py-1 text-center" />
          </label>
        </div>
      </section>

      <!-- Live result -->
      <section class="card bg-surface-100-900 p-4 text-sm">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.result")}</h2>
        <div>{$tr("mosaic.dimensions")}: {totalW} × {totalH} mm</div>
        <div>{$tr("mosaic.tile_count")}: {tileCount} ({cols}×{rows})</div>
        <div>{$tr("mosaic.tile_size")}: {labelWidthMm} × {labelHeightMm} mm</div>
      </section>

      <!-- Cropper.js -->
      <section class="card bg-surface-100-900 p-2">
        <h2 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.crop")}</h2>
        <div class="overflow-hidden rounded-xl">
          {#key `${imageSrc}-${cols}-${rows}`}
            <cropper-canvas style="height: 320px" background>
              <cropper-image src={imageSrc} rotatable scalable translatable bind:this={imageEl}></cropper-image>
              <cropper-shade hidden></cropper-shade>
              <cropper-handle action="select" plain></cropper-handle>
              <cropper-selection
                bind:this={selectionEl}
                aspect-ratio={aspectRatio}
                initial-coverage="0.9"
                movable
                resizable>
                <cropper-grid role="grid" columns={cols} rows={rows} covered></cropper-grid>
                <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
                <cropper-handle action="n-resize"></cropper-handle>
                <cropper-handle action="e-resize"></cropper-handle>
                <cropper-handle action="s-resize"></cropper-handle>
                <cropper-handle action="w-resize"></cropper-handle>
                <cropper-handle action="ne-resize"></cropper-handle>
                <cropper-handle action="nw-resize"></cropper-handle>
                <cropper-handle action="se-resize"></cropper-handle>
                <cropper-handle action="sw-resize"></cropper-handle>
              </cropper-selection>
            </cropper-canvas>
          {/key}
        </div>
      </section>

      <!-- Options -->
      <section class="card space-y-2 bg-surface-100-900 p-4 text-sm">
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={numbering} />
          {$tr("mosaic.numbering")}
        </label>
        <label class="flex items-center gap-2">
          {$tr("mosaic.margin")}
          <input type="number" min="0" step="0.5" bind:value={marginMm} class="w-16 rounded-lg bg-surface-200-800 px-2 py-1 text-center" />
          <span>mm</span>
        </label>
      </section>
    </div>
  </main>
</div>
