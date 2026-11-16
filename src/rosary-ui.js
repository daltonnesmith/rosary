import { MYSTERIES, PRAYERS, sequence } from './core.js';

export function rosaryPieces(set, fatima) {
  const steps = sequence(set, fatima);
  const piece = (id, kind, indices) => ({ id, kind, indices });
  const opening = [
    piece('cross', 'cross', [0, 1, steps.length - 1]),
    piece('opening-father', 'father', [2]),
    ...[3, 4, 5].map((index, i) => piece(`opening-mary-${i + 1}`, 'mary', [index])),
    piece('medal', 'medal', [6, steps.length - 3, steps.length - 2]),
  ];
  const loop = [];
  for (let decade = 1; decade <= 5; decade++) {
    const indices = steps.flatMap((step, index) => step.decade === decade ? [index] : []);
    loop.push(
      piece(`decade-${decade}-father`, 'father', [indices[0]]),
      ...indices.slice(1, 11).map((index, i) => piece(`decade-${decade}-mary-${i + 1}`, 'mary', [index])),
      piece(`decade-${decade}-chain`, 'chain', indices.slice(11)),
    );
  }
  return { steps, opening, loop };
}

export function rosaryPositions(width) {
  if (!Number.isFinite(width) || width < 180) throw new Error('The rosary needs at least 180 pixels of drawing space.');
  const diameter = Math.min(width - 56, 760);
  const radius = diameter / 2;
  const perimeter = 60 * 52;
  const straight = (perimeter - Math.PI * diameter) / 2;
  const top = 28;
  const bottom = top + diameter + straight;
  const cx = width / 2;
  const bottomCy = bottom - radius;
  const topCy = top + radius;
  const quarter = Math.PI * radius / 2;
  function point(distance) {
    if (distance < quarter) {
      const angle = Math.PI / 2 - distance / radius;
      return { x: cx + radius * Math.cos(angle), y: bottomCy + radius * Math.sin(angle) };
    }
    distance -= quarter;
    if (distance < straight) return { x: cx + radius, y: bottomCy - distance };
    distance -= straight;
    if (distance < 2 * quarter) {
      const angle = -distance / radius;
      return { x: cx + radius * Math.cos(angle), y: topCy + radius * Math.sin(angle) };
    }
    distance -= 2 * quarter;
    if (distance < straight) return { x: cx - radius, y: topCy + distance };
    distance -= straight;
    const angle = Math.PI - distance / radius;
    return { x: cx + radius * Math.cos(angle), y: bottomCy + radius * Math.sin(angle) };
  }
  return {
    width, height: bottom + 380, diameter, radius, cx, top, bottom,
    loop: Array.from({ length: 60 }, (_, i) => point((i + 0.5) * 52)),
    opening: [336, 264, 208, 156, 104, 52].map(offset => ({ x: cx, y: bottom + offset })),
  };
}

