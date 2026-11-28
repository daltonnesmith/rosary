import { copyFile, mkdir } from 'node:fs/promises';

const shared = new URL('./shared/', import.meta.url);
await mkdir(shared, { recursive: true });
for (const name of ['core', 'dates', 'reading', 'scripture', 'mystery-passages', 'liturgical', 'liturgical-data', 'fasting']) {
  await copyFile(new URL(`../src/${name}.js`, import.meta.url), new URL(`${name}.js`, shared));
}
