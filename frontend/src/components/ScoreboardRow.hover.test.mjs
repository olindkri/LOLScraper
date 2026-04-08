import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);
const indexCssPath = new URL('../index.css', import.meta.url);

function readCssVariable(source, name) {
  const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

test('expanded match rows use a distinct hover color token', async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(scoreboardRowPath, 'utf8'),
    readFile(indexCssPath, 'utf8'),
  ]);

  const hoverColor = readCssVariable(cssSource, 'table-row-hover');
  const surfaceColor = readCssVariable(cssSource, 'surface');
  const cardHoverColor = readCssVariable(cssSource, 'card-hover');

  assert.ok(hoverColor, 'expected --table-row-hover to be defined');
  assert.notStrictEqual(hoverColor, surfaceColor);
  assert.notStrictEqual(hoverColor, cardHoverColor);
  assert.match(componentSource, /backgroundColor = 'var\(--table-row-hover\)'/);
});
