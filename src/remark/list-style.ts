import type { List, ListItem, Paragraph, Root, RootContent } from 'mdast';

const LIST_OPEN_RE = /^:::list\{\.([A-Za-z0-9_-]+)\}$/;

const isParagraph = (node: RootContent | undefined): node is Paragraph => {
  return node?.type === 'paragraph';
};

const isList = (node: RootContent | undefined): node is List => {
  return node?.type === 'list';
};

const getTextContent = (node: Paragraph): string => {
  return node.children
    .map((child: any) => (typeof child.value === 'string' ? child.value : ''))
    .join('');
};

const appendClassName = (list: List, className: string): void => {
  const data = (list.data || (list.data = {})) as {
    hProperties?: {
      className?: string | string[];
    };
  };
  const hProperties = data.hProperties || (data.hProperties = {});

  if (Array.isArray(hProperties.className)) {
    hProperties.className.push(className);
    return;
  }

  if (typeof hProperties.className === 'string' && hProperties.className.length > 0) {
    hProperties.className = `${hProperties.className} ${className}`;
    return;
  }

  hProperties.className = className;
};

const getLastListItemParagraph = (list: List): {
  item: ListItem;
  paragraph: Paragraph;
  paragraphIndex: number;
} | undefined => {
  const item = list.children[list.children.length - 1];
  if (!item) return undefined;

  for (let i = item.children.length - 1; i >= 0; i--) {
    const child = item.children[i];
    if (child.type === 'paragraph') {
      return {
        item,
        paragraph: child,
        paragraphIndex: i,
      };
    }
  }

  return undefined;
};

const removeTrailingClosingMarker = (list: List): boolean => {
  const last = getLastListItemParagraph(list);
  if (!last) return false;

  for (let i = last.paragraph.children.length - 1; i >= 0; i--) {
    const child = last.paragraph.children[i] as any;
    if (typeof child.value !== 'string') continue;

    if (child.value === ':::') {
      last.paragraph.children.splice(i, 1);
    } else if (child.value.endsWith('\n:::')) {
      child.value = child.value.slice(0, -4);
    } else {
      return false;
    }

    if (last.paragraph.children.length === 0) {
      last.item.children.splice(last.paragraphIndex, 1);
    }

    return true;
  }

  return false;
};

export function listStyle() {
  return (tree: Root) => {
    for (let i = 0; i < tree.children.length - 1; i++) {
      const node = tree.children[i];
      const list = tree.children[i + 1];
      if (!isParagraph(node) || !isList(list)) continue;

      const match = getTextContent(node).match(LIST_OPEN_RE);
      if (!match) continue;

      const closing = tree.children[i + 2];
      const hasSeparateClosing = isParagraph(closing) && getTextContent(closing) === ':::';
      const hasTrailingClosing = !hasSeparateClosing && removeTrailingClosingMarker(list);
      if (!hasSeparateClosing && !hasTrailingClosing) continue;

      appendClassName(list, match[1]);
      tree.children.splice(i, 1);

      if (hasSeparateClosing) {
        tree.children.splice(i + 1, 1);
      }
    }
  };
}
