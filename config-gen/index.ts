import {
  string,
  text,
  datetime,
  list,
  file,
  image,
  markdown,
  customEditor,
  boolean,
  object,
  select,
  relation,
  map,
  number,
  save,
  fileCollection,
  FileCollection,
  Files,
  files,
  title,
  folderCollection,
  FolderCollection,
  AnyWidget,
} from './buildconf.ts';

const icons = select('Ikona', 'icon', [
  'proc.svg',
  'jak-dlouho.svg',
  'vzali-me.svg',
  'prisnejsi.svg',
  'vikend.svg',
  'navstevy.svg',
  'sam-ven.svg',
  'alkohol.svg',
  'mobil.svg',
  'wifi.svg',
  'kontrolovat.svg',
  'zamykat.svg',
  'soukromi.svg',
  'ss.svg',
  'kapesne.svg',
  'vyzdobit.svg',
  'pujcovani.svg',
  'vzhled.svg',
  '18.svg',
  'nelibi.svg',
  'napsat.svg',
  'soud.png',
  'lecba.png',
  'nemocnice.png',
  'nesouhlas.png',
]);

const pic = (title: string, name: string) =>
  object(title, name, [
    image('Obrázek', 'pic'),
    string('Popis obrázku', 'desc', {
      hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
      required: true,
    }),
  ]);

const slug = (required: boolean = false) =>
  string('Řetezec v adrese', 'slug', {
    hint: 'Pouze číslice, písmena anglické abecedy, spojovník a podtržítko.',
    pattern: [
      '^[a-z0-9-_]+$',
      'Řetezec v adrese může obsahovat pouze číslice, písmena anglické abecedy, spojovník a podtržítko.',
    ],
    required: required,
  });

const fig = (title: string, name: string) =>
  object(title, name, [
    image('Obrázek', 'pic'),
    string('Titulek obrázku', 'caption', {
      hint: 'Titulek viditelný pod obrázkem.',
    }),
    string('Popis obrázku', 'desc', {
      hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
      required: true,
    }),
  ]);

const attached = (
  listTitle: string = 'Přílohy',
  name: string = 'attachments',
) =>
  list(listTitle, 'Příloha', name, [
    title('Název přílohy'),
    file('Soubor', 'file'),
    string('Odkaz', 'link'),
  ]);

const links = (title: string, name: string = 'links') => {
  return list(title, 'odkaz', name, [
    string('Odkaz', 'link'),
    string('Popis', 'text'),
  ]);
};

const pages = files('Stránky', 'pages', [
  fileCollection('Homepage', 'home', 'content/_index.markdown', [
    title('Titulek'),
    list('Youtube na homepage', 'video', 'videos', [
      string('Odkaz (youtu.be)', 'video'),
    ]),
    markdown('Úvodní text', 'body'),
  ]),
  fileCollection(
    'Upozornění',
    'varovani',
    'content/alert/_index.markdown',
    [
      title('Titulek'),
      boolean('Skrýt upozornění', 'draft'),
      markdown('Podrobný popis', 'body', {
        hint: 'Titulek se zobrazí na titulní straně, detailní popis na samostatné stránce.',
      }),
      attached(),
    ],
    {
      media_folder: '',
    },
  ),
  fileCollection('Nevíš si rady?', 'pomoc', 'content/pomoc/_index.markdown', [
    title('Titulek'),

    object('Kontakt', 'howto', [
      title('Titulek'),
      markdown('Perex', 'perex'),
      list('Možnosti kontaktu', 'položka', 'contact', [
        title('Název'),
        icons,
        markdown('Popis', 'desc'),
      ]),
      markdown('Text', 'reqs'),
    ]),

    //markdown('Perex', 'perex'),
    //markdown('Text', 'body'),
    markdown('Linky důvěry', 'linky'),
  ]),
  fileCollection('Jsem v zařízení…', 'jsem', 'content/jsem/_index.markdown', [
    title('Titulek'),
    markdown('Perex', 'perex'),
  ]),
  fileCollection(
    'Pro média',
    'pro-media',
    'content/pro-media/_index.markdown',
    [title('Titulek'), markdown('Obsah', 'body'), file('Mediakit', 'mediakit')],
  ),
]);

