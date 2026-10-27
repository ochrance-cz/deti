# Instrukce pro agenty

Základní popis repozitáře, příkazy a nasazení jsou v [README.md](README.md). Tady je jen to, co agent potřebuje navíc.

## Editory obsahu: který se používá a kde ho opravovat

Redakce upravuje obsah v hostované administraci Nua, v panelu **Kolekce**: bílý panel se seznamem záznamů vlevo a formulářem. Tohle je editor, na kterém záleží.

| Co | Odkud je | Kde se opravuje |
|---|---|---|
| Formulář kolekce (pole, levý sloupec, ukládání) | kód hostované administrace Nua | mimo toto repo |
| Editor těla článku ve formuláři | balíček `@nuasite/cms-mdx-editor` (monorepo nuasite) | PR do nuasite, vydání, zvednutí verze v administraci |
| Čtení a zápis souborů pro formulář | `@nuasite/cms-sidecar` (spouští se jako `@latest`) | je to jen API, ne editor |
| Černý inline editor v náhledu stránky | hotový editor z CDN, verze pevně v `cms.src` v `astro.config.ts` | v nuasite, tady jen posun verze |
| Lokální `/_nua/admin` | `@nuasite/collections-admin` z `node_modules` | vidí ho jen vývojář |

Z toho plyne:

- Chyba v bílém editoru nebo formuláři se neopravuje v tomto repu. Patche v `patches/` se v hostované administraci neprojeví, mění jen lokální `/_nua/admin`.
- Černý editor je vedlejší nástroj pro texty, které nejsou v kolekcích. Nepatchuje se: načítá se z `https://cdn.nuasite.com/script/<verze>/cms-editor.js`, ne z `node_modules`, takže patch na `@nuasite/cms/src/editor/*` nemá žádný účinek. Oprava patří do nuasite. `script/latest/` na CDN zaostává za vydáními, proto je verze pevná.
- V tomto repu se pro administraci mění jen `src/content.config.ts` (pole, popisky, nápověda, `cms: { label, order, group, hidden, pathname, sidebar, sections }`) a obsah v `src/content/`.
- Nový text, který má redakce upravovat, patří do kolekce, ne natvrdo do `.astro`.

## Pravidla pro `src/content.config.ts`

Administrace čte konfiguraci staticky ze zdrojového kódu, ne spuštěním.

- Hodnoty v `defineCmsCollection` a v nastavení polí (`label`, `help`, `accept`, `cms: {…}`) piš jako literály, ne konstanty ani šablonové řetězce.
- Každý výskyt slova `base` musí mít tvar `base: 'prostý řetězec',`. Jiný tvar (konstanta, šablona, slovo „base“ v komentáři) zablokuje trvalé mazání souborů v administraci.
- Alternativní text obrázku je textové pole `<pole>Alt` hned vedle obrázkového pole `<pole>`. Administrace je spáruje a zobrazí pod výběrem obrázku. Šablona ho musí vykreslit; bez textu zůstává obrázek dekorativní (`alt=""`).

## Aktualizace Nua

- Verze `@nuasite/*` je v `package.json` čtyřikrát a v klíčích i názvech souborů `patchedDependencies`. Při zvednutí verze se patche v `patches/` musí převést (`bun patch`, `bun patch --commit`); `bun install --frozen-lockfile` na nesedícím patchi spadne.
- `bunfig.toml` vyjímá balíčky `@nuasite/*` z čekací lhůty na nové verze. Přibude-li v `bun.lock` nový balíček `@nuasite`, doplň ho tam.
- Verze editoru v `cms.src` se se zvednutím balíčků sama neposune. Před změnou ověř, že na CDN existuje (`curl -I https://cdn.nuasite.com/script/<verze>/cms-editor.js`).
- Patch `cms-mdx-editor` obsahuje jen `safeImageSchema`: obrázek bez titulku by jinak lokální editor i `verify:editor-content` zahodily. Patche `cms`, `cms-core` a `collections-admin` jsou úpravy lokální administrace (popisek u `n.array`, rich editor pro `.md`, načtení sidecaru po restartu dev serveru).
- `src/_redirects` z CMS slučuje do `dist/_redirects` nua (`@nuasite/cms` při buildu).

## Před merge do `main`

Push do `main` v `ochrance-cz/deti` web rovnou nasadí. Před ním:

```sh
bun run build
bun run verify:pages
bun run verify:editor-content
```

Repo je veřejné. Do commitů nepatří screenshoty z administrace, interní adresy ani odkazy `#číslo` na PR z jiného repa (GitHub by je navázal na cizí issue).
