import { issue } from './helpers.js';
import type { LintRule } from '../types.js';

export const endBeforeStartRule: LintRule = {
  id: 'end-before-start',
  defaultConfig: 'error',
  run(context) {
    return context.cues
      .filter((cue) => cue.endMs < cue.startMs)
      .map((cue) => issue(context, cue, this.id, 'Cue ends before it starts.'));
  },
};
