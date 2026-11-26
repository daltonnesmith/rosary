import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { icon } from './icons.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'dist');
for (const dir of ['', 'src', 'icons']) await mkdir(path.join(out, dir), { recursive: true });
for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'SCRIPTURE-LICENSE.txt', 'CALENDAR-LICENSE.txt', 'NATIVE-LICENSE.txt', 'APACHE-2.0.txt', 'src/style.css', 'src/core.js', 'src/app.js', 'src/dates.js', 'src/platform.js', 'src/rosary-ui.js', 'src/reading.js', 'src/reading-ui.js', 'src/scripture.js', 'src/liturgical.js', 'src/liturgical-ui.js', 'src/liturgical-data.js', 'icons/icon.svg']) {
  await copyFile(path.join(root, file), path.join(out, file));
}
await copyFile(path.join(root, 'src/mystery-passages.js'), path.join(out, 'src/mystery-passages.js'));
for (const [size, filename] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) await writeFile(path.join(out, 'icons', filename), icon(size));
console.log('Built dependency-free PWA in dist, including install icons.');
