<script lang="ts">
  // PIKT: Mosaic configurator (Chantier 4 + mosaic chantier). Presets/custom grid + Portrait/Paysage
  // orientation + Cropper.js v2. Crop model = FIXED mosaic frame (aspect locked to the
  // (cols·tileW)/(rows·tileH) invariant) with a MOVABLE/ZOOMABLE/ROTATABLE image behind it (photo-crop
  // UX). Save bakes the framed region via selection.$toCanvas() so pan/zoom/rotation are captured, and
  // hands the rendered blob up — the print pipeline then just splits that already-framed image.
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
    onSave: (config: MosaicConfig, croppedBlob?: Blob) => void;
    onCancel: () => void;
  }

  let { initial, labelWidthMm, labelHeightMm, imageSrc, onSave, onCancel }: Props = $props();

  // Render resolution for the baked crop (B2 Pro ≈ 300 DPI ⇒ 11.81 px/mm).
  const RENDER_DPMM = 11.81;

  type Orientation = "landscape" | "portrait";
  type CropperImageEl = HTMLElement & {
    $zoom: (scale: number, x?: number, y?: number) => void;
    $rotate: (angle: number | string) => void;
  };
  type CropperSelectionEl = HTMLElement & {
    $reset?: () => void;
    $toCanvas?: (o?: { width?: number; height?: number }) => Promise<HTMLCanvasElement>;
  };

  const presets = [
    { cols: 2, rows: 2, label: "2×2" },
    { cols: 3, rows: 3, label: "3×3" },
    { cols: 4, rows: 4, label: "4×4" },
    { cols: 6, rows: 4, label: "6×4" },
  ];

  let cols = $state(initial?.cols ?? 3);
  let rows = $state(initial?.rows ?? 3);
  let orientation = $state<Orientation>("landscape");
  let numbering = $state(initial?.numbering ?? false);
  let marginMm = $state(initial?.marginMm ?? 0);

  // A single tile is the label rotated per orientation.
  const tileWmm = $derived(orientation === "landscape" ? labelWidthMm : labelHeightMm);
  const tileHmm = $derived(orientation === "landscape" ? labelHeightMm : labelWidthMm);

  const aspectRatio = $derived(mosaicAspectRatio(tileWmm, tileHmm, cols, rows));
  const totalW = $derived(cols * tileWmm);
  const totalH = $derived(rows * tileHmm);
  const tileCount = $derived(cols * rows);

  // The crop canvas takes the mosaic's own aspect ratio (bounded) so the WHOLE frame — every tile — is
  // always visible, whether the mosaic is landscape (wide/short) or portrait (narrow/tall).
  const CROP_BOX_W = 340;
  const CROP_BOX_H = 420;
  const canvasW = $derived(Math.round(Math.min(CROP_BOX_W, CROP_BOX_H * aspectRatio)));
  const canvasH = $derived(Math.max(1, Math.round(canvasW / aspectRatio)));

  let selectionEl = $state<CropperSelectionEl | null>(null);
  let imageEl = $state<CropperImageEl | null>(null);

  // Keep the fixed frame's aspect ratio in sync with grid + orientation, and re-centre it on change.
  $effect(() => {
    const ar = aspectRatio;
    if (selectionEl) {
      selectionEl.setAttribute("aspect-ratio", String(ar));
      selectionEl.$reset?.();
    }
  });

  const zoomImage = (ratio: number): void => {
    try {
      imageEl?.$zoom(ratio);
    } catch {
      /* image not ready yet */
    }
  };

  const rotateImage = (): void => {
    try {
      imageEl?.$rotate("90deg");
    } catch {
      /* image not ready yet */
    }
  };

  async function save() {
    const width = Math.max(1, Math.round(totalW * RENDER_DPMM));
    const height = Math.max(1, Math.round(totalH * RENDER_DPMM));
    const config: MosaicConfig = { rows, cols, cropRect: { x: 0, y: 0, width, height }, numbering, marginMm };
    try {
      const canvas = await selectionEl?.$toCanvas?.({ width, height });
      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
        onSave(config, blob ?? undefined);
        return;
      }
    } catch {
      /* fall through to config-only save */
    }
    onSave(config);
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

      <!-- Orientation -->
      <section class="card space-y-2 bg-surface-100-900 p-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.orientation")}</h2>
        <div class="flex gap-1">
          <button
            class="tool-action {orientation === 'landscape' ? 'tool-action-active' : ''}"
            onclick={() => (orientation = "landscape")}>
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="6" width="18" height="12" rx="2" />
            </svg>
            <span>{$tr("mosaic.landscape")}</span>
          </button>
          <button
            class="tool-action {orientation === 'portrait' ? 'tool-action-active' : ''}"
            onclick={() => (orientation = "portrait")}>
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="3" width="12" height="18" rx="2" />
            </svg>
            <span>{$tr("mosaic.portrait")}</span>
          </button>
        </div>
      </section>

      <!-- Live result -->
      <section class="card bg-surface-100-900 p-4 text-sm">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.result")}</h2>
        <div>{$tr("mosaic.dimensions")}: {totalW} × {totalH} mm</div>
        <div>{$tr("mosaic.tile_count")}: {tileCount} ({cols}×{rows})</div>
        <div>{$tr("mosaic.tile_size")}: {tileWmm} × {tileHmm} mm</div>
      </section>

      <!-- Cropper.js: fixed frame, movable/zoomable/rotatable image -->
      <section class="card bg-surface-100-900 p-2">
        <h2 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("mosaic.crop")}</h2>
        <div class="overflow-hidden rounded-xl">
          {#key `${imageSrc}-${canvasW}x${canvasH}`}
            <cropper-canvas class="mx-auto block" style="width: {canvasW}px; height: {canvasH}px" background>
              <cropper-image src={imageSrc} rotatable scalable translatable bind:this={imageEl}></cropper-image>
              <cropper-shade></cropper-shade>
              <cropper-handle action="move"></cropper-handle>
              <cropper-selection bind:this={selectionEl} aspect-ratio={aspectRatio} initial-coverage="0.82" outlined>
                <cropper-grid role="grid" columns={cols} rows={rows} covered></cropper-grid>
              </cropper-selection>
            </cropper-canvas>
          {/key}
        </div>
        <div class="mt-2 flex items-center justify-center gap-2">
          <button class="tool-action" aria-label={$tr("mosaic.zoom_out")} onclick={() => zoomImage(-0.15)}>
            <MdIcon icon="remove" />
          </button>
          <button class="tool-action" aria-label={$tr("mosaic.zoom_in")} onclick={() => zoomImage(0.15)}>
            <MdIcon icon="add" />
          </button>
          <button class="tool-action" aria-label={$tr("mosaic.rotate")} onclick={rotateImage}>
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 8 16 8" />
            </svg>
          </button>
        </div>
        <p class="mt-1 px-2 text-center text-xs text-surface-500">{$tr("mosaic.crop_hint")}</p>
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
