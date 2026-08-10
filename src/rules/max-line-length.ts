import { issue, numberOption } from './helpers.js';
import type { LintIssue, LintRule } from '../types.js';

export const maxLineLengthRule: LintRule = {
  id: 'max-line-length',
  defaultConfig: ['warning', { max: 42 }],
  run(context) {
    const max = numberOption(context.options, 'max', 42);
    const issues: LintIssue[] = [];

    for (const cue of context.cues) {
      cue.lines.forEach((line, lineOffset) => {
        if (line.length > max) {
          issues.push({
            ...issue(
              context,
              cue,
              this.id,
              `Line has ${line.length} characters; maximum is ${max}.`
            ),
            line: cue.line + 1 + lineOffset,
          });
        }
      });
    }

    return issues;
  },
};
