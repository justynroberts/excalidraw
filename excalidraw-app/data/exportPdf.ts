// PDF export for Sketchbench (upstream Excalidraw exports PNG and SVG only).
//
// The drawing is rendered at 2x through Excalidraw's own exportToCanvas, so
// every font, fill and theme setting matches the PNG export, then embedded as
// a single JPEG page sized to the drawing. No dependency: the PDF is written
// by hand (PDF supports JPEG natively via the DCTDecode filter).

import { exportToCanvas } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const RENDER_SCALE = 2;
const MAX_EDGE_PX = 8000;
const PADDING = 32;
/** Scene pixels are CSS pixels (96/in); PDF points are 72/in. */
const PX_TO_PT = 72 / 96;

const encoder = new TextEncoder();

const buildPdf = (
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
) => {
  const w = pageWidth.toFixed(2);
  const h = pageHeight.toFixed(2);
  const content = encoder.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  object(3, () =>
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
        `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ),
  );
  object(4, () => {
    push(
      `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    push(jpeg);
    push("\nendstream");
  });
  object(5, () => {
    push(`<< /Length ${content.length} >>\nstream\n`);
    push(content);
    push("\nendstream");
  });

  const xrefOffset = length;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let id = 1; id <= 5; id++) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
};

/**
 * Export the selection (or the whole drawing when nothing is selected) as a
 * one-page PDF and download it.
 */
export const exportToPdf = async (api: ExcalidrawImperativeAPI) => {
  const appState = api.getAppState();
  const all = api.getSceneElements();
  const selected = all.filter((el) => appState.selectedElementIds[el.id]);
  const elements = selected.length ? selected : all;
  if (!elements.length) {
    api.setToast({ message: "Nothing to export yet.", closable: true });
    return;
  }

  let renderScale = RENDER_SCALE;
  const canvas = await exportToCanvas({
    elements,
    appState: { ...appState, exportBackground: true },
    files: api.getFiles(),
    exportPadding: PADDING,
    getDimensions: (width, height) => {
      const scale = Math.min(
        RENDER_SCALE,
        MAX_EDGE_PX / Math.max(width, height),
      );
      renderScale = scale;
      return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        scale,
      };
    },
  });

  // JPEG has no alpha: paint the canvas background under the drawing.
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.fillStyle = appState.exportWithDarkMode
    ? "#121212"
    : appState.viewBackgroundColor || "#ffffff";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);

  const jpegBlob = await new Promise<Blob>((resolve, reject) =>
    flat.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("JPEG encode failed")),
      "image/jpeg",
      0.92,
    ),
  );
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());

  // Page size in points follows the drawing's scene size, whatever the
  // render scale ended up being for very large drawings.
  const pdf = buildPdf(
    jpeg,
    flat.width,
    flat.height,
    (flat.width / renderScale) * PX_TO_PT,
    (flat.height / renderScale) * PX_TO_PT,
  );

  const url = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${api.getName() || "sketchbench"}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
