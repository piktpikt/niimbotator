<script lang="ts">
  // PIKT: Per-item print-settings override (density / contrast / dithering) for a batch item. Falls back to
  // the batch's global settings when the override is off. Model already supports it (BatchItem.printSettings).
  import type { BatchItem } from "$/db/schema";
  import type { PostProcessType } from "$/types";
  import { setItemPrintSettings } from "$/stores/batchStore";
  import { activePrinterMetrics } from "$/stores/printerMetrics";
  import { tr } from "$/utils/i18n";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import Slider from "$/components/ui/Slider.svelte";
  import Select from "$/components/ui/Select.svelte";
  import Switch from "$/components/ui/Switch.svelte";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    item: BatchItem | undefined;
    open: boolean;
  }
  let { item, open = $bindable(false) }: Props = $props();

  let enabled = $state(false);
  let density = $state(3);
  let threshold = $state(140);
  let postProcess = $state<PostProcessType>("threshold");
  let invert = $state(false);
  let syncedId = $state<string | undefined>(undefined);

  // Sync from the item once per open, then edit optimistically (see memory svelte-fabric-reactivity) so a
  // DB round-trip from persist() doesn't clobber the control mid-edit.
  $effect(() => {
    if (open && item && item.id !== syncedId) {
      const ps = item.printSettings;
      enabled = !!ps;
      density = ps?.density ?? $activePrinterMetrics.densityDefault;
      threshold = ps?.threshold ?? 140;
      postProcess = ps?.postProcess ?? "threshold";
      invert = ps?.postProcessInvert ?? false;
      syncedId = item.id;
    } else if (!open) {
      syncedId = undefined;
    }
  });

  function persist() {
    if (!item) return;
    void setItemPrintSettings(item.id, enabled ? { density, threshold, postProcess, postProcessInvert: invert } : undefined);
  }
</script>

<BottomSheet bind:open title={$tr("batches.item.settings.title")}>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="text-title-small">{$tr("batches.item.settings.override")}</div>
      <div class="text-label-medium text-surface-500">{$tr("batches.item.settings.hint")}</div>
    </div>
    <Switch
      checked={enabled}
      ariaLabel={$tr("batches.item.settings.override")}
      onChange={(v) => {
        enabled = v;
        persist();
      }} />
  </div>

  {#if enabled}
    <div class="mt-4 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <span class="w-24 shrink-0 text-label-large">{$tr("preview.density")}</span>
        <Slider
          value={density}
          min={$activePrinterMetrics.densityMin}
          max={$activePrinterMetrics.densityMax}
          ariaLabel={$tr("preview.density")}
          onChange={(v) => {
            density = v;
            persist();
          }} />
        <span class="w-6 text-center text-label-large tabular-nums">{density}</span>
      </div>

      <div class="flex items-end gap-2">
        <div class="flex-1">
          <Select
            label={$tr("preview.postprocess")}
            value={postProcess ?? "threshold"}
            options={[
              { value: "threshold", label: $tr("preview.postprocess.threshold") },
              { value: "dither", label: $tr("preview.postprocess.atkinson") },
              { value: "bayer", label: $tr("preview.postprocess.bayer") },
            ]}
            ariaLabel={$tr("preview.postprocess")}
            onChange={(v) => {
              postProcess = v as PostProcessType;
              persist();
            }} />
        </div>
        <Button
          variant={invert ? "tonal" : "outlined"}
          icon="invert_colors"
          ariaLabel={$tr("preview.postprocess")}
          onclick={() => {
            invert = !invert;
            persist();
          }} />
      </div>

      {#if (postProcess ?? "threshold") === "threshold"}
        <div class="flex items-center gap-3">
          <span class="w-24 shrink-0 text-label-large">{$tr("preview.threshold")}</span>
          <Slider
            value={threshold}
            min={1}
            max={254}
            ariaLabel={$tr("preview.threshold")}
            onChange={(v) => {
              threshold = v;
              persist();
            }} />
          <span class="w-8 text-center text-label-large tabular-nums">{threshold}</span>
        </div>
      {/if}
    </div>
  {/if}
</BottomSheet>
