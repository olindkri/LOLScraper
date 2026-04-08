import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const matchModalPath = new URL('./MatchModal.jsx', import.meta.url);

test('MatchModal imports ChampionBadge', async () => {
  const source = await readFile(matchModalPath, 'utf8');
  assert.match(source, /import ChampionBadge from '\.\/ChampionBadge'/);
});

test('MatchModal renders participant champion through ChampionBadge', async () => {
  const source = await readFile(matchModalPath, 'utf8');
  assert.match(source, /<ChampionBadge[\s\S]*championName=\{participant\.champion\}/);
  assert.match(source, /size=\{22\}/);
});
