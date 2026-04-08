import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAMPION_CATALOG } from './catalog.js';
import { normalizeChampionLookupKey, resolveChampion } from './resolveChampion.js';

test('normalizeChampionLookupKey strips punctuation and whitespace', () => {
  assert.equal(normalizeChampionLookupKey(" Kha'Zix "), 'khazix');
  assert.equal(normalizeChampionLookupKey('Dr. Mundo'), 'drmundo');
  assert.equal(normalizeChampionLookupKey('Nunu & Willump'), 'nunuandwillump');
});

test('resolveChampion handles Riot display-name edge cases', () => {
  assert.equal(resolveChampion({ championName: "Kha'Zix" })?.slug, 'Khazix');
  assert.equal(resolveChampion({ championName: 'Nunu & Willump' })?.slug, 'Nunu');
});

test('resolveChampion round-trips every catalog entry by name and slug', () => {
  for (const champion of CHAMPION_CATALOG) {
    assert.equal(resolveChampion({ championName: champion.name })?.slug, champion.slug);
    assert.equal(resolveChampion({ championSlug: champion.slug })?.name, champion.name);
    assert.equal(
      resolveChampion({ championSlug: normalizeChampionLookupKey(champion.slug), championName: 'Ahri' })?.slug,
      champion.slug,
    );
  }
});

test('resolveChampion prefers explicit championSlug over conflicting championName', () => {
  assert.equal(resolveChampion({ championSlug: 'MonkeyKing', championName: 'Ahri' })?.slug, 'MonkeyKing');
  assert.equal(resolveChampion({ championSlug: 'monkeyking', championName: 'Ahri' })?.slug, 'MonkeyKing');
});

test('resolveChampion returns null for nullish champion names and unknown misses', () => {
  assert.equal(resolveChampion({ championName: null }), null);
  assert.equal(resolveChampion({ championName: undefined }), null);
  assert.equal(resolveChampion({ championSlug: 'Nope' }), null);
  assert.equal(resolveChampion({ championName: 'Nope' }), null);
});

test('normalized champion lookup keys stay collision-free across the catalog', () => {
  const lookupOwners = new Map();

  for (const champion of CHAMPION_CATALOG) {
    for (const sourceValue of [champion.name, champion.slug]) {
      const lookupKey = normalizeChampionLookupKey(sourceValue);
      const existingSlug = lookupOwners.get(lookupKey);

      assert.ok(
        existingSlug === undefined || existingSlug === champion.slug,
        `normalized lookup key collision: ${lookupKey} -> ${existingSlug} and ${champion.slug}`,
      );

      lookupOwners.set(lookupKey, champion.slug);
    }
  }
});
