<script lang="ts">
  // PIKT: Mosaïque tool tile (Chantier Mosaïque, phase 1). Opens a chooser: Découper (1 image → N tiles,
  // wired to the existing configurator + tile-by-tile batch print engine) or Collage (N photos → 1 label,
  // phase 3 — shown as "bientôt" for now). Shapes/icons are inline SVG (no curated-icon-subset entry).
  import { tr } from "$/utils/i18n";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import { Toasts } from "$/utils/toasts";
  import { startMosaicDecoupe } from "$/services/mosaicEntry";

  interface Props {
    /** Collage: compose the picked images onto the current label (handled by the editor). */
    onCollage: (files: File[]) => void;
  }

  let { onCollage }: Props = $props();

  let open = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let collageInput = $state<HTMLInputElement | null>(null);

  const chooseDecoupe = (): void => {
    open = false;
    fileInput?.click();
  };

  const chooseCollage = (): void => {
    open = false;
    collageInput?.click();
  };

  const onFilePicked = async (e: Event): Promise<void> => {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = ""; // allow reselecting the same file next time
    if (!file) return;
    try {
      await startMosaicDecoupe(file);
    } catch (err) {
      Toasts.error(err);
    }
  };

  const onCollagePicked = (e: Event): void => {
    const el = e.target as HTMLInputElement;
    const files = Array.from(el.files ?? []);
    el.value = ""; // allow reselecting the same files next time
    if (files.length) onCollage(files);
  };
</script>

<input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={onFilePicked} />
<input bind:this={collageInput} type="file" accept="image/*" multiple class="hidden" onchange={onCollagePicked} />

<button class="tool-cell" onclick={() => (open = true)}>
  <span class="tile-chip tile-sky">
    <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  </span>
  <span>{$tr("editor.mosaic.title")}</span>
</button>

<BottomSheet bind:open title={$tr("editor.mosaic.title")}>
  <button
    class="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-200-800"
    onclick={chooseDecoupe}>
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-500">
      <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-medium">{$tr("editor.mosaic.decoupe")}</span>
      <span class="block text-sm text-surface-600-400">{$tr("editor.mosaic.decoupe.sub")}</span>
    </span>
  </button>

  <button
    class="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-200-800"
    onclick={chooseCollage}>
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-500">
      <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="7" width="12" height="12" rx="2" />
        <rect x="9" y="3" width="12" height="12" rx="2" />
      </svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-medium">{$tr("editor.mosaic.collage")}</span>
      <span class="block text-sm text-surface-600-400">{$tr("editor.mosaic.collage.sub")}</span>
    </span>
  </button>
</BottomSheet>
