import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const indexHtmlPath = new URL('../index.html', import.meta.url);
const faviconSvgPath = new URL('../public/favicon.svg', import.meta.url);
const safariPinnedTabPath = new URL('../public/safari-pinned-tab.svg', import.meta.url);

test('index.html links the favicon, apple touch icon, and safari mask icon assets', async () => {
  const html = await readFile(indexHtmlPath, 'utf8');

  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
  assert.match(html, /<link rel="icon" href="\/favicon\.ico" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
  assert.match(html, /<link rel="mask-icon" href="\/safari-pinned-tab\.svg" color="#111111" \/>/);
});

test('favicon.svg and safari-pinned-tab.svg are monochrome 16x16 SVGs', async () => {
  const faviconSvg = await readFile(faviconSvgPath, 'utf8');
  const safariPinnedTabSvg = await readFile(safariPinnedTabPath, 'utf8');

  for (const source of [faviconSvg, safariPinnedTabSvg]) {
    assert.match(source, /viewBox="0 0 16 16"/);
    assert.match(source, /<path[^>]+fill="#000"/);
    assert.doesNotMatch(source, /<(?:g|mask|filter|linearGradient|radialGradient)\b/);
  }
});
