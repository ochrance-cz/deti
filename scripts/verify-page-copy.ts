import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { createCmsCore, createNodeFs } from '@nuasite/cms-core';
import pages from '../src/lib/page-copy.json';

const collections = await createCmsCore(createNodeFs(process.cwd())).scanCollections();
for (const removed of ['pages', 'error-pages', 'ombudsman']) {
  assert.equal(collections[removed], undefined, `${removed}: ordinary pages are absent from Collections`);
}
assert.equal(pages.length, 11, 'all former Pages entries except the CMS test page are retained');
for (const page of pages) {
  const source = readFileSync(page.source, 'utf8');
  assert.ok(source.includes('<h1>'), `${page.id}: heading is source-backed`);
  assert.ok(!source.includes('data-cms-markdown'), `${page.id}: uses direct live editing`);
  for (const route of page.routes) {
    const html = readFileSync(`dist${route}index.html`, 'utf8');
    const main = parse(html).querySelector('main')!;
    assert.ok(main, `${route}: main content exists`);
    assert.equal(main.querySelector('h1')?.textContent, page.title, `${route}: original heading preserved`);
    assert.ok(main.textContent.length > page.title.length, `${route}: page content is present`);
    assert.ok(!html.includes('22. června se tým poprvé sešel.'), `${route}: temporary editing test removed`);
  }
}
console.log(`Verified ${pages.length} editable page sources, ${pages.reduce((n, page) => n + page.routes.length, 0)} published routes and removal of Pages/Error pages/Ombudsman from Collections.`);
