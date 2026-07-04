<script lang="ts">
  // Presentational view for the batch print flow (Chantier 3). Pure: it renders one of the
  // five screens from a `screen` + `progress` snapshot and calls back on actions. No printer,
  // no job, no store beyond i18n — so every screen is provable by feeding props.
  import { tr, type TranslationKey } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TopAppBar from "$/components/navigation/TopAppBar.svelte";
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
    /** The batch has an interrupted-run cursor, so "confirm" resumes instead of reprinting. */
    resumeMode?: boolean;
    progress?: PrintProgress;
    labelsPrinted?: number;
    onConfirm: () => void;
    onBack: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onReprintFresh: () => void;
    onResumeRun: () => void;
    onDone: () => void;
    onOptionChange: (patch: Partial<PrintOptions>) => void;
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
    onConfirm,
    onBack,
    onPause,
    onResume,
    onStop,
    onReprintFresh,
    onResumeRun,
    onDone,
    onOptionChange,
  }: Props = $props();

  const t = (key: string, vars: Record<string, string | number> = {}): string => {
    let s = $tr(key as TranslationKey);
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };

  const currentLabel = $derived((progress?.unitIndex ?? 0) + 1);

  // The one-line detail under the big counter (item name + mosaic tile / copy).
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
</script>

<div class="flex h-dvh flex-col bg-surface-50-950 text-surface-950-50">
  <TopAppBar {title} showPrinter={false} onBack={onBack} />

  <main class="flex-1 overflow-y-auto">
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      {#if screen === "confirm"}
        <section class="card space-y-2 bg-surface-100-900 p-4">
          <div class="text-base font-semibold">{batchName}</div>
          <div class="text-sm text-surface-600-400">{t("print.confirm.recap", { items: itemsTotal, labels: labelsTotal })}</div>
          {#if passages > 1}
            <div class="text-sm text-surface-600-400">{t("print.confirm.passages", { n: passages })}</div>
          {/if}
          <div class="text-lg font-bold text-primary-500">{t("print.confirm.total", { n: labelsTotal })}</div>
        </section>

        <section class="card space-y-1 bg-surface-100-900 p-2">
          {#each [["pauseBetweenLabels", "print.option.pause_labels"], ["pauseBetweenItems", "print.option.pause_items"], ["numberMosaicTiles", "print.option.number_tiles"]] as [key, label] (key)}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-surface-200-800"
              onclick={() => onOptionChange({ [key]: !options[key as keyof PrintOptions] })}>
              <span>{t(label)}</span>
              <span
                class="grid size-6 place-items-center rounded-md border-2 {options[key as keyof PrintOptions] ? 'border-primary-500 bg-primary-500 text-primary-contrast-500' : 'border-surface-400-600'}">
                {#if options[key as keyof PrintOptions]}<MdIcon icon="check" />{/if}
              </span>
            </button>
          {/each}
        </section>
      {:else if screen === "printing" || screen === "paused"}
        <section class="card flex flex-col items-center gap-4 bg-surface-100-900 p-6 text-center">
          <MdIcon icon={screen === "paused" ? "pause_circle" : "print"} class="text-5xl text-primary-500" />
          <div class="text-3xl font-bold tabular-nums">{currentLabel} / {progress?.unitsTotal ?? 0}</div>
          {#if screen === "paused"}<div class="text-sm font-medium text-primary-500">{t("print.paused.title")}</div>{/if}
          <p class="whitespace-pre-line text-sm text-surface-600-400">{detail}</p>

          <div class="h-2 w-full overflow-hidden rounded-full bg-surface-300-700">
            <div class="h-full rounded-full bg-primary-500 transition-all" style="width: {progress?.percent ?? 0}%"></div>
          </div>
          <div class="text-xs font-semibold text-surface-600-400">{progress?.percent ?? 0}%</div>

          {#if screen === "printing"}
            <div class="h-1 w-2/3 overflow-hidden rounded-full bg-surface-200-800">
              <div class="h-full rounded-full bg-tertiary-500 transition-all" style="width: {progress?.labelProgress ?? 0}%"></div>
            </div>
          {/if}
        </section>
      {:else if screen === "completed" || screen === "cancelled"}
        <section class="card flex flex-col items-center gap-3 bg-surface-100-900 p-8 text-center">
          <MdIcon icon={screen === "completed" ? "check_circle" : "cancel"} class="text-6xl {screen === 'completed' ? 'text-success-500' : 'text-surface-500'}" />
          <div class="text-xl font-bold">{title}</div>
          <div class="text-sm text-surface-600-400">{t("print.completed.summary", { n: labelsPrinted })}</div>
        </section>
      {:else if screen === "errored"}
        <section class="card flex flex-col items-center gap-3 bg-surface-100-900 p-6 text-center">
          <MdIcon icon="error" class="text-6xl text-warning-500" />
          <div class="text-xl font-bold">{title}</div>
          <div class="rounded-full bg-warning-500/15 px-3 py-1 text-sm font-semibold text-warning-500">{errorMessage}</div>
          <div class="text-sm text-surface-600-400">{t("print.errored.progress", { done: labelsPrinted, total: labelsTotal })}</div>
          <div class="text-sm text-surface-600-400">{t("print.errored.resume_hint", { n: labelsPrinted + 1, total: labelsTotal })}</div>
        </section>
      {/if}
    </div>
  </main>

  <!-- Sticky action bar -->
  <div class="sticky bottom-0 flex gap-3 border-t border-surface-200-800 bg-surface-50-950 p-4">
    {#if screen === "confirm"}
      <button type="button" class="h-12 flex-1 rounded-full bg-surface-200-800 font-semibold" onclick={onBack}>{t("print.cancel")}</button>
      <button
        type="button"
        class="h-12 flex-[2] rounded-full bg-primary-500 font-semibold text-primary-contrast-500 disabled:opacity-40"
        disabled={!connected}
        onclick={onConfirm}>
        {connected ? (resumeMode ? t("print.resume_banner.resume") : t("print.confirm.action")) : t("print.confirm.not_connected")}
      </button>
    {:else if screen === "printing"}
      <button type="button" class="h-12 flex-1 rounded-full bg-surface-200-800 font-semibold" onclick={onPause}>
        <MdIcon icon="pause" /> {t("print.pause")}
      </button>
      <button type="button" class="h-12 flex-1 rounded-full bg-error-500/15 font-semibold text-error-500" onclick={onStop}>
        <MdIcon icon="stop" /> {t("print.stop")}
      </button>
    {:else if screen === "paused"}
      <button type="button" class="h-12 flex-[2] rounded-full bg-primary-500 font-semibold text-primary-contrast-500" onclick={onResume}>
        <MdIcon icon="play_arrow" /> {t("print.resume")}
      </button>
      <button type="button" class="h-12 flex-1 rounded-full bg-error-500/15 font-semibold text-error-500" onclick={onStop}>
        <MdIcon icon="stop" /> {t("print.stop")}
      </button>
    {:else if screen === "completed"}
      <button type="button" class="h-12 flex-1 rounded-full bg-surface-200-800 font-semibold" onclick={onReprintFresh}>{t("print.completed.reprint")}</button>
      <button type="button" class="h-12 flex-[2] rounded-full bg-primary-500 font-semibold text-primary-contrast-500" onclick={onDone}>{t("print.completed.done")}</button>
    {:else if screen === "cancelled" || screen === "errored"}
      <button type="button" class="h-12 flex-1 rounded-full bg-surface-200-800 font-semibold" onclick={onDone}>{t("print.view_batch")}</button>
      <button type="button" class="h-12 flex-[2] rounded-full bg-primary-500 font-semibold text-primary-contrast-500" onclick={onResumeRun}>{t("print.resume")}</button>
    {/if}
  </div>
</div>
