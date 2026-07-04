<script lang="ts">
  // PIKT: designer-control migrated from Bootstrap to M3 primitives (deep restyle).
  // Upstream PR candidate: no
  import { ArUcoMarker, type ArUcoDictionary } from "$/fabric-object/aruco";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import SegmentedButton from "$/components/ui/SegmentedButton.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { tr } from "$/utils/i18n";

  interface Props {
    selectedArUco: ArUcoMarker;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedArUco, editRevision, valueUpdated }: Props = $props();

  const dictOptions: { value: ArUcoDictionary; label: string; max: number }[] = [
    { value: "4x4", label: "4x4 (50)", max: 49 },
    { value: "5x5", label: "5x5 (50)", max: 49 },
    { value: "6x6", label: "6x6 (50)", max: 49 },
  ];

  let maxId = $derived(dictOptions.find((d) => d.value === selectedArUco.dictionary)?.max ?? 49);
</script>

<input type="hidden" value={editRevision} />

<div class="flex items-center gap-1">
  <MdIcon icon="grid_on" />
  <SegmentedButton
    options={dictOptions.map((d) => ({ value: d.value, label: d.label }))}
    value={selectedArUco.dictionary}
    ariaLabel={$tr("params.aruco.dict")}
    onChange={(v) => {
      selectedArUco?.set("dictionary", v);
      const newMax = dictOptions.find((d) => d.value === v)?.max ?? 49;
      if (selectedArUco.markerId > newMax) {
        selectedArUco?.set("markerId", 0);
      }
      valueUpdated();
    }} />
</div>

<TextField
  type="number"
  inputmode="numeric"
  leadingIcon="tag"
  min={0}
  max={maxId}
  value={selectedArUco.markerId}
  ariaLabel={$tr("params.aruco.marker_id")}
  onChange={(v) => {
    const val = parseInt(v);
    if (!isNaN(val) && val >= 0 && val <= maxId) {
      selectedArUco?.set("markerId", val);
      valueUpdated();
    }
  }} />
