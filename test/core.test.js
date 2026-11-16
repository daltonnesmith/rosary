import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { MYSTERIES, PRAYERS, emptyState, sequence, suggestedMystery, localDate, previousDate, validDate, validateState, loadState, saveState, parseBackup, mergeBackup, stats, finishRosary, STORAGE_KEY } from '../src/core.js';

const timestamp = '2026-11-16T18:00:00.000Z';
const note = (overrides = {}) => ({ id: 'note-1', date: '2026-11-16', text: 'A quiet intention.', updatedAt: timestamp, ...overrides });
const completion = (date, overrides = {}) => ({ id: `prayer-${date}`, date, mystery: 'joyful', completedAt: timestamp, ...overrides });
const progress = (overrides = {}) => ({ set: 'joyful', fatima: true, step: 0, startedAt: timestamp, ...overrides });

test('all mystery sets have five complete decades and the full opening/closing sequence', () => {
  for (const set of Object.keys(MYSTERIES)) {
    const steps = sequence(set);
    assert.equal(MYSTERIES[set].mysteries.length, 5);
    assert.equal(steps.length, 75);
    assert.deepEqual(steps.slice(0, 7).map(step => step.prayer), ['cross', 'creed', 'father', 'mary', 'mary', 'mary', 'glory']);
    assert.deepEqual(steps.slice(-3).map(step => step.prayer), ['queen', 'closing', 'cross']);
    assert.equal(steps.filter(step => step.prayer === 'mary').length, 53);
    for (let decade = 1; decade <= 5; decade++) {
      const prayers = steps.filter(step => step.decade === decade);
      assert.deepEqual(prayers.map(step => step.prayer), ['father', ...Array(10).fill('mary'), 'glory', 'fatima']);
      assert.deepEqual(prayers.filter(step => step.prayer === 'mary').map(step => step.bead), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
    for (const step of steps) assert.ok(PRAYERS[step.prayer][1].length > 50);
  }
});
test('optional Fatima prayer removes only its five occurrences', () => {
  assert.deepEqual(sequence('luminous', false), sequence('luminous', true).filter(step => step.prayer !== 'fatima'));
  assert.throws(() => sequence('__proto__'), /Unknown mystery/);
});
test('every guided decade supplies its written-out mystery and a devotional reflection', () => {
  for (const [set, { mysteries }] of Object.entries(MYSTERIES)) {
    for (const step of sequence(set).filter(step => step.prayer === 'father' && step.decade)) {
      const mystery = mysteries[step.decade - 1];
      assert.equal(typeof mystery.title, 'string');
      assert.ok(mystery.reading.length > 200, mystery.title);
      assert.ok(mystery.reference.length > 5, mystery.title);
      assert.ok(mystery.reflection.length > 50, mystery.title);
    }
  }
  assert.match(MYSTERIES.joyful.mysteries[0].reading, /Gabriel.*Mary/);
  assert.match(MYSTERIES.joyful.mysteries[1].reading, /Elizabeth/);
  assert.match(MYSTERIES.glorious.mysteries[3].reading, /not narrated directly/);
});
test('weekday defaults match the customary four-set calendar', () => {
  const expected = ['glorious', 'joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful'];
  for (let day = 0; day < 7; day++) assert.equal(suggestedMystery(new Date(2026, 10, 15 + day)), expected[day]);
});
test('completion is explicit, clears only progress, and cannot be repeated without a new rosary', () => {
  const state = { ...emptyState(), progress: progress(), notes: [note()] };
  assert.throws(() => finishRosary(state), /Finish all/);
  assert.equal(state.completions.length, 0);
  state.progress.step = sequence('joyful').length - 1;
  const now = new Date(2026, 10, 17, 0, 5);
  const result = finishRosary(state, now, () => 'completed-1');
  assert.equal(result.progress, null);
  assert.deepEqual(result.notes, state.notes);
  assert.equal(result.completions[0].date, '2026-11-17');
  assert.equal(result.completions[0].mystery, 'joyful');
  assert.equal(result.completions[0].completedAt, now.toISOString());
  assert.throws(() => finishRosary(result), /Finish all/);
  assert.notEqual(state.progress, null);
});
test('resumption round-trips the exact bead, set and optional-prayer setting', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const state = { ...emptyState(), fatima: false, progress: progress({ set: 'sorrowful', fatima: false, step: 42 }), notes: [note()], completions: [completion('2026-11-15')] };
  saveState(storage, state);
  assert.deepEqual(loadState(storage), state);
  assert.deepEqual(sequence(state.progress.set, state.progress.fatima)[loadState(storage).progress.step], sequence('sorrowful', false)[42]);
});
test('blocked, full and corrupt storage errors are surfaced, never overwritten on load', () => {
  assert.throws(() => loadState({ getItem() { throw new Error('Access denied'); } }), /Access denied/);
  assert.throws(() => saveState({ setItem() { throw new Error('Quota exceeded'); } }, emptyState()), /Quota exceeded/);
  const values = new Map([[STORAGE_KEY, '{"version":99}']]);
  assert.throws(() => loadState({ getItem: key => values.get(key) }), /valid Stillwater/);
  assert.equal(values.get(STORAGE_KEY), '{"version":99}');
});
test('local dates are not UTC dates in either hemisphere, including a year boundary', () => {
  const moduleUrl = new URL('../src/core.js', import.meta.url).href;
  for (const [timezone, instant, expected] of [
    ['America/New_York', '2026-03-08T03:30:00.000Z', '2026-03-07'],
    ['Pacific/Kiritimati', '2026-12-31T12:30:00.000Z', '2027-01-01'],
  ]) {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import {localDate} from '${moduleUrl}'; process.stdout.write(localDate(new Date('${instant}')));`], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, expected);
  }
  assert.equal(localDate(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
});
test('calendar arithmetic handles leap years, year ends and daylight-saving boundaries', () => {
  assert.equal(previousDate('2024-03-01'), '2024-02-29');
  assert.equal(previousDate('2026-03-09'), '2026-03-08');
  assert.equal(previousDate('2026-11-02'), '2026-11-01');
  assert.equal(previousDate('2027-01-01'), '2026-12-31');
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
});
test('streak preserves yesterday while today is unfinished, deduplicates days and ignores future days', () => {
  const history = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-15', '2026-11-18'].map(date => completion(date));
  assert.deepEqual(stats(history, '2026-11-16'), { days: 3, streak: 3, today: false });
  assert.deepEqual(stats(history.concat(completion('2026-11-16')), '2026-11-16'), { days: 4, streak: 4, today: true });
  assert.equal(stats(history, '2026-11-17').streak, 0);
  assert.deepEqual(stats([], '2026-11-16'), { days: 0, streak: 0, today: false });
  assert.equal(stats([completion('2026-12-31'), completion('2027-01-01')], '2027-01-02').streak, 2);
});
test('backups round-trip and reject malformed schemas, dates, duplicates, versions and progress', () => {
  const state = { ...emptyState(), notes: [note()], progress: progress() };
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  assert.throws(() => parseBackup('{'), /not readable JSON/);
  assert.throws(() => parseBackup('x'.repeat(2_000_001)), /too large/);
  for (const bad of [
    null, [], {}, { ...state, version: 2 }, { ...state, fatima: 'yes' },
    { ...state, notes: [note({ date: '2026-02-30' })] },
    { ...state, notes: [note({ text: ' ' })] },
    { ...state, notes: [note({ text: 'x'.repeat(10001) })] },
    { ...state, notes: [note(), note()] },
    { ...state, notes: [note({ updatedAt: 'yesterday' })] },
    { ...state, notes: [note({ updatedAt: '2026-02-30T12:00:00.000Z' })] },
    { ...state, progress: progress({ step: 75 }) },
    { ...state, progress: progress({ step: -1 }) },
    { ...state, progress: progress({ step: 1.5 }) },
    { ...state, progress: progress({ set: '__proto__' }) },
    { ...state, progress: progress({ fatima: 'true' }) },
    { ...state, completions: [completion('not-a-date')] },
  ]) assert.throws(() => validateState(bad), /valid Stillwater/);
});
test('merge preserves both conflicting notes, existing history and current place without mutating inputs', () => {
  const current = { ...emptyState(), notes: [note()], progress: progress({ step: 20 }), completions: [completion('2026-11-15')] };
  const incoming = { ...emptyState(), notes: [note({ text: 'A different reflection.' })], progress: progress({ step: 40 }), completions: [completion('2026-11-16')] };
  const merged = mergeBackup(current, incoming, () => 'conflict-copy');
  assert.equal(merged.notes.length, 2);
  assert.equal(merged.notes[1].id, 'conflict-copy');
  assert.equal(merged.completions.length, 2);
  assert.equal(merged.progress.step, 20);
  assert.equal(current.notes.length, 1);
  assert.equal(incoming.notes[0].id, 'note-1');
  assert.deepEqual(mergeBackup(merged, incoming), merged);
});
test('merge restores backed-up progress only when no rosary is currently underway', () => {
  const incoming = { ...emptyState(), progress: progress({ set: 'glorious', step: 33 }) };
  assert.deepEqual(mergeBackup(emptyState(), incoming).progress, incoming.progress);
  const current = { ...emptyState(), notes: [note()] };
  assert.deepEqual(mergeBackup(current, emptyState()).notes, current.notes);
});
