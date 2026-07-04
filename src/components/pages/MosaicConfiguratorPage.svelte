<script lang="ts">
  // PIKT: Mosaic configurator page — loads the item + its source image, then mounts the
  // configurator with the batch's label dimensions. Save writes mosaicConfig back on the item and
  // returns to the BatchManager. (Chantiers 2 & 4)
  import MosaicConfigurator from "$/components/mosaic/MosaicConfigurator.svelte";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { currentMosaicItemId, currentBatchId, navigate } from "$/stores/navigation";
  import { getItem, getImage, updateBatchItem } from "$/stores/batchStore";
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

  // PIKT: derive mm from the item's LabelProps (px). B2 Pro is 300 DPI => dpmm ≈ 11.81. When
  // Chantier 3.1 lands the size picker we can read a real dpmm off `$printerMeta`.
  const dpmm = 11.81;
  const labelWidthMm = $derived(item ? Math.max(1, Math.round(item.labelProps.size.width / dpmm)) : 50);
  const labelHeightMm = $derived(item ? Math.max(1, Math.round(item.labelProps.size.height / dpmm)) : 30);

  function back() {
    if ($currentBatchId) navigate("batch-manager");
    else navigate("home");
    currentMosaicItemId.set(undefined);
  }

  async function save(config: MosaicConfig) {
    if (!item) return;
    await updateBatchItem(item.id, { mode: "mosaic", mosaicConfig: config });
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
    imageSrc={imageUrl}
    onSave={save}
    onCancel={back} />
{/if}
