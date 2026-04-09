import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const recordsStripPath = new URL('./RecordsStrip.jsx', import.meta.url);

test('RecordsStrip defines LOWEST W/R between WIN RATE and PEAK RANK', async () => {
  const source = await readFile(recordsStripPath, 'utf8');

  const winRateIndex = source.indexOf("label: 'WIN RATE'");
  const lowestIndex = source.indexOf("label: 'LOWEST W/R'");
  const peakRankIndex = source.indexOf("label: 'PEAK RANK'");

  assert.notStrictEqual(lowestIndex, -1, 'expected LOWEST W/R entry to exist');
  assert.ok(winRateIndex < lowestIndex, 'expected LOWEST W/R after WIN RATE');
  assert.ok(lowestIndex < peakRankIndex, 'expected LOWEST W/R before PEAK RANK');

  assert.match(source, /key:\s*'lowestWinRate'/);
  assert.match(source, /color:\s*'var\(--loss\)'/);
  assert.match(source, /Math\.round\(r\.value \* 100\)/);
});
