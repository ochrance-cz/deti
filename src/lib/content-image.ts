import fs from 'node:fs';
import path from 'node:path';

const CONTENT_ROOT = path.resolve('./content');

export function findEntryFolder(
  collectionFolder: string,
  id: string,
): string | null {
  const candidates = [
    path.join(CONTENT_ROOT, collectionFolder, id),
    path.join(CONTENT_ROOT, collectionFolder, id.replace(/\/index$/, '')),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  return null;
}

export function resolveCoLocated(
  collectionFolder: string,
  id: string,
  filename: string,
): string | null {
  const folder = findEntryFolder(collectionFolder, id);
  if (!folder) return null;
  const file = path.join(folder, filename);
  if (fs.existsSync(file)) {
    return `/_astro-content/${collectionFolder}/${id}/${filename}`;
  }
  return null;
}

export function contentAsset(
  collectionFolder: string,
  id: string,
  filename: string,
): string {
  return `/content-assets/${collectionFolder}/${id.replace(/\/index$/, '')}/${filename}`;
}
