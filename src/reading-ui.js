import { PRAYERS } from './core.js';
import { READING_BOOKS, COMPANION_PRAYERS, booksFor, chapterFor, firstPosition, passageSteps, passageIndex, splitChapter, finishChapter, selectBook } from './reading.js';

export function createReadingCompanion({ getState, commit, notify, confirmChange }) {
  const $ = selector => document.querySelector(selector);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let completion = null;
  const pauses = [COMPANION_PRAYERS.jesus, PRAYERS.father, COMPANION_PRAYERS.jesus, PRAYERS.glory, PRAYERS.cross];
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
    const index = passageIndex(data.progress?.step ?? 0);
    const done = completion?.plan === plan;
    const part = splitChapter(chapter.verses)[index];
    $('#reading-plan').value = plan;
    $('#reading-description').textContent = 'Choose a chapter, or pick up where you left off.';
    $('#reading-book').replaceChildren(...READING_BOOKS.map(item => {
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
    $('#reading-chapter').disabled = !!data.progress;
    $('.reading-sidebar').classList.toggle('reading-active', !!data.progress);
    $('#reading-change').hidden = !data.progress;
    $('#reading-book-note').textContent = book.note;
    const total = booksFor(plan).reduce((sum, item) => sum + item.chapters.length, 0);
    $('#reading-total').textContent = `${data.completed.length} of ${total} chapters complete`;
    $('#reading-total-bar').value = data.completed.length / total * 100;
    $('#reading-books').replaceChildren(...READING_BOOKS.map(item => {
      const group = reading[item.plan];
      const mark = group.progress?.book === item.id ? group.progress : group.bookmarks[item.id];
      const count = group.completed.filter(entry => entry.book === item.id).length;
      const row = make('button', undefined, 'book-progress-row');
      row.type = 'button';
      row.setAttribute('aria-pressed', String(item.id === book.id));
      row.addEventListener('click', () => chooseBook(item.id));
      const label = make('span', `${item.name} · ${count}/${item.chapters.length} chapters complete`);
      const bar = make('progress');
      bar.max = item.chapters.length;
      const partial = mark?.step !== undefined && !group.completed.some(e => e.book === item.id && e.chapter === mark.chapter);
      bar.value = count + (partial ? passageIndex(mark.step) / passageSteps.length : 0);
      bar.setAttribute('aria-label', `${item.name} reading progress`);
      row.append(label, bar);
      if (mark?.step !== undefined) row.append(make('small', `Resume chapter ${mark.chapter} · passage ${passageIndex(mark.step) + 1}`));
      return row;
    }));
    $('#reading-phase').textContent = done ? 'CHAPTER COMPLETE' : 'THE DAILY CHAPTER';
    $('#reading-step-count').textContent = done ? 'Complete' : `Passage ${index + 1} of 5`;
    $('#reading-reference').textContent = done ? `${completion.bookName} ${completion.chapter}` : `World English Bible · Catholic Edition`;
    $('#reading-verses').hidden = done;
    $('#reading-verses').replaceChildren(...verseNodes(part));
    if (done) {
      $('#reading-title').textContent = 'A little further in the Word.';
      $('#reading-prayer').textContent = completion.saved ? 'Your chapter and prayers are saved. Rest here, or continue when you are ready.' : 'Your chapter and prayers are complete in this tab, but could not be saved. Export a journal backup before closing.';
    } else {
      $('#reading-title').textContent = `${book.name} ${chapter.number}:${part[0].number}–${part.at(-1).number}`;
      $('#reading-prayer').textContent = pauses[index][1];
    }
    $('#pause-label').textContent = done ? 'IN GRATITUDE' : `PAUSE FOR PRAYER · ${pauses[index][0]}`;
    const percent = done ? 100 : index * 20;
    $('#reading-progress').value = percent;
    $('#reading-progress-label').textContent = done ? 'Chapter completed' : 'Chapter progress';
    $('#reading-percent').textContent = `${percent}%`;
    $('#reading-back').disabled = !data.progress || index === 0;
    $('#reading-next').disabled = !data.progress && !data.next;
    $('#reading-next').textContent = !data.progress && !data.next ? 'Plan complete ✓' : done ? 'Continue reading →' : index === 4 ? 'Complete chapter ✓' : 'Next passage →';
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
  function chooseBook(id) {
    completion = null;
    save(selectBook(getState().reading, id));
    $('.book-progress-details').open = false;
    render();
  }
  $('#reading-book').addEventListener('change', event => chooseBook(event.target.value));
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
    if (completion) {
      completion = null;
      render(true);
      return;
    }
    if (!data.progress) {
      if (!data.next) return;
      completion = null;
      save(setPlanData(reading, plan, { progress: { ...data.next, step: passageSteps[1] } }));
    } else if (passageIndex(data.progress.step) === 4) {
      const bookName = READING_BOOKS.find(book => book.id === data.progress.book).name;
      const next = finishChapter(setPlanData(reading,plan,{progress:{...data.progress,step:passageSteps[4]}}), plan);
      const saved = save(next);
      completion = { plan, bookName, chapter: data.progress.chapter, saved };
      notify(saved ? `${bookName} ${data.progress.chapter} completed and saved. Your rosary history is unchanged.` : 'Chapter completed only in this tab. Export a journal backup before closing.');
    } else save(setPlanData(reading, plan, { progress: { ...data.progress, step: passageSteps[passageIndex(data.progress.step)+1] } }));
    render(true);
  });
  $('#reading-back').addEventListener('click', () => {
    const reading = getState().reading;
    const plan = reading.selectedPlan;
    if (!reading[plan].progress || !passageIndex(reading[plan].progress.step)) return;
    save(setPlanData(reading, plan, { progress: { ...reading[plan].progress, step: passageSteps[passageIndex(reading[plan].progress.step)-1] } }));
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
