/**
 * Helper to compute the URL pathname for entries in the "stranky" collection.
 * This helps identify where each page is located on the site.
 */

/** Entry IDs that render at root level (/{slug}) instead of /ostatni-stranky/{slug} */
const MERGED_IDS = [
  'desatero',
  'detskyombudsman',
  'elevator_napadem_to_zacina',
  'jak_ombudsmana_vidi_deti_digitalni_galerie_souteze_jak_pomaha_ombudsman_detem',
  'ochrana_tvych_osobnich_udaju',
  'akce-a-skoly',
  'publikace-a-vz/publikace-a-vyrocni-zpravy',
  'spoluprace-s-detmi',
  'vyzkumy-a-doporuceni',
]

/**
 * Compute the pathname for a stranky collection entry based on its ID.
 * @param entryId - The entry ID (slug) from the collection
 * @returns The URL pathname where the page is accessible
 */
export function getStrankyPathname(entryId: string): string {
  if (MERGED_IDS.includes(entryId)) {
    return `/${entryId}`
  }
  return `/ostatni-stranky/${entryId}`
}

/**
 * Get display information for all stranky entries.
 * Useful for generating a sitemap or index of all pages.
 */
export function getStrankyInfo(entryId: string) {
  const pathname = getStrankyPathname(entryId)
  const isMerged = MERGED_IDS.includes(entryId)
  
  return {
    slug: entryId,
    pathname,
    location: isMerged ? 'Root level page' : 'Ostatní stránky section',
    url: pathname,
  }
}
