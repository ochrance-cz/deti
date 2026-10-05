import { defineConfig } from '@nuasite/nua/config';
import collectionLabels from './src/lib/collection-labels.json';
import rehypeRaw from 'rehype-raw';
import type { Plugin } from 'vite';
import { cdnImages } from './src/rehype/cdn-images';
import { imageCaptions } from './src/rehype/image-captions';
import { remarkCzechTypography } from './src/remark/czech-typography';
import { listStyle } from './src/remark/list-style';
import { replaceYoutubeDirectives, youtube } from './src/remark/youtube';

const site = process.env.DEPLOY_PRIME_URL || 'https://deti.ochrance.cz/';

const youtubeMdxDirective = (): Plugin => ({
  name: 'youtube-mdx-directive',
  enforce: 'pre',
  transform(code, id) {
    const path = id.split('?', 1)[0] ?? id;
    if (!path.endsWith('.mdx')) return null;

    const transformed = replaceYoutubeDirectives(code);
    if (transformed === code) return null;

    return {
      code: transformed,
      map: null,
    };
  },
});

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Legacy Hugo URLs (původně řízené frontmatter polem `slug`, které už nic
  // neřídí — viz odstranění v src/content.config.ts). Astro je ve statickém
  // buildu vyrenderuje jako meta-refresh stránky. Status 301: adresy se změnily
  // natrvalo, bez něj by do _redirects šlo dočasné 307.
  redirects: {
    '/aktualne/zdravotni_pojisteni_stredoskolaku/': {
      status: 301,
      destination: '/aktualne/jsi_v_prvaku_na_stredni_skole_zkontroluj_si_ze_o_tom_vi_i_tva_zdravotni_pojistovna-/',
    },
    '/aktualne/bubnovacka2023/': {
      status: 301,
      destination: '/aktualne/biji_te_doma_krici_na_tebe_a_nadavaji_ti_neni_to_v_poradku_nenech_si_to_libit-/',
    },
    '/aktualne/prejeme-ti-krasne-vanoce/': { status: 301, destination: '/aktualne/prejeme_ti_krasne_vanoce/' },
  },
  nua: {
    tailwindcss: false,
    // MDX must NOT inherit the markdown rehype pipeline: `rehypeRaw` cannot
    // process MDX JSX nodes (<Icon>, <Youtube>) and would crash the build. MDX
    // handles raw HTML/components natively, so it only needs the remark plugins.
    mdx: {
      extendMarkdownConfig: false,
      remarkPlugins: [remarkCzechTypography, listStyle, youtube],
      rehypePlugins: [cdnImages, imageCaptions],
    },
    cms: {
      // Load the project-patched editor rather than the independently updated CDN UI.
      src: '/@nuasite/cms-editor.js',
      collections: collectionLabels,
      cmsConfig: {
        openMetadataByDefault: true,
        features: { collectionManagement: false },
        listStyles: [
          { label: 'Fajfky', class: 'checkmarks' },
          { label: 'Růžové tečky', class: 'dots-pink' },
          { label: 'Modré šipky', class: 'arrows-blue' },
          { label: 'Růžové šipky', class: 'arrows-pink' },
        ],
      },
    },
  },
  markdown: {
    remarkPlugins: [remarkCzechTypography, listStyle, youtube],
    rehypePlugins: [rehypeRaw, cdnImages, imageCaptions],
    remarkRehype: {
      allowDangerousHtml: true,
    },
  },
  vite: {
    optimizeDeps: { include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'debug', 'extend', 'acorn-jsx'] },
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
    plugins: [youtubeMdxDirective()],
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'slash-div', 'if-function'],
        },
      },
    },
  },
});
