<script lang="ts">
  // PIKT: deep restyle — Bootstrap dropdown → M3 ui/BottomSheet + Switch/TextField/Button (editor phase 5).
  // Upstream PR candidate: no
  import { tr } from "$/utils/i18n";
  import { csvParse } from "d3-dsv";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { type CsvParams } from "$/types";
  import { csvData } from "$/stores";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import Switch from "$/components/ui/Switch.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    enabled: boolean;
    onPlaceholderPicked: (name: string) => void;
  }

  let { enabled = $bindable(), onPlaceholderPicked }: Props = $props();

  let open = $state(false);
  let placeholders = $state<string[]>([]);
  let rows = $state<number>(0);

  const parse = (csv: CsvParams) => {
    const result = csvParse(csv.data);
    placeholders = result.columns;
    rows = result.length;
  };

  $effect(() => {
    parse($csvData);
  });
</script>

<button
  class="tool-action {enabled ? 'tool-action-active' : ''}"
  onclick={() => (open = true)}
  title={$tr("params.csv.title")}>
  <MdIcon icon="dataset" /><span>{$tr("editor.toolbar.csv")}</span>
</button>

<BottomSheet bind:open title={$tr("params.csv.title")}>
  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-3">
      <Switch checked={enabled} onChange={(v) => (enabled = v)} ariaLabel={$tr("params.csv.enabled")} />
      <span>{$tr("params.csv.enabled")}</span>
    </label>

    <div>
      {$tr("params.csv.tip")}
    </div>

    <TextField
      multiline
      rows={4}
      value={$csvData.data}
      onChange={(v) => {
        $csvData.data = v;
        enabled = true;
      }} />

    <div class="placeholders pt-1">
      {$tr("params.csv.rowsfound")} <strong>{rows}</strong>
    </div>
    <div class="placeholders flex flex-wrap items-center gap-2 pt-1">
      {$tr("params.csv.placeholders")}
      {#each placeholders as p (p)}
        <Button variant="tonal" onclick={() => onPlaceholderPicked(p)}>{`{${p}}`}</Button>
      {/each}
    </div>
  </div>
</BottomSheet>
