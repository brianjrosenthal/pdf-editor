
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TextOverlay } from '../types';

export const exportPdfWithAnnotations = async (
  originalBytes: Uint8Array,
  overlays: TextOverlay[],
  originalName: string
) => {
  if (!originalBytes || originalBytes.length === 0) {
    throw new Error("PDF data is empty or invalid.");
  }

  const bytesToLoad = originalBytes.slice(0);

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(bytesToLoad);
  } catch (e) {
    console.warn("pdf-lib fallback load strategy.", e);
    pdfDoc = await PDFDocument.load(bytesToLoad.buffer);
  }

  const pages = pdfDoc.getPages();

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontMap: Record<string, any> = {
    'Helvetica': helveticaFont,
    'Times-Roman': timesFont,
    'Courier': courierFont
  };

  for (const overlay of overlays) {
    const pageIndex = overlay.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    const x = (overlay.x / 100) * width;
    const y = height - ((overlay.y / 100) * height); 

    const textToDraw = String(overlay.text || '');

    if (textToDraw.trim().length > 0) {
      // PDF drawText handles \n natively.
      // We set lineHeight to 1.25 (same as 'leading-tight' in editor)
      page.drawText(textToDraw, {
        x,
        y,
        size: overlay.fontSize,
        font: fontMap[overlay.fontFamily] || helveticaFont,
        color: rgb(0, 0, 0),
        lineHeight: overlay.fontSize * 1.25,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `annotated-${originalName || 'document.pdf'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
