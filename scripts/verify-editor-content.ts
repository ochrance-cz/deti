import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ctx, Container, Clock } from '@milkdown/ctx';
import { nodesCtx, marksCtx, remarkPluginsCtx, remarkStringifyOptionsCtx } from '@milkdown/core';
import { schema as commonmarkSchema } from '@milkdown/preset-commonmark';
import { schema as gfmSchema } from '@milkdown/preset-gfm';
import { Schema } from '@milkdown/prose/model';
import { EditorState } from '@milkdown/prose/state';
import { ParserState, SerializerState } from '@milkdown/transformer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import { mdxComponentNode, mdxEsmNode, remarkMdxPlugin } from '../node_modules/@nuasite/cms-mdx-editor/src/mdx-plugin';
import { remarkDirectivePlugin, remarkListDirectivePlugin, styledBulletListSchema, styledOrderedListSchema } from '../node_modules/@nuasite/cms-mdx-editor/src/styled-list-plugin';
import { youtubeNode, remarkYoutubeDirectivePlugin } from '../node_modules/@nuasite/cms-mdx-editor/src/youtube-plugin';
import { safeImageSchema } from '../node_modules/@nuasite/cms-mdx-editor/src/image-schema';
import { safeImageSchema as nativeSafeImageSchema } from '../node_modules/@nuasite/cms/src/editor/image-schema';

