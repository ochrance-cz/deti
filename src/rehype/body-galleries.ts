import type { Element, ElementContent, Properties, Root, RootContent } from 'hast';
import { galleryPreview } from '../lib/gallery';

/**
 * Turn a paragraph of two or more images into a photo gallery, in every collection.
 *
 * Editors insert photos one after another with the editor's Image button; a paragraph that
 * holds nothing but images renders as a gallery: the first photo large, the others in rows of
 * three, opening in the photo viewer on click. The markup
 * mirrors src/components/Gallery.astro; src/components/GalleryViewer.astro, loaded on every
 * page, carries the styles and the viewer script.
 *
 * Runs before cdnImages (which adds the srcset) and imageCaptions (an image title becomes the
 * gallery caption here instead).
 */
const LABEL = 'Fotogalerie';
const LEAD_SIZES = '(max-width: 600px) 90vw, 800px';
const THUMB_SIZES = '(max-width: 600px) 30vw, 270px';

const h = (tagName: string, properties: Properties = {}, children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const text = (value: string): ElementContent => ({ type: 'text', value });

const isElement = (node: RootContent | ElementContent): node is Element => node.type === 'element';

const isWhitespace = (node: ElementContent): boolean => node.type === 'text' && node.value.trim() === '';

/** The images of a paragraph that contains two or more images and nothing else. */
const galleryImages = (node: Element): Element[] | undefined => {
  if (node.tagName !== 'p') return undefined;
  const images: Element[] = [];
  for (const child of node.children) {
    if (isWhitespace(child)) continue;
    if (!isElement(child) || child.tagName !== 'img') return undefined;
    images.push(child);
  }
  return images.length >= 2 ? images : undefined;
};

const galleryItem = (image: Element, index: number): Element => {
  const src = String(image.properties.src ?? '');
  const title = typeof image.properties.title === 'string' ? image.properties.title.trim() : '';
  delete image.properties.title;
  image.properties.sizes = index === 0 ? LEAD_SIZES : THUMB_SIZES;

  const button = h('button', { type: 'button', className: ['gallery-open'], dataSrc: galleryPreview(src), ariaHasPopup: 'dialog' }, [image]);
  // A photo without alternative text would leave the button unnamed for screen readers.
  if (!String(image.properties.alt ?? '').trim()) button.properties.ariaLabel = `Zvětšit fotografii ${index + 1}`;
  const figure = h('figure', {}, title ? [button, h('figcaption', {}, [text(title)])] : [button]);
  return h('li', {}, [figure]);
};

const viewer = (): Element =>
  h('dialog', { className: ['gallery-dialog'], ariaLabel: LABEL }, [
    h('button', { type: 'button', className: ['gallery-close'], ariaLabel: 'Zavřít galerii' }, [text('×')]),
    h('figure', { className: ['gallery-stage'] }, [
      h('img', { className: ['gallery-full'], alt: '' }),
      h('figcaption', {}, [
        h('span', { className: ['gallery-caption'] }),
        h('a', { className: ['gallery-download'], download: true, hidden: true }, [text('(stáhnout v plném rozlišení)')]),
      ]),
    ]),
    h('button', { type: 'button', className: ['gallery-prev'], ariaLabel: 'Předchozí fotografie' }, [h('img', { src: '/images/arrow-left.svg', alt: '' })]),
    h('button', { type: 'button', className: ['gallery-next'], ariaLabel: 'Další fotografie' }, [h('img', { src: '/images/arrow-right.svg', alt: '' })]),
    h('div', { className: ['gallery-thumbnails'], ariaLabel: 'Výběr fotografie' }),
    h('span', { className: ['gallery-position'], ariaLive: 'polite' }),
  ]);

const gallery = (images: Element[]): Element =>
  h('div', { className: ['editorial-gallery'], role: 'group', ariaLabel: LABEL }, [
    h('ul', { className: ['gallery-grid'] }, images.map(galleryItem)),
    viewer(),
  ]);

const walk = (children: Array<RootContent | ElementContent>): void => {
  for (let i = 0; i < children.length; i++) {
    const node = children[i]!;
    if (!isElement(node)) continue;
    const images = galleryImages(node);
    if (images) children[i] = gallery(images);
    else walk(node.children);
  }
};

export function bodyGalleries() {
  return (tree: Root) => {
    walk(tree.children);
  };
}
