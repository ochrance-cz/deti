import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCmsCollection, n } from '@nuasite/cms';

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
      pic: n.image({ label: 'Obrázek článku', help: 'Používá se v přehledu aktualit a při sdílení. Fotografie vkládejte přímo do textu článku. Dvě a více fotografií vložených za sebou se zobrazí jako galerie.' }).optional(),
      picAlt: n.text({ label: 'Popis obrázku článku', help: 'Alternativní text pro nevidomé a čtečky obrazovky a pro sdílení na sociálních sítích. Popište, co je na obrázku.' }).optional(),
      audio: n.file({ label: 'Audio pod perexem', accept: 'audio/*,.mp3,.wav,.m4a,.ogg', help: 'Volitelná nahrávka (MP3, WAV, M4A), typicky krátká citace pro rozhlas. Pod perexem se zobrazí tlačítko Stáhnout audio.' }).optional(),
      audioPopis: n.text({ label: 'Popis audia', help: 'Zobrazí se nad tlačítkem, aby bylo jasné, co se stahuje. Například Citace ombudsmana Stanislava Křečka k inspekci věznice.' }).optional(),
    }),
    cms: { label: 'Aktuality', order: 1 },
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
      pic: n.image({ label: 'Obrázek tiskové zprávy', help: 'Používá se v přehledu a při sdílení. Fotografie vkládejte přímo do textu zprávy. Dvě a více fotografií vložených za sebou se zobrazí jako galerie.' }).optional(),
      picAlt: n.text({ label: 'Popis obrázku tiskové zprávy', help: 'Alternativní text pro nevidomé a čtečky obrazovky a pro sdílení na sociálních sítích. Popište, co je na obrázku.' }).optional(),
      audio: n.file({ label: 'Audio pod perexem', accept: 'audio/*,.mp3,.wav,.m4a,.ogg', help: 'Volitelná nahrávka (MP3, WAV, M4A), typicky krátká citace pro rozhlas. Pod perexem se zobrazí tlačítko Stáhnout audio.' }).optional(),
      audioPopis: n.text({ label: 'Popis audia', help: 'Zobrazí se nad tlačítkem, aby bylo jasné, co se stahuje. Například Citace ombudsmana Stanislava Křečka k inspekci věznice.' }).optional(),
    }),
    cms: { label: 'Tiskové zprávy', order: 2 },
  }),

  pripady: defineCmsCollection({
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
    cms: { label: 'Nevím si rady s…', order: 4 },
  }),

  'pripady-pripady': defineCmsCollection({
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
    cms: { label: 'Případy' },
  }),

  jsem: defineCmsCollection({
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
    cms: { label: 'Jsem v zařízení nebo nemocnici', order: 5 },
  }),

  'jsem-otazky': defineCmsCollection({
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
    cms: { label: 'Otázky' },
  }),

  // Singleton "datová" stránka pro kontaktní stránku /jak-vas-kontaktovat
  'hledam-pomoc': defineCmsCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hledam-pomoc', }),
    schema: n.object({
      title: n.text({ label: 'Nadpis stránky' }),
      // Text stránky je body. Způsoby kontaktu se v něm zobrazí hned za prvním nadpisem H2.
      contact: n.array(n.object({
        title: n.text({ label: 'Způsob kontaktu' }),
        icon: n.text({ label: 'Ikona' }),
        desc: n.textarea({ label: 'Text kontaktu', help: 'Odstavce a řádky se na webu zachovají.' }),
        note: n.textarea({ label: 'Doplňující informace', help: 'Například úřední hodiny.' }).optional(),
        link: n.url({ label: 'Cíl odkazu', help: 'Volitelný odkaz za textem kontaktu.' }).optional(),
        linkText: n.text({ label: 'Text odkazu' }).optional(),
      }), { label: 'Způsoby kontaktu', help: 'Zobrazují se na webu ve stejném pořadí jako zde.' }).optional(),
    }),
    cms: {
      label: 'Jak vás kontaktovat',
      order: 3,
      pathname: [{ literal: '/jak-vas-kontaktovat/' }],
      sections: [{ title: 'Způsoby kontaktu', fields: ['contact'], collapsed: false }],
    },
  }),

  // Singleton rozcestník /o-pravech-deti (lead text + odkazové skupiny)
  'o-pravech-deti': defineCmsCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/o-pravech-deti', }),
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
    cms: { label: 'O právech dětí', order: 6 },
  }),

  // Singleton "datová" stránka /o-ombudsmanovi
  'o-ombudsmanovi': defineCmsCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/o-ombudsmanovi', }),
    schema: n.object({
      title: n.text(),
      perex: n.textarea().optional(),
      body: n.textarea().optional(),
      facts: n.textarea().optional(),
      links: z
        .array(z.object({ title: z.string().optional(), link: z.string().optional() }))
        .optional(),
    }),
    cms: { label: 'O ombudsmanovi', order: 7 },
  }),

  videos: defineCmsCollection({
    loader: glob({ pattern: '*.{md,mdx}', base: './src/content/videos', }),
    schema: n.object({
      title: n.text(),
      videoId: n.text(), // YouTube video ID (e.g., 'dQw4w9WgXcQ')
      order: z.number().optional().default(0),
      draft: n.boolean().optional().default(false),
      noIndex: n.boolean().optional().default(false),
    }),
    cms: { label: 'Videa', order: 8 },
  }),
};
