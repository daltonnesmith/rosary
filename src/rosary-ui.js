import { MYSTERIES, PRAYERS, sequence } from './core.js';

const MEDALLIONS = {
  mary: '<circle class="medal-halo" cx="20" cy="12" r="8"/><path class="medal-robe" d="M10 33c2-7 0-13 3-20 1-4 3-6 7-6s6 2 7 6c3 7 1 13 3 20Z"/><path d="M16 14c0-6 8-6 8 0 0 4-2 7-4 7s-4-3-4-7Zm4 9-5 7 5-3 5 3-5-7v10M14 7l-1-4 4 2 3-3 3 3 4-2-1 4"/>',
  crucifix: '<path class="medal-robe" d="M17 4h6v8h10v5H23v19h-6V17H7v-5h10Z"/><circle cx="20" cy="12" r="2.5"/><path d="m10 15 6 3 4 1 4-1 6-3m-10 4v8m0-7-3 4m3-4 3 4m-3 3-3 6m3-6 3 6M18 7h4"/>',
  michael: '<path class="medal-robe" d="M14 26C3 23 3 12 6 5c1 7 7 7 10 13m10 8c11-3 11-14 8-21-1 7-7 7-10 13"/><path d="m6 12 7 8M6 19l7 5m21-12-7 8m7-1-7 5"/><path class="medal-shield" d="m20 16 7 3v7c0 5-7 9-7 9s-7-4-7-9v-7Z"/><path d="M20 21v9m-4-6h8m-4-12V5m-2 3 2-3 2 3"/>',
  dove: '<path class="medal-robe" d="M18 19C13 13 8 14 4 8c0 9 5 15 13 17m5-6c5-6 10-5 14-11 0 9-5 15-13 17"/><circle cx="20" cy="17" r="3"/><path d="M17 21c0 5-1 8-3 12l6-3 6 3c-2-4-3-7-3-12M20 3v5M10 4l3 5m17-5-3 5M8 16l7 5m17-5-7 5"/>',
  heart: '<path class="medal-robe" d="M20 19c-9-9-17 1-9 9l9 8 9-8c8-8 0-18-9-9Z"/><path d="M17 15c-3-4 4-5 3-10 7 7 3 8 3 10M20 2v7m-3-5h6M10 26c7-3 13-3 20 0m-16-2 2 4m4-5 1 4m4-3 1 4"/>',
};
const PRAYER_SYMBOLS = { cross: 'crucifix', creed: 'michael', father: 'crucifix', mary: 'mary', glory: 'dove', fatima: 'heart', queen: 'mary', closing: 'crucifix' };

export function canTapRosaryStep(current, target, total) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(target) || target < 0 || target >= total) return false;
  return current === null ? target === 0 : Number.isInteger(current) && current >= 0 && target === current + 1;
}

export function rosaryWindow(set, fatima, current = 0) {
  const steps = sequence(set, fatima);
  if (!Number.isInteger(current) || current < 0 || current >= steps.length) throw new Error('Invalid rosary position.');
  const first = Math.max(0, Math.min(current - 2, steps.length - 5));
  return { steps, indices: Array.from({ length: Math.min(5, steps.length) }, (_, i) => first + i) };
}

