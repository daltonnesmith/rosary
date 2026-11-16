import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
test('production build includes a subpath-safe offline shell and real raster install icons', async () => {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const read = file => readFile(new URL(`dist/${file}`, root));
  const manifest = JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.id, './');
  for (const [file, size] of [['icons/icon-192.png', 192], ['icons/icon-512.png', 512], ['icons/apple-touch-icon.png', 180]]) {
    const png = await read(file);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    let offset = 8;
    const compressed = [];
    while (offset < png.length) {
      const length = png.readUInt32BE(offset);
      const type = png.toString('ascii', offset + 4, offset + 8);
      if (type === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + length));
      offset += 12 + length;
    }
    assert.equal(inflateSync(Buffer.concat(compressed)).length, (size * 3 + 1) * size);
  }
  const worker = (await read('sw.js')).toString();
  const paths = [...worker.matchAll(/'\.\/([^']*)'/g)].map(match => match[1] || 'index.html');
  assert.ok(paths.length >= 10);
  for (const file of paths) await read(file);
  const html = (await read('index.html')).toString();
  assert.ok(!/(?:src|href)="\/(?!\/)/.test(html), 'No root-absolute assets that break repository hosting');
  assert.ok(!/https?:\/\//.test(html), 'No external asset requests');
});
