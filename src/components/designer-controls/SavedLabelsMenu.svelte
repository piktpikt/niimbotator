<script lang="ts">
  // PIKT: deep restyle — Bootstrap dropdown → M3 ui/BottomSheet + Button/TextField (editor phase 5).
  // Dropped `import Dropdown`; `new Dropdown().hide()` → sheetOpen = false. confirm() → M3 confirmM3().
  // Upstream PR candidate: no
  import { tr } from "$/utils/i18n";
  import { onMount } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import SavedLabelsBrowser from "$/components/designer-controls/SavedLabelsBrowser.svelte";
  import { ExportedLabelTemplateSchema, type ExportedLabelTemplate } from "$/types";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import * as fabric from "fabric";
  import { Utils } from "@mmote/niimbluelib";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { confirmM3 } from "$/utils/confirm";

  interface Props {
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    canvas: fabric.Canvas;
    csvEnabled: boolean;
  }

  let { onRequestLabelTemplate, onLoadRequested, canvas, csvEnabled }: Props = $props();

  let sheetOpen = $state(false);
  let savedLabels = $state<ExportedLabelTemplate[]>([]);
  let selectedIndex = $state<number>(-1);
  let title = $state<string>("");
  let usedSpace = $state<number>(0);
  let customDefaultTemplate = $state<boolean>(LocalStoragePersistence.hasCustomDefaultTemplate());
  let isStandalone = Utils.getAvailableTransports().capacitorBle;

  const calcUsedSpace = () => {
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const onLabelSelected = (index: number) => {
    selectedIndex = index;
    title = savedLabels[index]?.title ?? "";
  };

  const onLabelExport = (idx: number) => {
    try {
      FileUtils.saveLabelAsJson(savedLabels[idx]);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onLabelDelete = (idx: number) => {
    selectedIndex = -1;
    const result = [...savedLabels];
    result.splice(idx, 1);
    LocalStoragePersistence.saveLabels(result);

    savedLabels = result;
    title = "";
    calcUsedSpace();
  };

  const saveLabels = (labels: ExportedLabelTemplate[]) => {
    const { zodErrors, otherErrors } = LocalStoragePersistence.saveLabels(labels);
    zodErrors.forEach((e) => Toasts.zodErrors(e, "Label save error"));
    otherErrors.forEach((e) => Toasts.error(e));

    if (zodErrors.length === 0 && otherErrors.length === 0) {
      savedLabels = labels;
    }

    calcUsedSpace();
  };

  const onSaveReplaceClicked = async () => {
    if (selectedIndex === -1) {
      return;
    }

    if (!(await confirmM3($tr("editor.warning.save")))) {
      return;
    }

    const label = onRequestLabelTemplate();
    label.title = title;

    const result = [...savedLabels];
    result[selectedIndex] = label;

    saveLabels(result);
  };

  const onMakeDefaultClicked = () => {
    const label = onRequestLabelTemplate();
    label.title = title;
    label.thumbnailBase64 = undefined;
    LocalStoragePersistence.saveDefaultTemplate(label);
    customDefaultTemplate = true;
    calcUsedSpace();
  };

  const onRemoveDefaultClicked = () => {
    LocalStoragePersistence.saveDefaultTemplate(undefined);
    customDefaultTemplate = false;
    calcUsedSpace();
  };

  const onSaveClicked = () => {
    const label = onRequestLabelTemplate();
    label.title = title;
    const result = [...savedLabels, label];
    saveLabels(result);
  };

  const onLoadClicked = async () => {
    if (selectedIndex === -1) {
      return;
    }

    const label = savedLabels[selectedIndex];

    let message = $tr("editor.warning.load");

    if (label.csv) {
      message += "\n" + $tr("editor.warning.load.csv");
    }

    if (!(await confirmM3(message))) {
      return;
    }

    onLoadRequested(label);
    sheetOpen = false;
  };

  const onImportClicked = async () => {
    const contents = await FileUtils.pickAndReadSingleTextFile("json");
    const rawData = JSON.parse(contents);


    try {
      const label = ExportedLabelTemplateSchema.parse(rawData);

      let message = $tr("editor.warning.load");

      if (label.csv) {
        message += "\n" + $tr("editor.warning.load.csv");
      }

      if (!(await confirmM3(message))) {
        return;
      }

      onLoadRequested(label);

      if (label.title) {
        title = label.title;
      }

      sheetOpen = false;
    } catch (e) {
      Toasts.zodErrors(e, "Canvas load error:");
    }
  };

  const onExportClicked = () => {
    try {
      const label = onRequestLabelTemplate();
      if (title) {
        label.title = title.replaceAll(/[\\/:*?"<>|]/g, "_");
      }
      FileUtils.saveLabelAsJson(label);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onExportPngClicked = () => {
    try {
      FileUtils.saveCanvasAsPng(canvas);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onExportUrlClicked = async () => {
    try {
      const label = onRequestLabelTemplate();
      const url = await FileUtils.makeLabelUrl(label);

      if (url.length > 2000 && !(await confirmM3($tr("params.saved_labels.save.url.warn")))) {
        return;
      }

      navigator.clipboard.writeText(url);
      Toasts.message($tr("params.saved_labels.save.url.copied"));
    } catch (e) {
      Toasts.error(e);
    }
  };

  onMount(() => {
    savedLabels = LocalStoragePersistence.loadLabels();
    calcUsedSpace();
  });
</script>

<button class="tool-action" onclick={() => (sheetOpen = true)}>
  <MdIcon icon="sd_storage" /><span>{$tr("editor.toolbar.save")}</span>
</button>

<BottomSheet bind:open={sheetOpen} title={$tr("params.saved_labels.menu_title")}>
  <div class="flex flex-col gap-4">
    <p class="text-body-small text-surface-600-400">
      {usedSpace}
      {$tr("params.saved_labels.kb_used")}
    </p>

    {#if csvEnabled}
      <p class="text-body-small text-warning-500">
        {$tr("params.saved_labels.save.withcsv")}
      </p>
    {/if}

    <div class="flex flex-wrap gap-2">
      <Button variant="outlined" icon="data_object" onclick={onImportClicked}>
        {$tr("params.saved_labels.load.json")}
      </Button>
      <Button variant="outlined" icon="data_object" onclick={onExportClicked}>
        {$tr("params.saved_labels.save.json")}
      </Button>
      <Button variant="outlined" onclick={onExportPngClicked}>PNG</Button>
      {#if !isStandalone}
        <Button variant="outlined" onclick={onExportUrlClicked}>
          {$tr("params.saved_labels.save.url")}
        </Button>
      {/if}
    </div>

    <SavedLabelsBrowser
      {selectedIndex}
      labels={savedLabels}
      onItemClicked={onLabelSelected}
      onItemDelete={onLabelDelete}
      onItemExport={onLabelExport} />

    <TextField
      value={title}
      label={$tr("params.saved_labels.label_title")}
      placeholder={$tr("params.saved_labels.label_title.placeholder")}
      onChange={(v) => (title = v)} />

    <div class="flex flex-wrap items-center justify-end gap-2">
      <div class="mr-auto flex items-center gap-1">
        <Button variant="text" color="secondary" onclick={onMakeDefaultClicked}>
          {$tr("params.saved_labels.make_default")}
        </Button>
        {#if customDefaultTemplate}
          <Button
            variant="text"
            color="secondary"
            icon="close"
            ariaLabel={$tr("params.saved_labels.make_default")}
            onclick={onRemoveDefaultClicked} />
        {/if}
      </div>

      <Button variant="tonal" color="secondary" icon="save" onclick={onSaveClicked}>
        {$tr("params.saved_labels.save.browser")}
      </Button>

      {#if selectedIndex !== -1}
        <Button variant="tonal" color="secondary" icon="edit_note" onclick={onSaveReplaceClicked}>
          {$tr("params.saved_labels.save.browser.replace")}
        </Button>

        <Button variant="filled" color="primary" icon="folder" onclick={onLoadClicked}>
          {$tr("params.saved_labels.load.browser")}
        </Button>
      {/if}
    </div>
  </div>
</BottomSheet>
