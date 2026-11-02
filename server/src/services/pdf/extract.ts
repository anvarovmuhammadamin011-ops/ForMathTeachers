import fs from 'node:fs/promises';
import path from 'node:path';
import { pdf as renderPdf } from 'pdf-to-img';
import { createWorker, type Worker } from 'tesseract.js';
import { config } from '../../config.js';

export interface PageContent {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  imagePath: string | null;
  isScanned: boolean;
  needsVision: boolean;
}

interface PdfJsTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

async function loadPdfJs() {
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

/** PDF sahifalaridan matn ajratib oladi. */
export async function extractPdfText(buffer: Buffer): Promise<{
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string; hasImages: boolean }>;
}> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  try {
    const pages: Array<{ pageNumber: number; text: string; hasImages: boolean }> = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items as PdfJsTextItem[];
      const lines = new Map<number, PdfJsTextItem[]>();
      for (const item of items) {
        if (!item.str) continue;
        const y = Math.round((item.transform?.[5] ?? 0) * 2) / 2;
        const line = lines.get(y) ?? [];
        line.push(item);
        lines.set(y, line);
      }
      const sortedY = [...lines.keys()].sort((a, b) => b - a);
      const textLines: string[] = [];
      for (const y of sortedY) {
        const line = (lines.get(y) ?? []).sort(
          (a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0),
        );
        let lineText = '';
        let previousEnd: number | null = null;
        for (const item of line) {
          const x = item.transform?.[4] ?? 0;
          const width = item.width ?? 0;
          if (previousEnd !== null && x - previousEnd > 1.5 && !lineText.endsWith(' ')) {
            lineText += ' ';
          }
          lineText += item.str ?? '';
          previousEnd = x + width;
        }
        if (lineText.trim()) textLines.push(lineText.trim());
      }

      let hasImages = false;
      try {
        const ops = await page.getOperatorList();
        const imageOps = new Set([
          pdfjs.OPS.paintImageXObject,
          pdfjs.OPS.paintInlineImageXObject,
          pdfjs.OPS.paintImageMaskXObject,
          pdfjs.OPS.paintImageXObjectRepeat,
          pdfjs.OPS.paintImageMaskXObjectRepeat,
        ]);
        hasImages = ops.fnArray.some((fn) => imageOps.has(fn));
      } catch {
        /* rasm aniqlash imkonsiz bo'lsa, matnga tayanamiz */
      }

      pages.push({ pageNumber, text: textLines.join('\n').trim(), hasImages });
      page.cleanup();
    }
    return { pageCount: doc.numPages, pages };
  } finally {
    await doc.destroy();
  }
}

/** Tanlangan sahifalarni PNG rasmga aylantiradi va fayl yo'llarini qaytaradi. */
export async function renderPages(
  filePath: string,
  pageNumbers: number[],
  outDir: string,
  scale = 1.8,
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (pageNumbers.length === 0) return result;
  await fs.mkdir(outDir, { recursive: true });
  const document = await renderPdf(filePath, { scale });
  for (const pageNumber of [...new Set(pageNumbers)].sort((a, b) => a - b)) {
    if (pageNumber < 1 || pageNumber > document.length) continue;
    const image = await document.getPage(pageNumber);
    const target = path.join(outDir, `page-${pageNumber}.png`);
    await fs.writeFile(target, image);
    result.set(pageNumber, target);
  }
  return result;
}

let workerPromise: Promise<Worker> | null = null;

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    const cachePath = path.resolve(process.cwd(), '.tesseract');
    await fs.mkdir(cachePath, { recursive: true });
    workerPromise = createWorker(config.ocr.language, 1, {
      cachePath,
      logger: () => undefined,
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/** Skanerlangan sahifani OCR qiladi. Xatolik bo'lsa bo'sh matn qaytaradi. */
export async function ocrPage(imagePath: string): Promise<string> {
  if (!config.ocr.enabled) return '';
  try {
    const worker = await getOcrWorker();
    const recognition = await Promise.race([
      worker.recognize(imagePath),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), 90_000),
      ),
    ]);
    return recognition.data.text.trim();
  } catch (error) {
    console.warn('[ocr] xato:', (error as Error).message);
    return '';
  }
}

export async function terminateOcr() {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      /* ignore */
    }
    workerPromise = null;
  }
}
