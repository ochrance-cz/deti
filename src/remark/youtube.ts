import type { Html, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';

// Directive format: `:::youtube{<value>}` where value is a YouTube URL or bare id, with no surrounding spaces.
const YOUTUBE_VALUE_PATTERN = '((?:[A-Za-z0-9_-]+)|(?:https?:\\/\\/(?:www\\.)?youtu\\.be\\/[A-Za-z0-9_-]+(?:[?&][^\\s{}]*)?)|(?:https?:\\/\\/(?:www\\.)?youtube\\.com\\/watch\\?v=[A-Za-z0-9_-]+(?:[?&][^\\s{}]*)?))';
const YOUTUBE_RE = new RegExp(`^:::youtube\\{${YOUTUBE_VALUE_PATTERN}\\}$`);
const YOUTUBE_LINE_RE = new RegExp(`^:::youtube\\{${YOUTUBE_VALUE_PATTERN}\\}$`, 'gm');

const isParagraph = (node: RootContent | undefined): node is Paragraph => {
  return node?.type === 'paragraph';
};

const hasStringValue = (node: PhrasingContent): node is PhrasingContent & { value: string } => {
  return 'value' in node && typeof node.value === 'string';
};

const getPhrasingContentText = (node: PhrasingContent): string => {
  if (hasStringValue(node)) return node.value;
  if ('children' in node) return node.children.map(getPhrasingContentText).join('');
  return '';
};

const getTextContent = (node: Paragraph): string => {
  return node.children
    .map(getPhrasingContentText)
    .join('');
};

const normalizeVideoId = (id: string): string => {
  return id
    .replace(/^https?:\/\/(www\.)?youtu\.be\//, '')
    .replace(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/, '')
    .replace(/[?&].*$/, '')
    .trim();
};

const createYoutubeEmbedHtml = (videoId: string): string => {
  return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube.com/embed/${videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"
    allowfullscreen
    title="YouTube Video"
  ></iframe>
</div>`;
};

const createYoutubeEmbed = (videoId: string): Html => {
  return {
    type: 'html',
    value: createYoutubeEmbedHtml(videoId),
  };
};

export const replaceYoutubeDirectives = (input: string): string => {
  return input.replace(YOUTUBE_LINE_RE, (_directive, value: string) => {
    return createYoutubeEmbedHtml(normalizeVideoId(value));
  });
};

export function youtube() {
  return (tree: Root) => {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (!isParagraph(node)) continue;

      const match = getTextContent(node).match(YOUTUBE_RE);
      if (!match) continue;

      const value = match[1];
      if (!value) continue;

      const videoId = normalizeVideoId(value);
      tree.children.splice(i, 1, createYoutubeEmbed(videoId));
    }
  };
}
