import test from 'node:test';
import assert from 'node:assert/strict';
import { MYSTERIES, sequence } from '../src/core.js';
import { canTapRosaryStep, rosaryWindow } from '../src/rosary-ui.js';

test('only starting at the cross or tapping the immediate next prayer is allowed', () => {
  for (const fatima of [true, false]) {
    const total = sequence('joyful', fatima).length;
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
      const total = sequence(set, fatima).length;
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
