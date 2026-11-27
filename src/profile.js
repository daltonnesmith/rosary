import { drawStrand } from '../chapel/medals.js';

const rewards = [
  ['dawn', 'Pilgrim’s dawn', 'Little Pilgrim', 'Your first complete rosary'],
  ['grove', 'Olive grove', 'Keeper of the Beads', '5 rosaries in total'],
  ['alcove', 'Candlelit alcove', 'Candlelighter', '7 prayer days in a row'],
  ['garden', 'Walled rose garden', 'Mary’s Gardener', '30 rosaries in total'],
  ['midnight', 'Midnight sanctuary', 'Keeper of the Lamp', '30 prayer days in a row'],
  ['rose', 'Rose window', 'Friend of the Saints', '365 prayer days, with breaks welcome'],
  ['bouquet', 'Stained-glass bouquet', 'Full Bouquet', 'Pray all four mystery sets'],
];

export function createProfilePreview() {
  const byId = id => document.getElementById(`profile-${id}`);
  const scene = byId('scene'), title = byId('title'), finish = byId('finish');
  for (const [id, name, honor] of rewards) {
    scene.add(new Option(name, id));
    title.add(new Option(honor, honor));
  }
  const strand = byId('strand'), votive = byId('votive');
  const sample = ['mary','glory','mary','father','mary'].map(prayer => ({prayer}));
  let lit = false;
  function render() {
    if (!strand.clientWidth) return;
    const [id, , , goal] = rewards.find(([key]) => key === scene.value);
    byId('window').dataset.scene = id;
    byId('art').setAttribute('href', `./icons/profile-windows.svg#${id === 'alcove' && lit ? 'lit' : id}`);
    byId('name').textContent = title.value;
    byId('unlock').textContent = `Unlock milestone: ${goal}.`;
    votive.hidden = id !== 'alcove';
    votive.setAttribute('aria-pressed', String(lit));
    votive.textContent = lit ? 'Extinguish the votive' : 'Light a votive';
    drawStrand(strand, 2, 'luminous', 0, sample, finish.value);
  }
  for (const control of [scene, title, finish]) control.addEventListener('change', render);
  votive.addEventListener('click', () => { lit = !lit; render(); });
  new ResizeObserver(render).observe(strand);
  return render;
}
