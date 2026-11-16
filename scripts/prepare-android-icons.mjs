import { mkdir, writeFile } from 'node:fs/promises';
import { icon } from './icons.mjs';

for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const directory = new URL(`../android/app/src/main/res/mipmap-${density}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('ic_launcher.png', directory), icon(size));
  await writeFile(new URL('ic_launcher_round.png', directory), icon(size));
  await writeFile(new URL('ic_launcher_foreground.png', directory), icon(size * 108 / 48));
}
console.log('Prepared original Stillwater Android launcher icons.');
