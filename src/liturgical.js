import { validDate } from './dates.js';
import { CALENDAR_SOURCE, LITURGICAL_DAYS, THURSDAY_OVERRIDES } from './liturgical-data.js';

export { CALENDAR_SOURCE };
export const FIRST_DAY = `${CALENDAR_SOURCE.startYear}-01-01`;
export const LAST_DAY = `${CALENDAR_SOURCE.endYear}-12-31`;
export const SEASONS = {
  ADVENT: 'Advent', CHRISTMAS_TIME: 'Christmas', ORDINARY_TIME: 'Ordinary Time',
  LENT: 'Lent', PASCHAL_TRIDUUM: 'Paschal Triduum', EASTER_TIME: 'Easter',
};
export const COLORS = {
  GREEN: 'Green', PURPLE: 'Violet', WHITE: 'White', RED: 'Red',
  ROSE: 'Rose', BLACK: 'Black',
};
const RANKS = {
  SOLEMNITY: 'Solemnity', FEAST: 'Feast', MEMORIAL: 'Memorial',
  OPTIONAL_MEMORIAL: 'Optional memorial', SUNDAY: 'Sunday', WEEKDAY: 'Weekday',
};
export function liturgicalDay(date, ascension = 'sunday') {
  if (!validDate(date) || date < FIRST_DAY || date > LAST_DAY) return null;
  if (ascension !== 'sunday' && ascension !== 'thursday') throw new Error('Unknown Ascension calendar.');
  return (ascension === 'thursday' && THURSDAY_OVERRIDES[date]) || LITURGICAL_DAYS[date];
}
export function moveDay(date, amount) {
  if (!validDate(date) || !Number.isInteger(amount)) throw new Error('A valid date and day offset are required.');
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}
export function moveMonth(date, amount) {
  if (!validDate(date) || !Number.isInteger(amount)) throw new Error('A valid date and month offset are required.');
  const next = new Date(`${date}T12:00:00Z`);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0, 12)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next.toISOString().slice(0, 10);
}
export function adventAppearance(date) {
  const day = liturgicalDay(date);
  if (day?.season !== 'ADVENT') return null;
  const christmas = `${date.slice(0,4)}-12-25`;
  return { week: day.week, remaining: (Date.parse(christmas) - Date.parse(date)) / 86400000 };
}
export function observanceLabel(event, day) {
  if (event.optional && !event.colors.length) return 'Optional commemoration';
  if (event.id === 'commemoration_of_all_the_faithful_departed') return 'Commemoration';
  return `${event.optional && event.rank !== 'OPTIONAL_MEMORIAL' ? 'Optional observance · ' : ''}${RANKS[event.rank]}`;
}
export function celebrationColors(event, day) {
  return !event.colors.length && event.optional ? day.celebrations[0].colors : event.colors;
}
export function dayNote(day) {
  const id = day.celebrations[0].id;
  if (id === 'holy_thursday') return 'Lent continues until before the evening Mass of the Lord’s Supper. That Mass, celebrated in white, begins the Paschal Triduum; it is not an optional memorial.';
  if (id === 'holy_saturday') return 'There is no daytime Mass on Holy Saturday. The Easter Vigil is celebrated after nightfall, in white. The empty daytime color here does not describe the Vigil.';
  if (day.celebrations.some(event => event.colors.includes('ROSE'))) return 'Rose is optional today; violet may also be used.';
  if (id === 'commemoration_of_all_the_faithful_departed') return 'Violet, white or black may be used for All Souls in the United States.';
  if (day.celebrations.some(event => event.optional && !event.colors.length)) return 'Optional commemorations do not replace the privileged weekday; its liturgical color is retained.';
  return '';
}
