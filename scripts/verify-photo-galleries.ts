import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCmsCore, createNodeFs, globToRegExp } from '@nuasite/cms-core';
import { galleryPreview } from '../src/lib/gallery';
import { applyImageChange } from '../node_modules/@nuasite/cms/src/handlers/source-writer';

// CMS mutations stay in memory; source files and publication state are untouched.
const disk = createNodeFs(process.cwd());
const writes = new Map<string, string>();
const removed = new Set<string>();
const core = createCmsCore({
  ...disk,
  readFile: async path => {
    if (removed.has(path)) throw new Error(`Removed in test: ${path}`);
    return writes.get(path) ?? disk.readFile(path);
  },
  writeFile: async (path, value) => { removed.delete(path); writes.set(path, value); },
  remove: async path => { writes.delete(path); removed.add(path); },
  exists: async path => !removed.has(path) && (writes.has(path) || disk.exists(path)),
  list: async dir => {
    const entries = new Map((await disk.list(dir)).map(entry => [entry.name, entry]));
    for (const path of writes.keys()) {
      if (!path.startsWith(`${dir}/`)) continue;
      const remainder = path.slice(dir.length + 1);
      const name = remainder.split('/')[0];
      entries.set(name, { name, isDirectory: remainder.includes('/') });
    }
    for (const path of removed) {
      if (path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/')) {
        entries.delete(path.slice(dir.length + 1));
      }
    }
    return [...entries.values()];
  },
  glob: async pattern => {
    const matches = globToRegExp(pattern);
    return [...new Set([...(await disk.glob(pattern)), ...writes.keys()])]
      .filter(path => !removed.has(path) && matches.test(path));
  },
});


const definitions = await core.scanCollections();
for (const name of ['pro-skoly-fotografie', 'pro-media-fotografie']) {
  assert.ok(!definitions[name], `${name}: internal photo collections stay absent`);
}
const nativePhotos = ['pro-skoly', 'pro-media'].flatMap(page => {
  const source = readFileSync(`src/pages/${page}/index.astro`, 'utf8');
  const photos = [...source.matchAll(/<Image src="([^"]+)" alt="([^"]+)"/g)].map(match => ({ pic: match[1], alt: match[2] }));
  assert.equal(photos.length, 4, `${page}: all four photos have directly editable literal alternatives`);
  if (page === 'pro-media') {
    for (const photo of photos) assert.ok(source.includes(`data-download="${photo.pic}"`), 'media photos preserve original downloads');
    assert.ok(source.includes('layout="media"'), 'media page uses original thumbnail strip design');
  }
  return photos.map(photo => ({ ...photo, page }));
});
for (const page of ['pro-skoly', 'pro-media']) {
  const sourcePath = `src/pages/${page}/index.astro`;
  const source = readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(/<Image src="([^"]+)" alt="([^"]+)"[^\n]+/g)) {
    const newAlt = `Ověřená samostatná úprava: ${match[2]}`;
    const result = await applyImageChange(source, {
      cmsId: 'photo-verification', sourcePath,
      sourceLine: source.slice(0, match.index).split('\n').length,
      sourceSnippet: match[0], originalValue: match[1], newValue: match[1],
      imageChange: { newSrc: match[1], newAlt },
    });
    assert.equal(result.success, true, `${page}: native alt save finds the selected image`);
    if (result.success) assert.equal(result.content, source.replace(match[0], match[0].replace(`alt="${match[2]}"`, `alt="${newAlt}"`)), 'native alt-only save preserves all neighboring photos, links and page text');
  }
}
const photo = nativePhotos[0];
for (const name of ['aktualne', 'press-releases']) {
  const definition = definitions[name];
  assert.ok(!definition.fields.some(field => field.name === 'body'), 'article body is not duplicated as a metadata field');
  const field = definition.fields.find(field => field.name === 'gallery');
  assert.equal(field?.type, 'array');
  assert.equal(field?.itemType, 'object');
  assert.equal(field?.fields?.find(field => field.name === 'pic')?.type, 'image');
  assert.equal(field?.fields?.find(field => field.name === 'alt')?.type, 'textarea');
  const original = (await core.getEntry(name, definition.entries![0].slug))!;
  const gallery = Array.from({ length: 5 }, (_, index) => ({ pic: photo.pic, alt: `Popis fotografie ${index + 1}`, caption: `Popisek ${index + 1}` }));
  const data = { ...original.frontmatter, gallery };
  assert.equal((await core.updateEntry({ collection: name, slug: definition.entries![0].slug, frontmatter: data, body: original.content })).success, true);
  const reread = (await core.getEntry(name, definition.entries![0].slug))!;
  assert.deepEqual(reread.frontmatter.gallery, gallery, 'five photos retain individual alt texts, captions and order');
  assert.equal(reread.content, original.content, 'gallery save preserves article body');
}
assert.ok(galleryPreview(String(photo.pic)).includes('/cdn-cgi/image/width=1600,'), 'dialog uses resized CDN image, never the 25 MB original');
if (process.argv.includes('--built')) {
  for (const photo of nativePhotos) {
    const html = readFileSync(`dist/${photo.page}/index.html`, 'utf8');
    assert.ok(html.includes(`alt="${photo.alt}"`), `${photo.page}: correct alt reaches its page`);
    assert.ok(html.includes(new URL(photo.pic).pathname.slice(1)), `${photo.page}: matching photo renders`);
    if (photo.page === 'pro-media') assert.ok(html.includes(`data-download="${photo.pic}"`), 'original download is available when opening the media photo');
  }
}
console.log('Verified hidden internal photo collections, 8 native page photos with directly editable alternatives, four original downloads, 5-item article/press galleries with body preservation, resized dialogs' + (process.argv.includes('--built') ? ', built-page alternatives and four original downloads.' : '.'));
