<script lang="ts">
  import Dropdown from "bootstrap/js/dist/dropdown";
  import * as fabric from "fabric";
  import { onDestroy, onMount, tick } from "svelte";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import { appConfig, automation, connectionState, csvData, loadedFonts } from "$/stores";
  import {
    type ExportedLabelTemplate,
    type FabricJson,
    type LabelProps,
    type MoveDirection,
    type OjectType,
  } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { UndoRedo, type UndoState } from "$/utils/undo_redo";
  import BarcodeParamsPanel from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPicker from "$/components/designer-controls/ObjectPicker.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  // PIKT: deep restyle — M3 button in the selection toolbar + sheet-aware canvas hooks (editor phase 4).
  import Button from "$/components/ui/Button.svelte";
  import { closeAllSheets, anySheetOpen } from "$/components/ui/BottomSheet.svelte";
  import ArUcoParamsPanel from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import QrCodeParamsPanel from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import { DEFAULT_LABEL_PROPS, GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
  import { LabelDesignerUtils } from "$/utils/label_designer_utils";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import { CanvasUtils } from "$/utils/canvas_utils";

  let htmlCanvas: HTMLCanvasElement;

  let fabricCanvas = $state<CustomCanvas>();
  let labelProps = $state<LabelProps>(DEFAULT_LABEL_PROPS);
  let previewOpened = $state<boolean>(false);
  let selectedObject = $state<fabric.FabricObject | undefined>(undefined);
  let selectedCount = $state<number>(0);
  let editRevision = $state<number>(0);
  let printNow = $state<boolean>(false);
  let csvEnabled = $state<boolean>(false);
  let windowWidth = $state<number>(0);
  let undoState = $state<UndoState>({ undoDisabled: false, redoDisabled: false });
  let zoomText = $state<string>("100%");

  // PIKT: batch-item mode (Chantier 2). When `initialItem` is set, the editor loads it on mount and
  // fires `onDirty` on canvas changes so the host page can debounce + persist a thumbnail.
  interface Props {
    initialItem?: { labelProps: LabelProps; canvasState: FabricJson };
    onDirty?: () => void;
  }
  let { initialItem, onDirty }: Props = $props();

  export function getSnapshot(): { labelProps: LabelProps; canvasState: FabricJson; thumbnail?: string } {
    if (!fabricCanvas) return { labelProps, canvasState: {} as FabricJson };
    const canvasState = fabricCanvas.toObject() as unknown as FabricJson;
    const w = labelProps.size.width;
    const h = labelProps.size.height;
    const thumbnail = fabricCanvas.toDataURL({ format: "png", multiplier: 64 / Math.max(w, h, 1), quality: 0.85 });
    return { labelProps, canvasState, thumbnail };
  }

  const undo = new UndoRedo();

  const discardSelection = () => {
    fabricCanvas!.discardActiveObject();
    fabricCanvas!.requestRenderAll();
    selectedObject = undefined;
    selectedCount = 0;
    editRevision = 0;
  };

  const loadLabelData = async (data: ExportedLabelTemplate) => {
    undo.paused = true;
    onUpdateLabelProps(data.label);
    if (data.csv) {
      $csvData = data.csv;
      csvEnabled = true;
    }
    await FileUtils.loadCanvasState(fabricCanvas!, data.canvas);
    undo.paused = false;
  };

  undo.onLabelUpdate = loadLabelData;
  undo.onStateUpdate = (state: UndoState) => {
    undoState = state;
  };

  const deleteSelected = () => {
    LabelDesignerUtils.deleteSelection(fabricCanvas!);
    discardSelection();
  };

  const cloneSelected = () => {
    LabelDesignerUtils.cloneSelection(fabricCanvas!).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const moveSelected = (direction: MoveDirection, ctrl?: boolean) => {
    LabelDesignerUtils.moveSelection(fabricCanvas!, direction, ctrl);
    undo.push(fabricCanvas!, labelProps);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key: string = e.key.toLowerCase();
    // windows and linux users are used to ctrl, mac users use cmd
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    // Esc
    if (key === "escape") {
      discardSelection();
      return;
    }

    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    // Arrows
    if (key.startsWith("arrow")) {
      moveSelected(key.slice("arrow".length) as MoveDirection, cmdOrCtrl);
      return;
    }

    if (e.repeat) {
      return;
    }

    // Ctrl + D
    if (cmdOrCtrl && key === "d") {
      e.preventDefault();
      cloneSelected();
      return;
    }

    // Ctrl + Y, Ctrl + Shift + Z
    if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && e.shiftKey && key === "z")) {
      e.preventDefault();
      if (!undoState.redoDisabled) {
        undo.redo();
      }
      return;
    }

    // Ctrl + Z
    if (cmdOrCtrl && key === "z") {
      e.preventDefault();
      if (!undoState.undoDisabled) {
        undo.undo();
      }
      return;
    }

    // Del
    if (key === "delete" || key === "backspace") {
      deleteSelected();
      return;
    }
  };

  const onUpdateLabelProps = (newProps: LabelProps) => {
    labelProps = newProps;
    fabricCanvas!.setDimensions(labelProps.size);
    fabricCanvas!.virtualZoom(fabricCanvas!.getVirtualZoom());
    try {
      LocalStoragePersistence.saveLastLabelProps(labelProps);
      undo.push(fabricCanvas!, labelProps);
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters save error:");
    }
  };

  const exportCurrentLabel = (): ExportedLabelTemplate => {
    return FileUtils.makeExportedLabel(fabricCanvas!, labelProps, csvEnabled);
  };

  const onLoadRequested = (label: ExportedLabelTemplate) => {
    loadLabelData(label).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const zplImageReady = async (img: Blob) => {
    await LabelDesignerObjectHelper.addImageBlob(fabricCanvas!, img);
    undo.push(fabricCanvas!, labelProps);
  };

  const pdfImageReady = async (el: HTMLCanvasElement) => {
    const img = new fabric.FabricImage(el, {
      ...OBJECT_DEFAULTS,
      left: 0,
      top: 0,
    });

    fabricCanvas!.add(img);
    fabricCanvas!.setActiveObject(img);
    undo.push(fabricCanvas!, labelProps);
  };

  const onObjectPicked = (objectType: OjectType) => {
    const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, objectType);
    if (obj !== undefined) {
      fabricCanvas!.setActiveObject(obj);
      undo.push(fabricCanvas!, labelProps);
    }
  };

  const onIconPicked = (i: MaterialIcon) => {
    // todo: icon is not vertically centered
    LabelDesignerObjectHelper.addStaticText(fabricCanvas!, String.fromCodePoint(iconCodepoints[i]), {
      fontFamily: "Material Icons",
      fontSize: 100,
    });
    undo.push(fabricCanvas!, labelProps);
  };

  const onSvgIconPicked = (i: string) => {
    LabelDesignerObjectHelper.addSvg(fabricCanvas!, i);
    undo.push(fabricCanvas!, labelProps);
  };

  const openPreview = () => {
    printNow = false;
    previewOpened = true;
  };

  const openPreviewAndPrint = () => {
    printNow = true;
    previewOpened = true;
  };

  const controlValueUpdated = () => {
    if (selectedObject) {
      selectedObject.setCoords();
      selectedObject.dirty = true;
      undo.push(fabricCanvas!, labelProps);
    }
    fabricCanvas!.requestRenderAll();

    // trigger reactivity for controls
    editRevision++;
  };

  const getCanvasForPreview = (): FabricJson => {
    return fabricCanvas!.toJSON();
  };

  const onCsvPlaceholderPicked = (name: string) => {
    const obj = LabelDesignerObjectHelper.addText(fabricCanvas!, `{${name}}`, {
      textAlign: "left",
      originX: "left",
      originY: "top",
    });
    fabricCanvas!.setActiveObject(obj);
    undo.push(fabricCanvas!, labelProps);
  };

  const onPaste = async (event: ClipboardEvent) => {
    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    // PIKT: deep restyle — also bail while an M3 BottomSheet is open (phase 4; keeps the legacy
    // .dropdown-menu.show probe until the dropdown panels become sheets in phase 5).
    const openedDropdowns = document.querySelectorAll(".dropdown-menu.show");
    if (openedDropdowns.length > 0 || $anySheetOpen) {
      return;
    }

    if (event.clipboardData != null) {
      event.preventDefault();
      const obj = await LabelDesignerObjectHelper.addObjectFromClipboard(fabricCanvas!, event.clipboardData);

      if (obj !== undefined) {
        fabricCanvas!.setActiveObject(obj);
        undo.push(fabricCanvas!, labelProps);
      }
    }
  };

  const clearCanvas = () => {
    if (!confirm($tr("editor.clear.confirm"))) {
      return;
    }
    undo.push(fabricCanvas!, labelProps);
    fabricCanvas!.clear();
  };

  const toggleGrid = () => {
    const newVal = !$appConfig.gridEnabled;
    appConfig.update((cfg) => ({ ...cfg, gridEnabled: newVal }));
    fabricCanvas?.setGridEnabled(newVal);
  };

  const loadLabelFromUrl = async () => {
    try {
      const urlTemplate = await FileUtils.readLabelFromUrl();

      if (urlTemplate !== null && confirm($tr("params.saved_labels.load.url.warn"))) {
        onLoadRequested(urlTemplate);
        Toasts.message($tr("params.saved_labels.load.url.loaded"));
        return true;
      }
    } catch (e) {
      Toasts.error(e);
    }
    return false;
  }

  const loadDefaultLabel = async () => {
    const urlLoaded = await loadLabelFromUrl();

    if (urlLoaded) {
      return;
    }

    try {
      const defaultTemplate = LocalStoragePersistence.loadDefaultTemplate();

      if (defaultTemplate !== null) {
        onLoadRequested(defaultTemplate);
        return;
      }
    } catch (e) {
      Toasts.error(e);
    }

    LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
  };

  const renderOnFontsChanged = () => {
    fabricCanvas?.forEachObject((o) => {
      if (o instanceof fabric.Textbox) {
        o.dirty = true;
      }
    });
    fabricCanvas?.requestRenderAll();
  };

  onMount(async () => {
    try {
      const savedLabelProps = LocalStoragePersistence.loadLastLabelProps();
      if (savedLabelProps !== null) {
        labelProps = savedLabelProps;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters load error:");
    }

    fabricCanvas = new CustomCanvas(htmlCanvas, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });
    fabricCanvas.setLabelProps(labelProps);
    fabricCanvas.onZoomChange = (z) => {
      zoomText = Math.round(z * 100) + "%";
    };
    fabricCanvas.setGridEnabled(!!$appConfig.gridEnabled);

    if (initialItem && initialItem.canvasState && Object.keys(initialItem.canvasState as object).length > 0) {
      // PIKT: batch-item mode — load the persisted state instead of the default label.
      await loadLabelData({ label: initialItem.labelProps, canvas: initialItem.canvasState });
    } else if (initialItem) {
      // PIKT: fresh batch item — apply its labelProps but keep the default text.
      onUpdateLabelProps(initialItem.labelProps);
      LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
    } else {
      await loadDefaultLabel();
    }

    window.addEventListener("hashchange", loadLabelFromUrl);

    undo.push(fabricCanvas, labelProps);

    // force close dropdowns / sheets on touch devices
    // PIKT: deep restyle — also dismiss any open M3 BottomSheet on canvas tap (phase 4; the
    // Bootstrap Dropdown.hide() path stays until the dropdown panels become sheets in phase 5).
    fabricCanvas.on("mouse:down", (): void => {
      closeAllSheets();
      const dropdowns = document.querySelectorAll("[data-bs-toggle='dropdown']");
      dropdowns.forEach((el) => new Dropdown(el).hide());
    });

    fabricCanvas.on("object:moving", (e): void => {
      if (e.target && e.target.left !== undefined && e.target.top !== undefined) {
        e.target.set({
          left: Math.round(e.target.left / GRID_SIZE) * GRID_SIZE,
          top: Math.round(e.target.top / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    fabricCanvas.on("object:modified", (): void => {
      undo.push(fabricCanvas!, labelProps);
      onDirty?.();
    });

    fabricCanvas.on("text:changed", () => {
      editRevision++;
      onDirty?.();
    });

    fabricCanvas.on("object:added", (): void => {
      onDirty?.();
    });

    fabricCanvas.on("object:removed", (): void => {
      undo.push(fabricCanvas!, labelProps);
      onDirty?.();
    });

    fabricCanvas.on("selection:created", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:updated", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:cleared", (): void => {
      selectedObject = undefined;
      selectedCount = 0;
      editRevision++;
    });

    fabricCanvas.on("dragover", (e): void => {
      e.e.preventDefault();
    });

    fabricCanvas.on("drop:after", async (e): Promise<void> => {
      const dragEvt = e.e as DragEvent;
      dragEvt.preventDefault();

      let dropped = false;

      if (dragEvt.dataTransfer?.files) {
        for (const file of dragEvt.dataTransfer.files) {
          try {
            await LabelDesignerObjectHelper.addImageFile(fabricCanvas!, file);
            dropped = true;
          } catch (e) {
            Toasts.error(e);
          }
        }

        if (dropped) {
          undo.push(fabricCanvas!, labelProps);
        }
      }
    });

    fabricCanvas.on("object:scaling", (e): void => {
      if (!e.target) {
        return;
      }

      CanvasUtils.fixFabricObjectScale(e.target);
    });

    // userFonts.subscribe((e) => {console.log(e); renderOnFontsChanged();});

    if ($automation !== undefined) {
      if ($automation.startPrint !== undefined) {
        if ($automation.startPrint === "immediately") {
          openPreview();
        } else if ($automation.startPrint === "after_connect") {
          const unsubscribe = connectionState.subscribe((st) => {
            if (st === "connected") {
              tick().then(() => unsubscribe());
              openPreviewAndPrint();
            }
          });
        }
      }
    }
  });

  onDestroy(() => {
    fabricCanvas!.dispose();
    window.removeEventListener("hashchange", loadLabelFromUrl);
  });

  $effect(() => {
    fabricCanvas?.setLabelProps(labelProps);
  });

  $effect(() => {
    if (!previewOpened) {
      printNow = false;
    }
  });

  $effect(() => {
    if ($loadedFonts) {
      renderOnFontsChanged();
    }
  });
</script>

<svelte:window bind:innerWidth={windowWidth} onkeydown={onKeyDown} onpaste={onPaste} />

<div class="image-editor">
  <div class="row mb-3">
    <div class="col d-flex {windowWidth === 0 || labelProps.size.width < windowWidth ? 'justify-content-center' : ''}">
      <div class="canvas-wrapper print-start-{labelProps.printDirection}">
        <canvas bind:this={htmlCanvas}></canvas>
      </div>
    </div>
  </div>

  <!-- PIKT: redesigned editor toolbar — clear labeled buttons, Niimbot-inspired (Chantier 0.5) -->
  <div class="mx-auto mb-2 w-full max-w-3xl space-y-2">
    <!-- Add element -->
    <div class="flex flex-wrap items-stretch justify-center gap-1 rounded-2xl bg-surface-100-900 p-2">
      <button class="tool-cell" onclick={() => onObjectPicked("text")}>
        <MdIcon icon="title" /><span>{$tr("editor.objectpicker.text")}</span>
      </button>
      <button class="tool-cell" onclick={() => onObjectPicked("image")}>
        <MdIcon icon="image" /><span>{$tr("editor.objectpicker.image")}</span>
      </button>
      <button class="tool-cell" onclick={() => onObjectPicked("rectangle")}>
        <MdIcon icon="crop_square" /><span>{$tr("editor.objectpicker.rectangle")}</span>
      </button>
      <button class="tool-cell" onclick={() => onObjectPicked("qrcode")}>
        <MdIcon icon="qr_code_2" /><span>{$tr("editor.objectpicker.qrcode")}</span>
      </button>
      <button class="tool-cell" onclick={() => onObjectPicked("barcode")}>
        <MdIcon icon="view_week" /><span>{$tr("editor.objectpicker.barcode")}</span>
      </button>
      <IconPicker onSubmit={onIconPicked} onSubmitSvg={onSvgIconPicked} />
      <ObjectPicker onSubmit={onObjectPicked} {labelProps} {zplImageReady} {pdfImageReady} />
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center justify-center gap-1">
      <LabelPropsEditor {labelProps} onChange={onUpdateLabelProps} />
      <SavedLabelsMenu
        canvas={fabricCanvas!}
        onRequestLabelTemplate={exportCurrentLabel}
        {onLoadRequested}
        {csvEnabled} />
      <CsvControl bind:enabled={csvEnabled} onPlaceholderPicked={onCsvPlaceholderPicked} />

      <button class="tool-action" onclick={clearCanvas}>
        <MdIcon icon="cancel_presentation" /><span>{$tr("editor.clear")}</span>
      </button>
      <button class="tool-action" disabled={undoState.undoDisabled} onclick={() => undo.undo()}>
        <MdIcon icon="undo" /><span>{$tr("editor.undo")}</span>
      </button>
      <button class="tool-action" disabled={undoState.redoDisabled} onclick={() => undo.redo()}>
        <MdIcon icon="redo" /><span>{$tr("editor.redo")}</span>
      </button>
      <button class="tool-action {$appConfig.gridEnabled ? 'tool-action-active' : ''}" onclick={toggleGrid}>
        <MdIcon icon="grid_on" /><span>{$tr("editor.grid")}</span>
      </button>
      <button class="tool-action" onclick={() => fabricCanvas?.resetVirtualZoom()} title="Reset zoom">
        {zoomText}
      </button>

      <button class="tool-action text-primary-500" onclick={openPreview}>
        <MdIcon icon="visibility" /><span>{$tr("editor.preview")}</span>
      </button>
      <button
        class="tool-primary"
        onclick={openPreviewAndPrint}
        disabled={$connectionState !== "connected"}
        title={$tr("editor.print")}>
        <MdIcon icon="print" /><span>{$tr("editor.print")}</span>
      </button>
    </div>
  </div>

  <div class="row mb-1">
    <div class="col d-flex justify-content-center">
      <div class="toolbar d-flex flex-wrap gap-1 justify-content-center align-items-center">
        {#if selectedCount > 0}
          <!-- PIKT: deep restyle — Bootstrap btn -> M3 ui/Button, labelled per deep-restyle (editor phase 4). -->
          <Button variant="tonal" color="error" icon="delete" onclick={deleteSelected}>{$tr("editor.delete")}</Button>
          <Button variant="tonal" color="secondary" icon="content_copy" onclick={cloneSelected}>{$tr("editor.clone")}</Button>
        {/if}

        {#if selectedObject && selectedCount === 1}
          <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject}
          <VectorParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject instanceof fabric.IText}
          <TextParamsControls selectedText={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject instanceof QRCode}
          <QrCodeParamsPanel selectedQRCode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject instanceof ArUcoMarker}
          <ArUcoParamsPanel selectedArUco={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject instanceof Barcode}
          <BarcodeParamsPanel selectedBarcode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
        {/if}

        {#if selectedObject instanceof fabric.IText || selectedObject instanceof QRCode || (selectedObject instanceof Barcode && selectedObject.encoding === "CODE128B")}
          <VariableInsertControl {selectedObject} valueUpdated={controlValueUpdated} />
        {/if}
      </div>
    </div>
  </div>

  {#if previewOpened}
    <PrintPreview
      bind:show={previewOpened}
      canvasCallback={getCanvasForPreview}
      {labelProps}
      {printNow}
      {csvEnabled}
      csvData={$csvData.data} />
  {/if}
</div>

<style>
  .canvas-wrapper {
    border: 1px solid rgba(0, 0, 0, 0.4);
    background-color: rgba(60, 55, 63, 0.5);
  }
  .canvas-wrapper.print-start-left {
    border-left: 2px solid #ff4646;
  }
  .canvas-wrapper.print-start-top {
    border-top: 2px solid #ff4646;
  }
  .canvas-wrapper canvas {
    image-rendering: pixelated;
  }
</style>
