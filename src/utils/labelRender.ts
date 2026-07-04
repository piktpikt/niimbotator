// Niimbotator — headless label rendering pipeline.
//
// Extracted from PrintPreview.svelte so a label can be rendered to a printable
// bitmap without a visible component (e.g. the upcoming batch-print service which
// iterates over batch items headlessly). PrintPreview.svelte now delegates its
// render pipeline here; the printer encoding + BLE orchestration stay in callers.
//
// The pipeline is deliberately split into two phases, mirroring PrintPreview:
//   - rasterizeLabel (expensive): Fabric build + variable substitution + rasterize
//     to grayscale ImageData. Run once per label/page.
//   - compositeLabel (cheap): monochrome post-process + offset compositing. Run on
//     every parameter tweak (threshold/offset/invert) without re-rasterizing Fabric.

import { CustomCanvas } from "$/fabric-object/custom_canvas";
import { canvasPreprocess } from "$/utils/canvas_preprocess";
import { atkinson, bayer, copyImageData, invert, threshold } from "$/utils/post_process";
import { ImageEncoder, type EncodedImage } from "@mmote/niimbluelib";
import type { FabricJson, LabelProps, PostProcessType, PreviewPropsOffset } from "$/types";

// Side-effect imports: register custom Fabric classes so loadFromJSON can
// deserialize them headlessly. In the editor these run transitively, but a
// headless caller (batch print) may reach here before the editor mounts.
import "$/fabric-object/qrcode";
import "$/fabric-object/barcode";
import "$/fabric-object/aruco";
import "$/fabric-object/textbox-ext";

export interface LabelRenderOptions {
  postProcess?: PostProcessType;
  postProcessInvert?: boolean;
  threshold?: number;
  offset?: PreviewPropsOffset;
}

const DEFAULT_OFFSET: PreviewPropsOffset = { x: 0, y: 0, offsetType: "inner" };
const DEFAULT_THRESHOLD = 140;

/**
 * Phase A (expensive). Build a headless Fabric canvas from the label props and
 * serialized canvas state, substitute `{var}`/`{dt}` templates, materialize
 * mirrored objects, and rasterize to grayscale ImageData. No DOM/preview/printer
 * coupling — safe to call without a mounted component.
 */
export async function rasterizeLabel(
  labelProps: LabelProps,
  canvasJson: FabricJson,
  variables: { [key: string]: string } = {},
): Promise<ImageData> {
  const fabricTempCanvas = new CustomCanvas(undefined, {
    width: labelProps.size.width,
    height: labelProps.size.height,
  });

  fabricTempCanvas.setCustomBackground(false);
  fabricTempCanvas.setHighlightMirror(false);
  fabricTempCanvas.setLabelProps(labelProps);

  await fabricTempCanvas.loadFromJSON(canvasJson);

  canvasPreprocess(fabricTempCanvas, variables);

  await fabricTempCanvas.createMirroredObjects();

  fabricTempCanvas.requestRenderAll();

  const preRenderedCanvas = fabricTempCanvas.toCanvasElement();
  const ctx = preRenderedCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, preRenderedCanvas.width, preRenderedCanvas.height);

  fabricTempCanvas.dispose();

  return imageData;
}

/**
 * Phase B (cheap). Apply the selected monochrome algorithm + optional invert to a
 * grayscale source, then composite it at the given offset onto a fresh canvas
 * holding the final black-and-white bitmap. Pure: the offset-warning UI (which
 * reads the printer meta store) stays in the caller.
 */
export function compositeLabel(source: ImageData, options: LabelRenderOptions = {}): HTMLCanvasElement {
  const {
    postProcess,
    postProcessInvert = false,
    threshold: thresholdValue = DEFAULT_THRESHOLD,
    offset = DEFAULT_OFFSET,
  } = options;

  let iData = copyImageData(source);

  if (postProcess === "threshold") {
    iData = threshold(iData, thresholdValue);
  } else if (postProcess === "dither") {
    iData = atkinson(iData, thresholdValue);
  } else if (postProcess === "bayer") {
    iData = bayer(iData, thresholdValue);
  }

  if (postProcessInvert) {
    iData = invert(iData);
  }

  const canvas = document.createElement("canvas");

  if (offset.offsetType === "inner") {
    canvas.width = source.width;
    canvas.height = source.height;
  } else {
    canvas.width = source.width + Math.abs(offset.x);
    canvas.height = source.height + Math.abs(offset.y);
  }

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (offset.offsetType === "inner") {
    ctx.putImageData(iData, offset.x, offset.y);
  } else {
    ctx.putImageData(iData, Math.max(offset.x, 0), Math.max(offset.y, 0));
  }

  return canvas;
}

/** Convenience: rasterize + composite in one call, returning the printable canvas. */
export async function renderLabelToCanvas(
  labelProps: LabelProps,
  canvasJson: FabricJson,
  options: LabelRenderOptions & { variables?: { [key: string]: string } } = {},
): Promise<HTMLCanvasElement> {
  const { variables, ...renderOptions } = options;
  const source = await rasterizeLabel(labelProps, canvasJson, variables);
  return compositeLabel(source, renderOptions);
}

/** Convenience for headless printing: render then encode to the printer bitmap. */
export async function encodeLabel(
  labelProps: LabelProps,
  canvasJson: FabricJson,
  options: LabelRenderOptions & { variables?: { [key: string]: string } } = {},
): Promise<EncodedImage> {
  const canvas = await renderLabelToCanvas(labelProps, canvasJson, options);
  return ImageEncoder.encodeCanvas(canvas, labelProps.printDirection);
}
