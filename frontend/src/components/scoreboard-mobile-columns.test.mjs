import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreboardRow.jsx', import.meta.url);

test('KDA td has class col-kda', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-kda"/);
});

test('CS td has class col-cs', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-cs"/);
});

test('Top Champ td has class col-champ', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-champ"/);
});
