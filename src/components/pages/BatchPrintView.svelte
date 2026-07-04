<script lang="ts">
  // Presentational view for the batch print flow (Chantier 3). Pure: it renders one of the
  // five screens from a `screen` + `progress` snapshot and calls back on actions. No printer,
  // no job, no store beyond i18n — so every screen is provable by feeding props.
  // Styling: Material Design 3 via the ui/ primitives + m3 tokens (deep restyle).
  import { tr, type TranslationKey } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TopAppBar from "$/components/navigation/TopAppBar.svelte";
  import Button from "$/components/ui/Button.svelte";
  import Card from "$/components/ui/Card.svelte";
  import type { PrintOptions } from "$/db/schema";
  import type { PrintProgress, PrintScreen } from "$/services/batchPrinting";

  interface Props {
    screen: PrintScreen;
    batchName: string;
    itemsTotal: number;
    labelsTotal: number;
    passages: number;
    options: PrintOptions;
    connected: boolean;
    resumeMode?: boolean;
    progress?: PrintProgress;
    labelsPrinted?: number;
    batteryWarning?: boolean;
    onConfirm: () => void;
    onBack: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onReprintFresh: () => void;
    onResumeRun: () => void;
    onDone: () => void;
    onOptionChange: (patch: Partial<PrintOptions>) => void;
    onBatteryProceed: () => void;
    onBatteryCancel: () => void;
  }

  let {
    screen,
    batchName,
    itemsTotal,
    labelsTotal,
    passages,
    options,
    connected,
    resumeMode = false,
    progress,
    labelsPrinted = 0,
    batteryWarning = false,
    onConfirm,
    onBack,
    onPause,
    onResume,
    onStop,
    onReprintFresh,
    onResumeRun,
    onDone,
    onOptionChange,
    onBatteryProceed,
    onBatteryCancel,
  }: Props = $props();

  const t = (key: string, vars: Record<string, string | number> = {}): string => {
    let s = $tr(key as TranslationKey);
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };

  const currentLabel = $derived((progress?.unitIndex ?? 0) + 1);

  const detail = $derived.by(() => {
    if (!progress) return "";
    const lines: string[] = [];
    if (progress.passesTotal > 1) lines.push(t("print.printing.pass", { n: progress.pass + 1, total: progress.passesTotal }));
    lines.push(t("print.printing.item", { n: progress.itemIndex + 1, total: progress.itemsTotal }) + ` · ${progress.itemName}`);
    if (progress.mode === "mosaic") {
      lines.push(t("print.printing.mosaic_tile", { grid: progress.gridLabel ?? "", n: progress.tile + 1, total: progress.tilesTotal }));
    } else if (progress.copiesTotal > 1) {
      lines.push(t("print.printing.copy", { n: progress.copy + 1, total: progress.copiesTotal }));
    }
    return lines.join("\n");
  });

  const errorMessage = $derived(progress?.errorKey ? t(`print.error.${progress.errorKey}`) : "");
  const title = $derived.by(() => {
    switch (screen) {
      case "confirm": return t("print.confirm.title");
      case "completed": return t("print.completed.title");
      case "cancelled": return t("print.completed.title");
      case "errored": return t("print.errored.title");
      default: return t("print.printing.title");
    }
  });

  const optionRows: { key: keyof PrintOptions; label: string }[] = [
    { key: "pauseBetweenLabels", label: "print.option.pause_labels" },
    { key: "pauseBetweenItems", label: "print.option.pause_items" },
    { key: "numberMosaicTiles", label: "print.option.number_tiles" },
  ];
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <TopAppBar {title} showPrinter={false} onBack={onBack} />

  <main class="flex-1 overflow-y-auto">
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      {#if screen === "confirm"}
        <Card variant="elevated" class="space-y-1 p-5">
          <div class="text-title-large">{batchName}</div>
          <div class="text-body-medium text-surface-600-400">{t("print.confirm.recap", { items: itemsTotal, labels: labelsTotal })}</div>
          {#if passages > 1}
            <div class="text-body-medium text-surface-600-400">{t("print.confirm.passages", { n: passages })}</div>
          {/if}
          <div class="pt-1 text-headline-medium text-primary-500">{t("print.confirm.total", { n: labelsTotal })}</div>
        </Card>

        <Card variant="filled" class="p-2">
          {#each optionRows as row (row.key)}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-m3-sm px-3 py-3 text-left text-body-large transition hover:bg-surface-300-700/40"
              onclick={() => onOptionChange({ [row.key]: !options[row.key] })}>
              <span>{t(row.label)}</span>
              <span class="grid size-6 place-items-center rounded-m3-xs border-2 transition-colors
                {options[row.key] ? 'border-primary-500 bg-primary-500 text-primary-contrast-500' : 'border-surface-400-600'}">
                {#if options[row.key]}<MdIcon icon="check" />{/if}
              </span>
            </button>
          {/each}
        </Card>
      {:else if screen === "printing" || screen === "paused"}
        <Card variant="elevated" class="flex flex-col items-center gap-4 p-6 text-center">
          <div class="grid size-16 place-items-center rounded-full bg-primary-500/15 text-primary-500">
            <MdIcon icon={screen === "paused" ? "pause_circle" : "print"} class="text-4xl" />
          </div>
          <div class="text-display-large tabular-nums">{currentLabel} <span class="text-surface-500">/ {progress?.unitsTotal ?? 0}</span></div>
          {#if screen === "paused"}<div class="text-label-large text-primary-500">{t("print.paused.title")}</div>{/if}
          <p class="whitespace-pre-line text-body-medium text-surface-600-400">{detail}</p>

          <div class="h-2 w-full overflow-hidden rounded-full bg-surface-300-700">
            <div class="h-full rounded-full bg-primary-500 transition-all" style="width: {progress?.percent ?? 0}%"></div>
          </div>
          <div class="text-label-medium text-surface-600-400">{progress?.percent ?? 0}%</div>

          {#if screen === "printing"}
            <div class="h-1 w-2/3 overflow-hidden rounded-full bg-surface-200-800">
              <div class="h-full rounded-full bg-tertiary-500 transition-all" style="width: {progress?.labelProgress ?? 0}%"></div>
            </div>
          {/if}
        </Card>
      {:else if screen === "completed" || screen === "cancelled"}
        <Card variant="elevated" class="flex flex-col items-center gap-3 p-8 text-center">
          <MdIcon icon={screen === "completed" ? "check_circle" : "cancel"} class="text-6xl {screen === 'completed' ? 'text-success-500' : 'text-surface-500'}" />
          <div class="text-headline-medium">{title}</div>
          <div class="text-body-medium text-surface-600-400">{t("print.completed.summary", { n: labelsPrinted })}</div>
        </Card>
      {:else if screen === "errored"}
        <Card variant="elevated" class="flex flex-col items-center gap-3 p-6 text-center">
          <MdIcon icon="error" class="text-6xl text-warning-500" />
          <div class="text-headline-medium">{title}</div>
          <div class="rounded-full bg-warning-500/15 px-3 py-1 text-label-large text-warning-500">{errorMessage}</div>
          <div class="text-body-medium text-surface-600-400">{t("print.errored.progress", { done: labelsPrinted, total: labelsTotal })}</div>
          <div class="text-body-medium text-surface-600-400">{t("print.errored.resume_hint", { n: labelsPrinted + 1, total: labelsTotal })}</div>
        </Card>
      {/if}
    </div>
  </main>

  <!-- Sticky action bar -->
  <div class="sticky bottom-0 flex gap-3 border-t border-surface-200-800 bg-surface-50-950 p-4">
    {#if screen === "confirm"}
      <Button variant="text" onclick={onBack}>{t("print.cancel")}</Button>
      <div class="flex-1"><Button variant="filled" full disabled={!connected} icon="print" onclick={onConfirm}>
        {connected ? (resumeMode ? t("print.resume_banner.resume") : t("print.confirm.action")) : t("print.confirm.not_connected")}
      </Button></div>
    {:else if screen === "printing"}
      <div class="flex-1"><Button variant="tonal" full icon="pause" onclick={onPause}>{t("print.pause")}</Button></div>
      <div class="flex-1"><Button variant="tonal" color="error" full icon="stop" onclick={onStop}>{t("print.stop")}</Button></div>
    {:else if screen === "paused"}
      <div class="flex-[2]"><Button variant="filled" full icon="play_arrow" onclick={onResume}>{t("print.resume")}</Button></div>
      <div class="flex-1"><Button variant="tonal" color="error" full icon="stop" onclick={onStop}>{t("print.stop")}</Button></div>
    {:else if screen === "completed"}
      <div class="flex-1"><Button variant="tonal" full onclick={onReprintFresh}>{t("print.completed.reprint")}</Button></div>
      <div class="flex-[2]"><Button variant="filled" full onclick={onDone}>{t("print.completed.done")}</Button></div>
    {:else if screen === "cancelled" || screen === "errored"}
      <div class="flex-1"><Button variant="outlined" full onclick={onDone}>{t("print.view_batch")}</Button></div>
      <div class="flex-[2]"><Button variant="filled" full icon="play_arrow" onclick={onResumeRun}>{t("print.resume")}</Button></div>
    {/if}
  </div>

  {#if batteryWarning}
    <div class="fixed inset-0 z-40 grid place-items-center bg-black/50 p-6">
      <Card variant="elevated" class="w-full max-w-sm space-y-4 p-5 shadow-e4">
        <div class="flex items-center gap-2 text-warning-500">
          <MdIcon icon="battery_2_bar" />
          <span class="text-title-large">{t("print.battery.warning.title")}</span>
        </div>
        <p class="text-body-medium text-surface-600-400">{t("print.battery.warning.body", { n: labelsTotal })}</p>
        <div class="flex justify-end gap-2">
          <Button variant="text" onclick={onBatteryCancel}>{t("print.cancel")}</Button>
          <Button variant="tonal" color="warning" onclick={onBatteryProceed}>{t("print.battery.warning.proceed")}</Button>
        </div>
      </Card>
    </div>
  {/if}
</div>
