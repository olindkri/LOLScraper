import assert from 'node:assert/strict';
import test from 'node:test';
import { stat } from 'node:fs/promises';

const appleTouchIconPath = new URL('../public/apple-touch-icon.png', import.meta.url);
const faviconIcoPath = new URL('../public/favicon.ico', import.meta.url);

test('generated raster favicon assets exist and are not empty', async () => {
  const [appleTouchIcon, faviconIco] = await Promise.all([
    stat(appleTouchIconPath),
    stat(faviconIcoPath),
  ]);

  assert.ok(appleTouchIcon.size > 0);
  assert.ok(faviconIco.size > 0);
});
