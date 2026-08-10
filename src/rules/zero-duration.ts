import { issue } from './helpers.js';
import type { LintRule } from '../types.js';

export const zeroDurationRule: LintRule = {
  id: 'zero-duration',
  defaultConfig: 'warning',
  run(context) {
    return context.cues
      .filter((cue) => cue.endMs === cue.startMs)
      .map((cue) => issue(context, cue, this.id, 'Cue has zero duration.'));
  },
};
