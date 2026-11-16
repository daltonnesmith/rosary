import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

if (!process.argv[2]) throw new Error('Usage: node scripts/inspect-apk.mjs path-to-apk');
const apk = path.resolve(process.argv[2]);
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll(path.sep, '/'));
const entries = execFileSync('jar', ['tf', apk], { encoding: 'utf8' }).split(/\r?\n/);
for (const required of ['AndroidManifest.xml', 'classes.dex', 'assets/capacitor.config.json']) assert.ok(entries.includes(required), required);
for (const file of files) assert.ok(entries.includes(`assets/public/${file}`), `Missing bundled asset: ${file}`);
const temporary = await mkdtemp(path.join(tmpdir(), 'stillwater-apk-check-'));
try {
  execFileSync('jar', ['xf', apk, 'assets/capacitor.config.json', ...files.map(file => `assets/public/${file}`)], { cwd: temporary });
  const config = JSON.parse(await readFile(path.join(temporary, 'assets', 'capacitor.config.json'), 'utf8'));
  assert.equal(config.appId, 'io.github.daltonnesmith.stillwater.test');
  assert.equal(config.server?.url, undefined, 'The APK must not depend on a hosted website');
  for (const file of files) {
    assert.deepEqual(await readFile(path.join(temporary, 'assets', 'public', file)), await readFile(path.join(root, file)), `APK asset differs from the verified web build: ${file}`);
  }
  console.log(JSON.stringify({ apk: path.basename(apk), package: config.appId, bundledAssets: files.length, byteIdenticalAssets: true, remoteServer: false, sha256: createHash('sha256').update(await readFile(apk)).digest('hex') }, null, 2));
} finally {
  await rm(temporary, { recursive: true });
}
