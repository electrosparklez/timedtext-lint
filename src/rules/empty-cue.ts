import { issue } from './helpers.js';
import type { LintRule } from '../types.js';

export const emptyCueRule: LintRule = {
  id: 'empty-cue',
  defaultConfig: 'warning',
  run(context) {
    return context.cues
      .filter((cue) => cue.text.trim() === '')
      .map((cue) => issue(context, cue, this.id, 'Cue contains no text.'));
  },
};
