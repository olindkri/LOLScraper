import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);
const championBadgePath = new URL('./ChampionBadge.jsx', import.meta.url);

test('ChampionBadge reserves icon space and hides broken images', async () => {
  const badgeSource = await readFile(championBadgePath, 'utf8');
  assert.match(badgeSource, /useState\(false\)/);
  assert.match(
    badgeSource,
    /<span[\s\S]*style=\{\{[\s\S]*width: size,[\s\S]*height: size,[\s\S]*flexShrink: 0,[\s\S]*\}\}[\s\S]*>\s*\{showImage \? \(/,
  );
  assert.match(badgeSource, /const showImage = Boolean\(resolved\) && !imageFailed;/);
  assert.match(badgeSource, /\{showImage \? \([\s\S]*<img/);
  assert.match(badgeSource, /<\/img>|\/>\s*\)\s*: null\s*\}/);
  assert.match(badgeSource, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(badgeSource, /width=\{size\}/);
  assert.match(badgeSource, /height=\{size\}/);
});

test('ScoreboardRow renders top champ and game champions through ChampionBadge', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /import ChampionBadge from '\.\/ChampionBadge';/);
  assert.match(source, /<ChampionBadge[\s\S]*championName=\{mostPlayedChampion\}/);
  assert.match(source, /<ChampionBadge[\s\S]*championName=\{g\.champion\}/);
  assert.match(source, /championSlug=\{g\.championSlug\}/);
});
