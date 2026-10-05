import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import { VFile } from 'vfile';
import { remarkCzechTypography } from '../remark/czech-typography';
import { listStyle } from '../remark/list-style';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(listStyle)
  .use(remarkCzechTypography)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(
  raw: string | undefined,
  filePath?: string,
): Promise<string> {
  if (!raw) return '';
  const file = new VFile({ value: raw, path: filePath });
  const out = await processor.process(file);
  return String(out);
}

export function renderMarkdownSync(
  raw: string | undefined,
  filePath?: string,
): string {
  if (!raw) return '';
  const file = new VFile({ value: raw, path: filePath });
  const out = processor.processSync(file);
  return String(out);
}
