import { issue, numberOption } from './helpers.js';
import type { LintIssue, LintRule } from '../types.js';

function readableCharacterCount(text: string): number {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export const maximumReadingSpeedRule: LintRule = {
  id: 'maximum-reading-speed',
  defaultConfig: ['warning', { maxCharsPerSecond: 20 }],
  run(context) {
    const max = numberOption(context.options, 'maxCharsPerSecond', 20);
    const issues: LintIssue[] = [];

    for (const cue of context.cues) {
      const durationMs = cue.endMs - cue.startMs;
      if (durationMs <= 0 || cue.text.trim() === '') continue;
      const cps = readableCharacterCount(cue.text) / (durationMs / 1000);
      if (cps > max) {
        issues.push(
          issue(
            context,
            cue,
            this.id,
            `Reading speed is ${cps.toFixed(1)} characters/sec; maximum is ${max}.`
          )
        );
      }
    }

    return issues;
  },
};