const kdoCustom = files('Speciální „O nás“', 'o-nas-custom', [
  fileCollection('O ombudsmanovi', 'o-nas', 'content/o-nas/_index.markdown', [
    title('Titulek'),
    markdown('Perex', 'perex'),
    markdown('Fakta', 'facts'),
  ]),
  fileCollection(
    'Profil ombudsmana',
    'ombudsman',
    'content/o-nas/ombudsman/index.markdown',
    [
      title('Titulek'),
      string('Název role', 'role'),
      image('Portrét', 'pic'),
      markdown('Text', 'body'),
    ],
    {
      media_folder: '',
    },
  ),
  fileCollection(
    'Profil zástupce',
    'zastupce',
    'content/o-nas/zastupce/index.markdown',
    [
      title('Titulek'),
      string('Název role', 'role'),
      image('Portrét', 'pic'),
      markdown('Text', 'body'),
    ],
    {
      media_folder: '',
    },
  ),
  fileCollection(
    'Čím se zabývá',
    'cim-se-zabyva',
    'content/o-nas/cim-se-zabyva/index.markdown',
    [
      title('Titulek'),
      markdown('Perex', 'perex'),
      markdown('Titulek - co může', 'we-can-title'),
      list('Co může', 'položka', 'we-can', [string('Může', 'text')]),
      markdown('Titulek - co nemůže', 'we-cannot-title'),
      list('Co nemůže', 'položka', 'we-cannot', [string('Nemůže', 'text')]),
      markdown('Text', 'body'),
    ],
    {
      media_folder: '',
    },
  ),
]);

const intl = folderCollection(
  'Cizojazyčné',
  'intl',
  'překlad',
  {
    folder: 'content/intl',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    string('Jazyk', 'language'),
    string('ISO zkratka', 'lang'),
    file('PDF leták', 'pdf'),
  ],
);

const kdo = folderCollection(
  'O nás',
  'o-nas',
  'o ombudsmanovi',
  {
    folder: 'content/o-nas',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [title('Titulek'), markdown('Perex', 'perex'), markdown('Text', 'body')],
);

const pomoc = folderCollection(
  'Hledám pomoc',
  'pomoc',
  'pomoc',
  {
    folder: 'content/pomoc',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [title('Titulek'), markdown('Perex', 'perex'), markdown('Text', 'body')],
);

const jsem = folderCollection(
  'Jsem v zařízení',
  'zařízení',
  'jsem',
  {
    folder: 'content/jsem',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    markdown('Perex', 'perex'),
    list('Otázky', 'otázka', 'questions', [
      title('Otázka'),
      icons,
      markdown('Odpověď', 'desc'),
    ]),
  ],
);

const aktualne = folderCollection(
  'Aktuálně',
  'aktualita',
  'aktualne',
  {
    folder: 'content/aktualne',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    slug(),
    boolean('Uložit jako draft', 'draft'),
    datetime('Datum publikování', 'date', { use_time: true }),
    markdown('Perex', 'perex'),
    markdown('Text', 'body'),
    attached(),
  ],
);

const press = folderCollection(
  'Tiskové zprávy',
  'tisková zpráva',
  'tz',
  {
    folder: 'content/tz',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    slug(),
    boolean('Uložit jako draft', 'draft'),
    datetime('Datum publikování', 'date', { use_time: true }),
    markdown('Perex', 'perex'),
    markdown('Text', 'body'),
    attached(),
  ],
);

const pripady = folderCollection(
  'Případy',
  'oblast',
  'pripady',
  {
    folder: 'content/pripady',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Oblast'),
    boolean('Uložit jako draft', 'draft'),
    list('Případy', 'případ', 'cases', [
      title('Situace'),
      markdown('Perex', 'perex'),
      markdown('Text', 'body'),
    ]),
  ],
);

save('./static/admin/config.yml', {
  backend: {
    name: 'git-gateway',
    branch: 'main',
  },
  locale: 'cs',
  media_folder: 'content/media',
  public_folder: '/media',
  site_domain: 'https://deti.ochrance.cz/',
  display_url: 'https://deti.ochrance.cz/',
  slug: {
    encoding: 'ascii',
    clean_accents: true,
    sanitize_replacement: '-',
  },
  collections: [
    pages,
    aktualne,
    press,
    kdoCustom,
    kdo,
    pomoc,
    jsem,
    pripady,
    intl,
  ],
});
