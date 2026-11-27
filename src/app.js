import { MYSTERIES, PRAYERS, emptyState, sequence, moveRosaryProgress, suggestedMystery, localDate, validDate, loadState, saveState, parseBackup, mergeBackup, stats, finishRosary, STORAGE_KEY } from './core.js';
import { createReadingCompanion } from './reading-ui.js';
import { READING_BOOKS } from './reading.js';
import { createLiturgicalCalendar } from './liturgical-ui.js';
import { prayerMilestones, POINTS_PER_ROSARY } from './core.js';
import { createProfilePreview } from './profile.js';
import { isAndroidApp, saveAndroidBackup } from './platform.js';

const $ = selector => document.querySelector(selector);
const make = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
let state;
let canWrite = true;
let storedSnapshot = null;
let selectedSet = suggestedMystery();
let completed = false;
let completionSaved = false;
let completedDate = null;
let displayedDecade = '';
let editingId = null;
let selectedDay = localDate();
let displayedMonth = new Date();
displayedMonth.setDate(1);
let deferredInstall = null;

function storageError(message) {
  $('#storage-error').textContent = message;
  $('#storage-error').hidden = false;
}
function notify(message) {
  $('#status').textContent = message;
  $('#status').hidden = false;
}
try {
  state = loadState({ getItem(key) {
    storedSnapshot = window.localStorage.getItem(key);
    return storedSnapshot;
  } });
} catch (error) {
  state = emptyState();
  canWrite = false;
  storageError(`Your saved data could not be read: ${error.message} Existing storage has been left untouched. New activity is temporary; export it before closing this tab. Try your usual browser, or recover from a backup.`);
}
selectedSet = state.progress?.set ?? selectedSet;
function commit(next) {
  state = next;
  if (!canWrite) {
    storageError('This tab cannot write safely to storage. Your activity is temporary. Export a backup before closing, then reload to reopen saved data. Existing storage has not been overwritten.');
    return false;
  }
  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== storedSnapshot) {
      canWrite = false;
      storageError('Your saved data changed outside this tab. This activity is temporary and will not overwrite it. Export a backup, then reload to reopen saved data.');
      return false;
    }
    storedSnapshot = saveState(window.localStorage, state);
    $('#storage-error').hidden = true;
    return true;
  } catch (error) {
    storageError(`Changes could not be saved on this device: ${error.message} Keep this tab open and export a backup to preserve your activity.`);
    return false;
  }
}
function humanDate(value, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}
function showTab(tab) {
  for (const name of ['pray', 'scripture', 'liturgical', 'journal', 'profile', 'about']) $(`#${name}`).hidden = name !== tab;
  document.querySelectorAll('[data-tab]').forEach(button => {
    if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (tab === 'journal') renderJournal();
  if (tab === 'profile') renderProfile();
  if (tab === 'scripture') readingCompanion.render();
  if (tab === 'liturgical') liturgicalCalendar.render();
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));
$('.brand').addEventListener('click', () => showTab('pray'));
$('#install-help').addEventListener('click', () => { showTab('about'); $('#about-heading').scrollIntoView({ behavior: 'smooth' }); });

Object.entries(MYSTERIES).forEach(([key, set]) => {
  const option = make('option', `${set.name} mysteries`);
  option.value = key;
  $('#mystery').append(option);
});
function renderPrayer(focus = false) {
  const progress = state.progress;
  const setKey = progress?.set ?? selectedSet;
  const set = MYSTERIES[setKey];
  const fatima = progress?.fatima ?? state.fatima;
  const steps = sequence(setKey, fatima);
  const index = progress?.step ?? 0;
  const step = steps[index];
  const percent = completed ? 100 : progress ? Math.round(index / steps.length * 100) : 0;
  $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  $('#mystery').value = setKey;
  $('#fatima').checked = fatima;
  $('#mystery-description').textContent = `${set.days}. ${set.description}`;
  const expandedMysteries = new Set([...$('#mystery-list').children].flatMap((item, i) => item.querySelector('details').open ? [i] : []));
  $('#mystery-list').replaceChildren(...set.mysteries.map((mystery, i) => {
    const item = make('li');
    const details = make('details');
    const summary = make('summary');
    const reference = make('p', mystery.citation, 'reading-reference');
    const reflection = make('p', `Reflection: ${mystery.reflection}`, 'reflection');
    summary.append(make('span', String(i + 1).padStart(2, '0'), 'mystery-number'), make('span', mystery.title));
    details.append(summary, reference, make('p', mystery.scripture, 'mystery-story'), make('p', `Meditation: ${mystery.reading}`), reflection);
    details.open = expandedMysteries.has(i);
    item.append(details);
    if (step.decade === i + 1 && progress) item.setAttribute('aria-current', 'step');
    return item;
  }));
  $('#phase').textContent = completed ? 'THANK YOU FOR PRAYING' : step.decade ? `${set.name} · Decade ${step.decade} of 5` : index >= steps.length - 3 ? 'CLOSING PRAYERS' : 'BEGIN IN PEACE';
  $('#step-count').textContent = completed ? 'Complete' : `Prayer ${index + 1} of ${steps.length}`;
  $('#meditation').textContent = completed ? set.description : step.decade ? set.mysteries[step.decade - 1].title : step.intention || (index >= steps.length - 3 ? 'Rest a moment in gratitude.' : 'Gather your intentions. Be here, in this moment.');
  $('#mystery-reading').hidden = !step.decade || completed;
  const decadeKey = `${setKey}-${step.decade}`;
  const enteringDecade = step.decade && displayedDecade !== decadeKey;
  if (step.decade) {
    const mystery = set.mysteries[step.decade - 1];
    $('#mystery-reading-text').textContent = mystery.scripture;
    $('#mystery-reading-reference').textContent = mystery.citation;
    $('#mystery-commentary').textContent = `Meditation: ${mystery.reading}`;
    $('#mystery-reflection').textContent = `Reflection: ${mystery.reflection}`;
    if (enteringDecade) $('#mystery-reading').open = true;
  }
  displayedDecade = decadeKey;
  $('#prayer-title').textContent = completed ? 'Go gently into your day.' : PRAYERS[step.prayer][0];
  $('#prayer-text').textContent = completed ? `Your rosary for ${humanDate(completedDate, { month: 'long', day: 'numeric' })} is ${completionSaved ? 'saved on this device' : 'complete in this tab, but not saved; please export a backup'}. May this little time of prayer stay with you.` : PRAYERS[step.prayer][1];
  $('#completion-message').hidden = !completed;
  $('#completion-message').textContent = completionSaved ? 'Recorded in your private journal.' : 'Temporary only — your device could not save this completion.';
  $('#beads').replaceChildren();
  const beadCount = step.decade ? 10 : 3;
  for (let bead = 1; bead <= beadCount; bead++) {
    const span = make('span', '', `bead${step.prayer === 'mary' && bead === step.bead && !completed ? ' active' : ''}${step.prayer === 'mary' && bead < step.bead ? ' passed' : ''}`);
    $('#beads').append(span);
  }
  $('#progress-label').textContent = completed ? 'A moment well spent' : step.prayer === 'mary' ? `Hail Mary ${step.bead} of ${beadCount}` : progress ? 'One prayer at a time' : 'Ready when you are';
  $('#progress-percent').textContent = `${percent}%`;
  $('#progress').value = percent;
  $('#previous').disabled = !progress || index === 0;
  $('#next').textContent = completed ? 'Pray again →' : !progress ? 'Begin rosary →' : index === steps.length - 1 ? 'Complete rosary ✓' : 'Next prayer →';
  $('#restart').hidden = !progress;
  if (focus && !$('#guided-rosary').hidden && !$('#chapel-dialog').open) {
    const heading = enteringDecade ? $('#meditation') : $('#prayer-title');
    heading.focus({ preventScroll: true });
    const bounds = heading.getBoundingClientRect();
    if (bounds.top < 20 || bounds.bottom > window.innerHeight - 30) heading.scrollIntoView({ block: 'center' });
  }
}
function start() {
  completed = false;
  commit({ ...state, progress: { set: selectedSet, fatima: state.fatima, step: 0, startedAt: new Date().toISOString() } });
  renderPrayer(true);
}
function nextPrayer(options = {}) {
  if (!state.progress) return start();
  const last = sequence(state.progress.set, state.progress.fatima).length - 1;
  if (state.progress.step === last) {
    const now = new Date();
    const day = localDate(now);
    const before = prayerMilestones(state.completions, day);
    const saved = commit(finishRosary(state, now));
    const after = prayerMilestones(state.completions, day);
    const earned = after.badges.filter((badge, i) => badge.earned && !before.badges[i].earned);
    $('#finished-awards').textContent = `+${POINTS_PER_ROSARY} points · ${after.points} total.${earned.length ? ` Newly earned: ${earned.map(b => b.name).join('; ')}.` : ''}`;
    completed = true;
    completionSaved = saved;
    completedDate = localDate(now);
    notify(saved ? 'Rosary completed and saved. Your journal is up to date.' : 'Rosary completed in this tab, but not saved to device storage. Export a backup.');
  } else commit({ ...state, progress: moveRosaryProgress(state.progress, 1, options) });
  renderPrayer(true);
  if (completed) {
    if ($('#chapel-dialog').open) $('#chapel-dialog').close();
    $('#finished-form').reset();
    $('#finished-status').textContent = completionSaved
      ? 'Recorded in your journal. Add a reflection if you like, or just tap Done.'
      : 'Completed in this tab only. Your device could not save it. Export a backup before closing.';
    $('#finished-dialog').showModal();
  }
}
$('#finished-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('#finished-dialog').open) return;
  const text = $('#finished-note').value.trim();
  if (text) {
    const note = { id: crypto.randomUUID(), date: completedDate, text, updatedAt: new Date().toISOString() };
    const saved = commit({ ...state, notes: [...state.notes, note] });
    notify(saved ? 'Your rosary and reflection are saved in your journal.' : 'Your reflection is only in this tab. Export a backup before closing.');
    if (saved) completionSaved = true;
  }
  $('#finished-dialog').close();
});
$('#next').addEventListener('click', () => nextPrayer());
function previousPrayer(options = {}) {
  if (!state.progress || state.progress.step === 0) return;
  commit({ ...state, progress: moveRosaryProgress(state.progress, -1, options) });
  renderPrayer(true);
}
$('#previous').addEventListener('click', () => previousPrayer());
async function confirmRestart(options = {}) {
  const dialog = $('#confirm-dialog');
  if (dialog.open) return false;
  $('#confirm-title').textContent = options.title ?? 'Start again?';
  $('#confirm-text').textContent = options.message ?? 'Only your current place will be reset. Your completed days and saved notes will be kept. An unfinished rosary will not be recorded as complete.';
  dialog.querySelector('[value=confirm]').textContent = options.confirmLabel ?? 'Start new rosary';
  dialog.querySelector('[value=cancel]').textContent = options.cancelLabel ?? 'Keep my place';
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}
$('#restart').addEventListener('click', async () => {
  if (!await confirmRestart()) return;
  commit({ ...state, progress: null });
  completed = false;
  renderPrayer(true);
});
$('#mystery').addEventListener('change', async event => {
  const next = event.target.value;
  if (state.progress && !await confirmRestart()) return renderPrayer();
  selectedSet = next;
  completed = false;
  commit({ ...state, progress: null });
  renderPrayer();
});
$('#fatima').addEventListener('change', async event => {
  const next = event.target.checked;
  if (state.progress && !await confirmRestart()) return renderPrayer();
  completed = false;
  commit({ ...state, fatima: next, progress: null });
  renderPrayer();
});
document.addEventListener('keydown', event => {
  if ($('#pray').hidden || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    $(event.key === 'ArrowRight' ? '#next' : '#previous').click();
  }
});

