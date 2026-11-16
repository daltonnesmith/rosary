import { PRAYERS } from './core.js';
import { PLANS, READING_BOOKS, COMPANION_PRAYERS, booksFor, chapterFor, firstPosition, readingSequence, splitChapter, finishChapter } from './reading.js';

export function createReadingCompanion({ getState, commit, notify, confirmChange }) {
  const $ = selector => document.querySelector(selector);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let completion = null;
  let reviewKey = '';
  const save = reading => commit({ ...getState(), reading });
  const setPlanData = (reading, plan, data) => ({ ...reading, [plan]: { ...reading[plan], ...data } });
  function verseNodes(verses) {
    return verses.map(verse => {
      const paragraph = make('p');
      paragraph.append(make('sup', `${verse.number} `, 'verse-number'), document.createTextNode(verse.text));
      return paragraph;
    });
  }
  function render(focus = false) {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    const data = reading[plan];
    const position = data.progress ?? data.next ?? firstPosition(plan);
    const book = READING_BOOKS.find(item => item.id === position.book);
    const chapter = chapterFor(position.book, position.chapter);
    const steps = readingSequence(plan);
    const index = data.progress?.step ?? 0;
    const step = steps[index];
    const done = completion?.plan === plan;
    const part = step.decade ? splitChapter(chapter.verses)[step.decade - 1] : [];
    $('#reading-plan').value = plan;
    $('#reading-description').textContent = PLANS[plan].description;
    $('#reading-book').replaceChildren(...booksFor(plan).map(item => {
      const option = make('option', item.name);
      option.value = item.id;
      return option;
    }));
    $('#reading-book').value = book.id;
    $('#reading-chapter').replaceChildren(...book.chapters.map(item => {
      const alreadyDone = data.completed.some(entry => entry.book === book.id && entry.chapter === item.number);
      const option = make('option', `Chapter ${item.number}${alreadyDone ? ' · complete' : ''}`);
      option.value = String(item.number);
      return option;
    }));
    $('#reading-chapter').value = String(chapter.number);
    $('#reading-book').disabled = !!data.progress;
    $('#reading-chapter').disabled = !!data.progress;
    $('.reading-sidebar').classList.toggle('reading-active', !!data.progress);
    $('#reading-change').hidden = !data.progress;
    $('#reading-book-note').textContent = book.note;
    const total = booksFor(plan).reduce((sum, item) => sum + item.chapters.length, 0);
    $('#reading-total').textContent = `${data.completed.length} of ${total} chapters complete`;
    $('#reading-total-bar').value = data.completed.length / total * 100;
    $('#reading-books').replaceChildren(...booksFor(plan).map(item => {
      const count = data.completed.filter(entry => entry.book === item.id).length;
      const row = make('div', undefined, 'book-progress-row');
      const label = make('p', `${item.name} · ${count}/${item.chapters.length}${count === item.chapters.length ? ' · complete' : ''}`);
      const bar = make('progress');
      bar.max = item.chapters.length;
      bar.value = count;
      bar.setAttribute('aria-label', `${item.name}: ${count} of ${item.chapters.length} chapters completed`);
      row.append(label, bar);
      return row;
    }));
    $('#reading-phase').textContent = done ? 'CHAPTER COMPLETE' : step.decade ? `Decade ${step.decade} of 5` : index === 0 ? 'BEGIN IN PEACE' : 'CLOSING PRAYERS';
    $('#reading-step-count').textContent = done ? 'Well done' : `Step ${index + 1} of ${steps.length}`;
    $('#reading-reference').textContent = done ? `${completion.bookName} ${completion.chapter}` : `${book.name} ${chapter.number}${part.length ? `:${part[0].number}–${part.at(-1).number}` : ''}`;
    $('#reading-verses').hidden = step.prayer !== 'reading' || done;
    $('#reading-prayer').hidden = step.prayer === 'reading' && !done;
    $('#reading-verses').replaceChildren(...verseNodes(part));
    if (done) {
      $('#reading-title').textContent = 'A little further in the Word.';
      $('#reading-prayer').textContent = completion.saved ? 'Your chapter and prayers are saved. Rest here, or continue when you are ready.' : 'Your chapter and prayers are complete in this tab, but could not be saved. Export a journal backup before closing.';
    } else if (step.prayer === 'reading') {
      $('#reading-title').textContent = `Reading ${step.decade} of 5`;
      $('#reading-prayer').textContent = '';
    } else {
      const prayer = COMPANION_PRAYERS[step.prayer] ?? PRAYERS[step.prayer];
      $('#reading-title').textContent = prayer[0];
      $('#reading-prayer').textContent = prayer[1];
    }
    $('#reading-review').hidden = !step.decade || step.prayer === 'reading' || done;
    const key = `${plan}-${book.id}-${chapter.number}-${step.decade}`;
    if (reviewKey !== key) $('#reading-review').open = false;
    reviewKey = key;
    $('#reading-review-verses').replaceChildren(...verseNodes(part));
    $('#reading-beads').hidden = !step.bead || done;
    $('#reading-beads').replaceChildren(...Array.from({ length: 10 }, (_, i) => make('span', '', `bead${step.bead === i + 1 ? ' active' : ''}${step.bead > i + 1 ? ' passed' : ''}`)));
    const percent = done ? 100 : data.progress ? Math.round(index / steps.length * 100) : 0;
    $('#reading-progress').value = percent;
    $('#reading-progress-label').textContent = done ? 'Chapter and prayers completed' : step.bead ? `Prayer bead ${step.bead} of 10` : step.prayer === 'reading' ? 'Read at your own pace' : 'One prayer at a time';
    $('#reading-percent').textContent = `${percent}%`;
    $('#reading-back').disabled = !data.progress || index === 0;
    $('#reading-next').disabled = !data.progress && !data.next;
    $('#reading-next').textContent = !data.progress && !data.next ? 'Plan complete ✓' : done ? 'Continue to next chapter →' : !data.progress ? 'Begin chapter →' : index === steps.length - 1 ? 'Complete chapter ✓' : step.prayer === 'reading' ? 'I’ve read this →' : 'Next prayer →';
    if (focus) {
      const heading = $('#reading-title');
      heading.focus({ preventScroll: true });
      if (heading.getBoundingClientRect().top < 20 || heading.getBoundingClientRect().bottom > innerHeight - 30) heading.scrollIntoView({ block: 'center' });
    }
  }
  $('#reading-plan').addEventListener('change', event => {
    const reading = getState().reading;
    completion = null;
    save({ ...reading, selectedPlan: event.target.value });
    render();
  });
  $('#reading-book').addEventListener('change', event => {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    const book = booksFor(plan).find(item => item.id === event.target.value);
    const chapter = book.chapters.find(item => !reading[plan].completed.some(entry => entry.book === book.id && entry.chapter === item.number)) ?? book.chapters[0];
    completion = null;
    save(setPlanData(reading, plan, { next: { book: book.id, chapter: chapter.number } }));
    render();
  });
  $('#reading-chapter').addEventListener('change', event => {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    completion = null;
    save(setPlanData(reading, plan, { next: { book: $('#reading-book').value, chapter: Number(event.target.value) } }));
    render();
  });
  $('#reading-next').addEventListener('click', () => {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    const data = reading[plan];
    if (!data.progress) {
      if (!data.next) return;
      completion = null;
      save(setPlanData(reading, plan, { progress: { ...data.next, step: 0 } }));
    } else if (data.progress.step === readingSequence(plan).length - 1) {
      const bookName = READING_BOOKS.find(book => book.id === data.progress.book).name;
      const next = finishChapter(reading, plan);
      const saved = save(next);
      completion = { plan, bookName, chapter: data.progress.chapter, saved };
      notify(saved ? `${bookName} ${data.progress.chapter} completed and saved. Your rosary history is unchanged.` : 'Chapter completed only in this tab. Export a journal backup before closing.');
    } else save(setPlanData(reading, plan, { progress: { ...data.progress, step: data.progress.step + 1 } }));
    render(true);
  });
  $('#reading-back').addEventListener('click', () => {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    if (!reading[plan].progress || reading[plan].progress.step === 0) return;
    save(setPlanData(reading, plan, { progress: { ...reading[plan].progress, step: reading[plan].progress.step - 1 } }));
    render(true);
  });
  $('#reading-change').addEventListener('click', async () => {
    if (!await confirmChange({ title: 'Choose another chapter?', message: 'Only this companion’s unfinished chapter position will be cleared. Completed chapters, book progress, the other companion, your traditional rosary, and all notes will be kept.', confirmLabel: 'Choose another chapter', cancelLabel: 'Keep my place' })) return;
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    const { book, chapter } = reading[plan].progress;
    save(setPlanData(reading, plan, { progress: null, next: { book, chapter } }));
    completion = null;
    render();
  });
  document.addEventListener('keydown', event => {
    if ($('#scripture').hidden || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      $(event.key === 'ArrowLeft' ? '#reading-back' : '#reading-next').click();
    }
  });
  return { render, resetView() { completion = null; render(); } };
}
