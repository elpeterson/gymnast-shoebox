// Convert a Between Ends scorecard PDF into a JSON test fixture of positioned
// text items, replacing the archer's name so real names never land in the repo.
//
//   node scripts/make-fixture.mjs <scorecard.pdf> <out.json>

import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/make-fixture.mjs <scorecard.pdf> <out.json>');
  process.exit(1);
}

const doc = await getDocument({
  data: new Uint8Array(fs.readFileSync(input)),
  verbosity: 0,
}).promise;

const items = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  for (const item of content.items) {
    if (!item.str?.trim()) continue;
    items.push({
      str: item.str,
      x: Math.round(item.transform[4] * 10) / 10,
      y: Math.round(item.transform[5] * 10) / 10,
      page: p,
    });
  }
}

// The value to the right of each "Name:" label is the archer's name.
const names = new Set();
for (const label of items.filter((i) => i.str === 'Name:')) {
  const value = items
    .filter((i) => i.page === label.page && Math.abs(i.y - label.y) <= 3 && i.x > label.x)
    .sort((a, b) => a.x - b.x)[0];
  if (value) names.add(value.str);
}
for (const item of items) {
  if (names.has(item.str)) item.str = 'Test Archer';
}

fs.writeFileSync(output, JSON.stringify(items, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`wrote ${items.length} items to ${output} (scrubbed: ${[...names].join(', ') || 'none'})`);
