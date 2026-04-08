import assert from 'node:assert/strict';
import test from 'node:test';
import { access, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CHAMPION_CATALOG } from './catalog.js';

const PUBLIC_CHAMPION_DIR = new URL('../../public/champions/', import.meta.url);
const SYNC_SCRIPT_PATH = fileURLToPath(new URL('../../../scripts/sync_champion_assets.py', import.meta.url));

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertChampionShape(champion) {
  assert.equal(typeof champion, 'object');
  assert.ok(champion, 'expected champion entry to be an object');
  assert.deepEqual(Object.keys(champion).sort(), ['imageUrl', 'name', 'slug']);
  assert.equal(typeof champion.name, 'string');
  assert.equal(typeof champion.slug, 'string');
  assert.equal(typeof champion.imageUrl, 'string');
  assert.ok(champion.name.length > 0);
  assert.ok(champion.slug.length > 0);
  assert.match(champion.imageUrl, /^\/champions\/[^/]+\.png$/);
}

test('champion catalog includes expected Riot slugs and hosted image URLs', async () => {
  assert.equal(CHAMPION_CATALOG.length, 172);

  const bySlug = new Map();
  const imageUrls = new Set();

  for (const champion of CHAMPION_CATALOG) {
    assertChampionShape(champion);
    assert.equal(bySlug.has(champion.slug), false, `duplicate slug: ${champion.slug}`);
    assert.equal(imageUrls.has(champion.imageUrl), false, `duplicate image URL: ${champion.imageUrl}`);
    bySlug.set(champion.slug, champion);
    imageUrls.add(champion.imageUrl);

    const imagePath = new URL(basename(champion.imageUrl), PUBLIC_CHAMPION_DIR);
    assert.equal(await fileExists(imagePath), true, `missing image for ${champion.slug}`);
  }

  assert.deepEqual(bySlug.get('Belveth'), {
    name: "Bel'Veth",
    slug: 'Belveth',
    imageUrl: '/champions/Belveth.png',
  });

  assert.deepEqual(bySlug.get('MonkeyKing'), {
    name: 'Wukong',
    slug: 'MonkeyKing',
    imageUrl: '/champions/MonkeyKing.png',
  });

  assert.deepEqual(bySlug.get('AurelionSol'), {
    name: 'Aurelion Sol',
    slug: 'AurelionSol',
    imageUrl: '/champions/AurelionSol.png',
  });
});

test('sync script validates before mutating destination assets', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'lolscraper-sync-test-'));
  const sourceDir = join(tempRoot, 'source');
  const outputDir = join(tempRoot, 'output');
  const catalogFile = join(tempRoot, 'catalog.js');

  await mkdir(join(sourceDir, 'champion-icons'), { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(sourceDir, 'champion-icons', 'Alpha.png'), 'alpha');
  await writeFile(join(sourceDir, 'champion-icons', 'Omega.png'), 'omega');

  await writeFile(
    join(sourceDir, 'lol-champion-images.json'),
    JSON.stringify(
      {
        champions: [
          { name: 'Alpha', slug: 'Alpha' },
          { name: 'Beta', slug: 'Beta', imageFile: 'Beta.png' },
        ],
      },
      null,
      2,
    ),
  );
  await writeFile(join(outputDir, 'sentinel.png'), 'keep-me');

  const python = `
import importlib.util
import os
import pathlib
import sys

spec = importlib.util.spec_from_file_location("sync_champion_assets", ${JSON.stringify(SYNC_SCRIPT_PATH)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PUBLIC_DIR = pathlib.Path(os.environ["SYNC_PUBLIC_DIR"])
module.CATALOG_FILE = pathlib.Path(os.environ["SYNC_CATALOG_FILE"])
sys.argv = [sys.argv[0], sys.argv[1]]
try:
    module.main()
except Exception as exc:
    print(type(exc).__name__, exc)
    raise
`;

  const result = spawnSync('python3', ['-c', python, sourceDir], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SYNC_PUBLIC_DIR: outputDir,
      SYNC_CATALOG_FILE: catalogFile,
    },
  });

  assert.notEqual(result.status, 0, 'expected sync to fail on malformed manifest');
  assert.equal(await fileExists(join(outputDir, 'sentinel.png')), true, 'destination file was deleted');
  assert.equal(await fileExists(catalogFile), false, 'catalog file should not be written on failure');
  assert.match(result.stderr, /ValueError: champion at index 0 is missing a valid "imageFile"/);
});

test('sync script rejects duplicate slugs before mutating destination assets', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'lolscraper-sync-test-'));
  const sourceDir = join(tempRoot, 'source');
  const outputDir = join(tempRoot, 'output');
  const catalogFile = join(tempRoot, 'catalog.js');

  await mkdir(join(sourceDir, 'champion-icons'), { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(sourceDir, 'champion-icons', 'Alpha.png'), 'alpha');
  await writeFile(join(sourceDir, 'champion-icons', 'Beta.png'), 'beta');

  await writeFile(
    join(sourceDir, 'lol-champion-images.json'),
    JSON.stringify(
      {
        champions: [
          { name: 'Alpha', slug: 'Alpha', imageFile: 'Alpha.png' },
          { name: 'Omega', slug: 'Alpha', imageFile: 'Omega.png' },
        ],
      },
      null,
      2,
    ),
  );
  await writeFile(join(outputDir, 'sentinel.png'), 'keep-me');

  const python = `
import importlib.util
import os
import pathlib
import sys

spec = importlib.util.spec_from_file_location("sync_champion_assets", ${JSON.stringify(SYNC_SCRIPT_PATH)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PUBLIC_DIR = pathlib.Path(os.environ["SYNC_PUBLIC_DIR"])
module.CATALOG_FILE = pathlib.Path(os.environ["SYNC_CATALOG_FILE"])
sys.argv = [sys.argv[0], sys.argv[1]]
try:
    module.main()
except Exception as exc:
    print(type(exc).__name__, exc)
    raise
`;

  const result = spawnSync('python3', ['-c', python, sourceDir], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SYNC_PUBLIC_DIR: outputDir,
      SYNC_CATALOG_FILE: catalogFile,
    },
  });

  assert.notEqual(result.status, 0, 'expected sync to fail on duplicate slugs');
  assert.equal(await fileExists(join(outputDir, 'sentinel.png')), true, 'destination file was deleted');
  assert.equal(await fileExists(catalogFile), false, 'catalog file should not be written on failure');
  assert.match(result.stderr, /ValueError: duplicate champion slug: Alpha/);
});
