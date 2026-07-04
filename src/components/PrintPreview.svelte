<script lang="ts">
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
  import { appConfig, connectionState, printerClient, printerMeta, refreshRfidInfo } from "$/stores";
  // PIKT: render pipeline extracted to $/utils/labelRender for headless reuse (batch print)
  // Upstream PR candidate: no
  import { rasterizeLabel, compositeLabel } from "$/utils/labelRender";
  import {
    type EncodedImage,
    ImageEncoder,
    LabelType,
    printTaskNames,
    type PrintProgressEvent,
    type PrintTaskName,
    AbstractPrintTask,
    Utils,
  } from "@mmote/niimbluelib";
  import type { LabelProps, PostProcessType, FabricJson, PreviewProps, PreviewPropsOffset } from "$/types";
  import ParamLockButton from "$/components/basic/ParamLockButton.svelte";
  import { tr, type TranslationKey } from "$/utils/i18n";
  import { type DSVRowArray, csvParse } from "d3-dsv";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  // PIKT: M3 restyle — AppModal -> Dialog, Bootstrap controls -> M3 primitives. Upstream PR candidate: no
  import Dialog from "$/components/ui/Dialog.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Select from "$/components/ui/Select.svelte";
  import Slider from "$/components/ui/Slider.svelte";

  interface Props {
    labelProps: LabelProps;
    canvasCallback: () => FabricJson;
    printNow?: boolean;
    csvData: string;
    csvEnabled: boolean;
    show: boolean;
  }

  let { labelProps, canvasCallback, printNow = false, csvData, csvEnabled, show = $bindable() }: Props = $props();

  let previewCanvas: HTMLCanvasElement;
  let printState = $state<"idle" | "sending" | "printing">("idle");
  let printProgress = $state<number>(0); // todo: more progress data
  let density = $state<number>($printerMeta?.densityDefault ?? 3);
  let speed = $state<0 | 1>(1);
  let quantity = $state<number>(1);
  let postProcessType = $state<PostProcessType>();
  let postProcessInvert = $state<boolean>(false);
  let thresholdValue = $state<number>(140);
  let originalImage: ImageData;
  let previewContext: CanvasRenderingContext2D;
  let printTaskName = $state<PrintTaskName>("B1");
  let labelType = $state<LabelType>(LabelType.WithGaps);
  // eslint-disable-next-line no-undef
  let statusTimer: NodeJS.Timeout | undefined = undefined;
  let error = $state<string>("");
  let detectedPrintTaskName: PrintTaskName | undefined = $printerClient?.getPrintTaskType();
  let csvParsed: DSVRowArray<string>;
  let page = $state<number>(0);
  let pagesTotal = $state<number>(1);
  let offset = $state<PreviewPropsOffset>({ x: 0, y: 0, offsetType: "inner" });
  let offsetWarning = $state<string>("");
  let currentPrintTask: AbstractPrintTask | undefined;

  let savedProps = $state<PreviewProps>({});

  let modalRef: Dialog;

  const disconnected = derived(connectionState, ($connectionState) => $connectionState !== "connected");

  const labelTypeTranslationKey = (labelType: string): TranslationKey =>
    `preview.label_type.${labelType}` as TranslationKey;

  const endPrint = async () => {
    clearInterval(statusTimer);

    if (!$disconnected && printState !== "idle") {
      if (currentPrintTask !== undefined) {
        await currentPrintTask.printEnd();
      } else {
        console.warn("Print task undefined, falling back to PrintEnd command");
        await $printerClient.abstraction.printEnd();
      }

      refreshRfidInfo();

      $printerClient.startHeartbeat();
    }

    printState = "idle";
    printProgress = 0;
  };

  const onPrintOnSystemPrinter = async () => {
    const sources: string[] = [];

    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      page = curPage;
      await generatePreviewData(page);
      sources.push(previewCanvas.toDataURL("image/png"));
    }

    FileUtils.printImageUrls(sources);
  };

  const onPrint = async () => {
    printState = "sending";
    error = "";

    // do it in a stupid way (multi-page print not finished yet)
    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      $printerClient.stopHeartbeat();

      currentPrintTask = $printerClient.abstraction.newPrintTask(printTaskName, {
        totalPages: quantity,
        density,
        speed,
        labelType,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
      });

      page = curPage;
      console.log("Printing page", page);

      await generatePreviewData(page);

      try {
        const encoded: EncodedImage = ImageEncoder.encodeCanvas(previewCanvas, labelProps.printDirection);
        await currentPrintTask.printInit();
        await currentPrintTask.printPage(encoded, quantity);
      } catch (e) {
        error = `${e}`;
        console.error(e);
        return;
      }

      printState = "printing";

      const listener = (e: PrintProgressEvent) => {
        printProgress = Math.floor((e.page / quantity) * ((e.pagePrintProgress + e.pageFeedProgress) / 2));
      };

      $printerClient.on("printprogress", listener);

      try {
        await currentPrintTask.waitForFinished();
      } catch (e) {
        error = `${e}`;
        console.error(e);
      }

      $printerClient.off("printprogress", listener);

      await endPrint();

      if (
        $appConfig.pageDelay !== undefined &&
        $appConfig.pageDelay > 0 &&
        pagesTotal > 1 &&
        curPage < pagesTotal - 1
      ) {
        await Utils.sleep($appConfig.pageDelay);
      }
    }

    printState = "idle";
    $printerClient.startHeartbeat();

    if (printNow && !error) {
      modalRef.hide();
    }
  };

  const updatePreview = () => {
    // PIKT: post-process + offset compositing delegated to $/utils/labelRender.
    // The offset-warning below stays here (reads $printerMeta / $tr). Upstream PR candidate: no
    const composited = compositeLabel(originalImage, {
      postProcess: postProcessType,
      postProcessInvert,
      threshold: thresholdValue,
      offset,
    });

    previewCanvas.width = composited.width;
    previewCanvas.height = composited.height;
    previewContext = previewCanvas.getContext("2d")!;
    previewContext.drawImage(composited, 0, 0);

    offsetWarning = "";

    if ($printerMeta !== undefined) {
      const headSize = labelProps.printDirection == "left" ? previewCanvas.height : previewCanvas.width;
      if (headSize > $printerMeta.printheadPixels) {
        offsetWarning += $tr("params.label.warning.width") + " ";
        offsetWarning += `(${headSize} > ${$printerMeta.printheadPixels})`;
        offsetWarning += "\n";
      }
    }
  };

  const toggleSavedProp = (key: string, value: any) => {
    const keyObj = key as keyof typeof savedProps;
    savedProps[keyObj] = savedProps[keyObj] === undefined ? value : undefined;
    try {
      LocalStoragePersistence.savePreviewProps(savedProps);
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters save error:");
    }
  };

  const updateSavedProp = (key: string, value: any, refreshPreview: boolean = false) => {
    const keyObj = key as keyof typeof savedProps;

    if (savedProps[keyObj] !== undefined) {
      savedProps[keyObj] = value;
      try {
        LocalStoragePersistence.savePreviewProps(savedProps);
      } catch (e) {
        Toasts.zodErrors(e, "Preview parameters save error:");
      }
    }

    if (refreshPreview) {
      updatePreview();
    }
  };

  const loadProps = () => {
    try {
      const saved = LocalStoragePersistence.loadSavedPreviewProps();
      if (saved === null) {
        return;
      }
      savedProps = saved;
      if (saved.postProcess !== undefined) postProcessType = saved.postProcess;
      if (saved.postProcessInvert !== undefined) postProcessInvert = saved.postProcessInvert;
      if (saved.threshold !== undefined) thresholdValue = saved.threshold;
      if (saved.quantity !== undefined) quantity = saved.quantity;
      if (saved.density !== undefined) density = saved.density;
      if (saved.speed !== undefined) speed = saved.speed;
      if (saved.labelType !== undefined) labelType = saved.labelType;
      if (saved.printTaskName !== undefined) printTaskName = saved.printTaskName;
      if (saved.offset !== undefined) offset = saved.offset;
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters load error:");
    }
  };

  const pageDown = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.max(0, Math.min(csvParsed.length - 1, page - 1));
    generatePreviewData(page);
  };

  const pageUp = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.min(csvParsed.length - 1, page + 1);
    generatePreviewData(page);
  };

  const generatePreviewData = async (page: number): Promise<void> => {
    // PIKT: Fabric build + rasterize delegated to $/utils/labelRender. Upstream PR candidate: no
    let variables = {};

    if (csvEnabled) {
      if (page >= 0 && page < csvParsed.length) {
        variables = csvParsed[page];
      } else {
        console.warn(`Page ${page} is out of csv bounds (csv length is ${csvParsed.length})`);
      }
    }

    originalImage = await rasterizeLabel(labelProps, canvasCallback(), variables);

    updatePreview();
  };

  const onModalClose = () => {
    endPrint();
  };

  onMount(async () => {
    if (csvEnabled) {
      const parseResult = csvParse(csvData);
      const spread: DSVRowArray<string> = Object.assign([], { columns: parseResult.columns });

      for (let row of parseResult) {
        for (const k of Object.keys(row)) {
          row[k] = row[k].replaceAll("\\n", "\n");
        }

        let times = 1;
        
        if ("$times" in row && row["$times"] !== "") {
          try {
            times = parseInt(row["$times"]);
          } catch (e) {
            console.warn("$times parse error", e);
          }
        }

        if (times < 0) {
          times = 0;
        }

        for (let i = 0; i < times; i++) {
          spread.push(row);
        }
      }

      csvParsed = spread;
      pagesTotal = csvParsed.length;
    }

    if (detectedPrintTaskName !== undefined) {
      console.log(`Detected print task version: ${detectedPrintTaskName}`);
      printTaskName = detectedPrintTaskName;
    }

    loadProps();

    await generatePreviewData(page);

    if (printNow && !$disconnected && printState === "idle") {
      onPrint();
    }
  });
