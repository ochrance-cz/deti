/**
 * Port new content from the legacy Hugo branch (`github-main`) into the Astro
 * content collections on the current branch.
 *
 * The legacy site (branch `github-main`) is still edited by the editorial team
 * through a Git-based CMS; this script lifts the entries they added there into
 * the new Astro structure so `main` carries the current data. It is meant to be
 * run again right before the final cut-over.
 *
 * Mapping
 *   content/aktualne/<slug>/  ->  src/content/aktualne/<slug>/        (URL /aktualne/<slug>/)
 *   content/tz/<slug>/        ->  src/content/press-releases/<slug>/  (URL /tz/<slug>/)
 *
 * Per entry folder
 *   index.md            -> index.md (Hugo shortcodes are rewritten to the raw-HTML
 *                          embeds the existing .md entries use, so we stay on .md and
 *                          avoid the MDX + rehype-raw build conflict)
 *   *.{jpg,png,...}     -> public/<urlBase>/<slug>/ (original published URLs)
 *   *.{pdf,docx,...}    -> public/<urlBase>/<slug>/  (frontmatter `attachments` render
 *                          as relative hrefs, so the bytes must sit at that URL path)
 *
 * Idempotent: an entry whose target index already exists is skipped (reported,
 * not overwritten). Pass `--force` to overwrite existing entries.
 *
 * Usage: LEGACY_REPO=/path/to/ochrance-cz-deti LEGACY_REF=HEAD bun scripts/port-from-github-main.ts [--dry-run]
 * Existing records are skipped; review upstream edits separately before using --force.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SRC_REF = process.env.LEGACY_REF || 'github-main';
const SOURCE_ROOT = process.env.LEGACY_REPO || path.resolve(import.meta.dir, '..');
const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']);

interface Mapping {
	hugoDir: string;
	collDir: string;
	urlBase: string;
}

const MAPPINGS: Mapping[] = [
	{ hugoDir: 'content/aktualne', collDir: 'src/content/aktualne', urlBase: 'aktualne' },
	{ hugoDir: 'content/tz', collDir: 'src/content/press-releases', urlBase: 'tz' },
];

function gitText(args: string[]): string {
	return execFileSync('git', args, { cwd: SOURCE_ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
}

function gitBytes(args: string[]): Buffer {
	return execFileSync('git', args, { cwd: SOURCE_ROOT, maxBuffer: 256 * 1024 * 1024 });
}

function lsTree(ref: string, p: string): string[] {
	return gitText(['ls-tree', '-r', '--name-only', ref, p]).split('\n').filter(Boolean);
}

function ext(file: string): string {
	const m = file.toLowerCase().match(/\.([a-z0-9]+)$/);
	return m ? m[1] : '';
}

/**
 * Rewrite known Hugo shortcodes to the raw-HTML embeds the existing .md entries
 * already use (passed through by rehype-raw). Returns null if none present.
 */
function convertShortcodes(body: string): string | null {
	if (!body.includes('{{<') && !body.includes('{{%')) return null;
	let out = body;
	// {{< youtube "ID" >}}  ->  raw <iframe> embed (matches existing .md convention)
	out = out.replace(
		/\{\{<\s*youtube\s+"?([^"\s>]+)"?\s*>\}\}/g,
		'<iframe width="560" height="315" src="https://www.youtube.com/embed/$1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
	);
	if (out.includes('{{<') || out.includes('{{%')) {
		const leftover = out.match(/\{\{[<%][^}]*[>%]\}\}/g) ?? [];
		throw new Error(`Unhandled Hugo shortcode(s): ${leftover.join(', ')}`);
	}
	return out;
}

function write(file: string, data: string | Buffer) {
	if (DRY_RUN) return;
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, data);
}

const summary = { ported: [] as string[], skipped: [] as string[], files: 0, mdx: [] as string[] };

for (const map of MAPPINGS) {
	const files = lsTree(SRC_REF, `${map.hugoDir}/`);
	// group files by slug (first path segment under hugoDir); ignore section files like _index.markdown
	const bySlug = new Map<string, string[]>();
	for (const f of files) {
		const rel = f.slice(map.hugoDir.length + 1); // <slug>/<file> or _index.markdown
		const parts = rel.split('/');
		if (parts.length < 2) continue; // section-level file, not an entry
		const slug = parts[0];
		if (!bySlug.has(slug)) bySlug.set(slug, []);
		bySlug.get(slug)!.push(f);
	}

	for (const [slug, entryFiles] of bySlug) {
		const targetMd = path.join(ROOT, map.collDir, slug, 'index.md');
		const targetMdx = path.join(ROOT, map.collDir, slug, 'index.mdx');
		if (!FORCE && (existsSync(targetMd) || existsSync(targetMdx))) {
			summary.skipped.push(`${map.urlBase}/${slug}`);
			continue;
		}

		for (const f of entryFiles) {
			const name = f.slice(`${map.hugoDir}/${slug}/`.length);
			if (name === 'index.md' || name === 'index.mdx') {
				let raw = gitText(['show', `${SRC_REF}:${f}`]);
				for (const asset of entryFiles.filter(p => !/\.(md|mdx)$/.test(p))) {
					const filename = asset.slice(`${map.hugoDir}/${slug}/`.length);
					const url = `/${map.urlBase}/${slug}/${filename}`;
					raw = raw.replaceAll(`](${filename}`, `](${url}`).replaceAll(`: ${filename}\n`, `: ${url}\n`).replaceAll(`src="${filename}"`, `src="${url}"`);
				}
				const fmEnd = raw.indexOf('\n---', 4);
				const fm = raw.slice(0, fmEnd + 4);
				const body = raw.slice(fmEnd + 4).replace(/^\n/, '');
				const converted = convertShortcodes(body);
				if (converted !== null) {
					write(targetMd, `${fm}\n${converted}`);
					summary.mdx.push(`${map.urlBase}/${slug}`);
				} else {
					write(targetMd, raw);
				}
			} else if (IMAGE_EXT.has(ext(name))) {
				// Keep the published Hugo URL for new images as well as downloads.
				write(path.join(ROOT, 'public', map.urlBase, slug, name), gitBytes(['show', `${SRC_REF}:${f}`]));
			} else {
				// downloadable attachments: serve verbatim at the relative href the page expects
				write(path.join(ROOT, 'public', map.urlBase, slug, name), gitBytes(['show', `${SRC_REF}:${f}`]));
			}
			summary.files++;
		}
		summary.ported.push(`${map.urlBase}/${slug}`);
	}
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Port from ${SRC_REF}`);
console.log(`  Ported ${summary.ported.length} new entries (${summary.files} files):`);
for (const e of summary.ported) console.log(`    + ${e}${summary.mdx.includes(e) ? '  (youtube embed)' : ''}`);
if (summary.skipped.length) {
	console.log(`  Skipped ${summary.skipped.length} already-present entries:`);
	for (const e of summary.skipped) console.log(`    = ${e}`);
}
console.log('');
