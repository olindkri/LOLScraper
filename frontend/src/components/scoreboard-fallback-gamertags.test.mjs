import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);

test('ScoreboardRow uses shared tracked-player fallback metadata', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');

  assert.match(source, /import \{ GAMERTAGS_BY_ID \} from '\.\.\/trackedPlayers'/);
  assert.match(source, /const tag = gamertag \|\| GAMERTAGS_BY_ID\[id\] \|\| null;/);
  assert.doesNotMatch(source, /const GAMERTAGS = \{/);
});
