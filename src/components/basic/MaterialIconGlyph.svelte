<script lang="ts">
  // PIKT: legacy material-icons font-glyph renderer (Chantier 0). Used by the icon picker's
  // insertable library, which still relies on the material-icons font for canvas/print content.
  // Removed in Chantier 5 when OpenMoji stickers replace icon-on-label insertion.
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";

  interface Props {
    icon: MaterialIcon;
    class?: string;
  }

  let { icon, class: className = "" }: Props = $props();
</script>

<span class="mdi-glyph {className}">
  {String.fromCodePoint(iconCodepoints[icon])}
</span>

<style>
  .mdi-glyph {
    font-family: "Material Icons";
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    font-size: 1.5em;
    vertical-align: -0.24em;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: "liga";
  }
  .mdi-glyph.r-90 {
    transform: rotate(90deg);
  }
</style>
