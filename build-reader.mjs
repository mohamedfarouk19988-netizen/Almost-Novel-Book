import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Run from anywhere: every path is resolved relative to this file.
const root = path.dirname(fileURLToPath(import.meta.url));
const here = (...parts) => path.join(root, ...parts);
const exists = file => fs.access(file).then(() => true, () => false);

const pdf = await getDocument({ data: new Uint8Array(await fs.readFile(here('Almost_Manuscript.pdf'))) }).promise;
const round = value => Math.round(value * 10) / 10;
const styleOf = name => /Bold/i.test(name) ? 'b' : /Italic/i.test(name) ? 'i' : 'r';
const pages = [];
const chapters = [{ label: '', text: 'Title Page', page: 0 }, { label: '', text: 'A Note on What Is True', page: 1 }];

for (let number = 1; number <= pdf.numPages; number++) {
  const page = await pdf.getPage(number);
  await page.getOperatorList();
  const content = await page.getTextContent();
  const [, , width, height] = page.view;
  const lines = [];
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;
    const [a, b, , , x, y] = item.transform;
    const size = Math.hypot(a, b);
    const style = styleOf(page.commonObjs.get(item.fontName).name);
    let line = lines.find(candidate => Math.abs(candidate.y - y) < 1.5);
    if (!line) { line = { y, items: [] }; lines.push(line); }
    line.items.push({ x, w: item.width, size, style, text: item.str });
  }
  const built = lines.sort((first, second) => second.y - first.y).map(line => {
    line.items.sort((first, second) => first.x - second.x);
    const runs = [];
    let end = null;
    for (const item of line.items) {
      let text = item.text;
      // Insert the space PDF.js represents only as positioning between text items.
      if (end !== null && item.x - end > 1 && !/\s$/.test(runs[runs.length - 1][0]) && !/^\s/.test(text)) text = ' ' + text;
      if (runs.length && runs[runs.length - 1][1] === item.style) runs[runs.length - 1][0] += text;
      else runs.push([text, item.style]);
      end = item.x + item.w;
    }
    const first = line.items[0];
    return { x: round(first.x), y: round(height - line.y), w: round(end - first.x), s: round(Math.max(...line.items.map(item => item.size))), r: runs };
  });
  const textRight = Math.max(...built.filter(line => line.s < 13).map(line => line.x + line.w));
  for (const line of built) {
    const words = line.r.map(run => run[0]).join('').trim().split(/\s+/).length;
    // Lines reaching the text block's right edge are justified in the manuscript.
    if (line.s < 13 && words > 4 && line.x + line.w > textRight - 2) line.j = 1;
  }
  const plain = built.map(line => line.r.map(run => run[0]).join(''));
  const chapterAt = plain.findIndex(text => /^CHAPTER\s+[A-Z]+$/.test(text.trim()));
  if (chapterAt >= 0) chapters.push({ label: plain[chapterAt].trim(), text: plain[chapterAt + 1].trim(), page: number - 1 });
  pages.push({ w: round(width), h: round(height), l: built });
}

// Cover art: crop the full wrap-around cover when the PNG is present; otherwise reuse the saved crops.
const coverPng = [here('Almost__A_Sunset_cover.png'), here('assets', 'Almost__A_Sunset_cover.png')];
let assets;
const pngPath = (await Promise.all(coverPng.map(exists))).findIndex(Boolean);
if (pngPath >= 0) {
  const { default: sharp } = await import('sharp');
  const artwork = sharp(coverPng[pngPath]);
  const metadata = await artwork.metadata();
  const crop = async (left, right, width) => 'data:image/jpeg;base64,' + (await artwork.clone().extract({ left: Math.round(metadata.width * left), top: 0, width: Math.round(metadata.width * right) - Math.round(metadata.width * left), height: metadata.height }).resize({ width }).jpeg({ quality: 86, mozjpeg: true }).toBuffer()).toString('base64');
  assets = { front: await crop(0.543, 1, 850), spine: await crop(0.46, 0.543, 150), back: await crop(0, 0.46, 850) };
} else {
  assets = JSON.parse(await fs.readFile(here('assets', 'cover-art.json'), 'utf8'));
}

const template = await fs.readFile(here('reader.template.html'), 'utf8');
const html = template.replace('/*__BOOK_DATA__*/', 'const BOOK = ' + JSON.stringify({ pages, chapters, assets }).replace(/</g, '\\u003c') + ';');
await fs.writeFile(here('book.html'), html);
await fs.writeFile(here('index.html'), html);
const words = pages.reduce((total, page) => total + page.l.reduce((sum, line) => sum + line.r.map(run => run[0]).join('').trim().split(/\s+/).length, 0), 0);
console.log(JSON.stringify({ pdfPages: pdf.numPages, pages: pages.length, words, chapters: chapters.length - 2, justifiedLines: pages.reduce((total, page) => total + page.l.filter(line => line.j).length, 0), italicRuns: pages.reduce((total, page) => total + page.l.reduce((sum, line) => sum + line.r.filter(run => run[1] === 'i').length, 0), 0), bytes: Buffer.byteLength(html) }, null, 2));