export function createVirtualRosary({ getContext, start, next, previous, notify, restart }) {
  const $ = selector => document.querySelector(selector);
  let mysteryKey = '';

  function focusPrayer() {
    $('#virtual-rosary').scrollIntoView({ block: 'start' });
    $('#virtual-prayer-title').focus({ preventScroll: true });
  }
  function tap(index) {
    const context = getContext();
    if (context.progress?.step === index) {
      focusPrayer();
      return;
    }
    const total = sequence(context.set, context.fatima).length;
    if (context.completed || !canTapRosaryStep(context.progress?.step ?? null, index, total)) {
      notify('Pray the current prayer, then tap the next bead. Later beads stay locked.');
      return;
    }
    if (context.progress) next();
    else start();
    focusPrayer();
  }
  function advance() {
    const context = getContext();
    if (context.completed) { start(); focusPrayer(); }
    else if (context.progress?.step === sequence(context.set, context.fatima).length - 1) { next(); focusPrayer(); }
    else tap(context.progress ? context.progress.step + 1 : 0);
  }
  function back() {
    if (!getContext().progress?.step) return;
    previous();
    focusPrayer();
  }
  function render() {
    const context = getContext();
    const total = sequence(context.set, context.fatima).length;
    const current = context.completed ? total - 1 : context.progress?.step ?? 0;
    const { steps, indices } = rosaryWindow(context.set, context.fatima, current);
    const step = steps[current];
    const mystery = step.decade ? MYSTERIES[context.set].mysteries[step.decade - 1] : null;
    const description = index => {
      const item = steps[index];
      return `${PRAYERS[item.prayer][0]}${item.bead ? ` ${item.bead} of ${item.decade ? 10 : 3}` : ''}${item.decade ? `, decade ${item.decade}` : ''}`;
    };
    $('#virtual-phase').textContent = context.completed ? 'ROSARY COMPLETE'
      : mystery ? `${MYSTERIES[context.set].name} · Decade ${step.decade} of 5` : current < 7 ? 'OPENING PRAYERS' : 'CLOSING PRAYERS';
    $('#virtual-count').textContent = `Prayer ${current + 1} of ${total}`;
    $('#virtual-progress').value = context.completed ? 100 : Math.round(current / total * 100);
    $('#virtual-prayer-title').textContent = context.completed ? 'A moment well spent.' : PRAYERS[step.prayer][0];
    $('#virtual-prayer-text').textContent = context.completed
      ? context.storageMessage ? 'Your rosary is complete in this tab, but could not be saved. Export a backup before closing.' : 'Your rosary is complete and recorded in your journal.'
      : PRAYERS[step.prayer][1];
    $('#virtual-intention').textContent = context.completed ? 'Go gently into your day.' : mystery?.title || step.intention || 'One bead. One prayer. No hurry.';
    $('#virtual-storage-error').hidden = !context.storageMessage;
    $('#virtual-storage-error').textContent = context.storageMessage;
    $('#virtual-mystery').hidden = !mystery || context.completed;
    if (mystery) {
      $('#virtual-mystery-text').textContent = mystery.reading;
      $('#virtual-mystery-reference').textContent = mystery.reference;
      $('#virtual-mystery-reflection').textContent = mystery.reflection;
    }
    const key = `${context.set}-${step.decade}`;
    if (mysteryKey !== key) $('#virtual-mystery').open = false;
    mysteryKey = key;
    $('#rosary-track').replaceChildren(...indices.map(index => {
      const item = steps[index];
      const available = !context.completed && canTapRosaryStep(context.progress?.step ?? null, index, total);
      const status = context.completed || index < current ? 'done' : index === current ? context.progress ? 'now' : 'start' : available ? 'next' : 'locked';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'touch-bead';
      button.dataset.step = index;
      button.dataset.state = status;
      button.disabled = !available && (index !== current || context.completed);
      button.setAttribute('aria-label', `${status}: ${description(index)}`);
      if (index === current) button.setAttribute('aria-current', 'step');
      const bead = document.createElement('span');
      bead.className = 'touch-bead-stone';
      bead.dataset.symbol = PRAYER_SYMBOLS[item.prayer];
      bead.setAttribute('aria-hidden', 'true');
      bead.innerHTML = `<svg viewBox="0 0 40 40" focusable="false">${MEDALLIONS[PRAYER_SYMBOLS[item.prayer]]}</svg>`;
      if (item.bead) {
        const count = document.createElement('span');
        count.className = 'touch-bead-count';
        count.textContent = item.bead;
        bead.append(count);
      }
      const label = document.createElement('span');
      label.className = 'touch-bead-label';
      label.textContent = status;
      button.append(bead, label);
      button.addEventListener('click', () => tap(index));
      return button;
    }));
    $('#virtual-hint').textContent = context.completed ? 'Saved on this device unless a storage warning is shown.'
      : !context.progress ? 'Tap START to begin. Your place will be saved.'
      : current === total - 1 ? 'Pray the final Sign of the Cross, then choose Complete rosary.'
      : `After this prayer, tap NEXT: ${description(current + 1)}. Later beads are locked.`;
    $('#virtual-back').disabled = !context.progress || current === 0;
    $('#virtual-next').textContent = context.completed ? 'Pray again' : !context.progress ? 'Begin rosary'
      : current === total - 1 ? 'Complete rosary' : 'Next bead';
    $('#virtual-restart').hidden = !context.progress;
  }
  for (const name of ['guided', 'virtual']) {
    $(`#view-${name}`).addEventListener('click', () => {
      const virtual = name === 'virtual';
      $('#guided-rosary').hidden = virtual;
      $('#virtual-rosary').hidden = !virtual;
      $('#view-guided').setAttribute('aria-pressed', String(!virtual));
      $('#view-virtual').setAttribute('aria-pressed', String(virtual));
      render();
      if (virtual) focusPrayer();
    });
  }
  $('#virtual-next').addEventListener('click', advance);
  $('#virtual-back').addEventListener('click', back);
  $('#virtual-restart').addEventListener('click', restart);
  return { render, advance, back };
}
