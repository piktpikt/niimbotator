<script lang="ts">
  // PIKT (Niimbotator): decorative sticker picker — search-as-you-type (FR/EN) + theme chips + recents/favorites.
  // Mirrors FontFamilyPicker. Emits the chosen StickerAsset; the parent adds it to the canvas.
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import { tr, locale, type TranslationKey } from "$/utils/i18n";
  import { loadCatalog } from "$/services/stickers/catalog";
  import { createStickerIndex, searchStickers } from "$/services/stickers/search";
  import { THEME_KEYS, type StickerAsset, type ThemeKey } from "$/services/stickers/types";
  import { favoriteIds, recentIds, toggleFavorite, pushRecent } from "$/stores/stickerStore";
  import type MiniSearch from "minisearch";

  interface Props {
    open: boolean;
    onPick: (asset: StickerAsset) => void;
  }
  let { open = $bindable(), onPick }: Props = $props();

  let assets = $state<StickerAsset[]>([]);
  let index = $state<MiniSearch<StickerAsset>>();
  let loading = $state(false);
  let query = $state("");
  let theme = $state<ThemeKey | undefined>(undefined);

  // Lazy-load the catalog the first time the sheet opens.
  $effect(() => {
    if (open && !index && !loading) {
      loading = true;
      void loadCatalog().then((cat) => {
        assets = cat;
        index = createStickerIndex(cat);
        loading = false;
      });
    }
  });

  let results = $derived.by<StickerAsset[]>(() => {
    if (!index) return [];
    return searchStickers(index, assets, query, theme).slice(0, 300);
  });

  let byId = $derived(new Map(assets.map((a) => [a.id, a])));
  let recentAssets = $derived($recentIds.map((id) => byId.get(id)).filter((a): a is StickerAsset => !!a));
  let favoriteAssets = $derived([...$favoriteIds].map((id) => byId.get(id)).filter((a): a is StickerAsset => !!a));
  let showBrowse = $derived(query.trim() === "" && !theme);

  // PIKT: lang selection must key off the locale code (e.g. "fr", "fr_FR"), not a translated
  // string comparison — see controller directive for Task 6.
  let lang = $derived($locale);
  const label = (a: StickerAsset) => (lang.startsWith("fr") ? a.labelFr : a.labelEn);

  function choose(a: StickerAsset): void {
    void pushRecent(a.id);
    onPick(a);
    open = false;
  }
  function toggleTheme(t: ThemeKey): void {
    theme = theme === t ? undefined : t;
  }
</script>

{#snippet grid(items: StickerAsset[])}
  <div class="grid grid-cols-6 gap-1">
    {#each items as a (a.id)}
      <button
        type="button"
        class="flex aspect-square items-center justify-center rounded-m3-md p-1 hover:bg-surface-200-800"
        title={label(a)}
        aria-label={label(a)}
        oncontextmenu={(e) => {
          e.preventDefault();
          void toggleFavorite(a.id);
        }}
        onclick={() => choose(a)}>
        <img src={a.spriteUrl} alt={label(a)} loading="lazy" class="h-full w-full object-contain" />
      </button>
    {/each}
  </div>
{/snippet}

<BottomSheet bind:open title={$tr("stickers.title")}>
  <div class="flex flex-col gap-3">
    <TextField placeholder={$tr("stickers.search")} value={query} onChange={(v) => (query = v)} />

    <div class="flex gap-1 overflow-x-auto pb-1">
      {#each THEME_KEYS as t (t)}
        <button
          type="button"
          class="shrink-0 rounded-m3-full px-3 py-1 text-label-large transition-colors {theme === t
            ? 'bg-primary-500 text-white'
            : 'bg-surface-200-800'}"
          onclick={() => toggleTheme(t)}>
          {$tr(`stickers.theme.${t}` as TranslationKey)}
        </button>
      {/each}
    </div>

    {#if loading}
      <p class="py-8 text-center text-body-medium text-surface-500">{$tr("stickers.loading")}</p>
    {:else if showBrowse}
      {#if favoriteAssets.length > 0}
        <h6 class="text-label-large text-surface-500">{$tr("stickers.favorites")}</h6>
        {@render grid(favoriteAssets)}
      {/if}
      {#if recentAssets.length > 0}
        <h6 class="text-label-large text-surface-500">{$tr("stickers.recents")}</h6>
        {@render grid(recentAssets)}
      {/if}
      {@render grid(results)}
    {:else if results.length === 0}
      <p class="py-8 text-center text-body-medium text-surface-500">{$tr("stickers.empty")}</p>
    {:else}
      {@render grid(results)}
    {/if}
  </div>
</BottomSheet>
