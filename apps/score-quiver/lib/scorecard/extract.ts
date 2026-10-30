// Turn a PDF into positioned text items with pdf.js. The pdf.js module is
// passed in so the browser (with a web worker) and Node scripts (legacy build)
// share the same flattening logic.

import type { TextItem } from './types';

type PdfJs = typeof import('pdfjs-dist');

export async function extractTextItems(
  pdfjs: Pick<PdfJs, 'getDocument'>,
  data: ArrayBuffer | Uint8Array,
): Promise<TextItem[]> {
  const task = pdfjs.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
  });
  const doc = await task.promise;

  const items: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({
        str: item.str,
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        page: p,
      });
    }
  }
  await task.destroy();
  return items;
}
