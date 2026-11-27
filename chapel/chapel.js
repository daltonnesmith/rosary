import { MYSTERIES, PRAYERS } from '../src/core.js';
import { virtualRosarySteps } from '../src/rosary-ui.js';
import { drawStrand, drawLoop } from './medals.js';

export async function createChapel(host, controls) {
const response = await fetch(new URL('./chapel.html', import.meta.url));
if (!response.ok) throw new Error(`Chapel artwork could not load (${response.status}).`);
const template = new DOMParser().parseFromString(await response.text(), 'text/html');
const root = host.attachShadow({mode:'open'});
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = new URL('./chapel.css', import.meta.url);
const styled = new Promise((ok,fail) => {style.onload = ok; style.onerror = () => fail(new Error('Chapel styles could not load.'));});
const wrapper = document.createElement('div');
wrapper.className = 'chapel';
wrapper.append(...template.body.childNodes);
root.append(style, wrapper);
await styled;
const $ = id => root.getElementById(id);
let steps, index, page, pages, anchor = 0, frame;
const dialog = root.querySelector('dialog');
let set;
function sync(position = 0) {
  const ctx = controls.context();
  set = ctx.set;
  wrapper.dataset.set = set;
  steps = virtualRosarySteps(set, ctx.fatima);
  index = ctx.progress ? steps.findIndex(s=>s.step===ctx.progress.step && s.stage===ctx.progress.stage) : 0;
  render(position);
}
function paginate(text) {
  const words = text.match(/\S+\s*/g), result = [];
  for (let start = 0; start < words.length;) {
    let low = start + 1, high = words.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      $('words').textContent = words.slice(start, mid).join('').trimEnd();
      if ($('words').offsetHeight <= $('leaf').clientHeight) low = mid;
      else high = mid - 1;
    }
    result.push({ start, text: words.slice(start, low).join('').trimEnd() });
    start = low;
  }
  return result;
}
function render(position = 0) {
  const s = steps[index], mystery = MYSTERIES[set].mysteries[s.decade - 1];
  const reading = s.stage === 'mystery';
  const scene = s.decade ? new URL(`./windows.svg#${set}-${s.decade}`,import.meta.url).href : '#window-symbol';
  if ($('scene').getAttribute('href') !== scene) {
    $('scene').setAttribute('href', scene);
    $('scene').setAttribute('transform', s.decade ? 'translate(0)' : 'translate(-120 -70)');
  }
  $('phase').textContent = `${MYSTERIES[set].name} · ${s.decade ? `Decade ${s.decade} of 5` : 'Prayer'} · ${reading ? 'Mystery' : s.bead ? `Bead ${s.bead}` : 'Rosary'}`;
  $('title').textContent = reading ? mystery.title : PRAYERS[s.prayer][0];
  $('cite').textContent = reading ? mystery.citation : mystery?.title || '';
  pages = paginate(reading ? mystery.scripture : PRAYERS[s.prayer][1]);
  if (reading) {
    const reflectionStart = mystery.scripture.trim().split(/\s+/).length;
    pages.push(...paginate(mystery.reflection).map(p => ({ ...p, start: reflectionStart + p.start, reflection: true })));
  }
  page = pages.findLastIndex(p => p.start <= position);
  paint();
}
function paint() {
  const p = pages[page];
  anchor = p.start;
  $('words').textContent = p.text;
  $('leaf').scrollTop = 0;
  const reading = steps[index].stage === 'mystery';
  const label = p.reflection ? 'Reflection' : reading ? 'Scripture' : 'Prayer';
  $('page').textContent = `${label} · ${page + 1} / ${pages.length}`;
  $('cite').style.visibility = p.reflection ? 'hidden' : 'visible';
  $('phase').textContent = $('phase').textContent.replace(/ · (?:Reflection|Mystery)$/, ` · ${p.reflection ? 'Reflection' : 'Mystery'}`);
  $('back').disabled = !index && !page;
  const ctx = controls.context();
  $('next').textContent = !ctx.progress ? 'Begin rosary →' : page < pages.length - 1 ? pages[page + 1].reflection && !p.reflection ? 'Read reflection →' : 'Continue reading →' : index < steps.length - 1 ? 'Next bead →' : 'Complete rosary ✓';
  $('bead').disabled = index === steps.length-1 && page === pages.length-1;
  $('message').textContent = ctx.error || (ctx.progress ? `Card ${index+1} of ${steps.length}` : 'Gather your intentions.');
  drawStrand($('strand'), index, set, 0, steps, controls.getFinish(), true);
}
function move(direction) {
  if (!controls.context().progress) { controls.start(); sync(); return; }
  if (page + direction >= 0 && page + direction < pages.length) { page += direction; paint(); return; }
  const finishing = direction > 0 && index === steps.length-1;
  controls.move(direction);
  if (finishing) return;
  sync(direction < 0 ? Infinity : 0);
  cancelAnimationFrame(frame);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const start = performance.now();
    const tick = now => {
      const t = Math.max(0, 1 - (now - start) / 340);
      drawStrand($('strand'), index, set, direction * t * t, steps, controls.getFinish(), true);
      if (t > 0) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
}
$('next').onclick = $('bead').onclick = () => move(1);
$('back').onclick = () => move(-1);
$('exit').onclick = () => controls.leave();
function loop() { drawLoop($('loop'), Number($('angle').value), steps[index], set); }
$('whole').onclick = () => { dialog.showModal(); loop(); };
$('close').onclick = () => dialog.close();
$('angle').oninput = loop;
$('loop').onpointerdown = e => $('loop').setPointerCapture(e.pointerId);
$('loop').onpointermove = e => {
  if (!$('loop').hasPointerCapture(e.pointerId)) return;
  $('angle').value = Number($('angle').value) + e.movementX * .65;
  loop();
};
new ResizeObserver(() => { if(!host.closest('dialog').open || !steps)return; render(anchor); if (dialog.open) loop(); }).observe($('leaf'));
return {sync};
}
