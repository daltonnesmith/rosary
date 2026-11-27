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

const symbols = { shell:'Pilgrim’s Shell', beads:'Holy Rosary', lily:'Annunciation Lily', heart:'Sacred Heart', keys:'Keys of Saint Peter', candle:'Paschal Candle', lamp:'Sanctuary Lamp', 'chi-rho':'Chi-Rho', roses:'Marian Roses', jerusalem:'Jerusalem Cross' };
Object.assign(symbols, { rose:'Golden Rose', fish:'Ichthys', harp:'David’s Harp', anchor:'Anchor of Hope', vine:'True Vine', chalice:'Eucharistic Chalice', olive:'Olive Branch', dove:'Dove of Peace', star:'Star of the Sea' });
const gospelNames = {MAT:'Matthew · Winged Man',MAR:'Mark · Winged Lion',LUK:'Luke · Winged Ox',JOH:'John · Eagle'};
Object.assign(symbols,{mass:'Bread of Life', confession:'Reconciliation',lent:'Lenten Journey'});
const finishes = {wood:['Olivewood & brass','beads'],pearl:['Pearl & gold','chi-rho'],MAT:['Burnished copper','MAT'],MAR:['Emerald','MAR'],LUK:['Amethyst','LUK'],JOH:['Sapphire','JOH'],jerusalem:['Jerusalem gold','jerusalem']};
for (const id of ['rose','fish','harp','anchor','vine','chalice','olive','dove','star']) finishes[id] = [`${symbols[id]} enamel`,id];
const sceneKeys = ['','beads','candle','heart','lamp','chi-rho','roses'];
function medal(badge) {
  const item = document.createElement('li');
  item.className = 'award-medal';
  item.dataset.earned = badge.earned;
  const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('aria-hidden','true');
  icon.setAttribute('viewBox','0 0 40 40');
  const use = document.createElementNS(icon.namespaceURI,'use');
  const artwork = {mass:'chalice', confession:'dove', lent:'olive'}[badge.symbol] ?? badge.symbol;
  use.setAttribute('href',`./icons/awards.svg#${artwork}`);
  icon.append(use);
  const name = document.createElement('strong'), rule = document.createElement('span'), status = document.createElement('small');
  name.textContent = symbols[badge.symbol] ?? gospelNames[badge.symbol];
  rule.textContent = badge.name.replace(/^Jerusalem Cross · /,'');
  status.textContent = badge.earned ? '✓ Earned' : `${badge.progress} / ${badge.goal}`;
  const unlock = document.createElement('small');
  const finish = Object.values(finishes).find(([,key])=>key===badge.symbol);
  unlock.textContent = finish ? `Beads: ${finish[0]}` : ['mass','confession','lent'].includes(badge.symbol) ? 'Private calendar milestone' : 'Reward: profile background';
  if (badge.children) {
    const details=document.createElement('details'), summary=document.createElement('summary'), list=document.createElement('ul');
    summary.append(icon,name,rule,status,unlock,document.createTextNode('View Gospel medals'));
    list.append(...badge.children.map(medal));
    details.append(summary,list); item.append(details);
  } else if (badge.symbol === 'chi-rho') {
    const details = document.createElement('details'), summary = document.createElement('summary');
    const list = document.createElement('ol');
    list.className = 'prayer-days-ladder';
    summary.append(icon, name, rule, status, unlock, document.createTextNode('View total prayer days'));
    for (const days of [1, 7, 30, 60, 90, 180, 270, badge.goal]) {
      const row = document.createElement('li');
      const reached = badge.progress >= days;
      row.dataset.earned = reached;
      row.textContent = `${days} ${days === 1 ? 'prayer day' : 'prayer days'} · ${reached ? '✓ Reached' : `${badge.progress} / ${days}`}`;
      list.append(row);
    }
    details.append(summary, list); item.append(details);
  } else item.append(icon, name, rule, status, unlock);
  item.dataset.symbol = badge.symbol;
  return item;
}
export function createProfilePreview(getState) {
  const byId = id => document.getElementById(`profile-${id}`);
  const scene = byId('scene'), title = byId('title'), finish = byId('finish');
  finish.replaceChildren(new Option('Mystery enamel','enamel'), ...Object.entries(finishes).map(([id,[name]])=>new Option(name,id)));
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
  let equipped = {scene:'dawn',finish:'enamel'};
  const storageKey = 'stillwater-profile-style';
  const testEquip = ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
    && new URLSearchParams(location.search).get('testEquip') === '1';
  if (testEquip) {
    byId('equip').textContent = 'Try background & beads';
    byId('preview-locked').parentElement.lastChild.textContent = ' Preview locked rewards (try on in this tab)';
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && [...scene.options].some(o=>o.value===saved.scene) && [...finish.options].some(o=>o.value===saved.finish)) {
      equipped = saved; scene.value=saved.scene; finish.value=saved.finish;
    }
  } catch { byId('equip-status').textContent='Saved appearance could not be read.'; }
  function render() {
    if (!strand.clientWidth) return;
    const state = getState();
    const {points, badges} = prayerMilestones(state.completions, undefined, state.reading.gospels.completed,state.checkins);
    const total = points / POINTS_PER_ROSARY;
    const previewLocked = byId('preview-locked').checked;
    const unlocked = new Set(badges.flatMap(b=>[b,...(b.children??[])]).filter(b=>b.earned).map(b=>b.symbol));
    function gate(option,allowed,fallback) {
      option.dataset.unlocked=String(allowed);
      option.disabled=!allowed && !previewLocked;
      if(option.disabled && option.selected) option.parentNode.closest('select').value=fallback;
    }
    rewards.forEach((_,i)=>gate(scene.options[i],!sceneKeys[i] || unlocked.has(sceneKeys[i]),'dawn'));
    for(const opt of finish.options) gate(opt,opt.value==='enamel' || unlocked.has(finishes[opt.value][1]),'enamel');
    for (const [i, option] of [...gallery.children].entries()) {
      const p = paintings[i], earned = total >= p.goal;
      gate(option,earned,'dawn');
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
    const earned = badges.flatMap(b=>[b,...(b.children??[])]).filter(b => b.earned);
    for(const [list,items] of [[byId('catalog'),badges],[byId('awards'),earned]]) {
      const openSymbols=new Set([...list.querySelectorAll('details[open]')].map(d=>d.parentElement.dataset.symbol));
      list.replaceChildren(...items.map(medal));
      for (const d of list.querySelectorAll('details')) d.open=openSymbols.has(d.parentElement.dataset.symbol);
    }
    byId('award-note').textContent = earned.length ? `${points} points from your recorded rosaries.` : 'Your first award appears here when you complete a rosary. Trying a background doesn’t earn an award.';
    byId('equip').disabled = !testEquip && (scene.selectedOptions[0].dataset.unlocked!=='true' || finish.selectedOptions[0].dataset.unlocked!=='true');
    votive.hidden = id !== 'alcove';
    votive.setAttribute('aria-pressed', String(lit));
    votive.textContent = lit ? 'Extinguish the votive' : 'Light a votive';
    drawStrand(strand, 2, 'luminous', 0, sample, finish.value);
  }
  for (const control of [scene, title, finish, byId('preview-locked')]) control.addEventListener('change', () => {byId('equip-status').textContent='';render();});
  byId('equip').onclick=()=>{
    render();
    if(byId('equip').disabled)return;
    const style={scene:scene.value,finish:finish.value};
    if (testEquip) {
      equipped=style;
      byId('equip-status').textContent='Trying this look until reload. Your saved appearance and awards are unchanged.';
      return;
    }
    try {localStorage.setItem(storageKey,JSON.stringify(style));equipped=style;byId('equip-status').textContent='Profile background and chapel beads saved on this device.';}
    catch {byId('equip-status').textContent='Could not save your appearance on this device.';}
  };
  votive.addEventListener('click', () => { lit = !lit; render(); });
  new ResizeObserver(render).observe(strand);
  return {render, getFinish:()=>equipped.finish, getArtwork:()=>{
    const p=paintings.find(p=>p.id===equipped.scene);
    return p ? {photo:`../icons/${p.id}.jpg`,name:p.name} : {symbol:equipped.scene,name:rewards.find(r=>r[0]===equipped.scene)[1]};
  }};
}
