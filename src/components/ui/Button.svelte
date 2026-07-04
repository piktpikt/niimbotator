<script lang="ts">
  // PIKT: M3 Button primitive (deep restyle). Skeleton ships no Button, so this encodes the M3
  // button hierarchy once: filled / tonal / outlined / text / elevated, with a translucent
  // state-layer (::before, on-color) for hover/pressed feedback, a 48dp touch target, and icon
  // support. Colours are literal class strings so Tailwind's JIT keeps them.
  import type { Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { IconName } from "$/styles/icon_data";

  type Variant = "filled" | "tonal" | "outlined" | "text" | "elevated";
  type Color = "primary" | "secondary" | "tertiary" | "error" | "warning";

  interface Props {
    variant?: Variant;
    color?: Color;
    icon?: IconName;
    trailingIcon?: IconName;
    type?: "button" | "submit";
    disabled?: boolean;
    full?: boolean;
    ariaLabel?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = "filled",
    color = "primary",
    icon,
    trailingIcon,
    type = "button",
    disabled = false,
    full = false,
    ariaLabel,
    onclick,
    children,
  }: Props = $props();

  const filled: Record<Color, string> = {
    primary: "bg-primary-500 text-primary-contrast-500 shadow-e1",
    secondary: "bg-secondary-500 text-secondary-contrast-500 shadow-e1",
    tertiary: "bg-tertiary-500 text-tertiary-contrast-500 shadow-e1",
    error: "bg-error-500 text-error-contrast-500 shadow-e1",
    warning: "bg-warning-500 text-warning-contrast-500 shadow-e1",
  };
  const tonal: Record<Color, string> = {
    primary: "bg-primary-500/15 text-primary-500",
    secondary: "bg-secondary-500/15 text-secondary-500",
    tertiary: "bg-tertiary-500/15 text-tertiary-500",
    error: "bg-error-500/15 text-error-500",
    warning: "bg-warning-500/15 text-warning-500",
  };
  const outlined: Record<Color, string> = {
    primary: "border border-surface-400-600 text-primary-500",
    secondary: "border border-surface-400-600 text-secondary-500",
    tertiary: "border border-surface-400-600 text-tertiary-500",
    error: "border border-error-500/50 text-error-500",
    warning: "border border-warning-500/50 text-warning-500",
  };
  const textOnly: Record<Color, string> = {
    primary: "text-primary-500",
    secondary: "text-secondary-500",
    tertiary: "text-tertiary-500",
    error: "text-error-500",
    warning: "text-warning-500",
  };
  const elevated: Record<Color, string> = {
    primary: "bg-surface-100-900 text-primary-500 shadow-e2",
    secondary: "bg-surface-100-900 text-secondary-500 shadow-e2",
    tertiary: "bg-surface-100-900 text-tertiary-500 shadow-e2",
    error: "bg-surface-100-900 text-error-500 shadow-e2",
    warning: "bg-surface-100-900 text-warning-500 shadow-e2",
  };

  const variantClass = $derived(
    variant === "filled"
      ? filled[color]
      : variant === "tonal"
        ? tonal[color]
        : variant === "outlined"
          ? outlined[color]
          : variant === "text"
            ? textOnly[color]
            : elevated[color],
  );
</script>

<button
  {type}
  {disabled}
  aria-label={ariaLabel}
  {onclick}
  class="relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-m3-sm px-6 text-label-large transition
    before:absolute before:inset-0 before:bg-current before:opacity-0 before:transition-opacity before:content-['']
    hover:before:opacity-[0.08] active:before:opacity-[0.12]
    disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none
    {variantClass} {full ? 'w-full' : ''}">
  <span class="relative z-10 inline-flex items-center gap-2">
    {#if icon}<MdIcon {icon} />{/if}
    {#if children}{@render children()}{/if}
    {#if trailingIcon}<MdIcon icon={trailingIcon} />{/if}
  </span>
</button>
