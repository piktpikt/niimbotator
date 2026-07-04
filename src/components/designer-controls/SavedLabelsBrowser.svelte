<script lang="ts">
  // PIKT: deep restyle — Bootstrap btn/flex utils → M3 ui/Button + Tailwind (editor phase 5 finalize). Upstream PR candidate: no
  import type { ExportedLabelTemplate, LabelProps } from "$/types";
  import { tr } from "$/utils/i18n";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    onItemClicked: (index: number) => void;
    onItemDelete: (index: number) => void;
    onItemExport: (index: number) => void;
    labels: ExportedLabelTemplate[];
    selectedIndex?: number;
    class?: string;
  }

  let { onItemClicked, onItemDelete, onItemExport, labels, selectedIndex = -1, class: className }: Props = $props();

  let deleteIndex = $state<number>(-1);

  const scaleDimensions = (preset: LabelProps): { width: number; height: number } => {
    const scaleFactor = Math.min(100 / preset.size.width, 100 / preset.size.height);
    return {
      width: Math.round(preset.size.width * scaleFactor),
      height: Math.round(preset.size.height * scaleFactor),
    };
  };

  const deleteConfirmed = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = -1;
    onItemDelete(idx);
  };

  const deleteRejected = (e: MouseEvent) => {
    e.stopPropagation();
    deleteIndex = -1;
  };

  const deleteRequested = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = idx;
  };

  const exportRequested = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    onItemExport(idx);
  };
</script>

<div
  class="labels-browser overflow-y-auto border border-surface-300-700 rounded-lg flex p-2 gap-1 flex-wrap {className}">
  {#each labels as item, idx (item.id ?? item.timestamp)}
    <div
      tabindex="0"
      class="p-0 card-wrapper flex justify-center items-center rounded-lg {selectedIndex === idx
        ? 'ring-2 ring-primary-500'
        : ''}"
      onkeydown={() => onItemClicked(idx)}
      onclick={() => onItemClicked(idx)}
      role="button">
      <div
        class="card print-start-{item.label.printDirection} flex justify-center items-center"
        style="width: {scaleDimensions(item.label).width}%; height: {scaleDimensions(item.label).height}%;">
        <div class="buttons flex">
          <Button
            variant="text"
            color="primary"
            icon="download"
            ariaLabel={$tr("params.saved_labels.save.json")}
            onclick={(e) => exportRequested(e, idx)} />

          {#if deleteIndex === idx}
            <Button variant="text" color="error" icon="delete" onclick={(e) => deleteConfirmed(e, idx)} />
            <Button variant="text" color="secondary" icon="close" onclick={(e) => deleteRejected(e)} />
          {:else}
            <Button variant="text" color="error" icon="delete" onclick={(e) => deleteRequested(e, idx)} />
          {/if}
        </div>

        {#if item.thumbnailBase64}
          <img class="thumbnail" src={item.thumbnailBase64} alt="thumbnail" />
        {/if}

        {#if item.title}
          <span class="label p-1">
            {item.title}
          </span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .labels-browser {
    max-height: 200px;
    max-width: 100%;
    min-height: 96px;
  }

  .card-wrapper {
    width: 96px;
    height: 96px;
  }

  .card {
    background-color: white;
    position: relative;
  }

  .card > .buttons {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
  }

  .card > .buttons > button {
    padding: 0;
    line-height: 100%;
  }

  .card > .label {
    background-color: rgba(255, 255, 255, 0.8);
    color: black;
    border-radius: 8px;
    z-index: 1;
  }

  .card.print-start-left {
    border-left: 2px solid #ff4646;
  }
  .card.print-start-top {
    border-top: 2px solid #ff4646;
  }

  .card .thumbnail {
    width: 100%;
    height: 100%;
    position: absolute;
  }
</style>
