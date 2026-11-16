import { READING_BOOKS } from './scripture.js';
import { localDate, validDate, validTimestamp } from './dates.js';

export { READING_BOOKS };
export const PLANS = {
  deuterocanon: { name: 'Deuterocanon', closing: 'michael', description: 'The seven books, plus the Greek additions to Esther and Daniel in their chapter context. Ten Jesus Prayers in each decade; Saint Michael at the close.' },
  gospels: { name: 'The four Gospels', closing: 'memorare', description: 'Matthew, Mark, Luke, and John. Five Jesus Prayers alternating with five Hail Marys in each decade; the Memorare at the close.' },
};
export const COMPANION_PRAYERS = {
  jesus: ['The Jesus Prayer', 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.'],
  michael: ['Saint Michael the Archangel', 'Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.'],
  memorare: ['The Memorare', 'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided. Inspired with this confidence, I fly unto thee, O Virgin of virgins, my Mother. To thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.'],
};
export const booksFor = plan => READING_BOOKS.filter(book => book.plan === plan);
export const chapterFor = (book, chapter) => READING_BOOKS.find(item => item.id === book)?.chapters.find(item => item.number === chapter);
export const firstPosition = plan => ({ book: booksFor(plan)[0].id, chapter: booksFor(plan)[0].chapters[0].number });
const emptyPlan = plan => ({ next: firstPosition(plan), progress: null, completed: [] });
export const emptyReading = () => ({ selectedPlan: 'deuterocanon', deuterocanon: emptyPlan('deuterocanon'), gospels: emptyPlan('gospels') });
export function readingSequence(plan) {
  if (!Object.hasOwn(PLANS, plan)) throw new Error('Unknown reading plan.');
  const steps = [{ prayer: 'cross', decade: 0, bead: 0 }];
  for (let decade = 1; decade <= 5; decade++) {
    steps.push({ prayer: 'reading', decade, bead: 0 }, { prayer: 'father', decade, bead: 0 });
    for (let bead = 1; bead <= 10; bead++) steps.push({ prayer: plan === 'gospels' && bead % 2 === 0 ? 'mary' : 'jesus', decade, bead });
    steps.push({ prayer: 'glory', decade, bead: 0 });
  }
  steps.push({ prayer: PLANS[plan].closing, decade: 0, bead: 0 }, { prayer: 'cross', decade: 0, bead: 0 });
  return steps;
}
export function splitChapter(verses) {
  if (!Array.isArray(verses) || verses.length < 5) throw new Error('A chapter needs at least five verses for this plan.');
  return Array.from({ length: 5 }, (_, i) => verses.slice(Math.floor(i * verses.length / 5), Math.floor((i + 1) * verses.length / 5)));
}
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function validPosition(value, plan) {
  return record(value) && booksFor(plan).some(book => book.id === value.book && book.chapters.some(chapter => chapter.number === value.chapter));
}
export function validateReading(value) {
  const invalid = () => { throw new Error('Invalid Scripture companion progress. No saved data has been changed.'); };
  if (!record(value) || typeof value.selectedPlan !== 'string' || !Object.hasOwn(PLANS, value.selectedPlan)) invalid();
  const result = { selectedPlan: value.selectedPlan };
  for (const plan of Object.keys(PLANS)) {
    const data = value[plan];
    if (!record(data) || (data.next !== null && !validPosition(data.next, plan)) || !Array.isArray(data.completed) || data.completed.length > 235) invalid();
    if (data.progress !== null && (!validPosition(data.progress, plan) || !Number.isInteger(data.progress.step) || data.progress.step < 0 || data.progress.step >= readingSequence(plan).length)) invalid();
    const completed = data.completed.map(item => {
      if (!validPosition(item, plan) || !validDate(item.date) || !validTimestamp(item.completedAt)) invalid();
      return { book: item.book, chapter: item.chapter, date: item.date, completedAt: item.completedAt };
    });
    if (new Set(completed.map(item => `${item.book}:${item.chapter}`)).size !== completed.length) invalid();
    if (data.next === null && completed.length !== booksFor(plan).reduce((sum, book) => sum + book.chapters.length, 0)) invalid();
    result[plan] = {
      next: data.next && { book: data.next.book, chapter: data.next.chapter },
      progress: data.progress && { book: data.progress.book, chapter: data.progress.chapter, step: data.progress.step },
      completed,
    };
  }
  return result;
}
export function nextPosition(position, plan) {
  const positions = booksFor(plan).flatMap(book => book.chapters.map(chapter => ({ book: book.id, chapter: chapter.number })));
  const index = positions.findIndex(item => item.book === position.book && item.chapter === position.chapter);
  if (index < 0) throw new Error('Unknown chapter in this plan.');
  return positions[index + 1] ?? null;
}
export function finishChapter(reading, plan, now = new Date()) {
  const result = validateReading(reading);
  const data = result[plan];
  if (!data?.progress || data.progress.step !== readingSequence(plan).length - 1) throw new Error('Finish this chapter and its prayers before recording completion.');
  const { book, chapter } = data.progress;
  if (!data.completed.some(item => item.book === book && item.chapter === chapter)) data.completed.push({ book, chapter, date: localDate(now), completedAt: now.toISOString() });
  let next = nextPosition(data.progress, plan);
  while (next && data.completed.some(item => item.book === next.book && item.chapter === next.chapter)) next = nextPosition(next, plan);
  data.next = next ?? booksFor(plan).flatMap(book => book.chapters.map(item => ({ book: book.id, chapter: item.number }))).find(position => !data.completed.some(item => item.book === position.book && item.chapter === position.chapter)) ?? null;
  data.progress = null;
  return result;
}
export function mergeReading(current, incoming) {
  const result = validateReading(current);
  const backup = validateReading(incoming);
  if (Object.keys(PLANS).every(plan => !result[plan].progress && result[plan].completed.length === 0 && result[plan].next?.book === firstPosition(plan).book && result[plan].next?.chapter === firstPosition(plan).chapter)) result.selectedPlan = backup.selectedPlan;
  for (const plan of Object.keys(PLANS)) {
    const data = result[plan];
    for (const item of backup[plan].completed) if (!data.completed.some(existing => existing.book === item.book && existing.chapter === item.chapter)) data.completed.push(item);
    if (!data.progress && backup[plan].progress) {
      data.progress = backup[plan].progress;
      data.next = backup[plan].next;
    } else if (!data.progress && current[plan].completed.length === 0 && current[plan].next?.book === firstPosition(plan).book && current[plan].next?.chapter === 1) {
      data.next = backup[plan].next;
    }
  }
  return validateReading(result);
}
