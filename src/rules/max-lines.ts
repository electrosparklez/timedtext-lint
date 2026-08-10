import { issue, numberOption } from './helpers.js';
import type { LintRule } from '../types.js';

export const maxLinesRule: LintRule = {
  id: 'max-lines',
  defaultConfig: ['warning', { max: 2 }],
  run(context) {
    const max = numberOption(context.options, 'max', 2);
    return context.cues
      .filter((cue) => cue.lines.length > max)
      .map((cue) =>
        issue(context, cue, this.id, `Cue has ${cue.lines.length} lines; maximum is ${max}.`)
      );
  },
};