function renderJournal() {
  const summary = stats(state.completions);
  const {points, badges} = prayerMilestones(state.completions);
  $('#achievement-summary').textContent = `${points} points · ${badges.filter(b => b.earned).length} of ${badges.length} milestones earned`;
  $('#achievement-list').replaceChildren(...badges.map(badge => {
    const item = make('li');
    item.append(make('span', badge.name), make('strong', badge.earned ? '✓ Earned' : `${badge.progress} / ${badge.goal}`));
    return item;
  }));
  $('#stats').replaceChildren(...[[summary.streak, 'day current streak'], [summary.days, 'days of prayer'], [summary.today ? 'Yes' : 'Not yet', 'prayed today']].map(([value, label]) => {
    const card = make('div', undefined, 'stat');
    card.append(make('strong', String(value)), make('span', label));
    return card;
  }));
  $('#month-title').textContent = displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const calendar = $('#calendar');
  calendar.replaceChildren(...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => make('span', day, 'weekday')));
  const first = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  for (let i = 0; i < first.getDay(); i++) calendar.append(make('span'));
  for (let day = 1; day <= count; day++) {
    const date = localDate(new Date(first.getFullYear(), first.getMonth(), day));
    const rosary = state.completions.some(item => item.date === date);
    const scripture = [...state.reading.deuterocanon.completed, ...state.reading.gospels.completed].some(item => item.date === date);
    const prayed = rosary || scripture;
    const noted = state.notes.some(note => note.date === date);
    const button = make('button', String(day), `calendar-day${prayed ? ' prayed' : ''}${noted ? ' noted' : ''}${date === selectedDay ? ' selected' : ''}`);
    button.setAttribute('aria-label', `${humanDate(date)}${rosary ? ', rosary completed' : ''}${scripture ? ', Scripture chapter completed' : ''}${!prayed ? ', no completion' : ''}${noted ? ', has notes' : ''}`);
    button.setAttribute('aria-pressed', String(date === selectedDay));
    if (date === localDate()) button.setAttribute('aria-current', 'date');
    button.addEventListener('click', () => { selectedDay = date; renderJournal(); });
    calendar.append(button);
  }
  const entries = state.completions.filter(item => item.date === selectedDay);
  $('#day-history').replaceChildren(make('h3', humanDate(selectedDay)));
  if (!entries.length) $('#day-history').append(make('p', 'No completed rosary recorded for this day.', 'muted small'));
  entries.forEach(item => $('#day-history').append(make('p', `${MYSTERIES[item.mystery].name} mysteries · ${new Date(item.completedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`, 'history-entry')));
  for (const item of [...state.reading.deuterocanon.completed, ...state.reading.gospels.completed].filter(item => item.date === selectedDay)) {
    const book = READING_BOOKS.find(book => book.id === item.book);
    $('#day-history').append(make('p', `${book.name} ${item.chapter} · Scripture & prayer`, 'history-entry'));
  }
  const notes = state.notes.filter(note => note.date === selectedDay);
  notes.forEach(note => $('#day-history').append(make('p', note.text, 'history-note')));
  renderNotes();
}
$('#month-back').addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderJournal(); });
$('#month-next').addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderJournal(); });
$('#note-date').value = localDate();
function resetEditor() {
  editingId = null;
  $('#note-text').value = '';
  $('#cancel-edit').hidden = true;
  $('#note-form button[type=submit]').textContent = 'Save note';
}
$('#cancel-edit').addEventListener('click', resetEditor);
$('#note-form').addEventListener('submit', event => {
  event.preventDefault();
  const date = $('#note-date').value;
  const text = $('#note-text').value.trim();
  if (!validDate(date) || !text || text.length > 10000) return notify('Choose a valid date and write a note of 1–10,000 characters.');
  const note = { id: editingId ?? crypto.randomUUID(), date, text, updatedAt: new Date().toISOString() };
  const notes = state.notes.filter(item => item.id !== note.id).concat(note);
  const saved = commit({ ...state, notes });
  selectedDay = date;
  displayedMonth = new Date(`${date}T12:00:00`);
  displayedMonth.setDate(1);
  resetEditor();
  renderJournal();
  notify(saved ? 'Your reflection has been saved on this device.' : 'Your reflection is only in this tab. Export a backup before closing.');
});
function renderNotes() {
  const list = $('#notes-list');
  list.replaceChildren(make('h3', 'Your saved reflections'));
  const notes = [...state.notes].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  if (!notes.length) list.append(make('p', 'Nothing to write today? Your prayer is enough.', 'small muted'));
  notes.forEach(note => {
    const article = make('article', undefined, 'note');
    const edit = make('button', 'Edit', 'text-button');
    edit.setAttribute('aria-label', `Edit reflection from ${humanDate(note.date)}`);
    edit.addEventListener('click', () => {
      if (editingId === note.id) {
        $('#note-text').focus();
        return;
      }
      if ($('#note-text').value.trim()) {
        notify('Save your current reflection or cancel editing before opening another note.');
        return;
      }
      editingId = note.id;
      $('#note-date').value = note.date;
      $('#note-text').value = note.text;
      $('#cancel-edit').hidden = false;
      $('#note-form button[type=submit]').textContent = 'Save changes';
      $('#note-text').focus();
    });
    article.append(make('time', humanDate(note.date), 'small muted'), make('p', note.text), edit);
    list.append(article);
  });
}
$('#export').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const data = JSON.stringify(state, null, 2);
    const filename = `stillwater-backup-${localDate()}.json`;
    if (isAndroidApp()) {
      const result = await saveAndroidBackup(data, filename);
      notify(result.cancelled ? 'Backup cancelled. Your saved data is unchanged.' : 'Backup saved to your chosen location. Keep it private; it includes your notes.');
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = make('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify('Backup download requested. Keep this file private; it includes your notes.');
  } catch (error) { notify(`Backup could not be exported: ${error.message}`); }
  finally { button.disabled = false; }
});
$('#import').addEventListener('change', async event => {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Backup is too large (maximum 2 MB).');
    const merged = mergeBackup(state, parseBackup(await file.text()));
    const saved = commit(merged);
    selectedSet = state.progress?.set ?? selectedSet;
    completed = false;
    renderPrayer();
    renderJournal();
    readingCompanion.resetView();
    notify(saved ? 'Backup merged and saved. Existing notes and history were kept.' : 'Backup merged in this tab but could not be saved. Export a backup before closing.');
  } catch (error) { notify(`Import failed: ${error.message}`); }
  finally { input.value = ''; }
});
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    canWrite = false;
    storageError('Your saved data changed in another tab. This tab will not overwrite it. Export any unsaved activity, then reload before continuing.');
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { renderPrayer(); if (!$('#journal').hidden) renderJournal(); if (!$('#scripture').hidden) readingCompanion.render(); if (!$('#liturgical').hidden) liturgicalCalendar.render(); }
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstall = event;
  $('#install-native').hidden = false;
});
$('#install-native').addEventListener('click', async () => {
  if (!deferredInstall) return;
  try {
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $('#install-native').hidden = true;
  } catch (error) { notify(`Installation could not open: ${error.message} Use your browser's install menu instead.`); }
});
window.addEventListener('appinstalled', () => {
  $('#install-native').hidden = true;
  notify('Stillwater is installed. Your quiet space is ready.');
});
if (isAndroidApp()) {
  document.documentElement.classList.add('native-app');
  $('#install-help').textContent = 'App help';
  $('#web-install-guidance').hidden = true;
  $('#native-install-guidance').hidden = false;
  $('#offline-status').textContent = 'All prayers, Scripture and calendar files are included in this Android app. No first online visit is needed. Your journal is saved separately on this device.';
} else if ('serviceWorker' in navigator) {
  $('#offline-status').textContent = 'Preparing offline app files…';
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then(async registration => {
    const watch = worker => {
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) notify('An app update is ready. Close all Stillwater tabs and reopen when convenient. Your saved journal will be kept.');
        if (worker.state === 'redundant') {
          $('#offline-status').textContent = 'App-file download failed. An existing offline version, if installed, is unchanged. Reopen online to retry.';
          notify('Offline app-file download failed. See A little guidance for details.');
        }
      });
    };
    watch(registration.installing);
    registration.addEventListener('updatefound', () => watch(registration.installing));
    await navigator.serviceWorker.ready;
    $('#offline-status').textContent = 'Offline app files are ready on this device. Your journal is saved separately from the app cache.';
  }).catch(error => {
    $('#offline-status').textContent = `Offline setup could not finish: ${error.message} You can still pray online; reopen later to retry.`;
    notify('Offline setup could not finish. You can still use the app online. See A little guidance for details.');
  });
} else $('#offline-status').textContent = 'This browser does not support offline app installation. You can use Stillwater online.';

