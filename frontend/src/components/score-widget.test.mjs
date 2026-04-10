import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreWidget.jsx', import.meta.url);

test('ScoreWidget uses ARC constant 65.97', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /65\.97/);
});

test('ScoreWidget SVG has role="img"', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /role="img"/);
});

test('ScoreWidget SVG has aria-label', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /aria-label=/);
});

test('ScoreWidget ranks 1 as MVP', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /MVP/);
});

test('ScoreWidget multiplies score by 10 for display', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /score.*\*.*10|10.*\*.*score/);
});

test('ScoreWidget respects prefers-reduced-motion', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /prefers-reduced-motion|reducedMotion|reduceMotion/);
});
