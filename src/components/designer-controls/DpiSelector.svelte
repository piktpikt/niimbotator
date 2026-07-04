<script lang="ts">
  // PIKT: deep restyle — Bootstrap form-select/form-control → M3 ui/* primitives (editor phase 2).
  // Upstream PR candidate: no
  import { tr } from "$/utils/i18n";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import TextField from "$/components/ui/TextField.svelte";

  interface Props {
    value: number;
  }

  let { value = $bindable() }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
  <span class="text-label-medium text-surface-600-400">{$tr("params.label.head_density")}</span>

  <SegmentedButton
    options={[
      { value: 8, label: "203dpi" },
      { value: 11.81, label: "300dpi" },
    ]}
    {value}
    onChange={(v) => (value = v)} />

  <TextField
    type="number"
    value={value}
    min={1}
    inputmode="decimal"
    onChange={(v) => {
      const n = Number(v);
      if (Number.isFinite(n)) value = n;
    }} />

  <span class="text-label-medium text-surface-600-400 cursor-help" title={$tr("params.label.head_density.help")}>
    {$tr("params.label.dpmm")}
  </span>
</div>
