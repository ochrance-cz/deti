import assert from 'node:assert/strict';
import { applyImageChange } from '../node_modules/@nuasite/cms/src/handlers/source-writer';

const source = '<img src="/first.jpg" alt="První">\n<img src="/second.jpg" alt="Druhá" aria-hidden="true">';
const change = (newAlt: string, sourceLine = 2, sourceSnippet = '<img src="/second.jpg" alt="Druhá" aria-hidden="true">') => ({
  cmsId: 'test-image', sourcePath: 'src/pages/test.astro', sourceLine, sourceSnippet,
  originalValue: 'https://cdn.nuasite.com/cdn-cgi/image/width=640/second.jpg',
  newValue: 'https://cdn.nuasite.com/cdn-cgi/image/width=640/second.jpg',
  imageChange: { newSrc: 'https://cdn.nuasite.com/cdn-cgi/image/width=640/second.jpg', newAlt },
});
const result = await applyImageChange(source, change('Žáci & učitelka "ve třídě"'));
assert.equal(result.success, true);
if (result.success) {
  assert.equal(result.content, '<img src="/first.jpg" alt="První">\n<img src="/second.jpg" alt="Žáci &amp; učitelka &quot;ve třídě&quot;">');
}
const empty = await applyImageChange(source, change(''));
assert.equal(empty.success, true);
if (empty.success) assert.equal(empty.content, source.replace('alt="Druhá"', 'alt=""'));
const noAlt = await applyImageChange('<img src="/second.jpg">', change('Popis', 1, '<img src="/second.jpg">'));
assert.equal(noAlt.success, true);
if (noAlt.success) assert.equal(noAlt.content, '<img src="/second.jpg" alt="Popis">');
const duplicate = await applyImageChange('<img src="/same.jpg" alt="První">\n<img src="/same.jpg" alt="Druhá">', change('Změněný druhý', 2, '<img src="/same.jpg" alt="Druhá">'));
assert.equal(duplicate.success, true);
if (duplicate.success) assert.equal(duplicate.content, '<img src="/same.jpg" alt="První">\n<img src="/same.jpg" alt="Změněný druhý">');
const bound = await applyImageChange('<Image src={photo.pic} alt={photo.alt} />', change('Popis', 1, '<Image src={photo.pic} alt={photo.alt} />'));
assert.equal(bound.success, false, 'collection bindings must be edited in the collection');

const first = '<img src="/first.jpg" alt="První">';
const second = '<img src="/second.jpg" alt="Druhá">';
const sameLine = await applyImageChange(first + second, change('Změna druhé', 1, second));
assert.equal(sameLine.success, true);
if (sameLine.success) assert.equal(sameLine.content, first + second.replace('Druhá', 'Změna druhé'));

const staleLine = await applyImageChange(first + '\n\n' + second, change('Změna druhé', 1, second));
assert.equal(staleLine.success, true, 'an exact unique snippet survives a shifted source line');
if (staleLine.success) assert.equal(staleLine.content, first + '\n\n' + second.replace('Druhá', 'Změna druhé'));
const staleSnippet = await applyImageChange(first + '\n' + second, change('Wrong', 1, '<img src="/deleted.jpg" alt="Deleted">'));
assert.equal(staleSnippet.success, false, 'stale coordinates must never overwrite a different image');
const ambiguous = await applyImageChange(second + second, change('Wrong', 1, second));
assert.equal(ambiguous.success, false, 'identical images on one line cannot be distinguished safely');

const tagged = '<img src="/second.jpg" data-alt="Keep" alt="Druhá">';
const dataAlt = await applyImageChange(tagged, change('Popis', 1, tagged));
assert.equal(dataAlt.success, true);
if (dataAlt.success) assert.equal(dataAlt.content, '<img src="/second.jpg" data-alt="Keep" alt="Popis">');

const embeddedAttribute = '<img src="/second.jpg" title="Image alt=\'unchanged\' aria-hidden=\'true\'" alt="Druhá">';
const embeddedResult = await applyImageChange(embeddedAttribute, change('Popis', 1, embeddedAttribute));
assert.equal(embeddedResult.success, true);
if (embeddedResult.success) assert.equal(embeddedResult.content, embeddedAttribute.replace('alt="Druhá"', 'alt="Popis"'));

const expression = '<Image src={portrait} widths={items.map(x => ({ width: x.width })).filter(x => x.width > 0)} alt="Druhá" />';
const expressionResult = await applyImageChange(expression, change('Popis', 1, expression));
assert.equal(expressionResult.success, true);
if (expressionResult.success) assert.equal(expressionResult.content, expression.replace('Druhá', 'Popis'));

const unquoted = '<img src="/second.jpg" alt=Original/>';
const unquotedResult = await applyImageChange(unquoted, change('Popis', 1, unquoted));
assert.equal(unquotedResult.success, true);
if (unquotedResult.success) assert.equal(unquotedResult.content, '<img src="/second.jpg" alt="Popis"/>');

const multiline = '<Image\n  src={portrait}\n  widths={[320, 640]}\n  alt=\'Původní\'\n  aria-hidden={true}\n/>';
const multilineResult = await applyImageChange(multiline, change('Nový popis', 4, multiline));
assert.equal(multilineResult.success, true);
if (multilineResult.success) {
  assert.equal(multilineResult.content, multiline.replace("alt='Původní'", 'alt="Nový popis"').replace('\n  aria-hidden={true}', ''));
}
console.log('Verified alt-only saves: same-line/neighboring/repeated pictures, stale/ambiguous targets, optimized src preservation, escaping, empty/missing alt, multiline/single-quoted tags, data-alt preservation, aria-hidden removal and protected data bindings.');
