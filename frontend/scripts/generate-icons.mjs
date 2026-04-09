import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const toIco = require('to-ico');

const faviconSvgPath = new URL('../public/favicon.svg', import.meta.url);
const appleTouchIconPath = new URL('../public/apple-touch-icon.png', import.meta.url);
const faviconIcoPath = new URL('../public/favicon.ico', import.meta.url);

const faviconSvg = await readFile(faviconSvgPath);

const icoPngBuffers = await Promise.all(
  [16, 32, 48].map((size) =>
    sharp(faviconSvg, { density: 1024 })
      .resize(size, size)
      .png()
      .toBuffer(),
  ),
);

const appleTouchIcon = await sharp(faviconSvg, { density: 1024 })
  .resize(180, 180)
  .flatten({ background: '#ffffff' })
  .png()
  .toBuffer();

await writeFile(appleTouchIconPath, appleTouchIcon);
await writeFile(faviconIcoPath, await toIco(icoPngBuffers));

console.log('Generated favicon.ico and apple-touch-icon.png');
