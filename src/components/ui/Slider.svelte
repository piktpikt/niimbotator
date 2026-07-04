<script lang="ts">
  // PIKT: M3 slider (deep restyle). Replaces input[type=range]/form-range (font size, density,
  // scale). Track + fill + thumb are styled divs; a transparent native range on top handles
  // interaction + keyboard/a11y.
  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
    ariaLabel?: string;
  }

  let { value, min = 0, max = 100, step = 1, onChange, ariaLabel }: Props = $props();

  const pct = $derived(max > min ? ((value - min) / (max - min)) * 100 : 0);
</script>

<div class="relative flex h-9 w-full items-center">
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-300-700">
    <div class="h-full rounded-full bg-primary-500" style="width: {pct}%"></div>
  </div>
  <div
    class="pointer-events-none absolute size-[18px] -translate-x-1/2 rounded-full border-4 border-primary-500 bg-white shadow-e1"
    style="left: {pct}%"></div>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    aria-label={ariaLabel}
    oninput={(e) => onChange(Number(e.currentTarget.value))}
    class="absolute inset-0 h-9 w-full cursor-pointer opacity-0" />
</div>
