import * as fabric from "fabric";
import { DEFAULT_LABEL_PROPS } from "$/defaults";
import { CustomCanvas } from "$/fabric-object/custom_canvas";
import type { FabricJson, LabelProps } from "$/types";
import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
import { planLabel } from "./plan";
import { resolveIconSvg } from "./resolveIcon";
import type { CategoryRecipe } from "./types";

/**
 * Fabric wrapper around {@link planLabel}: materializes each headless {@link ObjectDescriptor} onto a
 * fresh {@link CustomCanvas} and serializes the result.
 *
 * NOT unit-tested — this repo runs Vitest under Node with `node-canvas` deliberately uninstalled, so a
 * real `fabric.Canvas`/`CustomCanvas` cannot be constructed in a unit test (Fabric rendering is
 * browser-proven per CLAUDE.md). This function is covered by `npm run sv-check` (type-checks the Fabric
 * wiring below) and `npm run build`; visual/browser proof is deferred to Phase 2.
 */
export async function generateLabel(
  recipe: CategoryRecipe,
  variables: Record<string, string>,
  labelProps: LabelProps = DEFAULT_LABEL_PROPS
): Promise<{ canvasState: FabricJson; thumbnail: string }> {
  const descriptors = planLabel(recipe, variables, labelProps);

  const canvas = new CustomCanvas(undefined, { width: labelProps.size.width, height: labelProps.size.height });
  canvas.setLabelProps(labelProps);
  canvas.setCustomBackground(false);

  for (const descriptor of descriptors) {
    if (descriptor.kind === "text") {
      const textObj = LabelDesignerObjectHelper.addStaticText(canvas, descriptor.text, {
        fontSize: descriptor.sizePx,
        textAlign: descriptor.align,
      });
      textObj.set({ left: descriptor.box.left, top: descriptor.box.top, originX: "left", originY: "top" });
    } else if (descriptor.kind === "icon") {
      const svg = await resolveIconSvg(descriptor.keywords);
      if (!svg) continue;

      const obj = await LabelDesignerObjectHelper.addSvg(canvas, svg);
      const scale = Math.min(descriptor.box.width / (obj.width || 1), descriptor.box.height / (obj.height || 1));
      obj.set({
        scaleX: scale,
        scaleY: scale,
        originX: "left",
        originY: "top",
        left: descriptor.box.left + (descriptor.box.width - (obj.width || 0) * scale) / 2,
        top: descriptor.box.top + (descriptor.box.height - (obj.height || 0) * scale) / 2,
      });
    } else if (descriptor.kind === "shape") {
      if (descriptor.shape === "line") {
        canvas.add(
          new fabric.Line(
            [
              descriptor.box.left,
              descriptor.box.top + descriptor.box.height / 2,
              descriptor.box.left + descriptor.box.width,
              descriptor.box.top + descriptor.box.height / 2,
            ],
            { stroke: "black", strokeWidth: 2 }
          )
        );
      } else {
        canvas.add(
          new fabric.Rect({
            left: descriptor.box.left,
            top: descriptor.box.top,
            width: descriptor.box.width,
            height: descriptor.box.height,
            fill: descriptor.shape === "band" ? "black" : "transparent",
            stroke: "black",
            strokeWidth: 2,
            originX: "left",
            originY: "top",
          })
        );
      }
    }
  }

  canvas.renderAll();

  // toObject() returns fabric's generic serialization shape; FabricJson (Zod-inferred) matches it at
  // runtime but the two types aren't structurally related, hence the cast.
  const canvasState = canvas.toObject() as unknown as FabricJson;
  const longestSidePx = Math.max(labelProps.size.width, labelProps.size.height, 1);
  const thumbnail = canvas.toDataURL({ format: "png", multiplier: 64 / longestSidePx });

  canvas.dispose();

  return { canvasState, thumbnail };
}