const readingCompanion = createReadingCompanion({ getState: () => state, commit, notify, confirmChange: confirmRestart });
const liturgicalCalendar = createLiturgicalCalendar();
const renderProfile = createProfilePreview();
let chapel;
$('#view-chapel').addEventListener('click', async () => {
  const button = $('#view-chapel');
  button.disabled = true;
  try {
    if (!chapel) {
      const { createChapel } = await import('../chapel/chapel.js');
      chapel = await createChapel($('#chapel-host'), {
        context: () => ({
          progress: state.progress, set: state.progress?.set ?? selectedSet,
          fatima: state.progress?.fatima ?? state.fatima,
          error: $('#storage-error').hidden ? '' : $('#storage-error').textContent,
        }),
        start,
        move: direction => (direction > 0 ? nextPrayer : previousPrayer)({ mysteryCards: true }),
        leave: () => $('#chapel-dialog').close(),
      });
    }
    $('#chapel-dialog').showModal();
    chapel.sync();
  } catch (error) {
    $('#chapel-dialog').close();
    $('#chapel-host').replaceWith(Object.assign(document.createElement('div'), {id: 'chapel-host'}));
    chapel = null;
    notify(`The chapel could not open: ${error.message} Your saved place has not changed.`);
  } finally { button.disabled = false; }
});
readingCompanion.render();
renderPrayer();
renderJournal();
