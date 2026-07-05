import * as fabric from "fabric";
import { OBJECT_DEFAULTS, OBJECT_DEFAULTS_TEXT, OBJECT_DEFAULTS_VECTOR, OBJECT_SIZE_DEFAULTS } from "$/defaults";
import { ArUcoMarker } from "$/fabric-object/aruco";
import Barcode from "$/fabric-object/barcode";
import { QRCode } from "$/fabric-object/qrcode";
import type { OjectType } from "$/types";
import { Toasts } from "$/utils/toasts";
import { FileUtils } from "$/utils/file_utils";
import { CanvasUtils } from "$/utils/canvas_utils";
import { TextboxExt, TextboxExtProps } from "$/fabric-object/textbox-ext";

export class LabelDesignerObjectHelper {
  static async addSvg(canvas: fabric.Canvas, svgCode: string): Promise<fabric.FabricObject | fabric.Group> {
    const { objects, options } = await fabric.loadSVGFromString(svgCode);
    const obj = fabric.util.groupSVGElements(
      objects.filter((o) => o !== null),
      options,
    );
    obj.set({ ...OBJECT_DEFAULTS });
    CanvasUtils.fitObjectIntoCanvas(canvas, obj, OBJECT_DEFAULTS.left, OBJECT_DEFAULTS.top);
    canvas.add(obj);
    canvas.renderAll();
    return obj;
  }

  static async addImageFile(canvas: fabric.Canvas, file: File): Promise<fabric.FabricObject | fabric.Group> {
    if (file.type.startsWith("image/svg")) {
      const data = await file.text();
      return await this.addSvg(canvas, data);
    }

    if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/bmp" || file.type === "image/gif") {
      const url = await FileUtils.blobToDataUrl(file);
      const fabricImg = await fabric.FabricImage.fromURL(url);
      fabricImg.set({ ...OBJECT_DEFAULTS });
      CanvasUtils.fitObjectIntoCanvas(canvas, fabricImg, OBJECT_DEFAULTS.left, OBJECT_DEFAULTS.top);
      canvas.add(fabricImg);
      return fabricImg;
    }

