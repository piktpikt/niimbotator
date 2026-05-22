<script lang="ts">
  // PIKT: Settings (wireframe 12.1). Theme + language are live now; more sections land with later chantiers.
  import { tr, locale, locales } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { themeMode, setThemeMode } from "$/stores/theme";
  import { connectionState, connectedPrinterName } from "$/stores";
  import { navigate } from "$/stores/navigation";

  const themeOptions = [
    { value: "light", label: "settings.theme.light" },
    { value: "dark", label: "settings.theme.dark" },
    { value: "auto", label: "settings.theme.auto" },
  ] as const;

  let connected = $derived($connectionState === "connected");
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4">
  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("settings.section.printer")}</h2>
    <button
      type="button"
      class="card flex w-full items-center gap-3 bg-surface-100-900 p-4 text-left"
      onclick={() => navigate("editor")}>
      <span
        class="grid size-10 place-items-center rounded-full {connected
          ? 'bg-success-500/15 text-success-500'
          : 'bg-surface-200-800 text-surface-500'}">
        <MdIcon icon={connected ? "bluetooth" : "power_off"} />
      </span>
      <span class="flex-1">
        {connected ? $connectedPrinterName || $tr("printer.connected") : $tr("printer.disconnected")}
      </span>
      <MdIcon icon="chevron_right" class="text-surface-400-600" />
    </button>
  </section>

  <section class="space-y-2">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">{$tr("settings.section.display")}</h2>
    <div class="card space-y-4 bg-surface-100-900 p-4">
      <div class="space-y-2">
        <span class="text-sm font-medium">{$tr("settings.theme")}</span>
        <div class="flex gap-2">
          {#each themeOptions as opt (opt.value)}
            <button
              type="button"
              class="flex-1 rounded-lg py-2 text-sm font-medium {$themeMode === opt.value
                ? 'preset-filled-primary-500'
                : 'preset-tonal-surface'}"
              onclick={() => setThemeMode(opt.value)}>
              {$tr(opt.label)}
            </button>
          {/each}
        </div>
      </div>

      <label class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">{$tr("settings.language")}</span>
        <select class="rounded-lg bg-surface-200-800 px-3 py-2 text-sm" bind:value={$locale}>
          {#each Object.entries(locales) as [key, name] (key)}
            <option value={key}>{name}</option>
          {/each}
        </select>
      </label>
    </div>
  </section>
</div>
