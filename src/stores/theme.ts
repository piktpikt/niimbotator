// PIKT: Theme (light/dark/auto) store driving Skeleton's `data-theme` + `.dark` class on <html>.
// Replaces niimblue's hardcoded `data-bs-theme="dark"`. (Chantier 0)
import { derived, get, type Readable } from "svelte/store";
import { appConfig } from "$/stores";

export type ThemeMode = "light" | "dark" | "auto";

/** Active Skeleton theme name (see src/themes/niimbotator.css). */
export const THEME_NAME = "niimbotator";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const prefersDark = (): boolean =>
  typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;

/** Whether dark mode should be active for the given mode. */
function isDark(mode: ThemeMode): boolean {
  return mode === "auto" ? prefersDark() : mode === "dark";
}

/** Apply the resolved theme to <html>: Skeleton theme name + dark class (+ Bootstrap coexistence attr). */
function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = isDark(mode);
  root.setAttribute("data-theme", THEME_NAME);
  root.classList.toggle("dark", dark);
}

/** Current theme mode, derived from persisted appConfig (defaults to "auto"). */
export const themeMode: Readable<ThemeMode> = derived(appConfig, ($c) => $c.theme ?? "auto");

/** Persist a new theme mode. */
export function setThemeMode(mode: ThemeMode): void {
  appConfig.update((c) => ({ ...c, theme: mode }));
}

/** Call once at app startup: apply the current theme and react to config + OS scheme changes. */
export function initTheme(): void {
  if (typeof window === "undefined") return;
  themeMode.subscribe((mode) => applyTheme(mode));
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    if (get(themeMode) === "auto") applyTheme("auto");
  });
}
