import test from 'node:test';
import assert from 'node:assert/strict';
import { MYSTERIES, sequence, moveRosaryProgress } from '../src/core.js';
import { canTapRosaryStep, rosaryWindow, virtualRosarySteps } from '../src/rosary-ui.js';

test('only starting at the cross or tapping the immediate next prayer is allowed', () => {
  for (const fatima of [true, false]) {
    const total = virtualRosarySteps('joyful', fatima).length;
    for (let target = -1; target <= total; target++) {
      assert.equal(canTapRosaryStep(null, target, total), target === 0);
      for (let current = 0; current < total; current++) {
        assert.equal(canTapRosaryStep(current, target, total), target === current + 1 && target < total);
      }
    }
    assert.equal(canTapRosaryStep(2, 5, total), false);
    assert.equal(canTapRosaryStep(2, 1, total), false);
    assert.equal(canTapRosaryStep(2, 2, total), false);
    assert.equal(canTapRosaryStep(2.5, 3.5, total), false);
  }
});

test('the compact bead chain always contains the current and next prayer without gaps', () => {
  for (const set of Object.keys(MYSTERIES)) {
    for (const fatima of [true, false]) {
      const total = virtualRosarySteps(set, fatima).length;
      for (let current = 0; current < total; current++) {
        const { steps, indices } = rosaryWindow(set, fatima, current);
        assert.equal(steps.length, total);
        assert.equal(indices.length, 5);
        assert.ok(indices.includes(current));
        if (current < total - 1) assert.ok(indices.includes(current + 1));
        assert.deepEqual(indices, Array.from({ length: 5 }, (_, i) => indices[0] + i));
        assert.ok(indices[0] >= 0 && indices.at(-1) < total);
      }
    }
  }
  assert.throws(() => rosaryWindow('joyful', true, -1), /Invalid rosary position/);
});

test('virtual navigation inserts each mystery before its Our Father and preserves every prayer in both directions', () => {
  for (const set of Object.keys(MYSTERIES)) {
    for (const fatima of [true, false]) {
      const cards = virtualRosarySteps(set, fatima);
      assert.equal(cards.length, sequence(set, fatima).length + 5);
      assert.deepEqual(cards.filter(card => !card.stage).map(({ step, ...prayer }) => prayer), sequence(set, fatima));
      const mysteries = cards.filter(card => card.stage);
      assert.deepEqual(mysteries.map(card => card.decade), [1, 2, 3, 4, 5]);
      let progress = { set, fatima, step: 0, startedAt: '2026-11-16T18:00:00.000Z' };
      for (let i = 0; i < cards.length; i++) {
        assert.equal(progress.step, cards[i].step);
        assert.equal(progress.stage, cards[i].stage);
        if (cards[i].stage) {
          assert.equal(cards[i - 1].prayer, cards[i].decade === 1 || !fatima ? 'glory' : 'fatima');
          assert.equal(cards[i + 1].prayer, 'father');
          assert.equal(cards[i + 1].stage, undefined);
        }
        if (i < cards.length - 1) progress = moveRosaryProgress(progress, 1, { mysteryCards: true });
      }
      for (let i = cards.length - 1; i > 0; i--) {
        progress = moveRosaryProgress(progress, -1, { mysteryCards: true });
        assert.equal(progress.step, cards[i - 1].step);
        assert.equal(progress.stage, cards[i - 1].stage);
      }
    }
  }
});

test('guided navigation retains its original prayer positions and clears a pending mystery stage', () => {
  const progress = { set: 'joyful', fatima: true, step: 7, stage: 'mystery', startedAt: '2026-11-16T18:00:00.000Z' };
  const next = moveRosaryProgress(progress, 1);
  assert.equal(next.step, 8);
  assert.equal(next.stage, undefined);
  const previous = moveRosaryProgress(progress, -1);
  assert.equal(previous.step, 6);
  assert.equal(previous.stage, undefined);
  assert.equal(progress.stage, 'mystery');
});

test('every virtual decade announces the Catholic mystery in the Vatican order before its ten Hail Marys', () => {
  const catholicOrder = {
    joyful: ['The Annunciation', 'The Visitation', 'The Nativity', 'The Presentation in the Temple', 'The Finding of Jesus in the Temple'],
    luminous: ['The Baptism of Jesus in the Jordan', 'The Wedding at Cana', 'The Proclamation of the Kingdom of God', 'The Transfiguration', 'The Institution of the Eucharist'],
    sorrowful: ['The Agony in the Garden', 'The Scourging at the Pillar', 'The Crowning with Thorns', 'The Carrying of the Cross', 'The Crucifixion'],
    glorious: ['The Resurrection', 'The Ascension', 'The Descent of the Holy Spirit', 'The Assumption of Mary', 'The Coronation of Mary'],
  };
  for (const [set, titles] of Object.entries(catholicOrder)) {
    const cards = virtualRosarySteps(set, true);
    assert.deepEqual(cards.filter(card => card.stage === 'mystery').map(card => MYSTERIES[set].mysteries[card.decade - 1].title), titles);
    for (let decade = 1; decade <= 5; decade++) {
      const decadeCards = cards.filter(card => card.decade === decade);
      assert.equal(decadeCards[0].stage, 'mystery');
      assert.equal(decadeCards[1].prayer, 'father');
      assert.equal(decadeCards.filter(card => card.prayer === 'mary').length, 10);
    }
  }
});
