import { issue } from './helpers.js';
import type { LintIssue, LintRule } from '../types.js';

export const duplicateCueRule: LintRule = {
  id: 'duplicate-cue',
  defaultConfig: 'warning',
  run(context) {
    const seen = new Map<string, number>();
    const issues: LintIssue[] = [];

    for (const cue of context.cues) {
      const normalized = cue.text.replace(/\s+/g, ' ').trim();
      const key = `${cue.startMs}:${cue.endMs}:${normalized}`;
      const previousIndex = seen.get(key);
      if (previousIndex !== undefined) {
        issues.push(issue(context, cue, this.id, `Cue duplicates cue ${previousIndex} exactly.`));
      } else {
        seen.set(key, cue.index);
      }
    }

    return issues;
  },
};
