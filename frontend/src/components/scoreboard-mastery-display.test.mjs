import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);

test('ScoreboardRow destructures mostPlayedChampionMastery from stats', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /mostPlayedChampionMastery\s*=\s*null/);
});

test('ScoreboardRow renders mastery points as rounded K value', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /Math\.round\(mostPlayedChampionMastery\s*\/\s*1000\)/);
  assert.match(source, /K pts/);
});

test('ScoreboardRow only renders mastery label when value is positive', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /mostPlayedChampionMastery\s*>\s*0/);
});
