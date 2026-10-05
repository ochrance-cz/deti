import assert from 'node:assert/strict';
import { createCmsCore, createNodeFs } from '@nuasite/cms-core';
import { createServer } from '@nuasite/cms-sidecar';
import collectionLabels from '../src/lib/collection-labels.json';

// Exercise the sidecar's actual API response consumed by collection browsers.
const fs = createNodeFs(process.cwd());
const core = createCmsCore(fs);
const server = createServer({ core, fs, root: process.cwd(), coreVersion: 'labels-verification' });
const response = await server.fetch(new Request('http://localhost/cms/v1/collections'));
assert.equal(response.status, 200);
const collections = await response.json() as Array<{ name: string; label: string }>;
const byName = new Map(collections.map(collection => [collection.name, collection]));
for (const [name, { label }] of Object.entries(collectionLabels)) {
  assert.equal(byName.get(name)?.label, label, `${name}: shared Czech label reaches the sidecar`);
}
const gallery = (byName.get('aktualne') as { fields: Array<{ name: string; label?: string; help?: string }> }).fields.find(field => field.name === 'gallery');
assert.equal(gallery?.label, 'Fotogalerie', 'article gallery has a visible Czech field label');
assert.ok(gallery?.help?.includes('Přidejte fotografie přes +'), 'article gallery explains how to add photos');
const cover = (byName.get('aktualne') as { fields: Array<{ name: string; label?: string; help?: string }> }).fields.find(field => field.name === 'pic');
assert.equal(cover?.label, 'Obrázek článku', 'article card image has a clear label');
assert.ok(cover?.help?.includes('Fotogalerie'), 'article card image distinguishes images in the body');
for (const name of ['pages', 'error-pages', 'ombudsman', 'pro-skoly-fotografie', 'pro-media-fotografie']) {
  assert.ok(!byName.has(name), `${name}: removed collection stays absent`);
}
// The optional file must not prevent another project's collections from loading.
const unconfigured = await createCmsCore({ ...fs, readFile: async path => {
  if (path === 'src/lib/collection-labels.json') throw new Error('No optional project vocabulary');
  return fs.readFile(path);
} }).scanCollections();
assert.equal(Object.keys(unconfigured).length, collections.length);
console.log(`Verified all ${collections.length} collection names through GET /cms/v1/collections; Pages, Error pages and Ombudsman remain absent.`);
