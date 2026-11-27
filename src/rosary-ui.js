import { sequence } from './core.js';

export function virtualRosarySteps(set, fatima) {
  return sequence(set, fatima).flatMap((step, index) => {
    const prayer = { ...step, step: index };
    return step.prayer === 'father' && step.decade ? [{ ...prayer, stage: 'mystery' }, prayer] : [prayer];
  });
}