    throw new Error("Unsupported image");
  }

  static async addImageWithFilePicker(fabricCanvas: fabric.Canvas): Promise<fabric.FabricObject | fabric.Group> {
    const files = await FileUtils.pickFileAsync("*", false);
    try {
      return await this.addImageFile(fabricCanvas, files[0]);
    } catch (e) {
      // fixme: catch error in other place
      Toasts.error(e);
      throw e;
    }
  }

  static async addImageBlob(fabricCanvas: fabric.Canvas, img: Blob): Promise<fabric.FabricImage> {
    const url = await FileUtils.blobToDataUrl(img);
    const fabricImg = await fabric.FabricImage.fromURL(url);
    fabricImg.set({ left: 0, top: 0, snapAngle: OBJECT_DEFAULTS.snapAngle });
    fabricCanvas.add(fabricImg);
    return fabricImg;
  }

  static async addObjectFromClipboard(
    fabricCanvas: fabric.Canvas,
    data: DataTransfer,
  ): Promise<fabric.FabricObject | undefined> {
    // paste image
    for (const item of data.items) {
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        if (file) {
          return await LabelDesignerObjectHelper.addImageFile(fabricCanvas, file);
        }
      }
    }

    // paste text
    const text = data.getData("text");
    if (text) {
      const obj = LabelDesignerObjectHelper.addText(fabricCanvas, text);
      fabricCanvas.setActiveObject(obj);
      return obj;
    }
  }

  static addText(canvas: fabric.Canvas, text?: string, options?: Partial<TextboxExtProps>): TextboxExt {
    const obj = new TextboxExt(text ?? "Text", {
      ...OBJECT_DEFAULTS_TEXT,
      ...options,
    });
    canvas.add(obj);
    canvas.centerObject(obj);
    return obj;
  }

  static addStaticText(canvas: fabric.Canvas, text?: string, options?: Partial<fabric.TextProps>): fabric.FabricText {
    const obj = new fabric.FabricText(text ?? "Text", {
      ...OBJECT_DEFAULTS_TEXT,
      ...options,
    });
    canvas.add(obj);
    canvas.centerObject(obj);
    return obj;
  }

  static addHLine(canvas: fabric.Canvas): fabric.Polyline {
    const obj = new fabric.Polyline(
      [
        { x: OBJECT_DEFAULTS.left, y: OBJECT_DEFAULTS.top },
        { x: OBJECT_DEFAULTS.left + OBJECT_SIZE_DEFAULTS.width, y: OBJECT_DEFAULTS.top },
      ],
      { ...OBJECT_DEFAULTS_VECTOR },
    );
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addCircle(canvas: fabric.Canvas): fabric.Circle {
    const obj = new fabric.Circle({
      ...OBJECT_DEFAULTS_VECTOR,
      radius: OBJECT_SIZE_DEFAULTS.width / 2,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addRect(canvas: fabric.Canvas): fabric.Rect {
    const obj = new fabric.Rect({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS_VECTOR,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addRoundedRect(canvas: fabric.Canvas): fabric.Rect {
    const obj = new fabric.Rect({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS_VECTOR,
      rx: 12,
      ry: 12,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addEllipse(canvas: fabric.Canvas): fabric.Ellipse {
    const obj = new fabric.Ellipse({
      ...OBJECT_DEFAULTS_VECTOR,
      rx: OBJECT_SIZE_DEFAULTS.width / 2,
      ry: OBJECT_SIZE_DEFAULTS.height / 3,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addTriangle(canvas: fabric.Canvas): fabric.Triangle {
    const obj = new fabric.Triangle({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS_VECTOR,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addStar(canvas: fabric.Canvas): fabric.Polygon {
    const r = OBJECT_SIZE_DEFAULTS.width / 2;
    const obj = new fabric.Polygon(this.starPoints(5, r, r / 2), { ...OBJECT_DEFAULTS_VECTOR });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addArrow(canvas: fabric.Canvas): fabric.Polygon {
    const w = OBJECT_SIZE_DEFAULTS.width;
    const h = OBJECT_SIZE_DEFAULTS.height;
    const points = [
      { x: 0, y: h * 0.3 },
      { x: w * 0.55, y: h * 0.3 },
      { x: w * 0.55, y: h * 0.05 },
      { x: w, y: h / 2 },
      { x: w * 0.55, y: h * 0.95 },
      { x: w * 0.55, y: h * 0.7 },
      { x: 0, y: h * 0.7 },
    ];
    const obj = new fabric.Polygon(points, { ...OBJECT_DEFAULTS_VECTOR });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addHeart(canvas: fabric.Canvas): fabric.Path {
    // Heart outline (viewBox 24×24), scaled up to the default shape size. A native Fabric Path, so it
    // serializes/loads without a classRegistry entry — like the other primitive shapes.
    const HEART =
      "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
    const obj = new fabric.Path(HEART, { ...OBJECT_DEFAULTS_VECTOR });
    const scale = OBJECT_SIZE_DEFAULTS.width / (obj.width || 24);
    obj.set({ scaleX: scale, scaleY: scale });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  /** Vertices for an N-point star inscribed in a 2*outer box (origin at top-left of that box). */
  private static starPoints(points: number, outer: number, inner: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = i * step - Math.PI / 2;
      result.push({ x: outer + radius * Math.cos(angle), y: outer + radius * Math.sin(angle) });
    }
    return result;
  }

  static addQrCode(canvas: fabric.Canvas): QRCode {
    const qr = new QRCode({
      text: "NiimBlue",
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS,
    });
    canvas.add(qr);
    return qr;
  }

  static addArUco(canvas: fabric.Canvas): ArUcoMarker {
    const aruco = new ArUcoMarker({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS,
    });
    canvas.add(aruco);
    return aruco;
  }

  static addBarcode(canvas: fabric.Canvas): Barcode {
    const barcode = new Barcode({
      ...OBJECT_DEFAULTS,
      text: "123456789012",
      height: OBJECT_SIZE_DEFAULTS.height,
      encoding: "CODE128B",
    });
    canvas.add(barcode);
    return barcode;
  }

  static addObject(canvas: fabric.Canvas, objType: OjectType): fabric.FabricObject | undefined {
    switch (objType) {
      case "text":
        return this.addText(canvas);
      case "line":
        return this.addHLine(canvas);
      case "circle":
        return this.addCircle(canvas);
      case "ellipse":
        return this.addEllipse(canvas);
      case "rectangle":
        return this.addRect(canvas);
      case "rounded_rect":
        return this.addRoundedRect(canvas);
      case "triangle":
        return this.addTriangle(canvas);
      case "star":
        return this.addStar(canvas);
      case "arrow":
        return this.addArrow(canvas);
      case "heart":
        return this.addHeart(canvas);
      case "image":
        this.addImageWithFilePicker(canvas);
        return;
      case "qrcode":
        return this.addQrCode(canvas);
      case "aruco":
        return this.addArUco(canvas);
      case "barcode":
        return this.addBarcode(canvas);
    }
  }
}
