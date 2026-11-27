import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { LITURGICAL_DAYS, THURSDAY_OVERRIDES } from '../src/liturgical-data.js';
import { adventAppearance } from '../src/liturgical.js';
test('Advent countdown follows the four Sundays and stops at Christmas', () => {
  assert.equal(adventAppearance('2026-11-28'),null);
  for(const [date,week,remaining] of [['2026-11-29',1,26],['2026-12-06',2,19],['2026-12-13',3,12],['2026-12-24',4,1]]) {
    assert.deepEqual(adventAppearance(date),{week,remaining});
  }
  assert.equal(adventAppearance('2026-12-25'),null);
});
import { FIRST_DAY, LAST_DAY, SEASONS, COLORS, liturgicalDay, moveDay, moveMonth, observanceLabel, celebrationColors, dayNote } from '../src/liturgical.js';

const primary = (date, mode) => liturgicalDay(date, mode).celebrations[0];
test('bundled U.S. calendar covers every civil day, with labeled primary and optional celebrations', () => {
  let date = FIRST_DAY;
  let count = 0;
  while (date <= LAST_DAY) {
    const day = liturgicalDay(date);
    assert.ok(day, date);
    assert.ok(SEASONS[day.season], date);
    assert.equal(day.celebrations[0].optional, false, date);
    assert.equal(new Set(day.celebrations.map(event => event.id)).size, day.celebrations.length);
    for (const event of day.celebrations) {
      assert.ok(event.name.trim(), date);
      assert.ok(!observanceLabel(event, day).includes('undefined'), date);
      for (const color of celebrationColors(event, day)) assert.ok(COLORS[color], `${date}: ${color}`);
      if (!celebrationColors(event, day).length) assert.equal(event.id, 'holy_saturday');
    }
    count++;
    date = moveDay(date, 1);
  }
  assert.equal(count, 4383);
  assert.equal(Object.keys(LITURGICAL_DAYS).length, count);
  assert.equal(liturgicalDay('2026-02-30'), null);
  assert.equal(liturgicalDay(moveDay(FIRST_DAY, -1)), null);
  assert.equal(liturgicalDay(moveDay(LAST_DAY, 1)), null);
});
test('movable U.S. feasts match published USCCB 2026-2028 dates', () => {
  for (const [year, epiphany, ash, easter, ascension, pentecost] of [
    [2026, '01-04', '02-18', '04-05', '05-14', '05-24'],
    [2027, '01-03', '02-10', '03-28', '05-06', '05-16'],
    [2028, '01-02', '03-01', '04-16', '05-25', '06-04'],
  ]) {
    assert.equal(primary(`${year}-${epiphany}`).id, 'epiphany_of_the_lord');
    assert.equal(primary(`${year}-${ash}`).id, 'ash_wednesday');
    assert.equal(primary(`${year}-${easter}`).id, 'easter_sunday');
    assert.equal(primary(`${year}-${ascension}`, 'thursday').id, 'ascension_of_the_lord');
    assert.equal(primary(moveDay(`${year}-${ascension}`, 3)).id, 'ascension_of_the_lord');
    assert.equal(primary(`${year}-${pentecost}`).id, 'pentecost_sunday');
  }
  assert.equal(primary('2026-06-07').id, 'most_holy_body_and_blood_of_christ');
  assert.equal(primary('2026-01-05').id, 'john_nepomucene_neumann_bishop');
});
test('season boundaries distinguish Lent, the Triduum, Easter and both parts of Ordinary Time', () => {
  for (const [date, season] of [
    ['2026-01-11', 'CHRISTMAS_TIME'], ['2026-01-12', 'ORDINARY_TIME'],
    ['2026-02-17', 'ORDINARY_TIME'], ['2026-02-18', 'LENT'],
    ['2026-04-02', 'LENT'], ['2026-04-03', 'PASCHAL_TRIDUUM'],
    ['2026-04-04', 'PASCHAL_TRIDUUM'], ['2026-04-05', 'EASTER_TIME'],
    ['2026-05-24', 'EASTER_TIME'], ['2026-05-25', 'ORDINARY_TIME'],
    ['2026-11-28', 'ORDINARY_TIME'], ['2026-11-29', 'ADVENT'],
    ['2026-12-24', 'ADVENT'], ['2026-12-25', 'CHRISTMAS_TIME'],
    ['2027-01-01', 'CHRISTMAS_TIME'],
  ]) assert.equal(liturgicalDay(date).season, season, date);
  assert.deepEqual(primary('2026-03-19').colors, ['WHITE']);
  assert.deepEqual(primary('2026-12-26').colors, ['RED']);
});
test('precedence transfers Annunciation out of Holy Week and suppresses impeded optional memorials', () => {
  assert.notEqual(primary('2024-03-25').id, 'annunciation_of_the_lord');
  assert.equal(primary('2024-04-08').id, 'annunciation_of_the_lord');
  assert.notEqual(primary('2027-03-25').id, 'annunciation_of_the_lord');
  assert.equal(primary('2027-04-05').id, 'annunciation_of_the_lord');
  assert.ok(liturgicalDay('2026-09-05').celebrations.some(event => event.id === 'teresa_of_calcutta_virgin'));
  assert.ok(liturgicalDay('2026-10-09').celebrations.some(event => event.id === 'john_henry_newman_priest'));
  assert.ok(!liturgicalDay('2027-09-05').celebrations.some(event => event.id === 'teresa_of_calcutta_virgin'));
});
test('both Ascension variants retain full precedence, without modifying the default dataset', () => {
  assert.equal(primary('2026-05-14').id, 'matthias_apostle');
  assert.equal(primary('2026-05-17').id, 'ascension_of_the_lord');
  assert.equal(primary('2026-05-14', 'thursday').id, 'ascension_of_the_lord');
  assert.equal(primary('2026-05-17', 'thursday').id, 'easter_time_7_sunday');
  assert.equal(primary('2026-05-14').id, 'matthias_apostle');
  assert.equal(Object.keys(THURSDAY_OVERRIDES).length, 24);
  assert.throws(() => liturgicalDay('2026-05-14', 'unknown'), /Ascension/);
});
test('commemorations retain weekday colors; Holy Thursday and the Vigil are not mislabeled as optional Masses', () => {
  for (const date of ['2026-03-03', '2026-12-21', '2026-12-31']) {
    const day = liturgicalDay(date);
    const event = day.celebrations.find(item => item.optional && !item.colors.length);
    assert.ok(event, date);
    assert.equal(observanceLabel(event, day), 'Optional commemoration');
    assert.deepEqual(celebrationColors(event, day), day.celebrations[0].colors);
    assert.match(dayNote(day), /weekday/);
  }
  const thursday = liturgicalDay('2026-04-02');
  assert.deepEqual(thursday.celebrations.map(event => event.optional), [false, false]);
  assert.deepEqual(thursday.celebrations.map(event => event.colors), [['PURPLE'], ['WHITE']]);
  assert.match(dayNote(thursday), /evening/);
  assert.deepEqual(primary('2026-04-04').colors, []);
  assert.match(dayNote(liturgicalDay('2026-04-04')), /after nightfall, in white/);
  assert.ok(primary('2026-03-15').colors.includes('ROSE'));
  assert.ok(primary('2026-12-13').colors.includes('ROSE'));
  assert.match(dayNote(liturgicalDay('2026-12-13')), /optional/);
  assert.deepEqual(new Set(primary('2026-11-02').colors), new Set(['PURPLE', 'WHITE', 'BLACK']));
  assert.equal(observanceLabel(primary('2026-11-02'), liturgicalDay('2026-11-02')), 'Commemoration');
});
test('Marian Saturdays are offered only on unimpeded Ordinary Time weekdays', () => {
  const hasMary = date => liturgicalDay(date).celebrations.some(event => event.id === 'blessed_virgin_mary_on_saturday');
  assert.equal(hasMary('2026-09-05'), true);
  assert.equal(hasMary('2026-08-15'), false);
  assert.equal(hasMary('2026-03-07'), false);
  assert.equal(hasMary('2026-09-04'), false);
});
test('month and keyboard day navigation clamp leap days and stay stable across time zones and DST', () => {
  assert.equal(moveMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(moveMonth('2025-01-31', 1), '2025-02-28');
  assert.equal(moveMonth('2026-12-31', 1), '2027-01-31');
  assert.equal(moveMonth('2026-03-31', -1), '2026-02-28');
  for (const timezone of ['America/New_York', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import {moveDay,moveMonth,liturgicalDay} from './src/liturgical.js'; console.log(JSON.stringify([moveDay('2026-03-08',1),moveDay('2026-11-01',-1),moveMonth('2024-03-31',-1),liturgicalDay('2026-04-05').celebrations[0].id]));"],
    { cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, TZ: timezone } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['2026-03-09', '2026-10-31', '2024-02-29', 'easter_sunday']);
  }
});
