import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(ctx: APIContext) {
  const entries = await getCollection('aktualne', (e) => !e.data.draft);
  entries.sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
  );
  return rss({
    title: 'Dětský ombudsman',
    description: 'Aktuality dětského ombudsmana',
    site: ctx.site ?? 'https://deti.ochrance.cz/',
    items: entries.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date ?? new Date(),
      description: e.data.perex ?? '',
      link: `/aktualne/${e.id}/`,
    })),
  });
}
