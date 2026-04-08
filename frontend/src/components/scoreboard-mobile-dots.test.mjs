import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreboardRow.jsx', import.meta.url);

test('GameDot accepts a className prop and applies it to the span', async () => {
  const source = await readFile(path, 'utf8');
  // GameDot destructures className
  assert.match(source, /function GameDot\(\s*\{[^}]*className[^}]*\}\s*\)/);
  // className is spread onto the span
  assert.match(source, /className=\{className\}/);
});

test('dots at index >= 5 receive mobile-dot-hidden class', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /i >= 5[^']*'mobile-dot-hidden'/);
});
