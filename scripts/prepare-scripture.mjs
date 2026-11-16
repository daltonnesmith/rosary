import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

if (!process.argv[2]) throw new Error('Provide the extracted eng-web-c_vpl.txt source file path.');
const source = await readFile(process.argv[2], 'utf8');
const definitions = [
  ['TOB', 'Tobit', 'deuterocanon', 14],
  ['JDT', 'Judith', 'deuterocanon', 16],
  ['ESG', 'Esther additions', 'deuterocanon', [1, 3, 4, 5, 8, 10]],
  ['1MA', '1 Maccabees', 'deuterocanon', 16],
  ['2MA', '2 Maccabees', 'deuterocanon', 15],
  ['WIS', 'Wisdom', 'deuterocanon', 19],
  ['SIR', 'Sirach', 'deuterocanon', 51],
  ['BAR', 'Baruch', 'deuterocanon', 6],
  ['DNG', 'Daniel additions', 'deuterocanon', [3, 13, 14]],
  ['MAT', 'Matthew', 'gospels', 28],
  ['MAR', 'Mark', 'gospels', 16],
  ['LUK', 'Luke', 'gospels', 24],
  ['JOH', 'John', 'gospels', 21],
];
const books = definitions.map(([id, name, plan, chapters]) => ({
  id, name, plan,
  note: id === 'ESG' ? 'Greek additions in their chapter context: Esther 1, 3, 4, 5, 8, and 10. These are complete chapters of the Greek edition, not the entire book of Esther.'
    : id === 'DNG' ? 'The additions in context: Daniel 3 (including the Prayer of Azariah and Song of the Three), 13 (Susanna), and 14 (Bel and the Dragon).'
      : id === 'BAR' ? 'Includes the Letter of Jeremiah as chapter 6.' : '',
  chapters: (Array.isArray(chapters) ? chapters : Array.from({ length: chapters }, (_, i) => i + 1)).map(number => ({ number, verses: [] })),
}));
for (const line of source.split(/\r?\n/)) {
  const match = /^([A-Z0-9]{3}) (\d+):(\d+) (.*)$/.exec(line);
  if (!match) continue;
  const book = books.find(item => item.id === match[1]);
  const chapter = book?.chapters.find(item => item.number === Number(match[2]));
  if (chapter && match[3] !== '0' && match[4].trim()) chapter.verses.push({ number: Number(match[3]), text: match[4].trim() });
}
for (const book of books) {
  for (const chapter of book.chapters) {
    if (chapter.verses.length < 5) throw new Error(`Missing or unexpectedly short chapter: ${book.id} ${chapter.number}`);
    chapter.verses.sort((a, b) => a.number - b.number);
    if (new Set(chapter.verses.map(verse => verse.number)).size !== chapter.verses.length) throw new Error(`Duplicate verse: ${book.id} ${chapter.number}`);
  }
}
const provenance = {
  translation: 'World English Bible, Catholic Edition (public domain)',
  source: 'https://ebible.org/Scriptures/eng-web-c_vpl.zip',
  license: 'https://ebible.org/eng-web-c/copyright.htm',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  note: 'Verbatim nonempty verse text from the official VPL export. Verse numbers, brackets, and spelling follow this edition. Footnotes and empty verse entries are not included.',
};
await writeFile(new URL('../src/scripture.js', import.meta.url), `// Generated from the official public-domain source by scripts/prepare-scripture.mjs.\nexport const SCRIPTURE_SOURCE = ${JSON.stringify(provenance, null, 2)};\nexport const READING_BOOKS = ${JSON.stringify(books, null, 2)};\n`);
console.log(`Prepared ${books.length} books/collections and ${books.reduce((sum, book) => sum + book.chapters.length, 0)} chapters.`);
