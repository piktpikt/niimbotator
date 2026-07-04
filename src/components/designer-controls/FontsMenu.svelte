<script lang="ts">
  // PIKT: deep restyle — Bootstrap AppModal → M3 ui/Dialog + Select/TextField/Button (editor phase 5).
  // Upstream PR candidate: no
  import Dialog from "$/components/ui/Dialog.svelte";
  import Button from "$/components/ui/Button.svelte";
  import Select from "$/components/ui/Select.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { userFonts } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";

  let show = $state<boolean>(false);
  let usedSpace = $state<number>(0);
  let selectExt = $state<"ttf" | "woff2">("ttf");
  let overrideFamily = $state<string>("");

  const calcUsedSpace = () => {
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const browseFont = async () => {
    const result = await FileUtils.pickAndReadBinaryFile(selectExt);

    let fontName = result.name.split(".")[0];
    const mime = `text/${selectExt}`;

    if (overrideFamily.trim() !== "") {
      fontName = overrideFamily.trim();
    }

    if ($userFonts.some((e) => e.family == fontName)) {
      Toasts.error(`${fontName} already loaded`);
      return;
    }

    const compressed = await FileUtils.compressData(result.data);
    const b64data = await FileUtils.base64buf(compressed);

    userFonts.update((prev) => [...prev, { gzippedDataB64: b64data, family: fontName, mimeType: mime }]);

    calcUsedSpace();
    overrideFamily = "";
  };

  const removeFont = (family: string) => {
    userFonts.update((prev) => prev.filter((e) => e.family !== family));
    calcUsedSpace();
  };

  $effect(() => {
    if (show) calcUsedSpace();
  });
</script>

<Button variant="outlined" icon="settings" ariaLabel={$tr("fonts.title")} onclick={() => (show = true)} />

{#if show}
  <Dialog title={$tr("fonts.title")} bind:show>
    <div class="flex flex-col gap-2">
      {#each $userFonts as font (font.family)}
        <div class="flex items-center gap-2">
          <span class="flex-1 text-headline-small" style="font-family: {font.family}">{font.family}</span>
          <Button variant="text" color="error" icon="delete" ariaLabel="delete" onclick={() => removeFont(font.family)} />
        </div>
      {:else}
        👀
      {/each}
    </div>

    <hr class="my-4 border-surface-400-600" />

    <div class="flex flex-col gap-3">
      <span class="text-label-large text-surface-600-400">{$tr("fonts.add")}</span>

      <Select
        value={selectExt}
        options={[
          { value: "ttf", label: "ttf" },
          { value: "woff2", label: "woff2" },
        ]}
        onChange={(v) => (selectExt = v as "ttf" | "woff2")} />

      <TextField
        value={overrideFamily}
        placeholder={$tr("fonts.title_override")}
        onChange={(v) => (overrideFamily = v)} />

      <Button variant="tonal" color="secondary" onclick={browseFont}>{$tr("fonts.browse")}</Button>
    </div>

    {#snippet footer()}
      <div class="text-surface-600-400">
        {usedSpace}
        {$tr("params.saved_labels.kb_used")} |
        <a class="text-surface-600-400 underline" href="https://fonts.google.com">{$tr("fonts.gfonts")}</a>
      </div>
    {/snippet}
  </Dialog>
{/if}
