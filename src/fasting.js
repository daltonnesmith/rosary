import { validDate } from './dates.js';
import { FIRST_DAY, LAST_DAY, liturgicalDay, moveDay } from './liturgical.js';

const seasons = new Map();
const names = { lent: 'Lent', ash: 'Ash Wednesday', friday: 'Good Friday', personal: 'Personal fast' };
export const fastName = fast => fast.kind === 'personal' ? names.personal : `${names[fast.kind]} ${fast.start.slice(0, 4)}`;
export const includesDay = (fast, date) => fast.start <= date && date <= fast.end;
export const fastKey = f => JSON.stringify([f.kind, f.start, f.end, f.intention]);

export function annualFasts(year) {
  if (!seasons.has(year)) {
    const list = [];
    if (year >= FIRST_DAY.slice(0, 4) && year <= LAST_DAY.slice(0, 4)) {
      for (let date = `${year}-02-01`; date <= `${year}-04-30`; date = moveDay(date, 1)) {
        if (liturgicalDay(date)?.celebrations[0].id !== 'ash_wednesday') continue;
        const friday = moveDay(date, 44);
        list.push({ kind: 'lent', start: date, end: moveDay(friday, -1) },
          { kind: 'ash', start: date, end: date }, { kind: 'friday', start: friday, end: friday });
        break;
      }
    }
    seasons.set(year, list);
  }
  return seasons.get(year);
}

export function validateFasts(rows, invalid) {
  if (!Array.isArray(rows) || rows.length > 2000) invalid();
  const keys = new Set();
  return rows.map(f => {
    if (!f || typeof f.kind !== 'string' || !Object.hasOwn(names, f.kind) || !validDate(f.start) || !validDate(f.end) ||
      f.start < FIRST_DAY || f.end > LAST_DAY || f.end < f.start || typeof f.intention !== 'string' ||
      f.intention.length > 160 || !Array.isArray(f.days) || f.days.length > 5000 ||
      f.days.some(d => !validDate(d) || !includesDay(f, d)) || new Set(f.days).size !== f.days.length) invalid();
    if (f.kind !== 'personal' && !annualFasts(f.start.slice(0, 4)).some(p => p.kind === f.kind && p.start === f.start && p.end === f.end)) invalid();
    const key = fastKey(f);
    if (keys.has(key)) invalid();
    keys.add(key);
    return { kind: f.kind, start: f.start, end: f.end, intention: f.intention, days: [...f.days].sort() };
  });
}

export function mergeFasts(current, incoming) {
  const map = new Map(current.map(f => [fastKey(f), f]));
  for (const f of incoming) {
    const key = fastKey(f);
    map.set(key, { ...f, days: [...new Set([...(map.get(key)?.days ?? []), ...f.days])].sort() });
  }
  return [...map.values()];
}

export function fastMedals(fasts, today) {
  const medals = [];
  function add(symbol, title, art, group, goal) {
    const count = new Set(group.flatMap(f => f.days.filter(d => d <= today))).size;
    medals.push({ symbol, title, art, name: `Record ${goal === 1 ? 'one day' : `${goal} distinct days`}`, goal,
      progress: Math.min(count, goal), earned: count >= goal });
  }
  const personal = fasts.filter(f => f.kind === 'personal');
  add('fast-personal', 'Small Offering', 'olive', personal, 1);
  add('fast-personal-seven', 'A Week of Offerings', 'vine', personal, 7);
  const years = new Set([today.slice(0, 4), ...fasts.filter(f => f.kind !== 'personal').map(f => f.start.slice(0, 4))]);
  for (const year of [...years].sort()) for (const plan of annualFasts(year)) {
    add(`fast-${plan.kind}-${year}`, fastName(plan), { lent: 'olive', ash: 'chalice', friday: 'jerusalem' }[plan.kind],
      fasts.filter(f => f.kind === plan.kind && f.start === plan.start), plan.kind === 'lent' ? 7 : 1);
  }
  return medals;
}
