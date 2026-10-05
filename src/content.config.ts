import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCmsCollection, n } from '@nuasite/cms';

const galleryImage = z.object({
  pic: n.image({ label: 'Fotografie' }),
  alt: n.textarea({ label: 'Alternativní text', help: 'Popište obsah této konkrétní fotografie. Text přečte čtečka obrazovky.' }),
  caption: n.text({ label: 'Popisek pod fotografií' }).optional(),
});

const attachment = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  file: z.string().optional(),
  link: z.string().optional(),
});

const caseItem = z.object({
  title: z.string(),
  perex: z.string().optional().default(''),
  body: z.string().optional().default(''),
});

const question = z.object({
  title: z.string(),
  icon: z.string().optional().default(''),
  desc: z.string().optional().default(''),
});

const indexEntryId = ({ entry }: { entry: string }) =>
  entry.replace(/\/index\.mdx?$/, '');

const fullEntryId = ({ entry }: { entry: string }) =>
  entry.replace(/\.mdx?$/, '');

export const collections = {
  aktualne: defineCmsCollection({
    loader: glob({
      pattern: '*/index.{md,mdx}',
      base: './src/content/aktualne',
      generateId: indexEntryId,
    }),
    schema: n.object({
      title: n.text(),
      draft: n.boolean().optional().default(false),
      noIndex: n.boolean().optional().default(false),
      date: z.coerce.date().optional(),
      perex: n.textarea().optional(),
      attachments: z.array(attachment).optional().default([]),
      icon: n.text().optional(),
      pic: n.image({ label: 'Obrázek článku', help: 'Používá se v přehledu aktualit a při sdílení. Fotografie uvnitř článku přidejte do Fotogalerie nebo přímo do textu.' }).optional(),
      gallery: n.array(galleryImage, { label: 'Fotogalerie', help: 'Přidejte fotografie přes +. U každé vyplňte její alternativní text a případný popisek. První fotografie bude velká, další budou pod ní po třech. Fotografie přidávejte v požadovaném pořadí.' }).optional().default([]),
    }),
    cms: { sections: [{ title: 'Fotogalerie', fields: ['gallery'], collapsed: false }] },
  }),

  'press-releases': defineCmsCollection({
    loader: glob({
      pattern: '*/index.{md,mdx}',
      base: './src/content/press-releases',
      generateId: indexEntryId,
    }),
    schema: n.object({
      title: n.text(),
      draft: n.boolean().optional().default(false),
      noIndex: n.boolean().optional().default(false),
      date: z.coerce.date().optional(),
      perex: n.textarea().optional(),
      attachments: z.array(attachment).optional().default([]),
      icon: n.text().optional(),
      pic: n.image({ label: 'Obrázek tiskové zprávy', help: 'Používá se v přehledu a při sdílení. Fotografie uvnitř zprávy přidejte do Fotogalerie nebo přímo do textu.' }).optional(),
      gallery: n.array(galleryImage, { label: 'Fotogalerie', help: 'Přidejte fotografie přes +. U každé vyplňte její alternativní text a případný popisek. První fotografie bude velká, další budou pod ní po třech. Fotografie přidávejte v požadovaném pořadí.' }).optional().default([]),
    }),
    cms: { sections: [{ title: 'Fotogalerie', fields: ['gallery'], collapsed: false }] },
  }),

  pripady: defineCollection({
    loader: glob({
      pattern: '*/index.{md,mdx}',
      base: './src/content/pripady',
      generateId: indexEntryId,
    }),
    schema: n.object({
      title: n.text(),
      draft: n.boolean().optional().default(false),
      noIndex: n.boolean().optional().default(false),
      date: z.coerce.date().optional(),
      perex: n.textarea().optional(),
      cases: z.array(caseItem).optional().default([]),
    }),
  }),

  'pripady-pripady': defineCollection({
    loader: glob({
      pattern: '*/pripady/*.{md,mdx}',
      base: './src/content/pripady',
      generateId: fullEntryId,
    }),
    schema: n.object({
      title: n.text(),
      perex: n.textarea().optional(),
      order: z.number(),
    }),
  }),

  jsem: defineCollection({
    loader: glob({
      pattern: '*/index.{md,mdx}',
      base: './src/content/jsem',
      generateId: indexEntryId,
    }),
    schema: n.object({
      title: n.text(),
      noIndex: n.boolean().optional().default(false),
      perex: n.textarea().optional(),
      questions: z.array(question).optional().default([]),
    }),
  }),

  'jsem-otazky': defineCollection({
    loader: glob({
      pattern: '*/otazky/*.{md,mdx}',
      base: './src/content/jsem',
      generateId: fullEntryId,
    }),
    schema: n.object({
      title: n.text(),
      icon: n.text().optional(),
      order: z.number(),
    }),
  }),

  // Singleton "datová" stránka pro kontaktní stránku /jak-vas-kontaktovat
  'hledam-pomoc': defineCmsCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hledam-pomoc' }),
    schema: n.object({
      title: n.text({ label: 'Nadpis stránky' }),
      noIndex: n.boolean().optional().default(false),
      perex: n.textarea({ label: 'Úvodní text' }).optional(),
      privacyNote: n.textarea({ label: 'Naléhavá pomoc – text před odkazem' }).optional(),
      privacyLink: n.url({ label: 'Naléhavá pomoc – cíl odkazu' }).optional(),
      privacyLinkText: n.text({ label: 'Naléhavá pomoc – text odkazu' }).optional(),
      privacyAfterLink: n.textarea({ label: 'Naléhavá pomoc – text za odkazem' }).optional(),
      howtoTitle: n.text({ label: 'Nadpis kontaktů' }).optional(),
      howtoPerex: n.textarea({ label: 'Úvod ke kontaktům' }).optional(),
      contact: n.array(n.object({
        title: n.text({ label: 'Způsob kontaktu' }),
        icon: n.text({ label: 'Ikona' }),
        desc: n.textarea({ label: 'Text kontaktu', help: 'Odstavce a řádky se na webu zachovají.' }),
        note: n.textarea({ label: 'Doplňující informace', help: 'Například úřední hodiny.' }).optional(),
        link: n.url({ label: 'Cíl odkazu', help: 'Volitelný odkaz za textem kontaktu.' }).optional(),
        linkText: n.text({ label: 'Text odkazu' }).optional(),
      }), { label: 'Způsoby kontaktu', help: 'Zobrazují se na webu ve stejném pořadí jako zde.' }).optional(),
      body: n.markdown({ label: 'Další informace', help: 'Celý obsah pod kontakty včetně postupu vyřízení případu.' }).optional(),
    }),
    cms: {
      pathname: [{ literal: '/jak-vas-kontaktovat/' }],
      sections: [{ title: 'Způsoby kontaktu', fields: ['contact'], collapsed: false }],
    },
  }),

  // Singleton rozcestník /o-pravech-deti (lead text + odkazové skupiny)
  'o-pravech-deti': defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/o-pravech-deti' }),
    schema: n.object({
      title: n.text(),
      noIndex: n.boolean().optional().default(false),
      perex: n.textarea().optional(),
      lead: n.textarea().optional(),
      links: z
        .array(
          z.object({
            title: z.string().optional(),
            links: z
              .array(
                z.object({
                  title: z.string(),
                  link: z.string(),
                  description: z.string().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    }),
  }),

  // Singleton "datová" stránka /o-ombudsmanovi
  'o-ombudsmanovi': defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/o-ombudsmanovi' }),
    schema: n.object({
      title: n.text(),
      perex: n.textarea().optional(),
      body: n.textarea().optional(),
      facts: n.textarea().optional(),
      links: z
        .array(z.object({ title: z.string().optional(), link: z.string().optional() }))
        .optional(),
    }),
  }),

  videos: defineCollection({
    loader: glob({ pattern: '*.{md,mdx}', base: './src/content/videos' }),
    schema: n.object({
      title: n.text(),
      videoId: n.text(), // YouTube video ID (e.g., 'dQw4w9WgXcQ')
      order: z.number().optional().default(0),
      draft: n.boolean().optional().default(false),
      noIndex: n.boolean().optional().default(false),
    }),
  }),
};
