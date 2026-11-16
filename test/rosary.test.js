import test from 'node:test';
import assert from 'node:assert/strict';
import { MYSTERIES, sequence } from '../src/core.js';
import { rosaryPieces, rosaryPositions } from '../src/rosary-ui.js';

test('the 59 physical beads, cross, medal and links cover every prayer exactly once', () => {
  for (const set of Object.keys(MYSTERIES)) {
    for (const fatima of [true, false]) {
      const { steps, opening, loop } = rosaryPieces(set, fatima);
      const pieces = [...opening, ...loop];
      assert.deepEqual(pieces.flatMap(piece => piece.indices).sort((a, b) => a - b), steps.map((_, i) => i));
      assert.equal(pieces.filter(piece => piece.kind === 'mary').length, 53);
      assert.equal(pieces.filter(piece => piece.kind === 'father').length, 6);
      assert.deepEqual(opening[0].indices.map(i => steps[i].prayer), ['cross', 'creed', 'cross']);
      assert.deepEqual(opening.at(-1).indices.map(i => steps[i].prayer), ['glory', 'queen', 'closing']);
      for (let decade = 1; decade <= 5; decade++) {
        const group = loop.slice((decade - 1) * 12, decade * 12);
        assert.deepEqual(group.flatMap(piece => piece.indices).map(i => steps[i]), sequence(set, fatima).filter(step => step.decade === decade));
        assert.deepEqual(group.at(-1).indices.map(i => steps[i].prayer), fatima ? ['glory', 'fatima'] : ['glory']);
      }
    }
  }
});

test('phone and desktop rosaries keep bead targets distinct and inside the drawing', () => {
  for (const width of [180, 254, 320, 480, 760, 1100]) {
    const layout = rosaryPositions(width);
    const points = [...layout.opening, ...layout.loop];
    assert.equal(points.length, 66);
    for (const [i, point] of points.entries()) {
      assert.ok(point.x >= 22 && point.x <= width - 22);
      assert.ok(point.y >= 22 && point.y <= layout.height - 22);
      for (const other of points.slice(i + 1)) assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= 44, `Overlapping bead targets at ${width}px`);
    }
  }
  assert.throws(() => rosaryPositions(0), /drawing space/);
});
