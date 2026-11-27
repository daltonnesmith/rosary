import { localDate } from './dates.js';
import { annualFasts, fastKey, fastName, includesDay, canJoinSeason, nextLent } from './fasting.js';
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
  const start = $('#fast-start'), end = $('#fast-end'), intention = $('#fast-intention');
  const prettyDate = date => format(date, {month:'short', day:'numeric', year:'numeric'});
  start.min = FIRST_DAY;
  start.max = end.max = LAST_DAY;
  start.addEventListener('input', () => { end.min = start.value || FIRST_DAY; });
  start.required = end.required = true;
  for (const [form, field] of [['#lent-join','#lent-intention'],['#observance-join','#observance-intention']]) {
    $(form).addEventListener('submit', event => {
      event.preventDefault();
      const fasts = getFasts();
      const plan = annualFasts(selected.slice(0,4)).find(p =>
        (form === '#lent-join' ? p.kind === 'lent' : p.kind !== 'lent') && canJoinSeason(p,selected,localDate()));
      if (plan && !fasts.some(f=>f.kind === plan.kind && f.start === plan.start))
        saveFasts([...fasts,{...plan,intention:$(field).value.trim(),days:[]}], 'Fast started. No days marked yet.');
      render();
    });
  }
  let formDate;
  let preparing, preparedKey;
  const planText = $('#lent-plan-text');
  $('#lent-plan-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!preparing || localDate() >= preparing.start) { render(); return; }
    const text = planText.value.trim();
    if (!text) {
      planText.setCustomValidity('Enter an intention before saving.');
      planText.reportValidity();
      return;
    }
    const fasts = getFasts();
    const previous = fasts.find(f => f.kind === 'lent' && f.start === preparing.start);
    const updated = {...(previous ?? {...preparing, days:[]}), intention:text};
    if (previous && fasts.some(f=>f !== previous && fastKey(f) === fastKey(updated))) {
      planText.setCustomValidity('This intention is already saved.');
      planText.reportValidity();
      return;
    }
    saveFasts(previous ? fasts.map(f=>f === previous ? updated : f) : [...fasts,updated], 'Lent intention saved. No days recorded.');
    render();
  });
  planText.addEventListener('input', () => planText.setCustomValidity(''));
  function renderFasts(fasts, plans, today) {
    const lent = plans.find(p => p.kind === 'lent' && includesDay(p, selected));
    preparing = lent && lent.start > today ? lent : selected === today && !lent ? nextLent(today) : undefined;
    $('#lent-planner').hidden = !preparing;
    if (preparing) {
      const saved = fasts.find(f=>f.kind === 'lent' && f.start === preparing.start);
      $('#lent-plan-title').textContent = `${saved ? 'Your intention for' : 'Prepare for'} ${fastName(preparing)}`;
      $('#lent-plan-date').textContent = `Check-ins open on Ash Wednesday, ${prettyDate(preparing.start)}. You can save or change your intention now.`;
      const key = JSON.stringify([preparing.start, saved?.intention]);
      if (key !== preparedKey) { planText.value = saved?.intention ?? ''; planText.setCustomValidity(''); }
      preparedKey = key;
    }
    $('#lent-feature').hidden = !lent || lent.start > today;
    if (lent) {
      const joined = fasts.filter(f => f.kind === 'lent' && f.start === lent.start);
      const count = Math.min(7, new Set(joined.flatMap(f=>f.days.filter(d=>d<=today))).size);
      $('#lent-fast-title').textContent = fastName(lent);
      $('#lent-fast-dates').textContent = `${format(lent.start,{month:'long',day:'numeric'})} – ${format(lent.end,{month:'long',day:'numeric'})}`;
      $('#lent-fast-progress').textContent = count === 7 ? 'Seven days kept · yearly medal earned' : `${count} of 7 days toward your Lent medal`;
      $('#lent-stones').replaceChildren(...Array.from({length:7},(_,i)=>make('span','',i<count?'kept':'')));
      $('#lent-join').hidden = joined.length > 0 || !canJoinSeason(lent,selected,today);
    }
    const list = $('#fast-active');
    list.replaceChildren();
    for (const f of fasts.filter(f => includesDay(f, selected) && !(f.kind === 'lent' && f.start > today))) {
      const card = make('article', undefined, 'fast-entry');
      const recorded = f.days.includes(selected);
      const button = make('button', recorded ? '✓ Kept this fast · undo' : selected === today ? 'I kept this fast today' : 'I kept this fast', 'secondary');
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
      const daysKept = f.days.filter(d=>d<=today).length;
      card.append(make('strong', f.kind === 'personal' && f.intention ? f.intention : fastName(f)));
      if (f.intention) card.append(make('p', f.kind === 'personal' ? 'Personal fast' : f.intention, 'small muted'));
      card.append(make('p', `${prettyDate(f.start)}${f.end === f.start ? '' : ` – ${prettyDate(f.end)}`} · ${daysKept} ${daysKept === 1 ? 'day' : 'days'} recorded`, 'small muted'), button);
      list.append(card);
    }
    const observance = plans.find(p => p.kind !== 'lent' && canJoinSeason(p,selected,today) && !fasts.some(f => f.kind === p.kind && f.start === p.start));
    $('#observance-join').hidden = !observance;
    if (observance) $('#observance-begin').textContent = `Begin ${fastName(observance).replace(/ \d{4}$/, '')} fast`;
    if (formDate !== selected) {
      start.value = end.min = end.value = selected;
      intention.value = '';
      $('#lent-intention').value = $('#observance-intention').value = '';
      formDate = selected;
    }
    intention.setCustomValidity('');
  }
  $('#fast-form').addEventListener('input', () => intention.setCustomValidity(''));
  $('#fast-form').addEventListener('submit', event => {
    event.preventDefault();
    const plan = {kind:'personal', start:start.value, end:end.value};
    const fast = {...plan, intention:intention.value.trim(), days:[]};
    if (getFasts().some(f => fastKey(f) === fastKey(fast))) {
      intention.setCustomValidity('You have already joined this fast. Use its daily check-in above.');
      intention.reportValidity();
      return;
    }
    saveFasts([...getFasts(), fast], 'Fast saved. No days marked yet.');
    $('#personal-planner').open = false;
    formDate = undefined;
    choose(includesDay(fast, selected) ? selected : fast.start);
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
    $('#fast-summary-date').textContent = prettyDate(selected);
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
      if (fasts.some(f => includesDay(f,date) && !(f.kind === 'lent' && today < f.start))) {
        button.classList.add('fast-day');
        button.setAttribute('aria-label',`${button.getAttribute('aria-label')} Scheduled fasting day.`);
      }
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
