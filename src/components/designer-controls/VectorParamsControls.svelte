<script lang="ts">
  // PIKT: deep restyle — Bootstrap form-select/form-control → M3 ui/* primitives (editor phase 2).
  // Upstream PR candidate: no
  import { tr } from "$/utils/i18n";
  import TextField from "$/components/ui/TextField.svelte";
  import ThermalFill from "$/components/ui/ThermalFill.svelte";
  import * as fabric from "fabric";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const roundRadiusChanged = (value: number) => {
    const rect = selectedObject as fabric.Rect;
    rect.set({
      rx: value,
      ry: value,
    });
    valueUpdated();
  };

  const strokeWidthChanged = (value: number) => {
    selectedObject.set({ strokeWidth: value });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedObject.set({ fill: value });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision} />

{#if selectedObject instanceof fabric.Rect}
  <TextField
    type="number"
    inputmode="numeric"
    leadingIcon="rounded_corner"
    value={selectedObject.rx}
    min={0}
    max={Math.min(selectedObject.width, selectedObject.height) / 2}
    ariaLabel={$tr("params.vector.round_radius")}
    onChange={(v) => roundRadiusChanged(Number(v))} />
{/if}

{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle || selectedObject instanceof fabric.Line || selectedObject instanceof fabric.Polyline}
  <TextField
    type="number"
    inputmode="numeric"
    leadingIcon="line_weight"
    value={selectedObject.strokeWidth}
    min={1}
    ariaLabel={$tr("params.vector.stroke_width")}
    onChange={(v) => strokeWidthChanged(Number(v))} />
{/if}

{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle}
  <div class="flex flex-col gap-2">
    <span class="text-label-medium text-surface-600-400">{$tr("params.vector.fill")}</span>
    <ThermalFill
      value={typeof selectedObject.fill === "string" ? selectedObject.fill : "transparent"}
      ariaLabel={$tr("params.vector.fill")}
      options={[
        { value: "transparent", label: $tr("params.color.transparent") },
        { value: "white", label: $tr("params.color.white") },
        { value: "black", label: $tr("params.color.black") },
      ]}
      onChange={(v) => fillChanged(v)} />
  </div>
{/if}
