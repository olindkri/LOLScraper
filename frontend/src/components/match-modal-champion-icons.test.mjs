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

test('MatchModal keeps tracked-player highlighting keyed by tracked gamertags', async () => {
  const source = await readFile(matchModalPath, 'utf8');
  assert.match(source, /import \{ TRACKED_GAMERTAGS \} from '\.\.\/trackedPlayers'/);
  assert.match(source, /const isTracked = TRACKED_GAMERTAGS\.has\(participant\.summonerName\);/);
});
