# deti.ochrance.cz

Zdrojový kód webu [deti.ochrance.cz](https://deti.ochrance.cz) „Ombudsman dětem a náctiletým“. Je to web ochránce práv dětí (dětského ombudsmana), který provozuje Kancelář veřejného ochránce práv. Web je jen v češtině.

## Technologie

- [Astro](https://astro.build) 6 s nástavbou [@nuasite/nua](https://nuasite.com), která k Astru přidává CMS
- [Bun](https://bun.sh) pro instalaci balíčků a spouštění skriptů
- [Pagefind](https://pagefind.app) pro vyhledávání, index vzniká při buildu
- SCSS pro styly

## Lokální spuštění

```sh
bun install          # instalace závislostí včetně úprav z patches/
bun run dev          # vývojový server Astro
bun run build        # nua build, potom index Pagefind do dist/
bun run preview      # lokální náhled hotového buildu z dist/
```

Pull requesty do `main` projdou buildem a kontrolami v `.github/workflows/pr-build.yml`. Jednotlivé kontroly jsou v `package.json` jako skripty `verify:*`.

## Struktura repozitáře

- `src/content/` – obsah v kolekcích (aktuality, tiskové zprávy, případy, otázky a odpovědi, videa a další) jako Markdown a MDX
- `src/content.config.ts` – definice kolekcí a jejich polí, ze kterých vychází i CMS
- `src/pages/` – stránky a adresy webu včetně RSS a vyhledávání
- `src/components/`, `src/layouts/`, `src/styles/` – šablony, komponenty a styly. Texty jednotlivých stránek jsou v `src/components/page-copy/`.
- `src/remark/`, `src/rehype/`, `src/lib/` – zpracování Markdownu (česká typografie, videa z YouTube, obrázky a popisky) a pomocné funkce
- `src/site-data/` – údaje o ombudsmanovi a texty chybových stránek
- `src/_redirects` – přesměrování adres původního webu
- `public/` – statické soubory (fonty, část obrázků, HTTP hlavičky v `_headers`)
- `cloudflare/wrangler.jsonc` – konfigurace produkčního Workeru
- `patches/` – úpravy balíčků Nua, které Bun použije při `bun install`
- `scripts/` – kontrolní skripty a několik jednorázových skriptů z převodu webu z Hugo

Většina obrázků a příloh není v repozitáři, web je načítá z CDN.

## Úpravy obsahu

Obsah upravuje redakce v CMS Nua. CMS pracuje přímo se soubory v repozitáři: s kolekcemi v `src/content/` a s texty v komponentách stránek.

## Nasazení

Produkční web běží na Cloudflare jako Worker, který vydává jen statické soubory z `dist/`. Přesměrování a HTTP hlavičky určují soubory `_redirects` a `_headers` z buildu. Soubory nahrané na původní web (`/uploads-deti/`) jsou dostupné přes [www.ochrance.cz](https://www.ochrance.cz).

Workflow `.github/workflows/main.yml` web sestaví, ověří publikované adresy (`bun run verify:launch`) a nasadí ho podle `cloudflare/wrangler.jsonc`. Spouští se po každém pushi do `main`, v pracovní dny v 8:00 UTC a ručně. Nasazuje jen v repozitáři `ochrance-cz/deti`.

Workflow potřebuje v GitHub Actions secrets `CLOUDFLARE_API_TOKEN` a `CLOUDFLARE_ACCOUNT_ID`. Provoz obou webů Kanceláře v Cloudflare popisuje [`cloudflare/README.md`](https://github.com/ochrance-cz/web/blob/main/cloudflare/README.md) v repozitáři `ochrance-cz/web`.

## Kontakt

Kontakt na Kancelář pro dospělé, uvedený i v patičce webu: [podatelna@ochrance.cz](mailto:podatelna@ochrance.cz).
