<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  // PIKT: legacy font-glyph renderer for the insertable material-icons library (Chantier 0).
  import MaterialIconGlyph from "$/components/basic/MaterialIconGlyph.svelte";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  // PIKT: M3 restyle (editor phase 5) — Bootstrap dropdown -> BottomSheet + ui primitives.
  import BottomSheet from "$/components/ui/BottomSheet.svelte";
  import TextField from "$/components/ui/TextField.svelte";
  import Select from "$/components/ui/Select.svelte";
  import Button from "$/components/ui/Button.svelte";

  interface Props {
    onSubmit: (i: MaterialIcon) => void;
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmit, onSubmitSvg }: Props = $props();

  let open = $state(false);
  let iconNames = $state<MaterialIcon[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);

  // PIKT: lazy-init the icon list when the sheet opens (was tied to `show.bs.dropdown`).
  const onShow = () => {
    if (iconNames.length === 0) {
      iconNames = Object.keys(iconCodepoints) as MaterialIcon[];
    }
  };

  $effect(() => {
    if (open) onShow();
  });

  const addOwn = async () => {
    try {
      let counter = 0;
      const xmls = await FileUtils.pickAndReadTextFile("svg", true);
      const iconsToAdd = xmls.map((xml) => ({
        name: `i_${FileUtils.timestampFloat()}_${counter++}`,
        data: xml,
      }));

      userIcons.update((prev) => [...prev, ...iconsToAdd]);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const svgClicked = (name: string, data: string) => {
    if (deleteMode) {
      userIcons.update((prev) => prev.filter((e) => e.name !== name));
      return;
    }

    onSubmitSvg(data);
  };

  const iconClicked = (i: MaterialIcon) => {
    if (deleteMode) {
      return;
    }

    onSubmit(i);
  };
</script>

<button class="tool-cell" onclick={() => (open = true)}>
  <MdIcon icon="emoji_emotions" /><span>{$tr("editor.toolbar.sticker")}</span>
</button>

<BottomSheet bind:open title={$tr("editor.iconpicker.title")}>
  <div class="flex flex-col gap-3">
    <TextField
      value={search}
      type="text"
      placeholder={$tr("editor.iconpicker.search")}
      disabled={$appConfig.iconListMode === "user"}
      onChange={(v) => (search = v)} />

    <Select
      value={$appConfig.iconListMode}
      label={$tr("editor.iconpicker.show")}
      options={[
        { value: "both", label: $tr("editor.iconpicker.show.both") },
        { value: "user", label: $tr("editor.iconpicker.show.user") },
        { value: "pack", label: $tr("editor.iconpicker.show.pack") },
      ]}
      onChange={(v) => ($appConfig.iconListMode = v as "both" | "user" | "pack")} />

    <div class="icons flex flex-wrap gap-1">
      {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
        {#each $userIcons as { name, data } (name)}
          <button
            class="user-icon flex size-11 items-center justify-center rounded-m3-sm {deleteMode
              ? 'bg-error-500/15 text-error-500'
              : 'bg-surface-200-800'}"
            onclick={() => svgClicked(name, data)}>
            <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" />
          </button>
        {/each}
      {/if}

      {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
        {#each iconNames as name (name)}
          {#if !search || name.includes(search.toLowerCase())}
            <button
              class="flex size-11 items-center justify-center rounded-m3-sm text-surface-950-50 hover:bg-surface-200-800"
              title={name}
              onclick={() => iconClicked(name)}>
              <MaterialIconGlyph icon={name} />
            </button>
          {/if}
        {/each}
      {/if}
    </div>

    <div class="flex gap-2">
      <Button variant="outlined" icon="add" onclick={addOwn}>
        {$tr("editor.iconpicker.add")}
      </Button>
      <Button
        variant={deleteMode ? "tonal" : "outlined"}
        color="error"
        icon="delete"
        onclick={() => (deleteMode = !deleteMode)}>
        {$tr("editor.iconpicker.delete_mode")}
      </Button>
    </div>

    <a
      href="https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled"
      target="_blank"
      class="text-body-medium text-primary-500">
      {$tr("editor.iconpicker.mdi_link_title")}
    </a>
  </div>
</BottomSheet>

<style>
  .icons {
    max-height: 400px;
    overflow-y: auto;
  }
  .user-icon img {
    width: 24px;
  }
</style>
