<script lang="ts">
  // PIKT: Mosaic configurator page — loads the item + its source image, then mounts the
  // configurator with the batch's label dimensions. Save writes mosaicConfig back on the item and
  // returns to the BatchManager. (Chantiers 2 & 4)
  import MosaicConfigurator from "$/components/mosaic/MosaicConfigurator.svelte";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { currentMosaicItemId, currentBatchId, navigate } from "$/stores/navigation";
  import { getItem, getImage, updateBatchItem, addImage } from "$/stores/batchStore";
  import { activePrinterMetrics } from "$/stores/printerMetrics";
  import type { BatchItem, MosaicConfig } from "$/db/schema";

  let item = $state<BatchItem | undefined>(undefined);
  let imageUrl = $state<string | undefined>(undefined);
  let loading = $state(true);

  $effect(() => {
    const id = $currentMosaicItemId;
    loading = true;
    (async () => {
      if (!id) return;
      const it = await getItem(id);
      item = it;
      if (it) {
        if (it.sourceImageId) {
          const img = await getImage(it.sourceImageId);
          if (img) imageUrl = URL.createObjectURL(img.blob);
        }
      }
      loading = false;
    })();
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = undefined;
    };
  });

  // PIKT: the label's real dpmm (Roadmap P1) — the resolution it was authored at, else the connected
  // printer's, else a safe default. Replaces the old hardcoded 11.81 so px<->mm is correct per printer.
  const dpmm = $derived(item?.labelProps.size.dpmm ?? $activePrinterMetrics.dpmm);
  const labelWidthMm = $derived(item ? Math.max(1, Math.round(item.labelProps.size.width / dpmm)) : 50);
  const labelHeightMm = $derived(item ? Math.max(1, Math.round(item.labelProps.size.height / dpmm)) : 30);

  function back() {
    if ($currentBatchId) navigate("batch-manager");
    else navigate("home");
    currentMosaicItemId.set(undefined);
  }

  // PIKT: the configurator bakes the framed region (pan/zoom/rotation) into a rendered blob; store it as
  // the item's source image so the print pipeline just splits the already-framed image.
  async function save(config: MosaicConfig, croppedBlob?: Blob) {
    if (!item) return;
    let sourceImageId = item.sourceImageId;
    if (croppedBlob) {
      sourceImageId = await addImage(croppedBlob, "mosaic-crop.png");
    }
    await updateBatchItem(item.id, { mode: "mosaic", mosaicConfig: config, sourceImageId });
    back();
  }
</script>

{#if loading}
  <div class="flex h-dvh items-center justify-center bg-surface-50-950 text-surface-500">
    <span class="text-sm">…</span>
  </div>
{:else if !item}
  <div class="flex h-dvh flex-col items-center justify-center gap-3 bg-surface-50-950 p-8 text-center text-surface-500">
    <MdIcon icon="warning" />
    <span class="text-sm">{$tr("batches.item.empty")}</span>
    <button class="tool-primary" onclick={back}>{$tr("editor.autosave.saved")}</button>
  </div>
{:else if !imageUrl}
  <!-- Shouldn't happen: BatchManager gates entry on sourceImageId. Defensive empty-state. -->
  <div class="flex h-dvh flex-col items-center justify-center gap-3 bg-surface-50-950 p-8 text-center text-surface-500">
    <MdIcon icon="add_photo_alternate" />
    <span class="text-sm">{$tr("batches.item.pick_image")}</span>
    <button class="tool-primary" onclick={back}>{$tr("editor.autosave.saved")}</button>
  </div>
{:else}
  <MosaicConfigurator
    initial={item.mosaicConfig}
    labelWidthMm={labelWidthMm}
    labelHeightMm={labelHeightMm}
    renderDpmm={dpmm}
    imageSrc={imageUrl}
    onSave={save}
    onCancel={back} />
{/if}
