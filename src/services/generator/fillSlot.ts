import { slotRectToPx } from "./geometry";
import type { CategoryRecipe, ObjectDescriptor, Role, Slot } from "./types";

/**
 * Local copy of LabelBounds shape from custom_canvas.ts.
 * Only the fields needed for geometry conversion.
 */
interface LabelBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

/**
 * Default text size tiers in millimeters, per role, used when a {@link CategoryRecipe}
 * does not specify an override in `textSizesMm`. Mirrors the framework's size tiers:
 * hero/price >= 12mm, title 7-11mm, body/contact/date ~5-6mm, small (caption/legal) < 4mm.
 */
export const TIER_MM: Partial<Record<Role, number>> = {
  "text.price": 12,
  "text.title": 9,
  "text.name": 9,
  "text.contact": 5,
  "text.caption": 4,
  "text.body": 5,
  "text.legal": 3.5,
  "text.date": 6,
};

const DEFAULT_TIER_MM = 5;

/**
 * Replace every `{key}` placeholder in `template` with `variables[key]`.
 * Unknown keys are left untouched (e.g. `{adjective}` stays literal if not provided).
 */
export function substitute(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
}

/**
 * Resolve a {@link Slot} + {@link CategoryRecipe} + variables into a headless, Fabric-free
 * {@link ObjectDescriptor} ready for materialization on the canvas.
 *
 * Returns `null` for roles not yet supported in Phase 1 (`d.corner` ornaments — Phase 3;
 * `f.*` functional code objects — Phase 4). Callers must filter out `null` results.
 */
export function fillSlot(
  slot: Slot,
  recipe: CategoryRecipe,
  variables: Record<string, string>,
  bounds: LabelBounds,
  dpmm: number
): ObjectDescriptor | null {
  const box = slotRectToPx(slot.rect, bounds);

  if (slot.role.startsWith("text.")) {
    const template = recipe.defaults[slot.role] ?? "";
    const sizeMm = recipe.textSizesMm?.[slot.role] ?? TIER_MM[slot.role] ?? DEFAULT_TIER_MM;

    return {
      kind: "text",
      role: slot.role,
      text: substitute(template, variables),
      box,
      sizePx: sizeMm * dpmm,
      align: slot.align ?? "center",
    };
  }

  if (slot.role === "i.hero" || slot.role === "i.background" || slot.role === "d.accent") {
    return {
      kind: "icon",
      role: slot.role,
      keywords: recipe.iconKeywords,
      box,
      repeat: slot.repeat,
    };
  }

  if (slot.role === "d.frame") {
    return { kind: "shape", role: slot.role, shape: "rect", box };
  }

  if (slot.role === "d.separator") {
    return { kind: "shape", role: slot.role, shape: "line", box };
  }

  if (slot.role === "highlight-band") {
    return { kind: "shape", role: slot.role, shape: "band", box };
  }

  // d.corner (ornament, Phase 3) and f.* (code objects, Phase 4): not yet supported.
  return null;
}