// Use the actual rich editor schemas, remark plugins, parser and serializer,
// without mounting an editor view. A public Astro build alone does not detect
// Markdown rejected or silently discarded by Nua's MDX-based body editor.
const ctx = new Ctx(new Container(), new Clock());
ctx.inject(nodesCtx).inject(marksCtx).inject(remarkPluginsCtx).inject(remarkStringifyOptionsCtx);
// These schema-only plugins need no editor view or initialization timers.
(ctx as any).wait = async () => {};
for (const plugin of [
  ...commonmarkSchema, ...gfmSchema,
  ...safeImageSchema,
  ...styledBulletListSchema, ...styledOrderedListSchema,
  ...remarkDirectivePlugin, ...remarkListDirectivePlugin,
  ...remarkMdxPlugin, mdxComponentNode, mdxEsmNode,
  ...remarkYoutubeDirectivePlugin, youtubeNode,
]) await plugin(ctx)();
const schema = new Schema({
  nodes: Object.fromEntries(ctx.get(nodesCtx)),
  marks: Object.fromEntries(ctx.get(marksCtx)),
});
const remark = unified().use(remarkParse).use(remarkStringify).use(remarkGfm);
for (const { plugin, options } of ctx.get(remarkPluginsCtx)) remark.use(plugin, options);

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['position', 'data', 'estree', 'spread'].includes(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonical(entry)]));
}
const whitespace = (value: string) => value.replace(/\s+/gu, ' ').trim();
function textOf(node: any): string {
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') return node.value ?? '';
  if (node.type === 'break') return '\n';
  const text = (node.children ?? []).map(textOf).join('');
  return ['paragraph', 'heading', 'listItem', 'tableCell'].includes(node.type) ? text + '\n' : text;
}
function fingerprint(tree: any) {
  const media: any[] = [];
  const links: any[] = [];
  const formatting: any[] = [];
  const blocks: any[] = [];
  const booleanHtml = new Set(['allowfullscreen', 'autoplay', 'controls', 'loop', 'muted', 'disabled', 'checked', 'selected']);
  const walk = (node: any) => {
    const text = whitespace(textOf(node));
    if (node.type === 'image') media.push({ type: 'image', url: node.url, alt: node.alt ?? '', title: node.title || null });
    if (node.type === 'link' && text) links.push({ url: node.url, title: node.title || null, text });
    if (['strong', 'emphasis', 'delete', 'inlineCode', 'heading'].includes(node.type) && text) formatting.push({ type: node.type, depth: node.depth, text });
    if (['list', 'table', 'code'].includes(node.type)) blocks.push({ type: node.type, ordered: node.ordered, start: node.start, listStyle: node.listStyle, align: node.align, lang: node.lang, value: node.value });
    if (['leafDirective', 'containerDirective', 'textDirective', 'mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(node.type)) blocks.push(canonical(node));
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) {
      const attributes = (node.attributes ?? []).map((attribute: any) => ({ ...canonical(attribute),
        value: /^[a-z]/.test(node.name ?? '') && booleanHtml.has(attribute.name?.toLowerCase()) && attribute.value === null ? 'true' : canonical(attribute.value),
      }));
      // Flow/inline placement and mark nesting may be normalized on save;
      // component names, media properties and their visible text must survive.
      media.push({ type: 'jsx', name: node.name, attributes });
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return canonical({ text: whitespace(textOf(tree)), media, links,
    formatting: formatting.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))), blocks });
}
function difference(before: any, after: any, path = 'root'): string | undefined {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const found = difference(before[key], after[key], `${path}.${key}`);
      if (found) return found;
    }
  }
  return `${path}: ${JSON.stringify(before)?.slice(0, 160)} becomes ${JSON.stringify(after)?.slice(0, 160)}`;
}
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.mdx?$/.test(file) ? [file] : [];
  });
}
const failures: Array<{ file: string; error: string }> = [];
// Exercise both actual schema fixes with the alt-edit transaction used by the
// toolbar: editing the second photo must preserve the first uncaptioned photo.
for (const plugin of nativeSafeImageSchema) await plugin(ctx)();
const nativeSchema = new Schema({ nodes: Object.fromEntries(ctx.get(nodesCtx)), marks: Object.fromEntries(ctx.get(marksCtx)) });
for (const targetSchema of [schema, nativeSchema]) {
  const fixture = '![První foto](/first.jpg)\n\n![Druhá foto](/second.jpg "Zdroj fotografie")';
  const doc = ParserState.create(targetSchema, remark)(fixture);
  const photographs: Array<{ position: number; attrs: any }> = [];
  doc.descendants((node, position) => { if (node.type.name === 'image') photographs.push({ position, attrs: node.attrs }); });
  assert.equal(photographs.length, 2, 'uncaptioned photographs must survive parsing');
  const selected = photographs[1]!;
  const transaction = EditorState.create({ doc, schema: targetSchema }).tr.setNodeMarkup(selected.position, undefined, { ...selected.attrs, alt: 'Žáci a učitelka' });
  const saved = SerializerState.create(targetSchema, remark)(transaction.doc);
  assert.deepEqual(fingerprint(remark.runSync(remark.parse(saved))), fingerprint(remark.runSync(remark.parse(fixture.replace('Druhá foto', 'Žáci a učitelka')))), 'alt edit must preserve neighboring photos, URLs and captions');
}
const bodies = files('src/content');
for (const file of bodies) {
  const body = readFileSync(file, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  try {
    const before = remark.runSync(remark.parse(body));
    const warnings: string[] = [];
    const report = console.error;
    console.error = (...errors) => { warnings.push(errors.map(error => error instanceof Error ? error.message : String(error)).join(' ')); };
    let doc;
    try { doc = ParserState.create(schema, remark)(body); }
    finally { console.error = report; }
    if (warnings.length) throw new Error(`parser silently dropped content: ${warnings.join('; ')}`);
    const serialized = SerializerState.create(schema, remark)(doc);
    const after = remark.runSync(remark.parse(serialized));
    const changed = difference(fingerprint(before), fingerprint(after));
    if (changed) throw new Error(`rich editor roundtrip changes content: ${changed}`);
  } catch (error) {
    failures.push({ file, error: error instanceof Error ? error.message.slice(0, 500) : String(error) });
  }
}
if (failures.length) {
  console.error(JSON.stringify({ checked: bodies.length, failures }, null, 2));
  process.exitCode = 1;
} else console.log(`Verified ${bodies.length} collection bodies with the real rich editor parser and serializer; content survives a save roundtrip.`);
import assert from 'node:assert/strict';
