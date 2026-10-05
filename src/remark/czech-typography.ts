import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const CZ_LETTER = 'AÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPQRŘSŠTŤUÚŮVWXYÝZŽaábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzž';
const SHORT_WORD_RE = new RegExp(
  `(\\s[${CZ_LETTER}][${CZ_LETTER}]?) `,
  'g',
);
const SEMI_SHORT_WORD_RE = new RegExp(
  `(;[${CZ_LETTER}][${CZ_LETTER}]?) `,
  'g',
);

const NBSP = '\u00a0';

const applyFixes = (input: string): string => {
  let out = input;
  out = out.replace(/ - /g, ' \u2014 ');
  out = out.replace(/§ /g, `§${NBSP}`);
  out = out.replace(/ Kč/g, `${NBSP}Kč`);
  out = out.replace(SHORT_WORD_RE, `$1${NBSP}`);
  out = out.replace(SEMI_SHORT_WORD_RE, `$1${NBSP}`);
  return out;
};

export function applyCzechTypography(input: string): string {
  return applyFixes(input);
}

export function remarkCzechTypography() {
  return (tree: Root) => {
    visit(tree, 'text', (node: any) => {
      if (typeof node.value === 'string') {
        node.value = applyFixes(node.value);
      }
    });
  };
}
