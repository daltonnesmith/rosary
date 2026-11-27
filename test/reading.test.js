import test from 'node:test';
import assert from 'node:assert/strict';
import { READING_BOOKS, PLANS, emptyReading, booksFor, chapterFor, firstPosition, readingSequence, splitChapter, validateReading, nextPosition, finishChapter, mergeReading } from '../src/reading.js';
import { emptyState, validateState, mergeBackup, parseBackup, localDate } from '../src/core.js';
import { SCRIPTURE_SOURCE } from '../src/scripture.js';
import { selectBook } from '../src/reading.js';

const now = new Date(2026, 10, 17, 0, 5);
const stamp = now.toISOString();
const entry = (book = 'TOB', chapter = 1) => ({ book, chapter, date: localDate(now), completedAt: stamp });
function underway(plan = 'deuterocanon', book = 'TOB', chapter = 1, step = 0) {
  const reading = emptyReading();
  reading.selectedPlan = plan;
  reading[plan].progress = { book, chapter, step };
  return reading;
}
test('switching books across and within collections restores individual beads after backup', () => {
  let r = underway('gospels', 'MAR', 3, 31);
  r = selectBook(r, 'LUK');
  r.gospels.progress = {book:'LUK', chapter:1, step:4};
  r = selectBook(r, 'TOB');
  r.deuterocanon.progress = {book:'TOB', chapter:1, step:12};
  r = mergeReading(emptyReading(), parseBackup(JSON.stringify({...emptyState(), reading:r})).reading);
  assert.equal(selectBook(r, 'MAR').gospels.progress.step, 31);
  assert.equal(selectBook(r, 'LUK').gospels.progress.step, 4);
  assert.equal(selectBook(r, 'TOB').deuterocanon.progress.step, 12);
  assert.equal(r.gospels.completed.length, 0);
  r.gospels.bookmarks.MAR.step = 68;
  assert.throws(() => validateReading(r), /Invalid Scripture/);
});
test('bundled modern public-domain readings contain every selected book and Gospel in order', () => {
  assert.deepEqual(booksFor('deuterocanon').map(book => book.id), ['TOB', 'JDT', 'ESG', '1MA', '2MA', 'WIS', 'SIR', 'BAR', 'DNG']);
  assert.deepEqual(booksFor('gospels').map(book => book.id), ['MAT', 'MAR', 'LUK', 'JOH']);
  assert.equal(booksFor('deuterocanon').reduce((n, book) => n + book.chapters.length, 0), 146);
  assert.equal(booksFor('gospels').reduce((n, book) => n + book.chapters.length, 0), 89);
  assert.deepEqual(READING_BOOKS.find(book => book.id === 'ESG').chapters.map(chapter => chapter.number), [1, 3, 4, 5, 8, 10]);
  assert.deepEqual(READING_BOOKS.find(book => book.id === 'DNG').chapters.map(chapter => chapter.number), [3, 13, 14]);
  assert.equal(chapterFor('BAR', 6).verses.length, 73);
  assert.match(SCRIPTURE_SOURCE.translation, /public domain/);
  assert.match(SCRIPTURE_SOURCE.source, /^https:\/\/ebible.org\//);
});
test('all 235 chapters divide into five nonempty readings without omitting, repeating or altering verses', () => {
  for (const book of READING_BOOKS) {
    for (const chapter of book.chapters) {
      const parts = splitChapter(chapter.verses);
      assert.equal(parts.length, 5);
      assert.ok(parts.every(part => part.length > 0));
      assert.deepEqual(parts.flat(), chapter.verses, `${book.id} ${chapter.number}`);
      assert.ok(chapter.verses.every(verse => Number.isInteger(verse.number) && verse.text.trim()));
      assert.equal(new Set(chapter.verses.map(verse => verse.number)).size, chapter.verses.length);
    }
  }
});
test('each companion interleaves five readings, Our Fathers and Glory Bes with the agreed fifty prayers', () => {
  for (const plan of Object.keys(PLANS)) {
    const steps = readingSequence(plan);
    assert.equal(steps.length, 68);
    assert.equal(steps[0].prayer, 'cross');
    assert.equal(steps.at(-1).prayer, 'cross');
    assert.equal(steps.at(-2).prayer, plan === 'gospels' ? 'memorare' : 'michael');
    for (let decade = 1; decade <= 5; decade++) {
      const section = steps.filter(step => step.decade === decade);
      assert.deepEqual(section.slice(0, 2).map(step => step.prayer), ['reading', 'father']);
      assert.equal(section.at(-1).prayer, 'glory');
      assert.deepEqual(section.filter(step => step.bead).map(step => step.bead), [1,2,3,4,5,6,7,8,9,10]);
      assert.equal(section.filter(step => step.prayer === 'jesus').length, plan === 'gospels' ? 5 : 10);
      assert.equal(section.filter(step => step.prayer === 'mary').length, plan === 'gospels' ? 5 : 0);
    }
  }
});
test('finishing requires explicit completion after the last prayer and never changes the other companion', () => {
  const reading = underway();
  reading.gospels.progress = { book: 'MAT', chapter: 4, step: 10 };
  assert.throws(() => finishChapter(reading, 'deuterocanon', now), /Finish this chapter/);
  reading.deuterocanon.progress.step = 67;
  const result = finishChapter(reading, 'deuterocanon', now);
  assert.deepEqual(result.deuterocanon.completed, [entry()]);
  assert.equal(result.deuterocanon.progress, null);
  assert.deepEqual(result.deuterocanon.next, { book: 'TOB', chapter: 2 });
  assert.deepEqual(result.gospels, reading.gospels);
  assert.equal(reading.deuterocanon.completed.length, 0);
  assert.throws(() => finishChapter(result, 'deuterocanon'), /Finish this chapter/);
  result.deuterocanon.progress = { book: 'TOB', chapter: 1, step: 67 };
  assert.equal(finishChapter(result, 'deuterocanon', now).deuterocanon.completed.length, 1);
});
test('chapter advancement respects sparse additions, book boundaries, and the end of each plan', () => {
  assert.deepEqual(nextPosition({ book: 'TOB', chapter: 14 }, 'deuterocanon'), { book: 'JDT', chapter: 1 });
  assert.deepEqual(nextPosition({ book: 'ESG', chapter: 1 }, 'deuterocanon'), { book: 'ESG', chapter: 3 });
  assert.deepEqual(nextPosition({ book: 'DNG', chapter: 3 }, 'deuterocanon'), { book: 'DNG', chapter: 13 });
  assert.equal(nextPosition({ book: 'DNG', chapter: 14 }, 'deuterocanon'), null);
  assert.deepEqual(nextPosition({ book: 'MAT', chapter: 28 }, 'gospels'), { book: 'MAR', chapter: 1 });
  assert.equal(nextPosition({ book: 'JOH', chapter: 21 }, 'gospels'), null);
});
test('v1 data migrates without changing rosary progress, notes or completion history', () => {
  const old = { version: 1, progress: { set: 'joyful', fatima: true, step: 23, startedAt: stamp }, completions: [{ id: 'existing', date: localDate(now), mystery: 'joyful', completedAt: stamp }], notes: [{ id: 'note', date: localDate(now), text: 'Preserved', updatedAt: stamp }], fatima: true };
  const migrated = validateState(old);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.progress, old.progress);
  assert.deepEqual(migrated.completions, old.completions);
  assert.deepEqual(migrated.notes, old.notes);
  assert.deepEqual(migrated.reading, emptyReading());
  assert.deepEqual(parseBackup(JSON.stringify(old)), migrated);
});
test('book/chapter/bead resumption survives backups and rejects wrong-plan or out-of-range data', () => {
  const state = { ...emptyState(), reading: underway('gospels', 'LUK', 12, 26) };
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  for (const invalid of [
    { ...state.reading, selectedPlan: '__proto__' },
    { ...state.reading, gospels: { ...state.reading.gospels, progress: { book: 'TOB', chapter: 1, step: 0 } } },
    { ...state.reading, gospels: { ...state.reading.gospels, progress: { book: 'LUK', chapter: 99, step: 0 } } },
    { ...state.reading, gospels: { ...state.reading.gospels, progress: { book: 'LUK', chapter: 1, step: 68 } } },
    { ...state.reading, deuterocanon: { ...state.reading.deuterocanon, next: { book: 'ESG', chapter: 2 } } },
    { ...state.reading, deuterocanon: { ...state.reading.deuterocanon, completed: [entry(), entry()] } },
    { ...state.reading, deuterocanon: { ...state.reading.deuterocanon, next: null } },
  ]) assert.throws(() => validateReading(invalid), /Invalid Scripture/);
});
test('import merges chapter completions and protects both current prayer positions', () => {
  const current = underway('deuterocanon', 'TOB', 8, 24);
  current.deuterocanon.completed = [entry()];
  const incoming = underway('deuterocanon', 'JDT', 2, 17);
  incoming.deuterocanon.completed = [entry('JDT', 1)];
  incoming.gospels.progress = { book: 'MAR', chapter: 3, step: 12 };
  const result = mergeReading(current, incoming);
  assert.equal(result.deuterocanon.completed.length, 2);
  assert.deepEqual(result.deuterocanon.progress, current.deuterocanon.progress);
  assert.deepEqual(result.gospels.progress, incoming.gospels.progress);
  assert.deepEqual(mergeReading(result, incoming), result);
  const state = { ...emptyState(), reading: result };
  const legacy = { version: 1, progress: null, completions: [], notes: [], fatima: true };
  assert.deepEqual(mergeBackup(state, legacy).reading, result);
});
test('opening a later book never implies that earlier chapters have been completed', () => {
  const reading = underway('gospels', 'JOH', 21, 67);
  const result = finishChapter(reading, 'gospels', now);
  assert.equal(result.gospels.completed.length, 1);
  assert.deepEqual(result.gospels.next, {book:'JOH', chapter:1});
  assert.deepEqual(firstPosition('deuterocanon'), { book: 'TOB', chapter: 1 });
});
test('only completing every actual chapter finishes a plan, including when chapters were read out of order', () => {
  const reading = underway('gospels', 'JOH', 21, 67);
  reading.gospels.completed = booksFor('gospels').flatMap(book => book.chapters.map(chapter => entry(book.id, chapter.number))).filter(item => !(item.book === 'JOH' && item.chapter === 21));
  const result = finishChapter(reading, 'gospels', now);
  assert.equal(result.gospels.next, null);
  assert.equal(result.gospels.completed.length, 89);
  const restored = mergeReading(emptyReading(), underway('gospels', 'LUK', 4, 8));
  assert.equal(restored.selectedPlan, 'gospels');
});
