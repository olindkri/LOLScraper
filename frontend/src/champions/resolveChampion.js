import { CHAMPION_CATALOG } from './catalog.js';

const championBySlug = new Map(
  CHAMPION_CATALOG.map((champion) => [champion.slug, champion]),
);

const championSlugByLookupKey = new Map();

for (const champion of CHAMPION_CATALOG) {
  registerChampionLookupKey(normalizeChampionLookupKey(champion.name), champion.slug);
  registerChampionLookupKey(normalizeChampionLookupKey(champion.slug), champion.slug);
}

export function normalizeChampionLookupKey(value = '') {
  if (typeof value !== 'string') return '';

  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '');
}

function registerChampionLookupKey(lookupKey, slug) {
  if (!lookupKey) return;

  const existingSlug = championSlugByLookupKey.get(lookupKey);
  if (existingSlug && existingSlug !== slug) {
    throw new Error(`duplicate champion lookup key: ${lookupKey}`);
  }

  championSlugByLookupKey.set(lookupKey, slug);
}

export function resolveChampion(input = {}) {
  const { championSlug = '', championName = '' } = input ?? {};

  if (championSlug) {
    const exactMatch = championBySlug.get(championSlug);
    if (exactMatch) return exactMatch;

    const normalizedSlug = normalizeChampionLookupKey(championSlug);
    if (normalizedSlug) {
      const resolvedSlug = championSlugByLookupKey.get(normalizedSlug);
      if (resolvedSlug) return championBySlug.get(resolvedSlug) ?? null;
    }
  }

  const lookupKey = normalizeChampionLookupKey(championName);
  if (!lookupKey) return null;

  const resolvedSlug = championSlugByLookupKey.get(lookupKey);
  return resolvedSlug ? championBySlug.get(resolvedSlug) ?? null : null;
}
