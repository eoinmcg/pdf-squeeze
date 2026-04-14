import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function compressPdf(file, options = {}) {
  const {
    scale = 2,          // render scale (higher = better quality)
    format = "image/png", // "image/png" (lossless) or "image/jpeg"
    quality = 0.92       // JPEG quality (ignored for PNG)
  } = options;

  const arrayBuffer = await file.arrayBuffer();

  // Load PDF with pdf.js
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  console.log(pdf)

  // Create new PDF
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page to canvas
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to compressed image
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, format, quality)
    );

    const imgBytes = new Uint8Array(await blob.arrayBuffer());

    // Embed into new PDF
    const embedded =
      format === "image/png"
        ? await newPdf.embedPng(imgBytes)
        : await newPdf.embedJpg(imgBytes);

    const newPage = newPdf.addPage([embedded.width, embedded.height]);

    newPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height
    });
  }

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

