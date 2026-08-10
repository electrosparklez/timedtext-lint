import { issue, numberOption } from './helpers.js';
import type { LintRule } from '../types.js';

export const minimumDurationRule: LintRule = {
  id: 'minimum-duration',
  defaultConfig: ['warning', { minMs: 500 }],
  run(context) {
    const minMs = numberOption(context.options, 'minMs', 500);
    return context.cues
      .filter((cue) => cue.endMs > cue.startMs && cue.endMs - cue.startMs < minMs)
      .map((cue) =>
        issue(
          context,
          cue,
          this.id,
          `Cue lasts ${cue.endMs - cue.startMs}ms; minimum is ${minMs}ms.`
        )
      );
  },
};
