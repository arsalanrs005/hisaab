import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildPdfReport(options: {
  title: string;
  lines: string[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  page.drawText(options.title, { x: 48, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.2) });
  y -= 32;

  for (const line of options.lines) {
    if (y < 48) break;
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.2, 0.2, 0.25) });
    y -= 16;
  }

  return doc.save();
}

export async function downloadPdf(filename: string, title: string, lines: string[]) {
  const bytes = await buildPdfReport({ title, lines });
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
