export interface GalleryImage {
  pic: string;
  alt: string;
  caption?: string;
  title?: string;
  download?: string;
}

// Originals stay available for downloads; dialogs load a screen-sized image.
export function galleryPreview(src: string): string {
  if (!src.startsWith('https://cdn.nuasite.com/assets/')) return src;
  const url = new URL(src);
  return `${url.origin}/cdn-cgi/image/width=1600,quality=85,format=auto${url.pathname}`;
}
