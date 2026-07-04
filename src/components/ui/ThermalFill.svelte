<script lang="ts">
  // PIKT: M3 thermal fill picker (deep restyle). Thermal printing is monochrome — a pixel is
  // burned (black) or not (white/paper) — so "fill" is Noir / Blanc / Transparent, not an RGB
  // colour wheel (the NiimBlue "Color" picker was a desktop-legacy nonsense). Swatches, not a
  // dropdown. `value` stays a Fabric fill string ("black" | "white" | "transparent" | …) so the
  // canvas contract is unchanged; only the control UI reframes. A future 2-colour ribbon (detected
  // via ribbonRfidInfo) would add a "Rouge" option — deferred until hardware is confirmed.
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Option {
    value: string;
    label: string;
  }
  interface Props {
    value: string;
    options: Option[];
    onChange: (v: string) => void;
    ariaLabel?: string;
  }

  let { value, options, onChange, ariaLabel }: Props = $props();

  // Fabric objects aren't reactive: mutating selectedObject.fill in place doesn't re-evaluate the
  // `value` prop (Svelte 5 fine-grained reactivity + the editRevision hidden-input trick doesn't
  // force sibling expressions to re-read). So track the click optimistically, and drop the
  // optimistic pick whenever the bound value genuinely changes (e.g. a different object is selected).
  let picked = $state<string | undefined>(undefined);
  const active = $derived(picked ?? value);
  $effect(() => {
    void value;
    picked = undefined;
  });
  function choose(v: string): void {
    picked = v;
    onChange(v);
  }

  // Map a Fabric fill string to its swatch appearance.
  function swatchStyle(v: string): string {
    if (v === "transparent" || v === "" || v === "none") {
      // checkerboard = paper / no ink
      return "background-image: linear-gradient(45deg,#3a3c46 25%,transparent 25%,transparent 75%,#3a3c46 75%),linear-gradient(45deg,#3a3c46 25%,#26272e 25%,#26272e 75%,#3a3c46 75%); background-size:12px 12px; background-position:0 0,6px 6px;";
    }
    return `background:${v};`;
  }
  const isLight = (v: string): boolean => v === "white" || v === "#fff" || v === "#ffffff";
</script>

<div role="group" aria-label={ariaLabel} class="flex w-full gap-2">
  {#each options as opt (opt.value)}
    {@const selected = active === opt.value}
    <button
      type="button"
      aria-pressed={selected}
      aria-label={opt.label}
      onclick={() => choose(opt.value)}
      class="relative flex flex-1 flex-col items-center justify-end gap-1.5 rounded-m3-sm border p-2 pt-3 text-label-medium transition
        {selected ? 'border-primary-500 ring-2 ring-primary-500' : 'border-surface-400-600'}
        {isLight(opt.value) ? 'text-surface-950' : 'text-surface-50'}">
      <span class="pointer-events-none absolute inset-0 rounded-m3-sm" style={swatchStyle(opt.value)}></span>
      {#if selected}
        <span class="relative z-10 {isLight(opt.value) ? 'text-primary-600' : 'text-primary-300'}"><MdIcon icon="check" /></span>
      {/if}
      <span class="relative z-10 rounded-full bg-surface-950/45 px-2 py-0.5 text-surface-50">{opt.label}</span>
    </button>
  {/each}
</div>
