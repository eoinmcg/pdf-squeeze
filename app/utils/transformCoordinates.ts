import { PDFPage, PDFContext, PDFDict, PDFName, PDFString } from 'pdf-lib'

interface WebRect {
  rect: [number, number, number, number]
  text?: string
  id?: string | number
}

/**
 * Computes scaling adjustments and transforms top-down web coordinates
 * into native bottom-up PDF coordinates.
 */
export const transformCoordinates = (annot: any, page: any) => {
  const [rectX1, rectY1, rectX2, rectY2] = annot.rect.map(Number);

  const canvas = document.querySelector('.pdf-canvas') as HTMLCanvasElement
    || document.querySelector('canvas[class*="pdf"]') as HTMLCanvasElement;

  // 1. Get raw dimensions with an explicit fallback check
  const renderWidth = (canvas && canvas.clientWidth > 0) ? canvas.clientWidth : 595;
  const renderHeight = (canvas && canvas.clientHeight > 0) ? canvas.clientHeight : 842;

  // 2. Safely calculate scales
  const pdfWidth = page.getWidth();
  const pdfHeight = page.getHeight();

  const scaleX = pdfWidth / renderWidth;
  const scaleY = pdfHeight / renderHeight;

  // 3. Compute dimensions (using Math.abs to ensure positive numbers)
  const rawWidth = Math.abs(rectX2 - rectX1);
  const rawHeight = Math.abs(rectY2 - rectY1);

  const width = rawWidth * scaleX;
  const height = rawHeight * scaleY;

  // 4. Final Sanity Check: If width or height are invalid (e.g. NaN), force them to 1
  const finalWidth = (isNaN(width) || width <= 0) ? 1 : width;
  const finalHeight = (isNaN(height) || height <= 0) ? 1 : height;

  // 5. Calculate Y coordinates (Bottom-Up)
  const scaledY1 = rectY1 * scaleY;
  const y1 = pdfHeight - scaledY1 - finalHeight;
  const y2 = y1 + finalHeight;

  // 6. Calculate X coordinates
  const x1 = rectX1 * scaleX;
  const x2 = x1 + finalWidth;

  return {
    x1,
    x2,
    y1,
    y2,
    width: finalWidth,
    height: finalHeight
  };
}
