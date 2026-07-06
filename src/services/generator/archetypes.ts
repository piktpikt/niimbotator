import type { Archetype } from "./types";
import { ArchetypeSchema } from "./types";

/**
 * Hand-authored layouts (Phase 1 subset of the ~24 archetypes targeted in Phase 3).
 * Slot `rect` fractions are relative to the label bounds (0..1) and are kept within
 * [0,1] and non-overlapping per archetype. Validated against {@link ArchetypeSchema}
 * at module load — a malformed archetype throws immediately on import.
 */
const RAW_ARCHETYPES: Archetype[] = [
  // Centered hero illustration with a title band below it (e.g. Birthday, Pets).
  {
    id: "centred-hero",
    slots: [
      { role: "i.hero", rect: [0.2, 0.12, 0.6, 0.5], z: 1 },
      { role: "text.title", rect: [0.08, 0.68, 0.84, 0.22], align: "center", z: 2 },
    ],
  },

  // Hero image on the left half, title + body text stacked on the right half.
  {
    id: "image-left-text-right",
    slots: [
      { role: "i.hero", rect: [0.04, 0.1, 0.42, 0.8], z: 1 },
      { role: "text.title", rect: [0.5, 0.12, 0.46, 0.28], align: "left", z: 2 },
      { role: "text.body", rect: [0.5, 0.44, 0.46, 0.44], align: "left", z: 2 },
    ],
  },

  // Full-bleed background image with a caption band along the bottom.
  {
    id: "full-image-caption",
    slots: [
      { role: "i.background", rect: [0, 0, 1, 1], z: 0 },
      { role: "text.caption", rect: [0.05, 0.8, 0.9, 0.16], align: "center", z: 2 },
    ],
  },

  // Retail price tag: product name up top, big price centered, caption/code at the bottom.
  {
    id: "price-tag",
    slots: [
      { role: "text.name", rect: [0.06, 0.06, 0.88, 0.2], align: "center", z: 1 },
      { role: "text.price", rect: [0.1, 0.32, 0.8, 0.4], align: "center", z: 1 },
      { role: "text.caption", rect: [0.06, 0.8, 0.88, 0.14], align: "center", z: 1 },
    ],
  },

  // Name badge: name centered, small hero image, separator, optional contact line.
  {
    id: "name-badge",
    slots: [
      { role: "i.hero", rect: [0.06, 0.14, 0.22, 0.4], z: 1 },
      { role: "text.name", rect: [0.32, 0.16, 0.62, 0.34], align: "left", z: 2 },
      { role: "d.separator", rect: [0.06, 0.58, 0.88, 0.04], z: 1 },
      { role: "text.contact", rect: [0.06, 0.66, 0.88, 0.24], align: "left", z: 2 },
    ],
  },
];

export const ARCHETYPES: Archetype[] = RAW_ARCHETYPES.map((archetype) => ArchetypeSchema.parse(archetype));

/** Look up an archetype by id, or `undefined` if no archetype has that id. */
export function archetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find((archetype) => archetype.id === id);
}
