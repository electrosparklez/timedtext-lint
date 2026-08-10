import { issue } from './helpers.js';
import type { LintIssue, LintRule } from '../types.js';

export const overlappingCuesRule: LintRule = {
  id: 'overlapping-cues',
  defaultConfig: 'error',
  run(context) {
    const issues: LintIssue[] = [];
    for (let index = 1; index < context.cues.length; index += 1) {
      const previous = context.cues[index - 1];
      const current = context.cues[index];
      if (current.startMs < previous.endMs) {
        issues.push(
          issue(
            context,
            current,
            this.id,
            `Cue overlaps cue ${previous.index} by ${previous.endMs - current.startMs}ms.`
          )
        );
      }
    }
    return issues;
  },
};
