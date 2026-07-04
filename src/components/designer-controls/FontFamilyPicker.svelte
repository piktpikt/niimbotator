<script lang="ts">
  // PIKT: deep restyle — Bootstrap dropdown → M3 ui/BottomSheet + TextField/Button (editor phase 5).
  // Upstream PR candidate: no
  import { onMount } from "svelte";
  import { OBJECT_DEFAULTS_TEXT } from "$/defaults";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { fontCache, userFonts } from "$/stores";
  import FontsMenu from "$/components/designer-controls/FontsMenu.svelte";
  import Button from "$/components/ui/Button.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import BottomSheet from "$/components/ui/BottomSheet.svelte";

  interface Props {
    editRevision?: number;
    value: string;
    valueUpdated: (v: string) => void;
  }

  let { value, valueUpdated, editRevision }: Props = $props();

  let open = $state(false);

  let fontQuerySupported = typeof queryLocalFonts !== "undefined";
  let searchString = $state<string>("");

  let systemFontsFiltered = $derived.by<string[]>(() => {
    return $fontCache.filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  let userFontsFiltered = $derived.by<string[]>(() => {
    return $userFonts.map((e) => e.family).filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  const getSystemFonts = async () => {
    try {
      const fonts = await queryLocalFonts();
      const fontListSorted = [OBJECT_DEFAULTS_TEXT.fontFamily, ...new Set(fonts.map((f: FontData) => f.family))].sort();
      fontCache.update(() => fontListSorted);
      LocalStoragePersistence.saveCachedFonts(fontListSorted);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const fontClick = (family: string) => {
    searchString = "";
    valueUpdated(family);
    open = false;
  };

  onMount(() => {
    try {
      let stored = LocalStoragePersistence.loadCachedFonts();
      if (stored.length > 0) {
        const uniqueFonts = new Set([OBJECT_DEFAULTS_TEXT.fontFamily, ...stored]);
        fontCache.update(() => [...uniqueFonts].sort());
      }
    } catch (e) {
      Toasts.error(e);
    }
  });
</script>

<div class="flex flex-nowrap items-center gap-2 font-family-picker">
  <input type="hidden" data-ver={editRevision} />

  <TextField
    ariaLabel={$tr("params.text.font_family")}
    leadingIcon="text_format"
    {value}
    onChange={(v) => valueUpdated(v)} />

  <Button variant="outlined" ariaLabel={$tr("params.text.font_family")} onclick={() => (open = true)}>
    <span style="font-family: {value}">{value}</span>
  </Button>

  <FontsMenu />
</div>

<BottomSheet bind:open title={$tr("params.text.font_family")}>
  <div class="flex flex-col gap-2">
    <TextField
      placeholder={$tr("params.text.font_family.search")}
      value={searchString}
      onChange={(v) => (searchString = v)} />

    {#if userFontsFiltered.length > 0}
      <h6 class="px-2 pt-2 text-label-large text-surface-600-400">{$tr("params.text.user_fonts")}</h6>
      {#each userFontsFiltered as family (family)}
        <Button variant="text" full onclick={() => fontClick(family)}>
          <span class="w-full text-left" style="font-family: {family}">{family}</span>
        </Button>
      {/each}
    {/if}

    {#if systemFontsFiltered.length > 0}
      <h6 class="px-2 pt-2 text-label-large text-surface-600-400">{$tr("params.text.system_fonts")}</h6>
      {#each systemFontsFiltered as family (family)}
        <Button variant="text" full onclick={() => fontClick(family)}>
          <span class="w-full text-left" style="font-family: {family}">{family}</span>
        </Button>
      {/each}
    {/if}

    {#if fontQuerySupported}
      <div class="my-1 border-t border-surface-300-700"></div>
      <Button variant="text" full icon="refresh" onclick={getSystemFonts}>
        {$tr("params.text.fetch_fonts")}
      </Button>
    {/if}
  </div>
</BottomSheet>

<style>
  .font-family-picker {
    width: unset;
  }
</style>
