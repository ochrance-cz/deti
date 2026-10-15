import type { Root, RootContent } from 'mdast';
import type { VFile } from 'vfile';

// Kontaktní stránka /jak-vas-kontaktovat: redakce upravuje veškerý text v body
// a způsoby kontaktu vyklikává v CMS. Seznam kontaktů z frontmatteru se vloží
// hned za první nadpis H2 v body (nadpisy uvnitř citací se nepočítají), bez
// něj na začátek textu.

type Contact = {
  title?: string;
  icon?: string;
  desc?: string;
  note?: string;
  link?: string;
  linkText?: string;
};

const CONTACT_PAGE_RE = /[\\/]src[\\/]content[\\/]hledam-pomoc[\\/]/;

const escape = (value: string | undefined): string =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderContact = (contact: Contact): string => {
  const description = contact.link
    ? `<div class="linked-contact-text"><p>${escape(contact.desc)}</p> <a href="${escape(contact.link)}">${escape(contact.linkText || contact.link)}</a></div>`
    : `<div class="contact-description">${escape(contact.desc)}</div>`;

  return [
    '<li>',
    `<img class="contact-icon" src="/images/domov/${escape(contact.icon)}" alt="" aria-hidden="true">`,
    `<p><strong>${escape(contact.title)}</strong></p>`,
    description,
    contact.note ? `<p>${escape(contact.note)}</p>` : '',
    '</li>',
  ].join('');
};

export function contactList() {
  return (tree: Root, file: VFile) => {
    if (!CONTACT_PAGE_RE.test(file.path ?? '')) return;

    const frontmatter = (file.data as { astro?: { frontmatter?: { contact?: Contact[] } } }).astro?.frontmatter;
    const contacts = frontmatter?.contact ?? [];
    const node: RootContent = {
      type: 'html',
      value: `<ul class="_contact">${contacts.map(renderContact).join('')}</ul>`,
    };

    const index = tree.children.findIndex((child) => child.type === 'heading' && child.depth === 2);
    tree.children.splice(index + 1, 0, node);
  };
}
