import type { Element, ElementContent, Root, RootContent } from 'hast';

const FIGURE_CLASS = 'image-figure';
const FIGCAPTION_CLASS = 'image-figcaption';

type ChildList = RootContent[] | ElementContent[];

const isElement = (node: RootContent | ElementContent): node is Element => {
  return node.type === 'element';
};

const isWhitespaceText = (node: ElementContent): boolean => {
  return node.type === 'text' && node.value.trim() === '';
};

const getImageCaption = (node: RootContent | ElementContent): string | undefined => {
  if (!isElement(node) || node.tagName !== 'img') return undefined;

  const title = node.properties.title;
  if (typeof title !== 'string') return undefined;

  const caption = title.trim();
  return caption.length > 0 ? caption : undefined;
};

const createFigure = (image: Element, caption: string): Element => {
  delete image.properties.title;

  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: [FIGURE_CLASS] },
    children: [
      image,
      {
        type: 'element',
        tagName: 'figcaption',
        properties: { className: [FIGCAPTION_CLASS] },
        children: [{ type: 'text', value: caption }],
      },
    ],
  };
};

const createStandaloneImageFigure = (node: Element): Element | undefined => {
  if (node.tagName !== 'p') return undefined;

  let image: Element | undefined;
  let caption: string | undefined;

  for (const child of node.children) {
    if (isWhitespaceText(child)) continue;

    const childCaption = getImageCaption(child);
    if (!childCaption || !isElement(child)) return undefined;
    if (image) return undefined;

    image = child;
    caption = childCaption;
  }

  return image && caption ? createFigure(image, caption) : undefined;
};

const wrapCaptionedImages = (children: ChildList): void => {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!isElement(node)) continue;

    const standaloneFigure = createStandaloneImageFigure(node);
    if (standaloneFigure) {
      children[i] = standaloneFigure;
      continue;
    }

    const caption = getImageCaption(node);
    if (caption) {
      children[i] = createFigure(node, caption);
      continue;
    }

    wrapCaptionedImages(node.children);
  }
};

export function imageCaptions() {
  return (tree: Root) => {
    wrapCaptionedImages(tree.children);
  };
}
