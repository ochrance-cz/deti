import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type CollectionName = 'jsem' | 'pripady';

type Args = {
  collection: CollectionName;
  only?: string;
  all: boolean;
};

type MigrationConfig = {
  arrayKey: 'questions' | 'cases';
  bodyKey: 'desc' | 'body';
  childDir: 'otazky' | 'pripady';
  optionalFrontmatterKey: 'icon' | 'perex';
};

const configs: Record<CollectionName, MigrationConfig> = {
  jsem: {
    arrayKey: 'questions',
    bodyKey: 'desc',
    childDir: 'otazky',
    optionalFrontmatterKey: 'icon',
  },
  pripady: {
    arrayKey: 'cases',
    bodyKey: 'body',
    childDir: 'pripady',
    optionalFrontmatterKey: 'perex',
  },
};

const usage =
  'Usage: bun scripts/migrate-accordions.ts --collection jsem|pripady (--only <parentDir> | --all)';

const parseArgs = (argv: string[]): Args => {
  let collection: CollectionName | undefined;
  let only: string | undefined;
  let all = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--collection') {
      const value = argv[i + 1];

      if (value !== 'jsem' && value !== 'pripady') {
        throw new Error(usage);
      }

      collection = value;
      i += 1;
      continue;
    }

    if (arg === '--only') {
      only = argv[i + 1];

      if (!only) {
        throw new Error(usage);
      }

      i += 1;
      continue;
    }

    if (arg === '--all') {
      all = true;
      continue;
    }

    throw new Error(usage);
  }

  if (!collection || (all && only) || (!all && !only)) {
    throw new Error(usage);
  }

  return { collection, only, all };
};

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const padOrder = (order: number): string => String(order).padStart(2, '0');

const toString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const parentIndexPath = async (parentDir: string): Promise<string | undefined> => {
  const mdPath = path.join(parentDir, 'index.md');
  const mdxPath = path.join(parentDir, 'index.mdx');

  try {
    await fs.access(mdPath);
    return mdPath;
  } catch {
    // Try MDX below.
  }

  try {
    await fs.access(mdxPath);
    return mdxPath;
  } catch {
    return undefined;
  }
};

const parentDirs = async (
  collectionRoot: string,
  only?: string,
): Promise<string[]> => {
  if (only) {
    return [path.join(collectionRoot, only)];
  }

  const entries = await fs.readdir(collectionRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(collectionRoot, entry.name));
};

const linesWithEndings = (value: string): string[] =>
  value.match(/.*(?:\r\n|\n|\r|$)/g)?.filter((line) => line.length > 0) ?? [];

const removeFrontmatterKey = (raw: string, key: string): string => {
  const lines = linesWithEndings(raw);

  if (!lines[0]?.trim().startsWith('---')) {
    throw new Error('Expected markdown file with YAML frontmatter.');
  }

  const closingIndex = lines.findIndex((line, index) => (
    index > 0 && line.trim() === '---'
  ));

  if (closingIndex === -1) {
    throw new Error('Could not find closing frontmatter delimiter.');
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const startIndex = frontmatterLines.findIndex((line) =>
    line.startsWith(`${key}:`),
  );

  if (startIndex === -1) {
    return raw;
  }

  const nextTopLevelIndex = frontmatterLines.findIndex((line, index) =>
    index > startIndex && /^[A-Za-z0-9_-]+:/.test(line),
  );
  const endIndex = nextTopLevelIndex === -1
    ? frontmatterLines.length
    : nextTopLevelIndex;
  const nextFrontmatterLines = [
    ...frontmatterLines.slice(0, startIndex),
    ...frontmatterLines.slice(endIndex),
  ];

  return [
    lines[0],
    ...nextFrontmatterLines,
    ...lines.slice(closingIndex),
  ].join('');
};

const childMarkdown = (
  item: Record<string, unknown>,
  config: MigrationConfig,
  order: number,
): string => {
  const frontmatter: Record<string, string | number> = {
    title: toString(item.title),
  };
  const optionalValue = item[config.optionalFrontmatterKey];

  if (typeof optionalValue === 'string' && optionalValue.length > 0) {
    frontmatter[config.optionalFrontmatterKey] = optionalValue;
  }

  frontmatter.order = order;

  const header = matter.stringify('', frontmatter).replace(/\n\n$/, '\n');

  return `${header}${toString(item[config.bodyKey])}`;
};

const migrateParent = async (
  parentDir: string,
  config: MigrationConfig,
): Promise<string[]> => {
  const indexPath = await parentIndexPath(parentDir);

  if (!indexPath) {
    return [];
  }

  const raw = await fs.readFile(indexPath, 'utf8');
  const parsed = matter(raw);
  const items = parsed.data[config.arrayKey];

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const childDir = path.join(parentDir, config.childDir);
  const changedFiles: string[] = [];

  await fs.mkdir(childDir, { recursive: true });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] as Record<string, unknown>;
    const slug = slugify(toString(item.title));

    if (!slug) {
      console.warn(`Skipping item ${index + 1} in ${indexPath}: empty slug.`);
      continue;
    }

    const childPath = path.join(childDir, `${padOrder(index + 1)}-${slug}.md`);

    try {
      await fs.access(childPath);
      throw new Error(`Refusing to overwrite existing file: ${childPath}`);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;

      if (code !== 'ENOENT') {
        throw error;
      }
    }

    await fs.writeFile(childPath, childMarkdown(item, config, index + 1));
    changedFiles.push(childPath);
  }

  const nextRaw = removeFrontmatterKey(raw, config.arrayKey);
  await fs.writeFile(indexPath, nextRaw);
  changedFiles.push(indexPath);

  return changedFiles;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const config = configs[args.collection];
  const collectionRoot = path.join(process.cwd(), 'src/content', args.collection);
  const changedFiles: string[] = [];

  for (const parentDir of await parentDirs(collectionRoot, args.only)) {
    changedFiles.push(...await migrateParent(parentDir, config));
  }

  if (changedFiles.length === 0) {
    console.log('No accordion arrays found to migrate.');
    return;
  }

  console.log('Migrated files:');
  for (const file of changedFiles) {
    console.log(path.relative(process.cwd(), file));
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
