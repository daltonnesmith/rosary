import { MYSTERIES, PRAYERS, sequence } from './core.js';

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
    const icons = { cross: '+', creed: 'A', father: 'OF', glory: 'GB', fatima: 'J', queen: 'M', closing: '+' };
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
      bead.className = `touch-bead-stone${item.prayer === 'cross' ? ' touch-cross' : ''}`;
      bead.textContent = item.prayer === 'mary' ? item.bead : icons[item.prayer];
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
