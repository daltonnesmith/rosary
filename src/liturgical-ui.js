import { localDate } from './dates.js';
import { annualFasts, fastKey, fastName, includesDay } from './fasting.js';
import { CALENDAR_SOURCE, FIRST_DAY, LAST_DAY, SEASONS, COLORS, liturgicalDay, moveDay, moveMonth, observanceLabel, celebrationColors, dayNote } from './liturgical.js';

const $ = selector => document.querySelector(selector);
const make = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const format = (date, options) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
const colorText = (event, day) => {
  const colors = celebrationColors(event, day);
  return colors.length ? `${colors.map(color => COLORS[color]).join(' / ')}${event.optional && !event.colors.length ? ' (weekday color)' : ''}` : 'No daytime Mass';
};

export function createLiturgicalCalendar({getChecks,toggle,getFasts,saveFasts}) {
  let selected = localDate();
  selected = selected < FIRST_DAY ? FIRST_DAY : selected > LAST_DAY ? LAST_DAY : selected;
  let ascension = 'sunday';
  const input = $('#lit-date');
  const kind = $('#fast-kind'), end = $('#fast-end'), intention = $('#fast-intention');
  let formDate;
  function showRule() {
    const personal = kind.value === 'personal';
    $('#fast-range').hidden = !personal;
    end.required = personal;
    end.disabled = !personal;
    $('#fast-rule').textContent = personal ? `Starts ${selected}. Earn Small Offering on your first recorded day, and A Week of Offerings after seven distinct days.` :
      kind.value === 'lent' ? 'Seven recorded days this Lent earn the yearly medal. They need not be consecutive.' : 'Record this observance once to earn its medal for the year.';
  }
  function renderFasts(fasts, plans, today) {
    const list = $('#fast-active');
    list.replaceChildren();
    for (const f of fasts.filter(f => includesDay(f, selected))) {
      const card = make('article', undefined, 'fast-entry');
      const recorded = f.days.includes(selected);
      const button = make('button', recorded ? '✓ Kept this fast · undo' : 'I kept this fast', 'secondary');
      button.type = 'button';
      button.disabled = selected > today;
      button.setAttribute('aria-pressed', String(recorded));
      button.addEventListener('click', () => {
        if (selected > localDate()) return;
        const days = recorded ? f.days.filter(d => d !== selected) : [...f.days, selected].sort();
        saveFasts(getFasts().map(item => fastKey(item) === fastKey(f) ? {...item, days} : item),
          recorded ? 'Fasting check-in removed.' : 'Fasting check-in saved.');
        render();
      });
      card.append(make('strong', fastName(f)));
      if (f.intention) card.append(make('p', f.intention));
      card.append(make('p', `${f.start} – ${f.end} · ${f.days.filter(d=>d<=today).length} days recorded`, 'small muted'), button);
      list.append(card);
    }
    const available = plans.filter(p => includesDay(p, selected) && !fasts.some(f => f.kind === p.kind && f.start === p.start));
    const options = [...available, {kind:'personal', start:selected}];
    const previousKind = kind.value;
    kind.replaceChildren(...options.map(p => new Option(fastName(p), p.kind)));
    if (formDate === selected && options.some(p=>p.kind===previousKind)) kind.value = previousKind;
    end.min = selected;
    end.max = LAST_DAY;
    if (formDate !== selected) {
      end.value = selected;
      intention.value = '';
      formDate = selected;
    }
    intention.setCustomValidity('');
    showRule();
  }
  kind.addEventListener('change', () => { intention.setCustomValidity(''); showRule(); });
  $('#fast-form').addEventListener('input', () => intention.setCustomValidity(''));
  $('#fast-form').addEventListener('submit', event => {
    event.preventDefault();
    const plan = kind.value === 'personal' ? {kind:'personal', start:selected, end:end.value} :
      annualFasts(selected.slice(0,4)).find(p => p.kind === kind.value && includesDay(p, selected));
    if (!plan) return;
    const fast = {...plan, intention:intention.value.trim(), days:[]};
    if (getFasts().some(f => fastKey(f) === fastKey(fast))) {
      intention.setCustomValidity('You have already joined this fast. Use its daily check-in above.');
      intention.reportValidity();
      return;
    }
    saveFasts([...getFasts(), fast], 'Fast joined. No days marked yet.');
    formDate = undefined;
    render();
  });
  input.min = FIRST_DAY;
  input.max = LAST_DAY;
  $('#lit-coverage').textContent = `Offline coverage: ${CALENDAR_SOURCE.startYear}–${CALENDAR_SOURCE.endYear}, calculated using the bundled current rules, not archival calendars. Future decrees may change dates.`;

  function choose(date, focus = false) {
    if (!liturgicalDay(date, ascension)) {
      input.setCustomValidity(`Choose a date between ${FIRST_DAY} and ${LAST_DAY}.`);
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    selected = date;
    render();
    if (focus) $(`#lit-days button[data-date="${selected}"]`).focus();
  }
  function render() {
    const today = localDate();
    const checks=getChecks();
    const fasts = getFasts();
    const plans = annualFasts(selected.slice(0, 4));
    const markedDates=new Set([...checks.map(c=>c.date), ...fasts.flatMap(f=>f.days)]);
    const month = selected.slice(0, 7);
    const first = `${month}-01`;
    const count = Number(moveDay(moveMonth(first, 1), -1).slice(8));
    const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
    input.value = selected;
    $('#lit-month-title').textContent = format(first, { month: 'long', year: 'numeric' });
    $('#lit-back').disabled = month === FIRST_DAY.slice(0, 7);
    $('#lit-next').disabled = month === LAST_DAY.slice(0, 7);
    $('#lit-today').disabled = !liturgicalDay(today, ascension);
    $('#lit-today').title = liturgicalDay(today, ascension) ? '' : 'Today is outside the bundled calendar coverage.';
    const body = $('#lit-days');
    body.replaceChildren();
    let row;
    for (let cell = 0; cell < Math.ceil((offset + count) / 7) * 7; cell++) {
      if (cell % 7 === 0) { row = make('tr'); body.append(row); }
      const td = make('td');
      row.append(td);
      const number = cell - offset + 1;
      if (number < 1 || number > count) continue;
      const date = `${month}-${String(number).padStart(2, '0')}`;
      const day = liturgicalDay(date, ascension);
      const event = day.celebrations[0];
      const color = event.colors[0] ?? 'NONE';
      const button = make('button', undefined, 'lit-day');
      button.type = 'button';
      button.dataset.date = date;
      button.dataset.season = day.season;
      button.dataset.color = color;
      button.tabIndex = date === selected ? 0 : -1;
      button.setAttribute('aria-pressed', String(date === selected));
      button.setAttribute('aria-label', `${format(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. ${SEASONS[day.season]}. ${event.name}. ${colorText(event, day)}.${day.celebrations.length > 1 ? ' More observances available.' : ''}`);
      if (date === today) button.setAttribute('aria-current', 'date');
      const heading = make('span', undefined, 'lit-day-number');
      const dot = make('span', '', 'lit-dot');
      dot.setAttribute('aria-hidden', 'true');
      heading.append(make('span', String(number)), dot);
      const occasions = plans.filter(p => p.start === date);
      if (occasions.length) {
        heading.append(make('span', '◇', 'lit-fast-mark'));
        button.setAttribute('aria-label', `${button.getAttribute('aria-label')} Fasting: ${occasions.map(fastName).join(', ')}.`);
      }
      button.append(heading, make('span', event.name, 'lit-day-name'), make('span', COLORS[color] ?? 'No Mass', 'lit-day-color'));
      if(markedDates.has(date)){
        heading.append(make('span','✓','lit-check-mark'));
        button.setAttribute('aria-label',`${button.getAttribute('aria-label')} Personal check-in recorded.`);
      }
      td.append(button);
    }
    const day = liturgicalDay(selected, ascension);
    renderFasts(fasts, plans, today);
    const isLent=day.season==='LENT';
    const challenge=$('#lent-challenge');
    challenge.hidden=!isLent;
    if(isLent){
      const count=checks.filter(c=>c.kind==='lent' && c.date.slice(0,4)===selected.slice(0,4) && c.date<=today).length;
      $('#lent-heading').textContent=day.celebrations[0].id==='ash_wednesday'?'Ash Wednesday · Begin the Lenten Journey':'Lenten Journey';
      $('#lent-count').textContent=`${Math.min(7,count)} of 7 prayer days this Lent. Set aside a moment for prayer today; the days need not be consecutive.`;
    }
    for(const button of document.querySelectorAll('[data-checkin]')){
      const marked=checks.some(c=>c.date===selected && c.kind===button.dataset.checkin);
      button.disabled=selected>today;
      button.setAttribute('aria-pressed',String(marked));
      button.textContent=`${marked?'✓ ':''}${button.dataset.label}`;
    }
    $('#lit-day-title').textContent = format(selected, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const season = $('#lit-season');
    season.dataset.season = day.season;
    const showWeek = day.week > 0 && !['CHRISTMAS_TIME', 'PASCHAL_TRIDUUM'].includes(day.season)
      && ['WEEKDAY', 'SUNDAY'].includes(day.celebrations[0].rank);
    season.textContent = `${SEASONS[day.season]}${showWeek ? ` · Week ${day.week}` : ''}`;
    $('#lit-events').replaceChildren(...day.celebrations.map((event, index) => {
      const article = make('article', undefined, 'lit-observance');
      const meta = make('p', `${observanceLabel(event, day)} · ${colorText(event, day)}`, 'small muted');
      meta.dataset.color = celebrationColors(event, day)[0] ?? 'NONE';
      const dot = make('span', '', 'lit-dot');
      dot.setAttribute('aria-hidden', 'true');
      meta.prepend(dot);
      article.append(make('h3', event.name), meta);
      if (index > 0 && !event.optional) article.append(make('p', 'Also celebrated on this date; see the note below.', 'small muted'));
      return article;
    }));
    const note = dayNote(day);
    $('#lit-day-note').textContent = note;
    $('#lit-day-note').hidden = !note;
  }
  $('#lit-back').addEventListener('click', () => choose(moveMonth(selected, -1)));
  $('#lit-next').addEventListener('click', () => choose(moveMonth(selected, 1)));
  $('#lit-today').addEventListener('click', () => choose(localDate()));
  for(const button of document.querySelectorAll('[data-checkin]')) button.addEventListener('click',()=>{
    if(selected>localDate() || (button.dataset.checkin==='lent' && liturgicalDay(selected,ascension).season!=='LENT')) return;
    toggle(selected,button.dataset.checkin);
    render();
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('change', () => choose(input.value));
  $('#lit-ascension').addEventListener('change', event => { ascension = event.target.value; render(); });
  $('#lit-days').addEventListener('click', event => {
    const button = event.target.closest('button[data-date]');
    if (button) choose(button.dataset.date, true);
  });
  $('#lit-days').addEventListener('keydown', event => {
    const button = event.target.closest('button[data-date]');
    if (!button || event.altKey || event.ctrlKey || event.metaKey) return;
    const date = button.dataset.date;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    let next;
    if (Object.hasOwn(offsets, event.key)) next = moveDay(date, offsets[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') next = moveMonth(date, event.key === 'PageUp' ? -1 : 1);
    else return;
    event.preventDefault();
    if (liturgicalDay(next, ascension)) choose(next, true);
  });
  render();
  return { render };
}
