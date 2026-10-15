/** Run against `bun --bun node_modules/.bin/astro dev --port 4331`.
 * Exercises actual CMS writes and restores the contact entry byte-for-byte.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';

const base = process.env.CMS_VERIFY_URL ?? 'http://127.0.0.1:4331';
const contentPath = 'src/content/hledam-pomoc/index.md';
const file = resolve(contentPath);
const original = readFileSync(file, 'utf8');
const pageUrl = `${base}/jak-vas-kontaktovat/`;
async function json(url: string, payload?: unknown) {
  const response = await fetch(url, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert(response.ok, `${response.status}: ${url}`);
  return response.json();
}
async function renderedWith(text: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(pageUrl);
    const html = await response.text();
    if (response.ok && html.includes(text)) return parse(html);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Rendered page did not contain ${text}`);
}

try {
  const initialHtml = await renderedWith('ombudsmana?');
  const steps = initialHtml.querySelectorAll('.contact-details ol > li');
  assert.equal(steps.length, 5, 'All five case-processing steps must render');
  assert.match(steps[0].textContent, /Nečekej od\s+nás právničinu/);
  const originalBody = original.split('---').slice(2).join('---');
  assert(!/<(?:a|div)\b/.test(originalBody), 'Contact body must use Markdown supported by the rich editor');
  const list = initialHtml.querySelector('.contact-details > ul._contact');
  assert(list, 'Contact list must render inside the body');
  assert.equal(list.previousElementSibling?.textContent.replace(/\s+/g, ' ').trim(), 'Jak se obrátit na ombudsmana?', 'Contact list must follow the first H2');
  const manifest = await json(`${base}/jak-vas-kontaktovat.json`);
  assert.equal(manifest.collection.sourcePath, contentPath);
  assert(manifest.collection.body.includes('Co se bude dít s mým případem?'));
  assert(manifest.collection.wrapperId, 'Missing editable body wrapper');
  const entry = await json(`${base}/_nua/cms/markdown/content?filePath=${encodeURIComponent(contentPath)}`);
  const expectedOrder = entry.frontmatter.contact.map((contact: any) => contact.title);
  assert.equal(expectedOrder[2], 'Český znakový jazyk');
  entry.frontmatter.contact.push({ title: 'Ověřovací sedmý kontakt', icon: 'wifi.svg', desc: 'Ověřovací kontaktní text.' });
  const body = entry.content + '\n\nOvěřovací závěrečná informace.\n';
  const fullSave = await json(`${base}/_nua/cms/markdown/update`, { filePath: contentPath, frontmatter: entry.frontmatter, content: body });
  assert(fullSave.success, JSON.stringify(fullSave));
  const html = await renderedWith('Ověřovací sedmý kontakt');
  assert(html.textContent.includes('Ověřovací závěrečná informace.'), 'Final body edit missing');
  const cards = html.querySelectorAll('._contact > li');
  assert.equal(cards.length, 7, 'New contact was omitted');
  assert.deepEqual(cards.slice(0, 6).map((card) => card.querySelector('strong')?.textContent), expectedOrder);
  assert(!cards[3].textContent.includes('\\'), 'Postal address contains escaped line breaks');
  console.log('PASS: contact list renders after the first H2; full body save; seventh contact renders; CMS/web order agrees.');
} finally {
  writeFileSync(file, original);
  assert.equal(readFileSync(file, 'utf8'), original, 'Contact fixture was not restored');
}
