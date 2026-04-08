import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);

test('ScoreboardRow renders solo rank after the player name in a single line', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');

  const displayNameIndex = source.indexOf('{displayName}');
  const rankLabelDesktopIndex = source.indexOf('rank-label-desktop');

  assert.notStrictEqual(displayNameIndex, -1, 'expected display name markup to exist');
  assert.notStrictEqual(rankLabelDesktopIndex, -1, 'expected rank-label-desktop class to exist');
  assert.ok(
    displayNameIndex < rankLabelDesktopIndex,
    'expected the rank label to render after the player name',
  );

  // Desktop label includes LP
  assert.match(source, /labelFull.*soloRank\.lp.*LP/s);
  // Mobile label excludes LP
  assert.match(source, /labelShort/);
  assert.match(source, /rank-label-desktop/);
  assert.match(source, /rank-label-mobile/);
});