</script>

<Dialog title={$tr("preview.title")} onClose={onModalClose} bind:show bind:this={modalRef}>
  <div class="flex items-center justify-center gap-2">
    {#if pagesTotal > 1}
      <Button
        variant="text"
        color="secondary"
        icon="chevron_left"
        ariaLabel="-"
        disabled={printState !== "idle"}
        onclick={pageDown} />
    {/if}

    <canvas class="print-start-{labelProps.printDirection}" bind:this={previewCanvas}></canvas>

    {#if pagesTotal > 1}
      <Button
        variant="text"
        color="secondary"
        icon="chevron_right"
        ariaLabel="+"
        disabled={printState !== "idle"}
        onclick={pageUp} />
    {/if}
  </div>

  <div class="mt-3 text-center">
    {#if pagesTotal > 1}<div class="text-body-medium text-surface-600-400">Page {page + 1} / {pagesTotal}</div>{/if}

    {#if printState === "sending"}
      <div class="text-body-medium">Sending...</div>
    {/if}
    {#if printState === "printing"}
      <div class="text-body-medium">
        Printing...
        <div class="mt-1 h-4 w-full overflow-hidden rounded-full bg-surface-300-700" role="progressbar">
          <div
            class="progress-bar flex h-full items-center justify-center bg-primary-500 text-label-small text-primary-contrast-500"
            style="width: {printProgress}%">
            {printProgress}%
          </div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="mt-2 rounded-m3-sm bg-error-500/15 px-3 py-2 text-body-medium text-error-500" role="alert">{error}</div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex w-full items-end gap-2">
      <div class="flex-1">
        <Select
          label={$tr("preview.postprocess")}
          value={postProcessType ?? "threshold"}
          options={[
            { value: "threshold", label: $tr("preview.postprocess.threshold") },
            { value: "dither", label: $tr("preview.postprocess.atkinson") },
            { value: "bayer", label: $tr("preview.postprocess.bayer") },
          ]}
          ariaLabel={$tr("preview.postprocess")}
          onChange={(v) => {
            postProcessType = v as PostProcessType;
            updateSavedProp("postProcess", postProcessType, true);
          }} />
      </div>

      <ParamLockButton
        propName="postProcess"
        value={postProcessType}
        savedValue={savedProps.postProcess}
        onClick={toggleSavedProp} />

      <Button
        variant={postProcessInvert ? "tonal" : "outlined"}
        color="secondary"
        icon="invert_colors"
        ariaLabel={$tr("preview.postprocess")}
        onclick={() => {
          postProcessInvert = !postProcessInvert;
          updatePreview();
        }} />
    </div>

    <div class="flex w-full items-center gap-2">
      <span class="w-24 shrink-0 text-label-large">{$tr("preview.threshold")}</span>
      <div class="flex-1">
        <Slider
          value={thresholdValue}
          min={1}
          max={255}
          step={1}
          ariaLabel={$tr("preview.threshold")}
          onChange={(v) => {
            thresholdValue = v;
            updateSavedProp("threshold", thresholdValue, true);
          }} />
      </div>
      <span class="w-8 text-center text-label-large tabular-nums">{thresholdValue}</span>

      <ParamLockButton
        propName="threshold"
        value={thresholdValue}
        savedValue={savedProps.threshold}
        onClick={toggleSavedProp} />
    </div>

    <!-- PIKT: copies stepper (Chantier 0.5) -->
    <div class="flex w-full items-center gap-2">
      <span class="w-24 shrink-0 text-label-large">{$tr("preview.copies")}</span>
      <div class="flex items-center gap-1">
        <Button
          variant="tonal"
          color="secondary"
          icon="remove"
          ariaLabel="-"
          onclick={() => {
            quantity = Math.max(1, quantity - 1);
            updateSavedProp("quantity", quantity);
          }} />
        <div class="w-20">
          <TextField
            type="number"
            min={1}
            value={quantity}
            ariaLabel={$tr("preview.copies")}
            onChange={(v) => {
              quantity = parseInt(v) || 1;
              updateSavedProp("quantity", quantity);
            }} />
        </div>
        <Button
          variant="tonal"
          color="secondary"
          icon="add"
          ariaLabel="+"
          onclick={() => {
            quantity = quantity + 1;
            updateSavedProp("quantity", quantity);
          }} />
      </div>
      <ParamLockButton
        propName="quantity"
        value={quantity}
        savedValue={savedProps.quantity}
        onClick={toggleSavedProp} />
    </div>

    <!-- PIKT: density slider 1–5 (Chantier 0.5) -->
    <div class="flex w-full items-center gap-3">
      <span class="w-24 shrink-0 text-label-large">{$tr("preview.density")}</span>
      <div class="flex-1">
        <Slider
          value={density}
          min={$printerMeta?.densityMin ?? 1}
          max={$printerMeta?.densityMax ?? 5}
          step={1}
          ariaLabel={$tr("preview.density")}
          onChange={(v) => {
            density = v;
            updateSavedProp("density", density);
          }} />
      </div>
      <span class="w-6 text-center text-label-large tabular-nums">{density}</span>
      <ParamLockButton propName="density" value={density} savedValue={savedProps.density} onClick={toggleSavedProp} />
    </div>

    {#if printTaskName === "D110M_V4"}
      <div class="flex w-full items-end gap-2">
        <div class="flex-1">
          <Select
            label={$tr("preview.speed")}
            value={speed}
            options={[
              { value: 0, label: $tr("preview.speed.0") },
              { value: 1, label: $tr("preview.speed.1") },
            ]}
            ariaLabel={$tr("preview.speed")}
            onChange={(v) => {
              speed = (parseInt(v) === 1 ? 1 : 0) as 0 | 1;
              updateSavedProp("speed", speed, true);
            }} />
        </div>

        <ParamLockButton propName="speed" value={speed} savedValue={savedProps.speed} onClick={toggleSavedProp} />
      </div>
    {/if}

    <!-- PIKT: label type + print task are auto-detected; tucked into Advanced (Chantier 0.5) -->
    <details class="w-full rounded-m3-sm bg-surface-100-900 px-3 py-2">
      <summary class="cursor-pointer text-label-large text-surface-600-400">{$tr("preview.advanced")}</summary>
      <div class="mt-3 space-y-3">
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <Select
              label={$tr("preview.label_type")}
              value={labelType}
              options={Object.values(LabelType)
                .filter((lt): lt is LabelType => typeof lt !== "string")
                .map((lt) => ({
                  value: lt,
                  label: `${$printerMeta?.paperTypes.includes(lt) ? "✔ " : ""}${$tr(labelTypeTranslationKey(LabelType[lt]))}`,
                }))}
              ariaLabel={$tr("preview.label_type")}
              onChange={(v) => {
                labelType = parseInt(v) as LabelType;
                updateSavedProp("labelType", labelType);
              }} />
          </div>
          <ParamLockButton propName="labelType" value={labelType} savedValue={savedProps.labelType} onClick={toggleSavedProp} />
        </div>

        <div class="flex items-end gap-2">
          <div class="flex-1">
            <Select
              label={$tr("preview.print_task")}
              value={printTaskName}
              options={printTaskNames.map((name) => ({
                value: name,
                label: `${detectedPrintTaskName === name ? "✔ " : ""}${name}`,
              }))}
              ariaLabel={$tr("preview.print_task")}
              onChange={(v) => {
                printTaskName = v as PrintTaskName;
                updateSavedProp("printTaskName", printTaskName);
              }} />
          </div>
          <ParamLockButton propName="printTaskName" value={printTaskName} savedValue={savedProps.printTaskName} onClick={toggleSavedProp} />
        </div>
      </div>
    </details>

    <div class="flex w-full items-center gap-2">
      <span class="shrink-0 text-label-large">{$tr("preview.offset")}</span>
      {#if offsetWarning}
        <span class="text-warning-500" title={offsetWarning}><MdIcon icon="warning" /></span>
      {/if}
      <span class="shrink-0 text-surface-600-400"><MdIcon icon="unfold_more" class="r-90" /></span>
      <div class="w-20">
        <TextField
          type="number"
          value={offset.x}
          ariaLabel="{$tr('preview.offset')} X"
          onChange={(v) => {
            offset.x = parseInt(v) || 0;
            updateSavedProp("offset", offset, true);
          }} />
      </div>
      <span class="shrink-0 text-surface-600-400"><MdIcon icon="unfold_more" /></span>
      <div class="w-20">
        <TextField
          type="number"
          value={offset.y}
          ariaLabel="{$tr('preview.offset')} Y"
          onChange={(v) => {
            offset.y = parseInt(v) || 0;
            updateSavedProp("offset", offset, true);
          }} />
      </div>
      <div class="flex-1">
        <Select
          value={offset.offsetType}
          options={[
            { value: "inner", label: $tr("preview.offset.inner") },
            { value: "outer", label: $tr("preview.offset.outer") },
          ]}
          ariaLabel={$tr("preview.offset")}
          onChange={(v) => {
            offset.offsetType = v as PreviewPropsOffset["offsetType"];
            updateSavedProp("offset", offset, true);
          }} />
      </div>

      <ParamLockButton propName="offset" value={offset} savedValue={savedProps.offset} onClick={toggleSavedProp} />
    </div>

    <Button variant="text" color="secondary" onclick={() => modalRef.hide()}>{$tr("preview.close")}</Button>

    {#if printState !== "idle"}
      <Button variant="filled" color="primary" disabled={$disconnected} onclick={endPrint}>
        {$tr("preview.print.cancel")}
      </Button>
    {/if}

    <Button
      variant="tonal"
      color="secondary"
      icon="print"
      ariaLabel={$tr("preview.print.system")}
      onclick={onPrintOnSystemPrinter} />

    <Button
      variant="filled"
      color="primary"
      icon={$disconnected ? undefined : "print"}
      disabled={$disconnected || printState !== "idle"}
      onclick={onPrint}>
      {#if $disconnected}
        {$tr("preview.not_connected")}
      {:else}
        {$tr("preview.print")}
      {/if}
    </Button>
  {/snippet}
</Dialog>

<style>
  canvas {
    image-rendering: pixelated;
    border: 1px solid #6d6d6d;
    max-width: 100%;
  }
  canvas.print-start-left {
    border-left: 2px solid #ff4646;
  }
  canvas.print-start-top {
    border-top: 2px solid #ff4646;
  }
  .progress-bar {
    transition: none;
  }
</style>
