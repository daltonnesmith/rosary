import { drawStrand } from '../chapel/medals.js';
import { prayerMilestones, POINTS_PER_ROSARY } from './core.js';

const paintings = [
  {id:'1952.110', name:'Madonna and Child', artist:'Lippo Memmi', goal:1},
  {id:'1954.834', name:'Virgin and Child Enthroned', artist:'Battista di Biagio Sanguigni', goal:5},
  {id:'1950.251', name:'The Annunciation', artist:'Paolo Veronese and workshop', goal:7},
  {id:'1916.802', name:'Virgin and Child with Angels', artist:'Fra Filippo Lippi', goal:30},
  {id:'1931.449', name:'The Crucifixion with a Carthusian Monk', artist:'Rogier van der Weyden', goal:365},
];

const rewards = [
  ['dawn', 'Pilgrim’s dawn', 'Little Pilgrim', 'Your first complete rosary'],
  ['grove', 'Olive grove', 'Keeper of the Beads', '5 rosaries in total'],
  ['alcove', 'Candlelit alcove', 'Candlelighter', '7 prayer days in a row'],
  ['garden', 'Walled rose garden', 'Mary’s Gardener', '30 rosaries in total'],
  ['midnight', 'Midnight sanctuary', 'Keeper of the Lamp', '30 prayer days in a row'],
  ['rose', 'Rose window', 'Friend of the Saints', '365 prayer days, with breaks welcome'],
  ['bouquet', 'Stained-glass bouquet', 'Full Bouquet', 'Pray all four mystery sets'],
];

export function createProfilePreview(getCompletions) {
  const byId = id => document.getElementById(`profile-${id}`);
  const scene = byId('scene'), title = byId('title'), finish = byId('finish');
  for (const [id, name, honor] of rewards) {
    scene.add(new Option(name, id));
    title.add(new Option(honor, honor));
  }
  const gallery = document.createElement('optgroup');
  gallery.label = 'Museum collection · public domain';
  for (const painting of paintings) gallery.append(new Option(painting.name, painting.id));
  scene.append(gallery);
  const strand = byId('strand'), votive = byId('votive');
  const sample = ['mary','glory','mary','father','mary'].map(prayer => ({prayer}));
  let lit = false;
  function render() {
    if (!strand.clientWidth) return;
    const {points, badges} = prayerMilestones(getCompletions());
    const total = points / POINTS_PER_ROSARY;
    const previewLocked = byId('preview-locked').checked;
    for (const [i, option] of [...gallery.children].entries()) {
      const p = paintings[i], earned = total >= p.goal;
      option.disabled = !previewLocked && !earned;
      option.textContent = `${p.name} · ${earned ? 'unlocked' : `${p.goal} ${p.goal === 1 ? 'rosary' : 'rosaries'}`}`;
      if (option.disabled && option.selected) scene.value = 'dawn';
    }
    const painting = paintings.find(p => p.id === scene.value);
    const [id, , , goal] = rewards.find(([key]) => key === scene.value) ?? rewards[0];
    const img = byId('painting'), credit = byId('credit');
    img.hidden = !painting;
    byId('art').ownerSVGElement.style.display = painting ? 'none' : '';
    credit.hidden = !painting;
    if (painting) {
      img.src = `./icons/${painting.id}.jpg`;
      img.alt = `${painting.name}, ${painting.artist}`;
      credit.href = `https://www.clevelandart.org/art/${painting.id}`;
      credit.textContent = `${painting.artist} · Cleveland Museum of Art · CC0`;
    }
    byId('window').dataset.scene = id;
    byId('art').setAttribute('href', `./icons/profile-windows.svg#${id === 'alcove' && lit ? 'lit' : id}`);
    byId('name').textContent = title.value;
    byId('unlock').textContent = painting ? total >= painting.goal ? 'Museum background unlocked.' : `Preview only · unlocks at ${painting.goal} completed ${painting.goal === 1 ? 'rosary' : 'rosaries'}.` : `Unlock milestone: ${goal}.`;
    const earned = badges.filter(b => b.earned);
    byId('catalog').replaceChildren(...badges.map(b => {
      const item = document.createElement('li');
      item.textContent = `${b.name} · ${b.earned ? '✓ Earned' : `${b.progress} / ${b.goal}`}`;
      return item;
    }));
    byId('award-note').textContent = earned.length ? `${points} points from your recorded rosaries.` : 'Your first award appears here when you complete a rosary. Trying a background doesn’t earn an award.';
    byId('awards').replaceChildren(...earned.map(badge => {
      const chip = document.createElement('li');
      chip.textContent = `✦ ${badge.name}`;
      return chip;
    }));
    votive.hidden = id !== 'alcove';
    votive.setAttribute('aria-pressed', String(lit));
    votive.textContent = lit ? 'Extinguish the votive' : 'Light a votive';
    drawStrand(strand, 2, 'luminous', 0, sample, finish.value);
  }
  for (const control of [scene, title, finish, byId('preview-locked')]) control.addEventListener('change', render);
  votive.addEventListener('click', () => { lit = !lit; render(); });
  new ResizeObserver(render).observe(strand);
  return render;
}
