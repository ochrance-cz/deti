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
  const initialHtml = await renderedWith('Jak se obrátit');
  const steps = initialHtml.querySelectorAll('.contact-details ol > li');
  assert.equal(steps.length, 5, 'All five case-processing steps must render');
  assert.match(steps[0].textContent, /Nečekej od\s+nás právničinu/);
  assert(!/<(?:a|div)\b/.test(original.split('---').slice(2).join('---')), 'Contact body must use Markdown supported by the rich editor');
  const manifest = await json(`${base}/jak-vas-kontaktovat.json`);
  assert.equal(manifest.collection.sourcePath, contentPath);
  assert(manifest.collection.body.includes('Co se bude dít s mým případem?'));
  assert(manifest.collection.wrapperId, 'Missing editable body wrapper');
  const entries = Object.values(manifest.entries) as any[];
  for (const text of ['Pokud máš problém', 'využij některou', 'v tomto seznamu', 'Napiš nám e-mail', 'deti@ochrance.cz.', 'Vyplň jednoduchý', 'on-line formulář.', 'Pošli nám své video', 'jungmann@ochrance.cz.']) {
    const entry = entries.find((entry) => entry.text?.startsWith(text));
    assert.equal(entry?.sourcePath, contentPath, `Unresolved live text: ${text}`);
    assert.notEqual(entry.textResolved, false);
  }
  const updates = [
    ['deti@ochrance.cz.', 'deti@ochrance.cz!'],
    ['Pošli nebo dones', 'Pošli nebo dones nám dopis na adresu Kancelář veřejného ochránce práv a ochránce práv dětí, Údolní 39, 602 00 Brno'],
  ];
  const changes = updates.map(([start, newValue]) => {
    const entry = entries.find((entry) => entry.text?.startsWith(start));
    assert(entry, `Missing ${start}`);
    return { ...entry, cmsId: entry.id, originalValue: entry.text, newValue };
  });
  const saved = await json(`${base}/_nua/cms/update`, { changes, meta: { source: 'verification', url: pageUrl } });
  assert.equal(saved.updated, 2, JSON.stringify(saved));
  assert(!saved.errors, JSON.stringify(saved.errors));
  const changed = readFileSync(file, 'utf8');
  assert(changed.includes('deti@ochrance.cz!'));
  assert(changed.includes('dětí, Údolní 39, 602 00 Brno'));
  assert(changed.includes('title: Osobně') && changed.includes('title: Telefon'), 'Adjacent contacts damaged');

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
  console.log('PASS: contact live source links; email/address saves; full body save; seventh contact renders; CMS/web order agrees.');
} finally {
  writeFileSync(file, original);
  assert.equal(readFileSync(file, 'utf8'), original, 'Contact fixture was not restored');
}