export function createVirtualRosary({ getContext, selectStep, start, next, previous }) {
  const $ = selector => document.querySelector(selector);
  const canvas = $('#rosary-drawing');
  const dialog = $('#bead-dialog');
  let model;
  let modelKey = '';
  let previewIndex = 0;
  let praying = false;
  let virtual = false;

  function label(index) {
    const step = model.steps[index];
    const prayer = PRAYERS[step.prayer][0];
    if (step.decade) return `Decade ${step.decade}, ${prayer}${step.bead ? ` ${step.bead} of 10` : ''}`;
    if (step.intention) return `${prayer} ${step.bead} of 3, ${step.intention.toLowerCase()}`;
    return `${index === model.steps.length - 1 ? 'Closing' : index < 7 ? 'Opening' : 'Closing'}: ${prayer}`;
  }
  function position() {
    if (!virtual || !canvas.clientWidth) return;
    const layout = rosaryPositions(canvas.clientWidth);
    canvas.style.height = `${layout.height}px`;
    const svg = $('#rosary-string');
    svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    const loop = $('#rosary-loop');
    for (const [name, value] of Object.entries({ x: layout.cx - layout.radius, y: layout.top, width: layout.diameter, height: layout.bottom - layout.top, rx: layout.radius })) loop.setAttribute(name, value);
    const stem = $('#rosary-stem');
    for (const [name, value] of Object.entries({ x1: layout.cx, x2: layout.cx, y1: layout.bottom, y2: layout.bottom + 336 })) stem.setAttribute(name, value);
    const pieces = [...model.opening, ...model.loop];
    [...layout.opening, ...layout.loop].forEach((point, i) => {
      const button = canvas.querySelector(`[data-piece="${pieces[i].id}"]`);
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
    });
    $('#rosary-center-label').style.top = `${(layout.top + layout.bottom) / 2}px`;
  }
  function renderDialog() {
    const context = getContext();
    const active = praying && context.progress;
    if (active) previewIndex = context.progress.step;
    const step = model.steps[previewIndex];
    $('#bead-dialog-phase').textContent = `${active ? context.storageMessage ? 'TEMPORARY PLACE' : 'YOUR SAVED PLACE' : 'PRAYER PREVIEW'} · ${previewIndex + 1} of ${model.steps.length}`;
    $('#bead-storage-error').hidden = !context.storageMessage;
    $('#bead-storage-error').textContent = context.storageMessage;
    $('#bead-dialog-title').textContent = PRAYERS[step.prayer][0];
    $('#bead-dialog-context').textContent = step.decade
      ? `${label(previewIndex)} · ${MYSTERIES[context.set].mysteries[step.decade - 1].title}`
      : step.intention || label(previewIndex);
    $('#bead-dialog-text').textContent = PRAYERS[step.prayer][1];
    $('#bead-dialog-mystery').hidden = !step.decade;
    if (step.decade) {
      const mystery = MYSTERIES[context.set].mysteries[step.decade - 1];
      $('#bead-dialog-story').textContent = mystery.reading;
      $('#bead-dialog-reference').textContent = mystery.reference;
      $('#bead-dialog-reflection').textContent = mystery.reflection;
    }
    const piece = [...model.opening, ...model.loop].find(item => item.indices.includes(previewIndex));
    $('#bead-piece-prayers').replaceChildren(...piece.indices.map(index => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiet';
      button.textContent = label(index);
      button.setAttribute('aria-pressed', String(index === previewIndex));
      button.addEventListener('click', () => { praying = false; previewIndex = index; renderDialog(); $('#bead-dialog-title').focus(); });
      return button;
    }));
    $('#bead-piece-options').hidden = piece.indices.length === 1;
    $('#bead-back').disabled = previewIndex === 0;
    $('#bead-next').textContent = active
      ? previewIndex === model.steps.length - 1 ? 'Complete rosary' : 'Next prayer'
      : 'Pray from here';
    $('#bead-preview-note').hidden = Boolean(active);
  }
  function open(index, active = false) {
    previewIndex = index;
    praying = active;
    $('#bead-dialog-mystery').open = false;
    renderDialog();
    dialog.showModal();
    $('#bead-dialog-title').focus();
    dialog.scrollTop = 0;
  }
  function render() {
    const context = getContext();
    const key = `${context.set}-${context.fatima}`;
    if (modelKey !== key) {
      modelKey = key;
      model = rosaryPieces(context.set, context.fatima);
      canvas.querySelectorAll('button').forEach(button => button.remove());
      for (const piece of [...model.opening, ...model.loop]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `rosary-piece rosary-${piece.kind}`;
        button.dataset.piece = piece.id;
        const labels = piece.indices.map(label);
        button.setAttribute('aria-label', labels.join('; '));
        button.title = labels.join('; ');
        const decoration = document.createElement('span');
        decoration.setAttribute('aria-hidden', 'true');
        if (piece.kind === 'father' && model.steps[piece.indices[0]].decade) decoration.textContent = model.steps[piece.indices[0]].decade;
        button.append(decoration);
        button.addEventListener('click', () => {
          const current = getContext().progress?.step;
          const index = piece.indices.includes(current) ? current
            : piece.kind === 'medal' && current > 6 ? piece.indices[1] : piece.indices[0];
          open(index);
        });
        canvas.append(button);
      }
      $('#rosary-center-label').textContent = `${MYSTERIES[context.set].name} mysteries`;
      position();
    }
    const current = context.progress?.step;
    for (const piece of [...model.opening, ...model.loop]) {
      const button = canvas.querySelector(`[data-piece="${piece.id}"]`);
      if (piece.indices.includes(current)) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    $('#virtual-current').textContent = context.completed
      ? context.storageMessage ? 'Completed in this tab only. Export a backup to keep it.' : 'Your rosary is complete and recorded.'
      : current === undefined ? 'Begin at the cross, or tap any bead to explore.' : label(current);
    $('#virtual-resume').textContent = context.completed ? 'Pray again' : context.progress ? 'Continue my rosary' : 'Begin at the cross';
    $('#virtual-locate').disabled = !context.progress;
    if (dialog.open) {
      if (praying && context.completed) {
        dialog.close();
        $('#virtual-current').focus({ preventScroll: true });
        $('#virtual-current').scrollIntoView({ block: 'center' });
      }
      else renderDialog();
    }
  }
  for (const name of ['guided', 'virtual']) {
    $(`#view-${name}`).addEventListener('click', () => {
      virtual = name === 'virtual';
      $('#guided-rosary').hidden = virtual;
      $('#virtual-rosary').hidden = !virtual;
      $('#view-guided').setAttribute('aria-pressed', String(!virtual));
      $('#view-virtual').setAttribute('aria-pressed', String(virtual));
      render();
      position();
    });
  }
  $('#virtual-resume').addEventListener('click', () => {
    if (!getContext().progress) start();
    open(getContext().progress.step, true);
  });
  $('#virtual-locate').addEventListener('click', () => {
    const bead = canvas.querySelector('[aria-current=step]');
    bead.focus({ preventScroll: true });
    bead.scrollIntoView({ block: 'center' });
  });
  $('#bead-close').addEventListener('click', () => dialog.close());
  $('#bead-next').addEventListener('click', () => {
    if (praying) next();
    else {
      praying = true;
      selectStep(previewIndex);
    }
    if (dialog.open) {
      renderDialog();
      dialog.scrollTop = 0;
      $('#bead-dialog-title').focus();
    }
  });
  $('#bead-back').addEventListener('click', () => {
    if (praying) previous();
    else if (previewIndex > 0) { previewIndex--; renderDialog(); }
    dialog.scrollTop = 0;
    $('#bead-dialog-title').focus();
  });
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || /^(BUTTON|SUMMARY|A)$/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!praying && event.key === 'ArrowRight') {
        if (previewIndex < model.steps.length - 1) previewIndex++;
        renderDialog();
        dialog.scrollTop = 0;
        return;
      }
      $(event.key === 'ArrowRight' ? '#bead-next' : '#bead-back').click();
    }
  });
  new ResizeObserver(position).observe(canvas);
  return { render };
}
