import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./MatchModal.jsx', import.meta.url);

test('MatchModal imports ScoreWidget', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /import.*ScoreWidget.*from/);
});

test('MatchModal computes rankMap from participants', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rankMap/);
  assert.match(src, /\.sort\(/);
});

test('MatchModal passes rankMap to TeamColumn', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rankMap=\{rankMap\}/);
});

test('TeamColumn passes rank to ParticipantRow', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rank=\{/);
});

test('MatchModal no longer renders raw scoreBg badge', async () => {
  const src = await readFile(path, 'utf8');
  assert.doesNotMatch(src, /scoreBg/);
});
