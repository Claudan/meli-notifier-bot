import { PDFDocument } from "pdf-lib";

export async function cropShippingLabel(pdfBuffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.load(pdfBuffer);
  const page = pdf.getPage(0);

  const { width, height } = page.getSize();
  page.setMediaBox(0, 0, width, height);

  const cropX = 24;
  const cropY = 70;
  const cropWidth = width - 572;
  const cropHeight = height - 90;

  if ([cropX, cropY, cropWidth, cropHeight].some((n) => Number.isNaN(n))) {
    throw new Error("Invalid crop values");
  }

  page.setCropBox(cropX, cropY, cropWidth, cropHeight);

  const cropped = await pdf.save();
  return Buffer.from(cropped);
}
