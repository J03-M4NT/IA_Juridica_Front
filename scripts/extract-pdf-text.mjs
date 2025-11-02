#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

/*
  This script requires 'pdf-parse' using createRequire to be compatible in ESM.
  Usage: node scripts/extract-pdf-text.mjs <pdfPath> [outTxtPath]
*/
const require = createRequire(import.meta.url);
let pdfjsLib;
try {
  // require the legacy build which exposes getDocument
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
} catch {
  console.error('Please ensure pdfjs-dist is installed');
  process.exit(5);
}

// Usage: node scripts/extract-pdf-text.mjs <pdfPath> [outTxtPath]
const [,, pdfPathArg, outPathArg] = process.argv;

if (!pdfPathArg) {
  console.error('Usage: node scripts/extract-pdf-text.mjs <pdfPath> [outTxtPath]');
  process.exit(2);
}

const pdfPath = path.resolve(process.cwd(), pdfPathArg);
const outTxt = outPathArg ? path.resolve(process.cwd(), outPathArg) : path.resolve(process.cwd(), 'extracted-arrendamiento.txt');

if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found at', pdfPath);
  process.exit(3);
}

const data = new Uint8Array(fs.readFileSync(pdfPath));
try {
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str || '');
    fullText += strings.join(' ') + '\n\n';
  }
  fs.writeFileSync(outTxt, fullText, 'utf8');
  console.log('Extracted text written to', outTxt);
} catch (err) {
  console.error('Error extracting PDF text:', err);
  process.exit(4);
}
