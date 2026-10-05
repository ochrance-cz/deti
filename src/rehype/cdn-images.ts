import type { Element, Root, RootContent, ElementContent } from 'hast';

/**
 * Route CDN-hosted markdown images through Cloudflare Image Resizing.
 *
 * Body images are absolute `https://cdn.nuasite.com/assets/...` URLs since the R2 migration, so
 * Astro's optimizer no longer sees them. The transform prefix is spliced onto the image's own
 * origin — the same rule `@nuasite/components`' <Image> follows — which only works because the
 * asset host is the zone with resizing enabled.
 */
const CDN_ORIGIN = 'https://cdn.nuasite.com';
const WIDTHS = [480, 768, 1024, 1400];
const SIZES = '(min-width: 1024px) 1024px, 100vw';
const QUALITY = 85;

/** SVG has nothing to resize and Cloudflare passes it through unchanged. */
const isTransformable = (src: string): boolean =>
  src.startsWith(`${CDN_ORIGIN}/`) && !src.endsWith('.svg');

const transformUrl = (src: string, width: number): string => {
  const { origin, pathname, search } = new URL(src);
  const options = `quality=${QUALITY},format=auto,width=${width}`;
  return `${origin}/cdn-cgi/image/${options}${pathname}${search}`;
};

const isElement = (node: RootContent | ElementContent): node is Element =>
  node.type === 'element';

const applyToImage = (node: Element): void => {
  const src = node.properties.src;
  if (typeof src !== 'string' || !isTransformable(src)) return;

  node.properties.src = transformUrl(src, WIDTHS[WIDTHS.length - 1]!);
  node.properties.srcset = WIDTHS.map((w) => `${transformUrl(src, w)} ${w}w`).join(', ');
  node.properties.sizes ??= SIZES;
  node.properties.loading ??= 'lazy';
  node.properties.decoding ??= 'async';
};

const walk = (children: Array<RootContent | ElementContent>): void => {
  for (const node of children) {
    if (!isElement(node)) continue;
    if (node.tagName === 'img') applyToImage(node);
    else walk(node.children);
  }
};

export function cdnImages() {
  return (tree: Root) => {
    walk(tree.children);
  };
}
